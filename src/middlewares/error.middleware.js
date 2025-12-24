import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    // 1. If the error isn't an instance of ApiError, wrap it
    if (!(error instanceof ApiError)) {
        const statusCode =
            error.statusCode || error instanceof mongoose.Error ? 400 : 500;

        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], error.stack);
    }

    // 2. Format the response
    const response = {
        ...error,
        message: error.message,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
    };

    // 3. Send JSON response
    return res.status(error.statusCode).json(response);
};

export { errorHandler };