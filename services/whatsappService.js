import axios from "axios";

const sendWhatsappOtp = async (phoneNumber, otp) => {
    try {
        const url = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: process.env.WHATSAPP_OTP_TEMPLATE,
                    language: {
                        code: "en_US",
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: otp,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(
            "✅ WhatsApp OTP sent:",
            response.data.messages?.[0]?.id
        );

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error(
            "❌ WhatsApp OTP Error:",
            error.response?.data || error.message
        );

        return {
            success: false,
            error:
                error.response?.data ||
                error.message,
        };
    }
};

export default sendWhatsappOtp;