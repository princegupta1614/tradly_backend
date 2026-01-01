import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Invoice } from "../models/invoice.model.js";
import { Customer } from "../models/customer.model.js";
import { Complaint } from "../models/complaint.model.js";

// --- 🔐 AUTH ---

const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
        throw new ApiError(404, "Admin not found");
    }

    const isPasswordValid = await admin.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = admin.generateAccessToken();

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 7000 // 7 day
    };

    // Standard login response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    token: accessToken,
                    admin: { username: admin.username, email: admin.email, role: admin.role }
                },
                "Admin logged in successfully"
            )
        );
});

// --- 👥 USER MANAGEMENT ---

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password -refreshToken").sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 🔥 CASCADE DELETE (Clean up all user data)
    await Promise.all([
        Product.deleteMany({ owner: userId }),
        Invoice.deleteMany({ owner: userId }),
        Customer.deleteMany({ owner: userId }),
        Complaint.deleteMany({ owner: userId })
    ]);

    await User.findByIdAndDelete(userId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, `User ${user.username} and all associated data deleted successfully`));
});

// --- 📩 COMPLAINT MANAGEMENT ---

const getAllComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find()
        .populate("owner", "username email businessName") // Fetch owner details
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, complaints, "Complaints fetched successfully"));
});

const resolveComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const { developerResponse, status } = req.body;

    if (!developerResponse) {
        throw new ApiError(400, "Developer response is required");
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
            developerResponse,
            status: status || "Resolved"
        },
        { new: true }
    );

    if (!updatedComplaint) {
        throw new ApiError(404, "Complaint not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComplaint, "Complaint resolved successfully"));
});

const logoutAdmin = asyncHandler(async (req, res) => {
    // 1. (Optional) Remove refresh token from DB if you use them
    await Admin.findByIdAndUpdate(
        req.admin._id,
        { $unset: { refreshToken: 1 } }, // Removes the field
        { new: true }
    );

    // 2. Cookie Options to CLEAR it (Must match login options exactly)
    const options = {
        httpOnly: true,
        secure: true,      // Match your login setting
        sameSite: "None",  // Match your login setting
    };

    return res
        .status(200)
        // 3. Clear the Access Token Cookie
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "Admin logged out successfully"));
});

export {
    loginAdmin,
    getAllUsers,
    deleteUser,
    getAllComplaints,
    resolveComplaint,
    logoutAdmin
};