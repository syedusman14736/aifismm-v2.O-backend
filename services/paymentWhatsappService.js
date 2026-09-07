import axios from "axios";

const sendPaymentNotification = async ({
    payment,
    user,
}) => {
    try {
        const apiVersion =
            process.env.WHATSAPP_API_VERSION;

        const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID;

        const accessToken =
            process.env.WHATSAPP_ACCESS_TOKEN;

        const templateName =
            process.env.WHATSAPP_PAYMENT_TEMPLATE;

        const adminWhatsapp =
            process.env.ADMIN_WHATSAPP_NUMBER;

        if (
            !apiVersion ||
            !phoneNumberId ||
            !accessToken ||
            !templateName ||
            !adminWhatsapp
        ) {
            console.error(
                "WhatsApp payment notification configuration is missing."
            );

            return {
                success: false,
                message:
                    "WhatsApp configuration is incomplete.",
            };
        }

        const url =
            `https://graph.facebook.com/${apiVersion}/` +
            `${phoneNumberId}/messages`;

        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",

                to: adminWhatsapp,

                type: "template",

                template: {
                    name: templateName,

                    language: {
                        code: "en",
                    },

                    components: [
                        // ==========================================
                        // BODY
                        // ==========================================

                        {
                            type: "body",

                            parameters: [
                                // {{1}} Customer
                                {
                                    type: "text",
                                    text:
                                        user.name ||
                                        user.username ||
                                        "User",
                                },

                                // {{2}} Amount
                                {
                                    type: "text",
                                    text: String(
                                        payment.amount
                                    ),
                                },

                                // {{3}} Transaction ID
                                {
                                    type: "text",
                                    text:
                                        payment.transactionId,
                                },
                            ],
                        },

                        // ==========================================
                        // APPROVE BUTTON
                        // ==========================================

                        {
                            type: "button",

                            sub_type: "quick_reply",

                            index: "0",

                            parameters: [
                                {
                                    type: "payload",

                                    payload:
                                        `approve_${payment._id}`,
                                },
                            ],
                        },

                        // ==========================================
                        // REJECT BUTTON
                        // ==========================================

                        {
                            type: "button",

                            sub_type: "quick_reply",

                            index: "1",

                            parameters: [
                                {
                                    type: "payload",

                                    payload:
                                        `reject_${payment._id}`,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json",
                },
            }
        );

        console.log(
            "Payment WhatsApp notification sent:",
            response.data
        );

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error(
            "Payment WhatsApp Notification Error:",
            error.response?.data ||
            error.message
        );

        return {
            success: false,
            message:
                error.response?.data?.error?.message ||
                error.message,
        };
    }
};

export default sendPaymentNotification;