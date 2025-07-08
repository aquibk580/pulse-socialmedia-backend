import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});
export const sendOtpEmail = async (to, otp) => {
    await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`,
    });
};
