import express from "express";
import { authentication } from "../middlewares/authentication";
import { getPaginatedTransactions } from "../controllers/transactionControllers";
const transactionsRouter = express.Router();

transactionsRouter
  .route("/paginated")
  .get(authentication, getPaginatedTransactions);

export default transactionsRouter;
