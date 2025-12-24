import dotenv from "dotenv";
import { sendEmail } from "./src/utils/emailService.js";

dotenv.config();

const test = async () => {
  console.log("Attempting to send email...");
  try {
    await sendEmail(
      process.env.EMAIL_USER, // Send to yourself
      "Test Email from Tradly",
      "If you are reading this, your Gmail SMTP is configured correctly!"
    );
    console.log("Success! Check your inbox.");
  } catch (error) {
    console.log("Failed:", error.message);
  }
};

test();