import express from "express";
import {
  addProductToWishList,
  deleteProductFromWishList,
  getWishList,
} from "../controllers/wishListController";
import { authentication } from "../middlewares/authentication";
const wishListRouter = express.Router();
wishListRouter.route("/").get(authentication, getWishList);
wishListRouter
  .route("/products/:productId")
  .post(authentication, addProductToWishList);
wishListRouter
  .route("/products/:productId")
  .delete(authentication, deleteProductFromWishList);

export default wishListRouter;
