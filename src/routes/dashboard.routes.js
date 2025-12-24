// routes/dashboard.routes.js
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { chatWithAI, getBusinessInsights } from "../controllers/ai.controller.js";

const router = Router();
router.use(verifyJWT);
router.route('/stats').get(getDashboardStats);
router.route("/ai-insights").get(getBusinessInsights);
router.route("/ai-chat").post(chatWithAI);

export default router;