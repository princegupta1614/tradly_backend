import { ApiError } from "./ApiError.js";

const sendEmailWithAttachment = async (to, subject, emailHtml, attachmentBuffer = null, filename = null) => {
    try {
        const url = "https://api.brevo.com/v3/smtp/email";

        const bodyData = {
            sender: {
                name: "Tradly Business",
                email: process.env.EMAIL_USER, 
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: emailHtml,
        };

        if (attachmentBuffer && filename) {
            const base64Content = Buffer.isBuffer(attachmentBuffer) 
                ? attachmentBuffer.toString('base64') 
                : attachmentBuffer;

            bodyData.attachment = [
                {
                    content: base64Content,
                    name: filename,
                }
            ];
        }

        const options = {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": process.env.BREVO_API_KEY, 
            },
            body: JSON.stringify(bodyData),
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new ApiError(500, `Email failed: ${errorData.message}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        throw new ApiError(500, error.message || "Failed to send email");
    }
};

export { sendEmailWithAttachment };