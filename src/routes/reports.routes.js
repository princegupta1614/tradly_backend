import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAnalytics } from "../controllers/reports.controller.js";

const router = Router();
router.use(verifyJWT);
router.get("/analytics", getAnalytics);

export default router;