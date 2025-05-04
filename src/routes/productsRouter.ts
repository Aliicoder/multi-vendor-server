import express from "express";
import {
  addProduct,
  getAISearchedProducts,
  getPaginatedProducts,
  getProduct,
  getSearchedProducts,
  updateProduct,
} from "../controllers/productControllers";
import { authentication } from "../middlewares/authentication";
const productsRouter = express.Router();

productsRouter.route("/").post(authentication, addProduct);

productsRouter.route("/paginated").get(authentication, getPaginatedProducts);

productsRouter.route("/search").get(getSearchedProducts);
productsRouter.route("/ai-search").post(getAISearchedProducts);

productsRouter.route("/:productId").patch(authentication, updateProduct);

productsRouter.route("/:productId").get(getProduct);

export default productsRouter;
