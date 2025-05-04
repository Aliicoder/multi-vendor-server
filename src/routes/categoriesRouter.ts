import express from "express";
import {
  createCategory,
  getCategories,
  getPaginatedCategories,
} from "../controllers/categoryControllers";
const categoriesRouter = express.Router();

categoriesRouter.route("/").post(createCategory);

categoriesRouter.route("/").get(getCategories);

categoriesRouter.route("/paginated").get(getPaginatedCategories);

export default categoriesRouter;
