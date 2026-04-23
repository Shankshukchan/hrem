import { User } from "../models/userModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { calculateCoins } from "../utils/coinCalculator.js";

// Unlimit API configuration
const UNLIMIT_API_KEY = process.env.UNLIMIT_API_KEY;
const UNLIMIT_BASE_URL = "https://api.unlimit.com/api/v1";

// Razorpay configuration - lazy initialization
let razorpay = null;

const initializeRazorpay = () => {
  if (
    !razorpay &&
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  ) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// Get user coins
export const getUserCoins = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("coins");

    return res.status(200).json({
      success: true,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============== UNLIMIT PAYMENT GATEWAY ==============

// Create Unlimit payment link
export const createUnlimitPayment = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    const userId = req.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!UNLIMIT_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Unlimit payment gateway not configured",
      });
    }

    try {
      const response = await fetch(`${UNLIMIT_BASE_URL}/payment-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UNLIMIT_API_KEY}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to smallest currency unit
          currency: currency,
          description: `Buy Coins - User ${userId}`,
          reference_id: `coins_${userId}_${Date.now()}`,
          redirect_url: `${process.env.FRONTEND_URL || "http://localhost:5174"}/profile/coins?status=success`,
          failure_url: `${process.env.FRONTEND_URL || "http://localhost:5174"}/profile/coins?status=failed`,
          metadata: {
            userId: userId,
            type: "coin_purchase",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create payment link");
      }

      return res.status(200).json({
        success: true,
        message: "Payment link created successfully",
        paymentLink: data.url || data.id,
        paymentId: data.id,
        reference: data.reference_id,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create Unlimit payment",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify Unlimit payment webhook
export const verifyUnlimitPayment = async (req, res) => {
  try {
    const { paymentId, reference_id, amount, status } = req.body;

    if (!paymentId || !reference_id) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and reference ID required",
      });
    }

    if (!UNLIMIT_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Unlimit payment gateway not configured",
      });
    }

    // Verify with Unlimit API
    try {
      const response = await fetch(
        `${UNLIMIT_BASE_URL}/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${UNLIMIT_API_KEY}`,
          },
        },
      );

      const paymentData = await response.json();

      if (!response.ok) {
        throw new Error("Payment verification failed with Unlimit");
      }

      // Check if payment is successful
      if (
        paymentData.status !== "completed" &&
        paymentData.status !== "succeeded"
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment was not completed",
        });
      }

      // Extract userId from reference_id
      const userId = reference_id.split("_")[1];

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment reference",
        });
      }

      // Calculate coins with bonus packages
      const coinsData = calculateCoins(paymentData.amount);
      const { coins, bonus, baseCoins, isBonusPackage, amountInRupees } =
        coinsData;

      // Add coins to user
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: coins } },
        { new: true },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and coins added successfully",
        coins: user.coins,
        addedCoins: coins,
        baseCoins,
        bonus,
        isBonusPackage,
        payment: {
          id: paymentId,
          status: paymentData.status,
          amount: paymentData.amount,
          amountInRupees,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to verify payment with Unlimit",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============== RAZORPAY PAYMENT GATEWAY ==============

// Create Razorpay order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees
    const userId = req.id;

    console.log("===== CREATE RAZORPAY ORDER =====");
    console.log("User ID:", userId);
    console.log("Amount received:", amount);
    console.log("Request body:", req.body);

    if (!amount || amount <= 0) {
      console.log("Invalid amount:", amount);
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log("Razorpay credentials missing");
      return res.status(503).json({
        success: false,
        message: "Razorpay payment gateway not configured",
      });
    }

    try {
      // Generate a receipt that's under 40 characters (Razorpay limit)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const userIdShort = userId.toString().slice(-8); // Last 8 chars of userId
      const receipt = `coins_${userIdShort}_${timestamp}`.slice(0, 40);

      const options = {
        amount: Math.round(amount * 100), // Convert to paise (1 rupee = 100 paise)
        currency: "INR",
        receipt: receipt,
        notes: {
          userId: userId,
          type: "coin_purchase",
        },
      };

      console.log("Razorpay order options:", options);
      console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
      console.log(
        "RAZORPAY_KEY_SECRET exists:",
        !!process.env.RAZORPAY_KEY_SECRET,
      );

      const rzp = initializeRazorpay();
      console.log("Razorpay instance:", rzp);
      if (!rzp) {
        console.log("Razorpay not initialized");
        return res.status(503).json({
          success: false,
          message: "Razorpay payment gateway not configured",
        });
      }

      const order = await rzp.orders.create(options);
      console.log("Order created successfully:", order.id);

      return res.status(200).json({
        success: true,
        message: "Order created successfully",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Error creating order - Full error object:", error);
      console.error("Error message:", error.message);
      console.error("Error body:", error.response?.body);
      console.error("Error status:", error.response?.statusCode);

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          error.error?.description ||
          "Failed to create Razorpay order",
      });
    }
  } catch (error) {
    console.log("Unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const userId = req.id;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Payment ID, and Signature are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay payment gateway not configured",
      });
    }

    try {
      // Verify signature
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (signature !== generatedSignature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed - invalid signature",
        });
      }

      // Fetch payment details from Razorpay
      const rzp = initializeRazorpay();
      if (!rzp) {
        return res.status(503).json({
          success: false,
          message: "Razorpay payment gateway not configured",
        });
      }

      const payment = await rzp.payments.fetch(paymentId);

      if (payment.status !== "captured" && payment.status !== "authorized") {
        return res.status(400).json({
          success: false,
          message: "Payment was not successful",
        });
      }

      // Calculate coins with bonus packages
      const coinsData = calculateCoins(payment.amount);
      const { coins, bonus, baseCoins, isBonusPackage, amountInRupees } =
        coinsData;

      // Add coins to user account
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: coins } },
        { new: true },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and coins added successfully",
        coins: user.coins,
        addedCoins: coins,
        baseCoins,
        bonus,
        isBonusPackage,
        payment: {
          id: paymentId,
          status: payment.status,
          amount: payment.amount,
          amountInRupees,
          orderId: orderId,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to verify payment with Razorpay",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Razorpay unlimited coins (one-time purchase)
export const createUnlimitedCoinsOrder = async (req, res) => {
  try {
    const userId = req.id;
    const UNLIMITED_PRICE = 9999; // Unlimited coins at fixed price

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay payment gateway not configured",
      });
    }

    try {
      // Generate a receipt that's under 40 characters (Razorpay limit)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const userIdShort = userId.toString().slice(-8); // Last 8 chars of userId
      const receipt = `unlim_${userIdShort}_${timestamp}`.slice(0, 40);

      const options = {
        amount: Math.round(UNLIMITED_PRICE * 100), // in paise
        currency: "INR",
        receipt: receipt,
        notes: {
          userId: userId,
          type: "unlimited_coins",
        },
      };

      const rzp = initializeRazorpay();
      if (!rzp) {
        return res.status(503).json({
          success: false,
          message: "Razorpay payment gateway not configured",
        });
      }

      const order = await rzp.orders.create(options);

      return res.status(200).json({
        success: true,
        message: "Unlimited coins order created successfully",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        price: UNLIMITED_PRICE,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create Razorpay order",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify unlimited coins purchase
export const verifyUnlimitedCoins = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const userId = req.id;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Payment ID, and Signature are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay payment gateway not configured",
      });
    }

    try {
      // Verify signature
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (signature !== generatedSignature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed - invalid signature",
        });
      }

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);

      if (payment.status !== "captured" && payment.status !== "authorized") {
        return res.status(400).json({
          success: false,
          message: "Payment was not successful",
        });
      }

      // Set unlimited coins (9999 as unlimited marker)
      const user = await User.findByIdAndUpdate(
        userId,
        { coins: 999999 }, // Set to very high number for unlimited
        { new: true },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Unlimited coins activated successfully",
        coins: user.coins,
        unlimitedCoins: true,
        payment: {
          id: paymentId,
          status: payment.status,
          amount: payment.amount,
          orderId: orderId,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to verify unlimited coins payment",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
