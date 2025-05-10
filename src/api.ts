import express from "express";
import usersRouter from "./routes/usersRouter";
import categoriesRouter from "./routes/categoriesRouter";
import productsRouter from "./routes/productsRouter";
import cartsRouter from "./routes/cartsRouter";
import wishListRouter from "./routes/wishListsRouter";
import currenciesRouter from "./routes/currenciesRouter";
import { errorHandler } from "./utils/catchAsync";
import ordersRouter from "./routes/ordersRouter";
import { setupSecurity } from "./middlewares/security";
import { setupCommonMiddleware } from "./middlewares/common";
import { Application } from "express-serve-static-core";
import transactionsRouter from "./routes/TransactionRouter";

const app: Application = express();

setupSecurity(app);
setupCommonMiddleware(app);

app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/carts", cartsRouter);
app.use("/api/v1/wishLists", wishListRouter);
app.use("/api/v1/currencies", currenciesRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/transactions", transactionsRouter);

app.use("*", (req, res) => {
  res.status(404).json({ message: "undefined route" });
});
app.use(errorHandler);

export default app;
