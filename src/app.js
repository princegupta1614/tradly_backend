import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// --- Import Routes ---
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import customerRouter from './routes/customer.routes.js';
import invoiceRouter from './routes/invoice.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import reportRouter from './routes/reports.routes.js';
import complaintRouter from './routes/complaint.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

// Imported faqs.json file
import faqs from "./data/faqs.json" with { type: "json" };
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

// --- Middleware ---
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan('dev')); // Logs requests to the console

app.use((req, res, next) => {
    const start = Date.now();
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress; 
    
    console.log(`\n============== [NEW REQUEST] ==============`);
    console.log(`🕒 Time: ${new Date().toISOString()}`);
    console.log(`🚀 Method: ${req.method} ${req.originalUrl}`);
    console.log(`📱 Device: ${userAgent}`);
    console.log(`🌍 IP: ${clientIp}`);
    console.log(`===========================================\n`);

    next();
});

// HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Tradly Server is Running!",
        status: "Active",
        time: new Date().toISOString()
    });
});

app.get("/api/v1/faqs", (req, res) => {
    return res.status(200).json(new ApiResponse(200, faqs, "FAQs fetched successfully"));
});

// --- API Routes ---
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/complaints", complaintRouter);

app.use(errorHandler);

export default app;