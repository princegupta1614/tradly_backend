import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Invoice } from "../models/invoice.model.js";

const getAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { range = "30" } = req.query; // Default to last 30 days

    // Calculate Date Range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    // Common Match Stage (Filter by Owner & Date)
    const matchStage = {
        owner: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "Cancelled" } // Exclude cancelled invoices
    };

    const [kpiStats, graphData, topProducts, topCustomers] = await Promise.all([

        // 1. KPI Cards (Total Revenue, Avg Order Value, Payment Status)
        Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalAmount" },
                    count: { $sum: 1 },
                    avgOrderValue: { $avg: "$finalAmount" },
                    paidAmount: {
                        $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$finalAmount", 0] }
                    },
                    pendingAmount: {
                        $sum: { $cond: [{ $ne: ["$status", "Paid"] }, "$finalAmount", 0] }
                    }
                }
            }
        ]),

        // 2. Revenue Graph (Group by Day)
        Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$finalAmount" }
                }
            },
            { $sort: { _id: 1 } } // Sort chronologically
        ]),

        // 3. Top Selling Products (Requires Unwinding Items)
        Invoice.aggregate([
            { $match: matchStage },
            { $unwind: "$items" }, // Break arrays into individual documents
            {
                $group: {
                    _id: "$items.productId", // Group by Product ID (assuming you store it)
                    name: { $first: "$items.name" }, // Get name
                    totalSold: { $sum: "$items.quantity" },
                    revenueGenerated: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } }, // Sort by highest quantity sold
            { $limit: 5 }
        ]),

        // 4. Top Customers
        Invoice.aggregate([
            { $match: matchStage },
            {
                $lookup: { // Join with Customers collection to get names
                    from: "customers",
                    localField: "customer",
                    foreignField: "_id",
                    as: "customerDetails"
                }
            },
            { $unwind: "$customerDetails" },
            {
                $group: {
                    _id: "$customer",
                    name: { $first: "$customerDetails.name" },
                    totalSpent: { $sum: "$finalAmount" },
                    invoicesCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 }
        ])
    ]);

    const data = {
        kpi: {
            revenue: kpiStats[0]?.totalRevenue || 0,
            invoices: kpiStats[0]?.count || 0,
            avgValue: Math.round(kpiStats[0]?.avgOrderValue || 0),
            collected: kpiStats[0]?.paidAmount || 0,
            outstanding: kpiStats[0]?.pendingAmount || 0,
        },
        graph: graphData.map(d => ({ date: d._id, amount: d.revenue })),
        topProducts,
        topCustomers
    };

    return res.status(200).json(new ApiResponse(200, data, "Analytics fetched"));
});

export { getAnalytics };