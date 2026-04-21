import express from "express";
import {
  getUserCoins,
  createUnlimitPayment,
  verifyUnlimitPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createUnlimitedCoinsOrder,
  verifyUnlimitedCoins,
} from "../controllers/paymentController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Unlimit payment routes
router.post("/create-payment", isAuthenticated, createUnlimitPayment);
router.post("/verify-payment", isAuthenticated, verifyUnlimitPayment);

// Razorpay payment routes
router.post("/razorpay/create-order", isAuthenticated, createRazorpayOrder);
router.post("/razorpay/verify-payment", isAuthenticated, verifyRazorpayPayment);

// Razorpay unlimited coins routes
router.post(
  "/razorpay/create-unlimited-order",
  isAuthenticated,
  createUnlimitedCoinsOrder,
);
router.post(
  "/razorpay/verify-unlimited",
  isAuthenticated,
  verifyUnlimitedCoins,
);

// Get coins
router.get("/get-coins", isAuthenticated, getUserCoins);

export default router;
