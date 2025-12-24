import { Router } from "express";
import { registerUser, loginUser, logoutUser, verifyOTP, sendOtp, getCurrentUser, updateAccountDetails, changeCurrentPassword, checkUsernameAvailability, requestPasswordReset, resetPassword } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/verify-otp").post(verifyOTP);
router.route("/send-otp").post(sendOtp);

router.route("/check-username").get(checkUsernameAvailability);

// forgot password with email otp
router.route("/forgot-password/request").post(requestPasswordReset);
router.route("/forgot-password/reset").post(resetPassword);

// Secured Routes
router.use(verifyJWT);
router.route("/logout").post(logoutUser);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account").patch(updateAccountDetails);
router.route("/change-password").post(changeCurrentPassword);

export default router;