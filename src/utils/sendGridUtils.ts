import { config } from "../config/environment";
import SendGridClient from "@sendgrid/mail";
import ApiError from "./apiError";

SendGridClient.setApiKey(config.TWILIO_SENDGRID_API_KEY);

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const msg = {
    to: email,
    from: config.TWILIO_SENDGRID_FROM,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    html: `
        <div>
          <h3>Your OTP Code</h3>
          <p>Here is your OTP code: <strong>${otp}</strong></p>
          <p>It will expire in 10 minutes.</p>
        </div>
      `,
  };
  try {
    const res = await SendGridClient.send(msg);
  } catch (error) {
    throw new ApiError("Failed to send OTP email", 500);
  }
};

export default SendGridClient;
