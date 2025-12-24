import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Invoice } from "../models/invoice.model.js";
import { Product } from "../models/product.model.js";
import { Customer } from "../models/customer.model.js";

const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // We use Promise.all to run all database queries simultaneously for speed
  const [invoiceStats, productStats, customerCount, monthlySales, recentInvoices] = await Promise.all([
    
    // 1. General Invoice Stats
    Invoice.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalAmount" },
          totalInvoices: { $sum: 1 },
          paidInvoices: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } },
          pendingInvoices: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } }
        }
      }
    ]),

    // 2. Product Stats
    Product.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          lowStockItems: { $sum: { $cond: [{ $lt: ["$stock", 5] }, 1, 0] } }
        }
      }
    ]),

    // 3. Customer Count
    Customer.countDocuments({ owner: userId }),

    // 4. Monthly Sales Trend (Last 6 Months) for Chart
    Invoice.aggregate([
      { 
        $match: { 
          owner: userId,
          status: { $ne: "Cancelled" }, // Don't count cancelled
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } // Last 6 months
        } 
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$finalAmount" }
        }
      },
      { $sort: { "_id": 1 } } // Sort by month Jan -> Dec
    ]),

    // 5. Recent 5 Transactions
    Invoice.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer", "name")
      .select("finalAmount status createdAt customer")
  ]);

  // Construct Data
  const stats = {
    revenue: invoiceStats[0]?.totalRevenue || 0,
    totalInvoices: invoiceStats[0]?.totalInvoices || 0,
    paid: invoiceStats[0]?.paidInvoices || 0,
    pending: invoiceStats[0]?.pendingInvoices || 0,
    products: productStats[0]?.totalProducts || 0,
    lowStock: productStats[0]?.lowStockItems || 0,
    customers: customerCount || 0,
    graphData: monthlySales, // Array of { _id: MonthNum, total: Amount }
    recentActivity: recentInvoices
  };

  return res.status(200).json(
    new ApiResponse(200, stats, "Dashboard stats fetched successfully")
  );
});

export { getDashboardStats };