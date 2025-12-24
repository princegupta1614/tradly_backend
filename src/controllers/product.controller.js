import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"; // Import new helper

// 1. ADD PRODUCT (Kept same, just for context)
const addProduct = asyncHandler(async (req, res) => {
  const { name, barcode, price, stock, category, description } = req.body;
  if (!name || !price) throw new ApiError(400, "Name and Price are required");

  let imageUrl = "";
  if (req.files && req.files.image && req.files.image.length > 0) {
    const localFilePath = req.files.image[0].path;
    const uploadResponse = await uploadOnCloudinary(localFilePath);
    if (uploadResponse) imageUrl = uploadResponse.secure_url;
  }

  const product = await Product.create({
    name, price, description, category, stock, barcode,
    image: imageUrl,
    owner: req.user._id
  });

  return res.status(201).json(new ApiResponse(201, product, "Product added successfully"));
});

// 2. GET ALL PRODUCTS
const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ owner: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));
});

// 3. GET SINGLE PRODUCT
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
  if (!product) throw new ApiError(404, "Product not found");
  return res.status(200).json(new ApiResponse(200, product, "Product details fetched"));
});

// 4. ✅ UPDATE PRODUCT (Enhanced)
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, stock, description, category, barcode } = req.body;

  // Find existing product first
  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
  if (!product) throw new ApiError(404, "Product not found or unauthorized");

  let imageUrl = product.image; // Default to existing image

  // Check if a NEW image file is uploaded
  if (req.files && req.files.image && req.files.image.length > 0) {
    const localFilePath = req.files.image[0].path;
    
    // Upload new image
    const uploadResponse = await uploadOnCloudinary(localFilePath);
    
    if (uploadResponse) {
      // If upload success, DELETE the old image
      await deleteFromCloudinary(product.image);
      imageUrl = uploadResponse.secure_url;
    }
  }

  // Update fields
  product.name = name || product.name;
  product.price = price || product.price;
  product.stock = stock || product.stock;
  product.description = description || product.description;
  product.category = category || product.category;
  product.barcode = barcode || product.barcode;
  product.image = imageUrl; // Update URL

  await product.save();

  return res.status(200).json(new ApiResponse(200, product, "Product updated successfully"));
});

// 5. ✅ DELETE PRODUCT (Enhanced)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!product) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  // Delete the image from Cloudinary
  if (product.image) {
    await deleteFromCloudinary(product.image);
  }

  return res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"));
});

export { addProduct, getMyProducts, getProductById, updateProduct, deleteProduct };