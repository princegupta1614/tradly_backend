import nodemailer from "nodemailer";


export const sendOTP = async (email, otp) => {
  // Configure Transport (Use environment variables for security)
  // const transporter = nodemailer.createTransport({
  //   service: "gmail", // Or your SMTP provider
  //   auth: {
  //     user: process.env.EMAIL_USER, // Your Email
  //     pass: process.env.EMAIL_PASS, // Your App Password
  //   },
  // });

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASSWORD, 
    },
    tls: {
        rejectUnauthorized: false,
    },
    family: 4
  });

  const mailOptions = {
    from: `"Tradly Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your Tradly Account",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Tradly!</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #4f46e5; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};