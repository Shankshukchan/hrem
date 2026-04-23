import express from "express";
import {
  addProduct,
  deleteProduct,
  getAllProduct,
  updateProduct,
  getAllAdsForAdmin,
  getAdsByUser,
  approveAd,
  rejectAd,
  getUserAdsForDashboard,
} from "../controllers/productController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";
import { multipleUpload } from "../middleware/multer.js";
import { Product } from "../models/productModel.js";

const router = express.Router();

router.post("/add", isAuthenticated, multipleUpload, addProduct);
router.get("/getallproducts", getAllProduct);
router.delete("/delete/:productId", isAuthenticated, deleteProduct);
router.put(
  "/update/:productId",
  isAuthenticated,
  multipleUpload,
  updateProduct,
);

// Admin routes
router.get("/admin/all-ads", isAuthenticated, isAdmin, getAllAdsForAdmin);
router.get("/admin/user-ads/:userId", isAuthenticated, isAdmin, getAdsByUser);
router.put("/admin/approve/:adId", isAuthenticated, isAdmin, approveAd);
router.put("/admin/reject/:adId", isAuthenticated, isAdmin, rejectAd);

// User dashboard route
router.get("/user/my-ads", isAuthenticated, getUserAdsForDashboard);

router.get("/api/v1/product/city/:citySlug", async (req, res) => {
  try {
    const { citySlug } = req.params;
    const city = citySlug.replace(/-/g, " ").toLowerCase();

    const products = await Product.find({
      $or: [
        { city: { $regex: city, $options: "i" } },
        { location: { $regex: city, $options: "i" } },
      ],
    }).lean();

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
