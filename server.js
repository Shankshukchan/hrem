import express, { urlencoded } from "express";
import "dotenv/config";
import connectDB from "./database/db.js";
import userRoute from "./routes/userRoute.js";
import productRoute from "./routes/productRoute.js";
import statesCitiesRoute from "./routes/statesCitiesRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import cors from "cors";
import { generalLimiter, authLimiter } from "./middleware/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Apply general rate limiter to all API routes
app.use("/api/v1/", generalLimiter);

// Apply stricter auth limiter to auth endpoints
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/user/forgot-password", authLimiter);
app.use("/api/v1/user/verify-otp", authLimiter);

app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/location", statesCitiesRoute);
app.use("/api/v1/payment", paymentRoute);
app.get("/cron-job", (req, res) => {
  console.log("✅ Cron job hit at:", new Date().toLocaleString());
  res.status(200).send("Cron job executed");
});

// http://localhost:8000/api/v1/user/register

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is listening at port:${PORT}`);
});
