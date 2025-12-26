export const sendOTP = async (email, otp) => {
  const url = "https://api.brevo.com/v3/smtp/email";
  
  const options = {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: "Tradly Support",
        email: process.env.EMAIL_USER,
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "Verify your Tradly Account",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Tradly!</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4f46e5; letter-spacing: 5px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    }),
  };

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Brevo API Error:", JSON.stringify(errorData, null, 2));
      throw new Error(`Email failed: ${errorData.message}`);
    }

    console.log("✅ Email sent successfully via Brevo API");
    
  } catch (error) {
    console.error("❌ Network/Server Error sending email:", error.message);
    throw error; 
  }
};