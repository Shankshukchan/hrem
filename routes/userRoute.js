import express from "express";
import {
  allUser,
  changePassword,
  forgotPassword,
  getUserById,
  login,
  logout,
  register,
  reVerify,
  updateUser,
  verify,
  verifyOTP,
  deleteUser,
  deductCoins,
  refundCoins,
} from "../controllers/userController.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";
import { coinLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/reverify", reVerify);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp/:email", verifyOTP);
router.post("/change-password/:email", changePassword);
router.get("/all-user", isAuthenticated, isAdmin, allUser);
router.get("/get-user/:userId", getUserById);
router.put("/update/:userId", isAuthenticated, singleUpload, updateUser);
router.delete("/delete-user/:userId", isAuthenticated, isAdmin, deleteUser);
router.put(
  "/deduct-coins/:userId",
  isAuthenticated,
  isAdmin,
  coinLimiter,
  deductCoins,
);
router.put(
  "/refund-coins/:userId",
  isAuthenticated,
  isAdmin,
  coinLimiter,
  refundCoins,
);

export default router;
