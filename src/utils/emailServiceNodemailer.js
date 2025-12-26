import nodemailer from "nodemailer";

const sendEmailWithAttachment = async (to, subject, emailHtml, attachmentBuffer = null, filename = null) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        transporter.verify(function (error, success) {
            if (error) {
                console.log("❌ SMTP CONNECTION FAILED IMMEDIATELY:");
                console.log(error);
            } else {
                console.log("✅ SMTP SERVER IS READY TO TAKE MESSAGES");
            }
        });

        console.log("🔍 DEBUG ENV VARS:");
        console.log("User length:", process.env.BREVO_USER ? process.env.BREVO_USER.length : "UNDEFINED");
        console.log("Pass length:", process.env.BREVO_PASSWORD ? process.env.BREVO_PASSWORD.length : "UNDEFINED");

        const mailOptions = {
            from: `"Tradly Business" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: emailHtml,
        };

        if (attachmentBuffer && filename) {
            mailOptions.attachments = [
                {
                    filename: filename,
                    content: attachmentBuffer,
                    contentType: "application/pdf",
                },
            ];
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email. Check SMTP configuration.");
    }
};

export { sendEmailWithAttachment };