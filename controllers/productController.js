import { Product } from "../models/productModel.js";
import { User } from "../models/userModel.js";
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/dataUri.js";
import {
  sendAdApprovalMail,
  sendAdRejectionMail,
} from "../emailVerify/sendAdStatusMail.js";

export const addProduct = async (req, res) => {
  try {
    console.log("📥 addProduct called");
    console.log("Body:", req.body);
    console.log("Files:", req.files ? `${req.files.length} files` : "no files");
    console.log("User ID:", req.id);

    let {
      title,
      whatsapp,
      contact,
      gender,
      services,
      category,
      state,
      city,
      location,
      age,
      about,
      terms,
      adType = "free",
    } = req.body;

    // Convert age to number
    age = parseInt(age);

    const userId = req.id;

    console.log(
      "📋 Extracted fields - title:",
      title,
      "adType:",
      adType,
      "age:",
      age,
    );

    if (
      !title ||
      !whatsapp ||
      !contact ||
      !gender ||
      !services ||
      !category ||
      !state ||
      !city ||
      !age ||
      !about ||
      !terms
    ) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Coin costs for ad types
    const coinCosts = {
      free: 0,
      golden: 100,
      premium: 200,
    };

    const coinsNeeded = coinCosts[adType] || 0;

    // Check if user has enough coins for paid ads
    if (adType !== "free") {
      console.log("💰 Checking coins for", adType, "ad");
      const user = await User.findById(userId);

      if (user.coins < coinsNeeded) {
        return res.status(400).json({
          success: false,
          message: `Insufficient coins. You need ${coinsNeeded} coins for a ${adType} ad. You have ${user.coins} coins.`,
        });
      }
    }

    // Handle multiple image uploads FIRST (before deducting coins)
    console.log("📸 Processing", req.files?.length || 0, "images");
    let productImg = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        try {
          console.log("⬆️ Uploading file:", file.originalname);
          const fileUri = getDataUri(file);
          const result = await cloudinary.uploader.upload(fileUri, {
            folder: "mern_products",
            quality: "auto",
            fetch_format: "auto",
            transformation: [
              {
                width: 500,
                height: 500,
                crop: "fill",
                gravity: "auto",
              },
              {
                overlay: {
                  font_family: "arial",
                  font_size: 30,
                  text: "HireMyEscort.com",
                },
                color: "ffffff",
                gravity: "south",
                y: 10,
              },
            ],
          });

          console.log("✅ Image uploaded:", result.public_id);
          productImg.push({
            url: result.secure_url,
            public_id: result.public_id,
          });
        } catch (uploadError) {
          console.error("❌ Cloudinary upload error:", uploadError.message);
          throw uploadError;
        }
      }
    }

    // NOW deduct coins ONLY after successful image upload
    let updatedUser = null;
    if (adType !== "free") {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: -coinsNeeded } },
        { new: true },
      );

      // Send email to user about coin deduction
      try {
        const user = await User.findById(userId);
        if (user && user.email) {
          const nodemailer = require("nodemailer");
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASS,
            },
          });

          const mailConfigurations = {
            from: process.env.MAIL_USER,
            to: user.email,
            subject: "Coins Deducted - Advertisement Posted",
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <h2 style="color: #9333ea; margin-bottom: 20px;">💰 Coins Deducted</h2>
                      <p style="color: #333; font-size: 16px; line-height: 1.6;">
                          Your advertisement has been successfully uploaded. The following coins have been deducted from your account:
                      </p>
                      <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #9333ea; margin: 20px 0;">
                          <p style="margin: 5px 0; color: #555;"><strong>Ad Type:</strong> ${adType}</p>
                          <p style="margin: 5px 0; color: #555;"><strong>Coins Deducted:</strong> ${coinsNeeded}</p>
                          <p style="margin: 5px 0; color: #555;"><strong>Your Remaining Coins:</strong> ${updatedUser?.coins || 0}</p>
                      </div>
                      <p style="color: #333; font-size: 16px; line-height: 1.6;">
                          Your ad is currently under review. You will receive another email once it is approved or rejected.
                      </p>
                      <div style="text-align: center; margin-top: 30px;">
                          <a href="${process.env.FRONTEND_URL || "https://hiremyescort.com"}/dashboard" style="background-color: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
                      </div>
                      <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                          If you have any questions, please contact our support team.
                      </p>
                  </div>
              </div>
            `,
          };

          await transporter.sendMail(mailConfigurations);
        }
      } catch (emailError) {
        console.error("Failed to send coin deduction email:", emailError);
        // Continue anyway - don't fail the upload if email fails
      }
    }

    // create a product in DB
    console.log("💾 Creating product in database");
    const newProduct = await Product.create({
      userId,
      title,
      whatsapp,
      contact,
      gender,
      services,
      category,
      state,
      city,
      location,
      age,
      about,
      terms,
      adType,
      productImg,
    });

    console.log("✅ Product created:", newProduct._id);
    return res.status(200).json({
      success: true,
      message: "Advertisement added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("❌ addProduct error:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add advertisement",
      errorType: error.name,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllProduct = async (_, res) => {
  try {
    // Fetch all approved products
    const products = await Product.find({ status: "approved" }).lean().exec();

    if (!products) {
      return res.status(404).json({
        success: false,
        message: "No advertisement available",
        products: [],
      });
    }

    // Sort products by type (premium -> golden -> free) then by creation date
    const typeOrder = { premium: 0, golden: 1, free: 2 };
    products.sort((a, b) => {
      const typeA = typeOrder[a.adType] !== undefined ? typeOrder[a.adType] : 2;
      const typeB = typeOrder[b.adType] !== undefined ? typeOrder[b.adType] : 2;

      if (typeA !== typeB) {
        return typeA - typeB;
      }
      // If same type, sort by newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.id;
    const userRole = req.user?.role;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check ownership - only owner or admin can delete
    const isOwner = product.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this product",
      });
    }

    // Delete images from cloudinary
    if (product.productImg && product.productImg.length > 0) {
      for (let img of product.productImg) {
        const result = await cloudinary.uploader.destroy(img.public_id);
      }
    }

    // Delete product from MongoDB
    await Product.findByIdAndDelete(productId);
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      title,
      whatsapp,
      contact,
      gender,
      services,
      category,
      state,
      city,
      location,
      age,
      about,
      terms,
      adType,
      existingImages,
    } = req.body;
    const userId = req.id;
    const userRole = req.user?.role;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check ownership - only owner or admin can update
    const isOwner = product.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this product",
      });
    }

    // Handle coin deduction
    const coinCosts = {
      free: 0,
      golden: 100,
      premium: 200,
    };

    // Check if this is a resubmission of a rejected or approved ad
    const isResubmission =
      product.status === "rejected" || product.status === "approved";
    const currentAdType = adType || product.adType;
    const coinsNeeded = coinCosts[currentAdType] || 0;

    // Deduct coins if:
    // 1. Ad type is changed to a paid type, OR
    // 2. Resubmitting a rejected/approved paid ad
    if (coinsNeeded > 0 && (adType !== product.adType || isResubmission)) {
      const user = await User.findById(userId);

      if (user.coins < coinsNeeded) {
        return res.status(400).json({
          success: false,
          message: `Insufficient coins. You need ${coinsNeeded} coins for a ${currentAdType} ad. You have ${user.coins} coins.`,
        });
      }

      // Deduct coins from user account
      await User.findByIdAndUpdate(userId, {
        $inc: { coins: -coinsNeeded },
      });

      console.log(
        `✅ Deducted ${coinsNeeded} coins from user ${userId} on ad resubmission. Ad status was: ${product.status}`,
      );
    }

    let updatedImages = [];

    // keep selected old Images
    if (existingImages) {
      const keepIds = JSON.parse(existingImages);
      updatedImages = product.productImg.filter((img) =>
        keepIds.includes(img.public_id),
      );

      // delete only removed images
      const removeImages = product.productImg.filter(
        (img) => !keepIds.includes(img.public_id),
      );
      for (let img of removeImages) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    } else {
      updatedImages = product.productImg; //keep all if nothing sent
    }

    // upload new images if any
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const fileUri = getDataUri(file);
        const result = await cloudinary.uploader.upload(fileUri, {
          folder: "mern_products",
          quality: "auto",
          fetch_format: "auto",
          transformation: [
            {
              width: 500,
              height: 500,
              crop: "fill",
              gravity: "auto",
            },
            {
              overlay: {
                font_family: "arial",
                font_size: 30,
                text: "HireMyEscort.com",
              },
              color: "ffffff",
              gravity: "south",
              y: 10,
            },
          ],
        });
        updatedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }

    // update product
    product.title = title || product.title;
    product.whatsapp = whatsapp || product.whatsapp;
    product.contact = contact || product.contact;
    product.gender = gender || product.gender;
    product.services = services || product.services;
    product.category = category || product.category;
    product.state = state || product.state;
    product.city = city || product.city;
    product.location = location || product.location;
    product.age = age || product.age;
    product.about = about || product.about;
    product.terms = terms || product.terms;
    product.adType = adType || product.adType;
    product.productImg = updatedImages;

    // Always reset status to pending when ad is updated
    product.status = "pending";

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin functions
export const getAllAdsForAdmin = async (req, res) => {
  try {
    const allAds = await Product.find()
      .populate({
        path: "userId",
        select: "firstName lastName email phoneNo city state",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All advertisements fetched",
      ads: allAds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const userAds = await Product.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "User advertisements fetched",
      ads: userAds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveAd = async (req, res) => {
  try {
    const { adId } = req.params;

    // Fetch the ad to check its current status and type
    const ad = await Product.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Coin costs for ad types
    const coinCosts = {
      free: 0,
      golden: 100,
      premium: 200,
    };

    // If re-approving a rejected ad, deduct coins
    const isReApproval = ad.status === "rejected";
    const requiredCoins = isReApproval ? coinCosts[ad.adType] || 0 : 0;

    if (isReApproval && requiredCoins > 0) {
      // Fetch user to check coin balance
      const user = await User.findById(ad.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user has enough coins
      if (user.coins < requiredCoins) {
        return res.status(400).json({
          success: false,
          message: `Insufficient coins. User has ${user.coins} coins but ${requiredCoins} required to re-approve this ${ad.adType} ad`,
          userCoins: user.coins,
          requiredCoins: requiredCoins,
        });
      }

      // Deduct coins from user
      user.coins -= requiredCoins;
      await user.save();
      console.log(
        `✅ Deducted ${requiredCoins} coins from user ${ad.userId} on re-approval. New balance: ${user.coins}`,
      );
    }

    // Update ad status
    const updatedAd = await Product.findByIdAndUpdate(
      adId,
      { status: "approved", rejectReason: "" },
      { new: true },
    );

    // Fetch user details to get email
    const user = await User.findById(ad.userId);
    if (user && user.email) {
      try {
        const message = isReApproval
          ? `Your advertisement "${ad.title}" has been re-approved after rejection.`
          : `Your advertisement "${ad.title}" has been approved.`;
        await sendAdApprovalMail(user.email, ad.title, ad._id.toString());
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Continue anyway - don't fail the approval if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: isReApproval
        ? `Advertisement re-approved successfully and ${requiredCoins} coins deducted`
        : "Advertisement approved successfully",
      ad: updatedAd,
      coinsDeducted: requiredCoins,
    });
  } catch (error) {
    console.error("Error in approveAd:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const rejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;

    // Fetch the ad first to check if it's a paid ad
    const ad = await Product.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Check if this ad has already been rejected with refund
    if (ad.status === "rejected" && ad.coinsRefunded) {
      // Ad already rejected and coins already refunded, no need to refund again
      return res.status(200).json({
        success: true,
        message:
          "Advertisement already rejected. Coins were previously refunded.",
        ad: ad,
        refundedCoins: 0,
      });
    }

    // Refund coins if ad is paid (golden or premium)
    const coinCosts = {
      free: 0,
      golden: 100,
      premium: 200,
    };

    const refundAmount = coinCosts[ad.adType] || 0;
    let updatedUser = null;
    let refundedAmount = 0;

    if (refundAmount > 0) {
      // Refund coins to user
      updatedUser = await User.findByIdAndUpdate(
        ad.userId,
        { $inc: { coins: refundAmount } },
        { new: true },
      );
      refundedAmount = refundAmount;
    }

    // Get user for email
    if (!updatedUser) {
      updatedUser = await User.findById(ad.userId);
    }

    // Reject the ad and mark coins as refunded (once)
    const updatedAd = await Product.findByIdAndUpdate(
      adId,
      {
        status: "rejected",
        rejectReason: reason || "",
        coinsRefunded: refundAmount > 0 ? true : false,
      },
      { new: true },
    );

    // Send rejection email to user with refund information
    const user = await User.findById(ad.userId);
    if (user && user.email) {
      try {
        const remainingCoins = updatedUser
          ? updatedUser.coins
          : user
            ? user.coins
            : 0;
        await sendAdRejectionMail(
          user.email,
          ad.title,
          ad._id.toString(),
          reason || "",
          refundedAmount,
          remainingCoins,
        );
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Continue anyway - don't fail the rejection if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: `Advertisement rejected successfully${refundedAmount > 0 ? ` and ${refundedAmount} coins refunded to user` : ""}`,
      ad: updatedAd,
      refundedCoins: refundedAmount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserAdsForDashboard = async (req, res) => {
  try {
    const userId = req.id;

    const userAds = await Product.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "User advertisements fetched",
      ads: userAds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
