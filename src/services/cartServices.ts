import Product from "../models/Product";
import {
  IAddProductToCartParams,
  ICheckoutParams,
  IDeleteProductFromCartParams,
  IGetActiveCartParams,
  IPaypalCaptureOrderParams,
  IPaypalCreateOrderParams,
} from "../types/params";
import ApiError from "../utils/apiError";
import { Order } from "../models/Order";
import { HydratedDocument, Types } from "mongoose";
import { generateAccessToken } from "../utils/paypalClient";
import { redisClient } from "../utils/redisClient";
import axios from "axios";
import { config } from "../config/environment";
import { Transaction } from "../models/Transaction";
import Cart from "../models/Cart";
import {
  ICart,
  ICartOrder,
  IOrder,
  ITransaction,
  IUnit,
} from "../types/schema";

export const getUserPopulatedActiveCartDB = async (
  params: IGetActiveCartParams
): Promise<any> => {
  const { userId } = params;
  const activeCart = await Cart.findOne({
    userId,
    status: "active",
  }).populate({
    path: "orders.units.productId",
    model: Product,
  });
  if (!activeCart) {
    const newCart = await Cart.create({ userId, status: "active" });
    throw new ApiError("Failed to create cart", 500);
  }
  const allUnits = activeCart.orders.reduce<IUnit[]>(
    (acc, order) => acc.concat([...order.units]),
    []
  );
  const cartWithUnits = {
    ...activeCart.toObject(),
    units: allUnits,
  };

  return {
    success: true,
    statusCode: 200,
    cart: cartWithUnits,
  };
};

export const getUserActiveCartDB = async (
  params: IGetActiveCartParams
): Promise<any> => {
  const { userId } = params;
  const activeCart = await Cart.findOne({ userId, status: "active" });
  if (!activeCart) {
    const newCart = await Cart.create({ userId, status: "active" });
    if (!newCart) throw new ApiError("Failed to create cart", 500);
    return { success: true, statusCode: 201, cart: newCart };
  }
  return { success: true, statusCode: 200, cart: activeCart };
};

export const addProductToCartDB = async (
  params: IAddProductToCartParams
): Promise<any> => {
  const { userId, productId } = params;

  const product = await Product.findById({ _id: productId });
  if (!product) throw new ApiError("Product not found", 404);

  let { cart } = await getUserActiveCartDB({ userId });
  if (!cart) throw new ApiError("Cart not found", 404);

  let order = cart.orders.find(
    (o: ICartOrder) => o.sellerId.toString() === product.sellerId.toString()
  );

  if (!order) {
    order = {
      sellerId: product.sellerId,
      amount: 0,
      units: [],
    };
    cart.orders.push(order);
  }

  let unit = order.units.find(
    (u: IUnit) => u.productId.toString() === productId.toString()
  );

  if (unit) {
    unit.quantity++;
    unit.price = product.price;
  } else {
    order.units.push({
      productId: product._id,
      quantity: 1,
      price: product.price,
      shopName: product.shopName,
    });
  }

  order.amount = order.units.reduce(
    (sum: number, u: IUnit) => sum + u.price * u.quantity,
    0
  );

  await cart.save();

  const populatedCart = await getUserPopulatedActiveCartDB({ userId });
  return {
    success: true,
    statusCode: 200,
    cart: populatedCart.cart,
    message: "quantity updated",
  };
};

export const deleteProductFromCartDB = async (
  params: IDeleteProductFromCartParams
): Promise<any> => {
  const { userId, productId } = params;
  const product = await Product.findById({ _id: productId });
  if (!product) throw new ApiError("Product not found", 404);

  let { cart } = await getUserActiveCartDB({ userId });
  if (!cart) throw new ApiError("Cart not found", 404);

  let productFound = false;

  cart.orders.forEach((order: ICartOrder) => {
    order.units.forEach((unit: IUnit) => {
      if (unit.productId.toString() === productId.toString()) {
        productFound = true;
        unit.quantity--;

        if (unit.quantity <= 0) {
          order.units = order.units.filter(
            (u) => u.productId.toString() !== productId.toString()
          );
        }
      }
    });

    order.amount = order.units.reduce(
      (sum, u) => sum + u.price * u.quantity,
      0
    );
  });

  cart.orders = cart.orders.filter(
    (order: ICartOrder) => order.units.length > 0
  );

  if (!productFound) throw new ApiError("Product not found in cart", 404);

  await cart.save();

  const populatedCart = await getUserPopulatedActiveCartDB({ userId });

  return {
    success: true,
    statusCode: 200,
    cart: populatedCart.cart,
    message: "quantity updated",
  };
};

export const cashCheckoutDB = async (params: ICheckoutParams): Promise<any> => {
  const { userId } = params;
  const cart = await Cart.findOne({ userId, status: "active" });

  if (!cart) throw new ApiError("Cart not found", 404);
  const allUnits = cart.orders.flatMap((order) =>
    order.units.map((unit) => ({
      productId: unit.productId,
      price: unit.price,
      quantity: unit.quantity,
      shopName: unit.shopName,
      sellerId: order.sellerId,
    }))
  );
  const createdOrders = await Promise.all(
    allUnits.map(async (unit) => {
      const OrderData: IOrder = {
        userId: new Types.ObjectId(userId),
        sellerId: unit.sellerId,
        productId: unit.productId,
        amount: unit.price * unit.quantity,
        quantity: unit.quantity,
        shopName: unit.shopName,
        paymentMethod: "cash",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        transactionId: cart.transactionId,
        cartId: cart._id,
      };
      const order = await Order.create(OrderData);
      return order;
    })
  );

  const transactionData: ITransaction = {
    userId: new Types.ObjectId(userId),
    orderIds: createdOrders.map((order) => order._id),
    paymentMethod: "cash",
    amount: cart.totalAmount,
    currency: "USD",
    status: "pending",
    cartId: cart._id,
  };
  const transaction = await Transaction.create(transactionData);

  cart.transactionId = transaction._id;
  cart.status = "settled";
  await cart.save();

  return {
    success: true,
    statusCode: 200,
    message: "Order placed successfully. Please pay on delivery.",
  };
};

export const paypalCreateOrderDB = async (
  params: IPaypalCreateOrderParams
): Promise<any> => {
  const { userId } = params;
  const cart: HydratedDocument<ICart> | null = await Cart.findOne({
    userId,
    status: "active",
  });

  if (!cart) throw new ApiError("Cart not found", 404);

  const totalAmount = cart.totalAmount;
  const currency = "USD";
  let accessToken = await redisClient.get("paypalAccessToken");
  if (!accessToken) {
    const data = await generateAccessToken();
    await redisClient.set("paypalAccessToken", data.access_token, {
      EX: data.expires_in,
    });
    accessToken = data.access_token;
  }
  const items = cart.orders.flatMap((order) =>
    order.units.map((unit) => ({
      name: `${unit.shopName} - Product ${unit.productId}`,
      sku: unit.productId.toString(),
      unit_amount: {
        currency_code: currency,
        value: unit.price.toString(),
      },
      quantity: unit.quantity.toString(),
    }))
  );

  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_BASE_URL}/v2/checkout/orders`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          items,
          amount: {
            currency_code: currency,
            value: totalAmount.toString(),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: totalAmount.toString(),
              },
            },
          },
        },
      ],
      application_context: {
        brand_name: "ons store",
        locale: "en-US",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    }),
  });

  const transactionData: ITransaction = {
    userId: new Types.ObjectId(userId),
    orderIds: [],
    paymentMethod: "paypal",
    amount: cart.totalAmount,
    currency: "USD",
    status: "failed",
    cartId: cart._id,
    paypalOrderId: response.data.id,
    paymentDetails: response.data,
  };
  const transaction = await Transaction.create(transactionData);

  cart.paypalOrderId = response.data.id;
  cart.transactionId = transaction._id;
  await cart.save();

  return {
    success: true,
    statusCode: 200,
    orderId: response.data.id,
    message: "PayPal order created successfully",
  };
};

export const paypalCaptureOrderDB = async (
  params: IPaypalCaptureOrderParams
): Promise<any> => {
  const { userId, orderId } = params;
  const cart: HydratedDocument<ICart> | null = await Cart.findOne({
    userId,
    status: "active",
  });

  if (!cart) throw new ApiError("Cart not found", 404);
  if (cart.paypalOrderId !== orderId)
    throw new ApiError("Order ID mismatch", 400);

  let accessToken = await redisClient.get("paypalAccessToken");
  if (!accessToken) {
    const data = await generateAccessToken();
    await redisClient.set("paypalAccessToken", data.access_token, {
      EX: data.expires_in,
    });
    accessToken = data.access_token;
  }

  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.data.status !== "COMPLETED")
    throw new ApiError("PayPal payment not completed", 400);

  const capturedAmount = parseFloat(
    response.data.purchase_units[0]?.payments?.captures[0]?.amount?.value
  );

  if (Math.abs(capturedAmount - cart.totalAmount) > 0.01)
    throw new ApiError("Payment amount mismatch", 400);

  const allUnits = cart.orders.flatMap((order) =>
    order.units.map((unit) => ({
      productId: unit.productId,
      price: unit.price,
      quantity: unit.quantity,
      shopName: unit.shopName,
      sellerId: order.sellerId,
    }))
  );

  const createdOrders = await Promise.all(
    allUnits.map(async (unit) => {
      const OrderData: IOrder = {
        userId: new Types.ObjectId(userId),
        sellerId: unit.sellerId,
        productId: unit.productId,
        amount: unit.price * unit.quantity,
        quantity: unit.quantity,
        shopName: unit.shopName,
        paymentMethod: "paypal",
        paymentStatus: "paid",
        deliveryStatus: "pending",
        transactionId: cart.transactionId,
        cartId: cart._id,
      };
      const order = await Order.create(OrderData);
      return order;
    })
  );

  const transaction: HydratedDocument<ITransaction> | null =
    await Transaction.findById(cart.transactionId);

  if (!transaction) throw new ApiError("Transaction not found", 404);

  transaction.status = "paid";
  transaction.orderIds = createdOrders.map((order) => order._id);
  await transaction.save();

  cart.status = "settled";
  await cart.save();

  return {
    success: true,
    statusCode: 200,
    message: "PayPal order captured successfully",
  };
};
