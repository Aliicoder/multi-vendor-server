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
    if (!newCart) throw new ApiError("Failed to create cart", 500);
    return { success: true, statusCode: 201, cart: newCart };
  }

  return {
    success: true,
    statusCode: 200,
    cart: activeCart,
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

  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found", 404);

  let { cart } = await getUserActiveCartDB({ userId });
  if (!cart) throw new ApiError("Cart not found", 404);

  let order = cart.orders.find(
    (o: ICartOrder) => o.sellerId.toString() === product.sellerId.toString()
  );

  if (order) {
    let unit = order.units.find(
      (u: IUnit) => u.productId.toString() === product._id.toString()
    );

    if (unit) {
      unit.quantity++;
    } else {
      order.units.push({
        productId: product._id,
        quantity: 1,
        price: product.price,
        shopName: product.shopName,
      });
    }
  } else {
    cart.orders.push({
      sellerId: product.sellerId,
      amount: 0,
      units: [
        {
          productId: product._id,
          quantity: 1,
          price: product.price,
          shopName: product.shopName,
        },
      ],
    });
  }

  await cart.save();

  const { cart: populatedCart } = await getUserPopulatedActiveCartDB({
    userId,
  });

  return {
    success: true,
    statusCode: 200,
    cart: populatedCart,
    message: "Quantity updated",
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
      if (unit.productId.toString() == productId.toString()) {
        productFound = true;
        unit.quantity--;

        if (unit.quantity <= 0) {
          order.units = order.units.filter(
            (u) => u.productId.toString() !== productId.toString()
          );
        }
      }
    });
  });

  cart.orders = cart.orders.filter(
    (order: ICartOrder) => order.units.length > 0
  );

  if (!productFound) throw new ApiError("Product not found in cart", 404);

  await cart.save();

  const { cart: populatedCart } = await getUserPopulatedActiveCartDB({
    userId,
  });
  return {
    success: true,
    statusCode: 200,
    cart: populatedCart,
    message: "quantity updated",
  };
};

const updateProductStockAndSales = async (
  productId: Types.ObjectId,
  quantity: number
) => {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found", 404);

  if (product.stock < quantity) {
    throw new ApiError(`Insufficient stock for product ${product.name}`, 400);
  }

  product.stock -= quantity;
  product.sales += quantity;
  await product.save();
};

export const cashCheckoutDB = async (params: ICheckoutParams): Promise<any> => {
  const { userId } = params;
  const cart = await Cart.findOne({ userId, status: "active" });

  if (!cart) throw new ApiError("Cart not found", 404);

  // Group units by seller
  const unitsBySeller: Record<string, IUnit[]> = {};
  cart.orders.forEach((order) => {
    if (!unitsBySeller[order.sellerId.toString()]) {
      unitsBySeller[order.sellerId.toString()] = [];
    }
    order.units.forEach((unit) => {
      unitsBySeller[order.sellerId.toString()].push({
        productId: unit.productId,
        price: unit.price,
        quantity: unit.quantity,
        shopName: unit.shopName,
      });
    });
  });

  // Update stock for all products
  const allUnits = Object.values(unitsBySeller).flat();
  await Promise.all(
    allUnits.map((unit) =>
      updateProductStockAndSales(unit.productId, unit.quantity)
    )
  );

  // Create orders and transactions per seller
  const transactions = await Promise.all(
    Object.entries(unitsBySeller).map(async ([sellerId, units]) => {
      // Create orders for this seller's products
      const createdOrders = await Promise.all(
        units.map(async (unit) => {
          const OrderData: IOrder = {
            userId: new Types.ObjectId(userId),
            sellerId: new Types.ObjectId(sellerId),
            productId: unit.productId,
            amount: unit.price * unit.quantity,
            quantity: unit.quantity,
            shopName: unit.shopName,
            paymentMethod: "cash",
            paymentStatus: "pending",
            deliveryStatus: "pending",
            cartId: cart._id,
          };
          return await Order.create(OrderData);
        })
      );

      // Calculate total amount for this seller
      const sellerAmount = units.reduce(
        (sum, unit) => sum + unit.price * unit.quantity,
        0
      );

      // Create transaction for this seller
      const transactionData: ITransaction = {
        clientId: new Types.ObjectId(userId),
        sellerId: new Types.ObjectId(sellerId),
        orderIds: createdOrders.map((order) => order._id),
        paymentMethod: "cash",
        amount: sellerAmount,
        currency: "USD",
        status: "pending",
        cartId: cart._id,
      };
      const transaction = await Transaction.create(transactionData);

      // Update orders with transaction ID
      await Order.updateMany(
        { _id: { $in: createdOrders.map((o) => o._id) } },
        { transactionId: transaction._id }
      );

      return transaction;
    })
  );
  cart.transactionIds = transactions.map((t) => t._id);
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

  // Group items by seller
  const itemsBySeller: Record<string, any[]> = {};
  cart.orders.forEach((order) => {
    if (!itemsBySeller[order.sellerId.toString()]) {
      itemsBySeller[order.sellerId.toString()] = [];
    }
    order.units.forEach((unit) => {
      itemsBySeller[order.sellerId.toString()].push({
        name: `${unit.shopName} - Product ${unit.productId}`,
        sku: unit.productId.toString(),
        unit_amount: {
          currency_code: "USD",
          value: unit.price.toString(),
        },
        quantity: unit.quantity.toString(),
      });
    });
  });

  // Calculate total amount per seller
  const purchaseUnits = Object.entries(itemsBySeller).map(
    ([sellerId, items]) => {
      const sellerAmount = items.reduce(
        (sum, item) =>
          sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity),
        0
      );

      return {
        items,
        amount: {
          currency_code: "USD",
          value: sellerAmount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: sellerAmount.toFixed(2),
            },
          },
        },
        custom_id: sellerId, // Store seller ID in custom_id for reference
      };
    }
  );

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
    url: `${config.PAYPAL_BASE_URL}/v2/checkout/orders`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: purchaseUnits,
      application_context: {
        brand_name: "ons store",
        locale: "en-US",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    }),
  });

  // Create transactions for each seller
  const transactions = await Promise.all(
    Object.entries(itemsBySeller).map(async ([sellerId, items]) => {
      const sellerAmount = items.reduce(
        (sum, item) =>
          sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity),
        0
      );

      const transactionData: ITransaction = {
        clientId: new Types.ObjectId(userId),
        sellerId: new Types.ObjectId(sellerId),
        orderIds: [],
        paymentMethod: "paypal",
        amount: sellerAmount,
        currency: "USD",
        status: "pending",
        cartId: cart._id,
        paypalOrderId: response.data.id,
        paymentDetails: response.data,
      };
      return await Transaction.create(transactionData);
    })
  );

  cart.paypalOrderId = response.data.id;
  cart.transactionIds = transactions.map((t) => t._id);
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

  // Verify all purchase units were captured successfully
  const purchaseUnits = response.data.purchase_units;
  for (const unit of purchaseUnits) {
    const capturedAmount = parseFloat(
      unit.payments?.captures[0]?.amount?.value || "0"
    );
    const expectedAmount = parseFloat(unit.amount.value);

    if (Math.abs(capturedAmount - expectedAmount) > 0.01) {
      throw new ApiError(
        `Payment amount mismatch for seller ${unit.custom_id}`,
        400
      );
    }
  }

  // Group units by seller
  const unitsBySeller: Record<string, IUnit[]> = {};
  cart.orders.forEach((order) => {
    if (!unitsBySeller[order.sellerId.toString()]) {
      unitsBySeller[order.sellerId.toString()] = [];
    }
    order.units.forEach((unit) => {
      unitsBySeller[order.sellerId.toString()].push({
        productId: unit.productId,
        price: unit.price,
        quantity: unit.quantity,
        shopName: unit.shopName,
      });
    });
  });

  // Update stock for all products
  const allUnits = Object.values(unitsBySeller).flat();
  await Promise.all(
    allUnits.map((unit) =>
      updateProductStockAndSales(unit.productId, unit.quantity)
    )
  );

  // Process orders and transactions per seller
  await Promise.all(
    Object.entries(unitsBySeller).map(async ([sellerId, units]) => {
      // Find the transaction for this seller
      const transaction = await Transaction.findOne({
        _id: { $in: cart.transactionIds },
        sellerId,
      });

      if (!transaction)
        throw new ApiError(`Transaction not found for seller ${sellerId}`, 404);

      // Create orders for this seller's products
      const createdOrders = await Promise.all(
        units.map(async (unit) => {
          const OrderData: IOrder = {
            userId: new Types.ObjectId(userId),
            sellerId: new Types.ObjectId(sellerId),
            productId: unit.productId,
            amount: unit.price * unit.quantity,
            quantity: unit.quantity,
            shopName: unit.shopName,
            paymentMethod: "paypal",
            paymentStatus: "paid",
            deliveryStatus: "pending",
            transactionId: transaction._id,
            cartId: cart._id,
          };
          return await Order.create(OrderData);
        })
      );

      transaction.status = "paid";
      transaction.orderIds = createdOrders.map((order) => order._id);
      await transaction.save();
    })
  );

  cart.status = "settled";
  await cart.save();

  return {
    success: true,
    statusCode: 200,
    message: "PayPal order captured successfully",
  };
};
