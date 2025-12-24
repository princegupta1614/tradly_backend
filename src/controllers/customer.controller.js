import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Customer } from "../models/customer.model.js";

// 1. ADD CUSTOMER
const addCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body;

  if (!name || !phone) {
    throw new ApiError(400, "Name and Phone number are required");
  }

  // Check if customer with same phone exists for THIS user
  const existingCustomer = await Customer.findOne({ 
    phone, 
    owner: req.user._id 
  });

  if (existingCustomer) {
    throw new ApiError(409, "Customer with this phone number already exists in your list");
  }

  const customer = await Customer.create({
    name,
    email,
    phone,
    address,
    owner: req.user._id
  });

  return res.status(201).json(
    new ApiResponse(201, customer, "Customer added successfully")
  );
});

// 2. GET ALL MY CUSTOMERS
const getMyCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ owner: req.user._id }).sort({ createdAt: -1 });
  
  return res.status(200).json(
    new ApiResponse(200, customers, "Customers fetched successfully")
  );
});

// 3. GET SINGLE CUSTOMER
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return res.status(200).json(
    new ApiResponse(200, customer, "Customer details fetched")
  );
});

// 4. UPDATE CUSTOMER
const updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body;

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    {
      $set: { name, email, phone, address }
    },
    { new: true }
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return res.status(200).json(
    new ApiResponse(200, customer, "Customer updated successfully")
  );
});

// 5. DELETE CUSTOMER
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Customer deleted successfully")
  );
});

export { addCustomer, getMyCustomers, getCustomerById, updateCustomer, deleteCustomer };