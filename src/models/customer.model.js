import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: "Rajkot"
    }
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerSchema);