import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"; // Reuse your existing multer
import { createComplaint, getMyComplaints } from "../controllers/complaint.controller.js";

const router = Router();

router.use(verifyJWT); // Protect all routes

router.route("/")
    .post(
        upload.single("image"), // Handle single file upload with field name 'image'
        createComplaint
    )
    .get(getMyComplaints);

export default router;