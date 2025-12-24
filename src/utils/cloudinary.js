import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


const uploadOnCloudinary = async (localFilePath) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        return null;
    }
};

// ✅ NEW FUNCTION: Delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    try {
        if (!imageUrl) return;

        // Extract Public ID from URL
        // Example: https://res.cloudinary.com/.../image/upload/v123/my-folder/filename.jpg
        // We need: "my-folder/filename" (without extension)
        const parts = imageUrl.split('/');
        const filenameWithExt = parts[parts.length - 1];
        const publicId = filenameWithExt.split('.')[0];

        // Note: If you use folders in Cloudinary, extraction logic might need the folder name too.
        // For standard uploads, just the filename usually works.

        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.log("Error deleting from cloudinary:", error);
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };