import { Router } from "express";
import {
  getCurrencies,
  getExchangeRates,
} from "../controllers/currenciesControllers";

const currenciesRouter = Router();

currenciesRouter.get("/", getCurrencies);
currenciesRouter.get("/exchange-rates", getExchangeRates);

export default currenciesRouter;
