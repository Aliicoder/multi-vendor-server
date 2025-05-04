import express from "express";
import { authentication } from "../middlewares/authentication";
import { getPaginatedOrders } from "../controllers/orderControllers";
const ordersRouter = express.Router();

ordersRouter.route("/paginated").get(authentication, getPaginatedOrders);

export default ordersRouter;
