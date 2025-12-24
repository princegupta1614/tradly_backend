import nodemailer from "nodemailer";

/**
 * Send an email with optional PDF attachment
 */
const sendEmailWithAttachment = async (to, subject, emailHtml, attachmentBuffer = null, filename = null) => {
    try {
        // const transporter = nodemailer.createTransport({
        //     service: "gmail",
        //     auth: {
        //         user: process.env.EMAIL_USER,
        //         pass: process.env.EMAIL_PASS,
        //     },
        // });


        // using Brevo for production email sender.
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.USER,
                pass: process.env.PASSWORD,
            },
        });

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