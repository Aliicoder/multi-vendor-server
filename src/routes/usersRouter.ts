import { Router } from "express";
import {
  acceptApplicant,
  addAddress,
  deleteAddress,
  getPaginatedUsers,
  googleLogin,
  login,
  logout,
  onboarding,
  refreshAccessToken,
  rejectApplicant,
  sendEmailOtp,
  sendMobileOtp,
  setDefaultAddress,
  updateAddress,
  verifyEmailOtp,
  verifyMobileOtp,
} from "../controllers/userControllers";
import { authentication } from "../middlewares/authentication";

const usersRouter = Router();

usersRouter.post("/login", login);
usersRouter.get("/refresh", refreshAccessToken);
usersRouter.patch("/logout", logout);
usersRouter.post("/google-login", googleLogin);

usersRouter.get("/paginated", authentication, getPaginatedUsers);

usersRouter.post("/send-mobile-otp", sendMobileOtp);
usersRouter.post("/verify-mobile-otp", verifyMobileOtp);

usersRouter.post("/send-email-otp", sendEmailOtp);
usersRouter.post("/verify-email-otp", verifyEmailOtp);

usersRouter.post("/:userId/onboarding", authentication, onboarding);

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
