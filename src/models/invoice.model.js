import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  name: {
    type: String,
    required: true
  },
  barcode: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    items: [invoiceItemSchema],
    totalAmount: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Overdue", "Cancelled"],
      default: "Pending"
    },
    // ✅ Updated Fields
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date
    }, // New Field
    reminderCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);