import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Complaint } from "../models/complaint.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Reuse your existing utility

const createComplaint = asyncHandler(async (req, res) => {
    const { subject, description } = req.body;

    if (!subject || !description) {
        throw new ApiError(400, "Subject and Description are required");
    }

    // 1. Handle Image Upload (Optional)
    let imageUrl = "";
    if (req.file) {
        const localPath = req.file.path;
        const uploadResponse = await uploadOnCloudinary(localPath);
        if (uploadResponse) {
            imageUrl = uploadResponse.url;
        }
    }

    // 2. Create Complaint
    const complaint = await Complaint.create({
        owner: req.user._id,
        subject,
        description,
        image: imageUrl
    });

    return res.status(201).json(
        new ApiResponse(201, complaint, "Complaint filed successfully. We will check it shortly.")
    );
});

// Optional: Get User's Complaints
const getMyComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, complaints, "Complaints fetched"));
});

export { createComplaint, getMyComplaints };