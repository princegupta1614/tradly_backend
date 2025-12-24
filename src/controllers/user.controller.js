import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { sendOTP } from "../utils/otpService.js";

// --- 1. REGISTER USER ---
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, businessName, businessCategory, businessDescription } = req.body;

  if ([username, email, password, businessName].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existingUser) {
    if (existingUser.isVerified) {
        throw new ApiError(409, "User already exists. Please login.");
    } else {
        // Remove unverified stale user to allow re-registration
        await User.deleteOne({ _id: existingUser._id });
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    businessName,
    businessCategory,
    businessDescription,
    otp,
    otpExpiry,
    isVerified: false 
  });

  sendOTP(email, otp).catch(err => console.log("Email Error:", err));

  console.log("User: ", user);

  return res.status(201).json(
    new ApiResponse(200, { userId: user._id, email: user.email }, "OTP sent to email")
  );
});

// --- 2. VERIFY OTP ---
const verifyOTP = asyncHandler(async (req, res) => {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user) throw new ApiError(404, "User not found");

    if (user.isVerified) {
        return res.status(200).json(new ApiResponse(200, user, "User already verified"));
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
        throw new ApiError(400, "Invalid or Expired OTP");
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    // await user.save({ validateBeforeSave: false });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const options = { httpOnly: true, secure: true };

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user, accessToken, refreshToken }, "Verified successfully"));
});

// --- 3. LOGIN USER ---
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) throw new ApiError(400, "Username or Email is required");

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) throw new ApiError(404, "User does not exist");

  // ✅ CHECK VERIFICATION STATUS
  if (!user.isVerified) {
      throw new ApiError(403, "Account not verified. Please verify your email.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in Successfully"));
});

// --- 4. LOGOUT USER (Added Back) ---
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 } // Removes the field from DB
    },
    { new: true }
  );

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});


// 5. sending otp to verify.
const sendOtp = asyncHandler(async (req, res) => {
  const { email, username } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or Username is required");
  }

  // Find user
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    return res.status(200).json(new ApiResponse(200, {}, "User is already verified"));
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save({ validateBeforeSave: false });

  // Send Email
  try {
    await sendOTP(user.email, otp);
  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }

  // Return userId so frontend can call verifyOTP next
  return res.status(200).json(
    new ApiResponse(200, { userId: user._id, email: user.email }, "OTP sent successfully")
  );
});

// 6. Get Current User Profile
const getCurrentUser = asyncHandler(async (req, res) => {
    // req.user is already injected by the verifyJWT middleware
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// 7. Update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { businessName, businessCategory, businessDescription, username } = req.body;

    if (!businessName || !username) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if username is taken by someone else
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        throw new ApiError(409, "Username already taken");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                businessName,
                username: username.toLowerCase(), // Ensure lowercase
                businessCategory: businessCategory || "General",
                businessDescription: businessDescription || ""
            }
        },
        { new: true }
    ).select("-password -refreshToken -otp");

    return res.status(200).json(new ApiResponse(200, user, "Account updated successfully"));
});


// 8. Check Username Availability (Public/Secured)
const checkUsernameAvailability = asyncHandler(async (req, res) => {
    const { username } = req.query;

    if (!username?.trim() || username?.trim() === '') {
        throw new ApiError(400, "Username is missing");
    }

    const existedUser = await User.findOne({ 
        username: username.toLowerCase() 
    });

    // If user exists AND it's not the current user (if logged in check is needed)
    // For simple check: just see if taken.
    // If you want to allow the user to keep their OWN username, handle that in frontend logic or ignore match with req.user._id

    return res.status(200).json(
        new ApiResponse(200, { isAvailable: !existedUser }, "Username checked")
    );
});

// 9. Change Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// --- 10. REQUEST PASSWORD RESET (Step 1) ---
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { username } = req.body;

    if (!username) {
        throw new ApiError(400, "Username is required");
    }

    // Find user by username (case insensitive)
    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
        // Security best practice: Don't reveal if user exists or not, 
        // but for this specific logic where we need the ID, we throw 404 
        // or handle it gracefully.
        throw new ApiError(404, "User with this username does not exist");
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update User with new OTP
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    // Send Email
    try {
        await sendOTP(user.email, otp);
    } catch (error) {
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(500, "Failed to send OTP email. Please try again.");
    }

    // Return UserID (needed for the next step) and masked email for UI feedback
    const maskedEmail = user.email.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2");

    return res.status(200).json(
        new ApiResponse(200, { userId: user._id, emailHint: maskedEmail }, "OTP sent to your registered email")
    );
});

// --- 11. RESET PASSWORD WITH OTP (Step 2) ---
const resetPassword = asyncHandler(async (req, res) => {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
        throw new ApiError(400, "User ID, OTP, and New Password are required");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Validate OTP
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
        throw new ApiError(400, "Invalid or Expired OTP");
    }

    // Update Password
    user.password = newPassword;
    
    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Save (triggers the pre('save') hook to hash the new password)
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset successfully. You can now login.")
    );
});

export { 
  registerUser, 
  verifyOTP, 
  loginUser, 
  logoutUser, 
  sendOtp, 
  getCurrentUser, 
  updateAccountDetails, 
  checkUsernameAvailability , 
  changeCurrentPassword,
  requestPasswordReset,
  resetPassword
}; 