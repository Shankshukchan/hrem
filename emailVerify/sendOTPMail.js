import nodemailer from 'nodemailer'
import 'dotenv/config'

export const sendOTPMail = async (otp, email) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        const mailConfigurations = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Password Reset OTP</h2>
                    <p>Your OTP for password reset is:</p>
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #9333ea; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #999; font-size: 12px;">This OTP will expire in 10 minutes.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailConfigurations);
        console.log('OTP Sent Successfully');
        console.log(info);
        return info;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
}