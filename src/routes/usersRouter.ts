import { Router } from "express";
import {
  acceptApplicant,
  addAddress,
  deleteAddress,
  getPaginatedUsers,
  googleLogin,
  login,
  logout,
  refreshAccessToken,
  rejectApplicant,
  setDefaultAddress,
  signup,
  updateAddress,
} from "../controllers/userControllers";
import { authentication } from "../middlewares/authentication";

const usersRouter = Router();

usersRouter.post("/signup", signup);
usersRouter.post("/login", login);
usersRouter.get("/refresh", refreshAccessToken);
usersRouter.patch("/logout", logout);
usersRouter.post("/google-login", googleLogin);

usersRouter.get("/paginated", authentication, getPaginatedUsers);

usersRouter.patch("/:userId/accept", authentication, acceptApplicant);
usersRouter.patch("/:userId/reject", authentication, rejectApplicant);

usersRouter.post("/:userId/addresses", authentication, addAddress);
usersRouter.patch(
  "/:userId/addresses/:addressId",
  authentication,
  updateAddress
);
usersRouter.delete(
  "/:userId/addresses/:addressId",
  authentication,
  deleteAddress
);
usersRouter.patch(
  "/:userId/addresses/default",
  authentication,
  setDefaultAddress
);

export default usersRouter;
