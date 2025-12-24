import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        subject: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        image: {
            type: String, // Cloudinary URL
            default: ""
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved"],
            default: "Pending"
        },
        developerResponse: {
            type: String, // Message from dev
            default: ""
        }
    },
    { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);