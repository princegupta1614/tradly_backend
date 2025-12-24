import { Router } from "express";
import {
  addProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Apply verifyJWT to all product routes automatically
router.use(verifyJWT);

router.route("/")
  .get(getMyProducts)
  .post(
    upload.fields([
      { name: "image", maxCount: 1 } // Expect a field named "image"
    ]),
    addProduct
  );

router.route("/:id")
  .get(getProductById)
  .patch(updateProduct)
  .delete(deleteProduct);

router.route("/:id")
  .get(getProductById)
  .delete(deleteProduct)
  .put(
    upload.fields([{ name: "image", maxCount: 1 }]),
    updateProduct
  );

export default router;