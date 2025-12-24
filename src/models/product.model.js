import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
    barcode: {
      type: String, 
      trim: true,
      index: true 
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      default: 0
    },
    stock: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      default: "Uncategorized"
    },
    image: {
      type: String, 
    }
  },
  { timestamps: true }
);

productSchema.pre("save", function () {
  if (!this.barcode) {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    this.barcode = randomCode;
  }
});

export const Product = mongoose.model("Product", productSchema);