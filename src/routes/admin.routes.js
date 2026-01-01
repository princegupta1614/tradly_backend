import { Router } from "express";
import { loginAdmin, getAllUsers, deleteUser, getAllComplaints, resolveComplaint, logoutAdmin } from "../controllers/admin.controller.js";
import { verifyAdmin } from "../middlewares/admin.auth.js";

const router = Router();

// Public Route
router.post("/login", loginAdmin);

// Protected Routes
router.get("/users", verifyAdmin, getAllUsers);
router.delete("/users/:id", verifyAdmin, deleteUser);

router.get("/complaints", verifyAdmin, getAllComplaints);
router.put("/complaints/:complaintId/resolve", verifyAdmin, resolveComplaint);
router.post("/logout", verifyAdmin, logoutAdmin);

export default router;