import { Router } from "express";
import { 
    createInvoice, 
    getMyInvoices, 
    getInvoiceById, 
    updateInvoiceStatus, 
    sendInvoiceReminder,
    downloadInvoice, 
    viewInvoice
} from "../controllers/invoice.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/")
    .post(createInvoice)
    .get(getMyInvoices);

router.route("/:id")
    .get(getInvoiceById)
    .patch(updateInvoiceStatus);

router.route("/:id/send").post(sendInvoiceReminder);
router.route("/:id/download").get(downloadInvoice);
router.route("/:id/view").get(viewInvoice);

export default router;