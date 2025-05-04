import express from "express";
import { authentication } from "../middlewares/authentication";
import {
  addProductToCart,
  cashCheckout,
  deleteProductFromCart,
  getUserActiveCart,
  paypalCaptureOrder,
  paypalCreateOrder,
} from "../controllers/cartControllers";

const cartsRouter = express.Router();

cartsRouter.get("/", authentication, getUserActiveCart);
cartsRouter.post("/products/:productId", authentication, addProductToCart);
cartsRouter.delete(
  "/products/:productId",
  authentication,
  deleteProductFromCart
);
cartsRouter.post("/cod", authentication, cashCheckout);
cartsRouter.post("/paypal/create-order", authentication, paypalCreateOrder);
cartsRouter.post("/paypal/capture-order", authentication, paypalCaptureOrder);

export default cartsRouter;
