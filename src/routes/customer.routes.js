import { Router } from "express";
import { 
    addCustomer, 
    getMyCustomers, 
    getCustomerById, 
    updateCustomer, 
    deleteCustomer 
} from "../controllers/customer.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Protect all routes

router.route("/")
    .get(getMyCustomers)
    .post(addCustomer);

router.route("/:id")
    .get(getCustomerById)
    .patch(updateCustomer)
    .delete(deleteCustomer);

export default router;