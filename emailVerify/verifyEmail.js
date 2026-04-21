import nodemailer from "nodemailer";
import "dotenv/config";

export const verifyEmail = async (token, email) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailConfigurations = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Email Verification",
      html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Email Verification</h2>
                    <p>Thank you for registering! Please click the link below to verify your email:</p>
                    <a href="${process.env.FRONTEND_URL}/verify/${token}" style="background-color: #9333ea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email
                    </a>
                    <p style="margin-top: 20px; color: #999; font-size: 12px;">Or copy this link: ${process.env.FRONTEND_URL || "http://localhost:5173"}/verify/${token}</p>
                </div>
            `,
    };

    const info = await transporter.sendMail(mailConfigurations);
    return info;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};
