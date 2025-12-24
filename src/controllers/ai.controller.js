import { GoogleGenerativeAI } from "@google/generative-ai";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Product } from "../models/product.model.js";
import { Invoice } from "../models/invoice.model.js";

// --- 🔐 API KEY MANAGER ---
const getWorkingGenerativeModel = async (modelName = "gemini-2.5-flash") => {
    // 1. Load available keys
    const keys = [
        process.env.GEMINI_API_KEY1,
        process.env.GEMINI_API_KEY2,
        process.env.GEMINI_API_KEY3
    ].filter(Boolean); // Remove any undefined keys

    if (keys.length === 0) {
        throw new Error("No GEMINI_API_KEYs found in environment variables");
    }

    // 2. Shuffle keys to pick a random one first (Load Balancing)
    const shuffledKeys = keys.sort(() => 0.5 - Math.random());

    let lastError = null;

    // 3. Try keys one by one (Fallback Mechanism)
    for (const key of shuffledKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // Return the model instance bound to this specific working key
            return { model, key }; 
        } catch (error) {
            console.warn(`⚠️ Key ending in ...${key.slice(-4)} failed initialization.`);
            lastError = error;
        }
    }

    throw lastError || new Error("All API keys failed to initialize");
};

// --- HELPER: Execute AI Request with Retry ---
const generateContentWithFallback = async (prompt) => {
    // 1. Load keys again (for retry logic inside execution)
    const keys = [
        process.env.GEMINI_API_KEY1,
        process.env.GEMINI_API_KEY2,
        process.env.GEMINI_API_KEY3
    ].filter(Boolean);

    // Shuffle
    const shuffledKeys = keys.sort(() => 0.5 - Math.random());
    let lastError = null;

    for (const key of shuffledKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            // using the model version you specified
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
            
            console.log(`🤖 Using Gemini Key: ...${key.slice(-4)}`); // Debug log
            
            const result = await model.generateContent(prompt);
            return result; // ✅ Success, return result immediately
            
        } catch (error) {
            console.error(`❌ Key ...${key.slice(-4)} failed: ${error.message}`);
            lastError = error;
            // Loop continues to the next key automatically...
        }
    }

    // If loop finishes and nothing returned, throw error
    throw lastError || new ApiError(500, "All AI keys failed. Service unavailable.");
};

// --- HELPER: Gather Business Context (Your Code) ---
const getContextData = async (userId) => {
    // 1. Low Stock
    const lowStock = await Product.find({ owner: userId, stock: { $lte: 5 } })
        .select("name stock price")
        .limit(5);

    // 2. Pending Invoices (With Customer Names)
    const pendingInvoices = await Invoice.find({
        owner: userId,
        status: { $in: ["Pending", "Overdue"] }
    })
    .populate("customer", "name phone")
    .select("finalAmount dueDate status")
    .limit(5);

    // 3. Top Customers
    const topCustomers = await Invoice.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: "$customer", total: { $sum: "$finalAmount" } } },
        { $sort: { total: -1 } },
        { $limit: 3 },
        {
            $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "details"
            }
        },
        { $unwind: "$details" },
        { $project: { name: "$details.name", total: 1 } }
    ]);

    return { lowStock, pendingInvoices, topCustomers };
};

// --- 1. GET DAILY INSIGHTS ---
const getBusinessInsights = asyncHandler(async (req, res) => {
    const context = await getContextData(req.user._id);

    const prompt = `
        You are a business consultant. Analyze this data:
        ${JSON.stringify(context)}

        Instructions:
        1. Identify 2-3 critical insights (e.g., low stock, high pending payments).
        2. Suggest 2 actionable steps (e.g., "Call Customer X").
        3. ✅ ALWAYS use the Rupee symbol (₹) for currency.
        4. ✅ Use the specific Customer Names provided in the data.

        Return strictly VALID JSON:
        {
            "insights": [ {"title": "string", "message": "string", "type": "warning" | "success" | "info"} ],
            "actions": [ {"label": "string", "action": "string"} ]
        }
    `;

    try {
        // ✅ Use the new Fallback Function
        const result = await generateContentWithFallback(prompt);
        
        let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        // JSON Cleanup Fix
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

        const aiData = JSON.parse(text);
        return res.status(200).json(new ApiResponse(200, aiData, "Insights fetched"));

    } catch (error) {
        console.error("Final AI Error:", error);
        // Fallback response if all keys fail
        return res.status(200).json(new ApiResponse(200, { insights: [], actions: [] }, "AI currently unavailable"));
    }
});

// --- 2. CHAT WITH AI ---
const chatWithAI = asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message) throw new ApiError(400, "Message is required");

    const context = await getContextData(req.user._id);

    const prompt = `
        You are a smart assistant for the ${req.user?.businessName}.
        
        CURRENT BUSINESS DATA:
        ${JSON.stringify(context)}

        USER QUESTION: "${message}"

        INSTRUCTIONS:
        - Answer based ONLY on the data provided.
        - If the answer isn't in the data, suggest where to look (e.g., "Check the products tab").
        - Keep answers short, professional, and friendly.
        - Use "₹" for currency.
        - Don't reply like: based on data provided..., skip this things.
    `;

    try {
        // ✅ Use the new Fallback Function
        const result = await generateContentWithFallback(prompt);
        const reply = result.response.text();

        return res.status(200).json(new ApiResponse(200, { reply }, "Reply sent"));
    } catch (error) {
        throw new ApiError(500, "Failed to chat with AI (All keys exhausted)");
    }
});

export { getBusinessInsights, chatWithAI };