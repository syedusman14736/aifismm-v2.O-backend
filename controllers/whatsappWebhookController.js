import crypto from "crypto";

import {
    approvePaymentById,
    rejectPaymentById,
} from "../services/paymentApprovalService.js";


// ==========================================
// ENVIRONMENT
// ==========================================

const WHATSAPP_VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN;

const WHATSAPP_APP_SECRET =
    process.env.WHATSAPP_APP_SECRET;

const ADMIN_WHATSAPP_NUMBER =
    String(
        process.env.ADMIN_WHATSAPP_NUMBER || ""
    )
        .replace(/\D/g, "");

const WHATSAPP_PHONE_NUMBER_ID =
    String(
        process.env.WHATSAPP_PHONE_NUMBER_ID || ""
    );


// ==========================================
// VERIFY META WEBHOOK
// ==========================================

export const verifyWhatsAppWebhook = (
    req,
    res
) => {



    const mode =
        req.query["hub.mode"];

    const token =
        req.query["hub.verify_token"];

    const challenge =
        req.query["hub.challenge"];



    if (
        mode === "subscribe" &&
        token === WHATSAPP_VERIFY_TOKEN
    ) {

        return res
            .status(200)
            .send(challenge);
    }


    console.error(
        "❌ WhatsApp webhook verification failed."
    );


    return res
        .sendStatus(403);
};


// ==========================================
// VERIFY WEBHOOK SIGNATURE
// ==========================================

const verifySignature = (
    req
) => {
    try {
        if (!WHATSAPP_APP_SECRET) {
            console.error(
                "❌ WHATSAPP_APP_SECRET is missing."
            );

            return false;
        }


        if (!req.rawBody) {
            console.error(
                "❌ rawBody is missing."
            );

            return false;
        }


        const signature =
            req.headers[
            "x-hub-signature-256"
            ];


        if (!signature) {
            console.error(
                "❌ x-hub-signature-256 header missing."
            );

            return false;
        }


        const expectedSignature =
            "sha256=" +
            crypto
                .createHmac(
                    "sha256",
                    WHATSAPP_APP_SECRET
                )
                .update(req.rawBody)
                .digest("hex");


        const signatureBuffer =
            Buffer.from(signature);

        const expectedBuffer =
            Buffer.from(
                expectedSignature
            );


        if (
            signatureBuffer.length !==
            expectedBuffer.length
        ) {
            console.error(
                "❌ Invalid signature length."
            );

            return false;
        }


        const isValid =
            crypto.timingSafeEqual(
                signatureBuffer,
                expectedBuffer
            );


        if (!isValid) {
            console.error(
                "❌ Invalid WhatsApp webhook signature."
            );
        }
        else {
            console.log(
                "✅ WhatsApp webhook signature verified."
            );
        }


        return isValid;
    }
    catch (error) {
        console.error(
            "❌ Signature verification error:",
            error
        );

        return false;
    }
};


// ==========================================
// NORMALIZE PHONE NUMBER
// ==========================================

const normalizePhoneNumber = (
    value
) => {
    return String(
        value || ""
    )
        .replace(/\D/g, "");
};


// ==========================================
// GET MESSAGE SENDER
// ==========================================

const getSenderNumber = (
    message
) => {
    return normalizePhoneNumber(
        message?.from
    );
};


// ==========================================
// GET PHONE NUMBER ID
// ==========================================

const getPhoneNumberId = (
    value
) => {
    return String(
        value || ""
    );
};


// ==========================================
// HANDLE WHATSAPP WEBHOOK
// ==========================================

export const handleWhatsAppWebhook = async (
    req,
    res
) => {
    console.log(
        "\n\n=========================================="
    );

    console.log(
        "📱📱📱 WHATSAPP WEBHOOK RECEIVED 📱📱📱"
    );

    console.log(
        "=========================================="
    );


    try {
        // ==========================================
        // LOG REQUEST
        // ==========================================

        console.log(
            "📱 HTTP METHOD:",
            req.method
        );

        console.log(
            "📱 REQUEST URL:",
            req.originalUrl
        );

        console.log(
            "📱 HAS RAW BODY:",
            Boolean(req.rawBody)
        );

        console.log(
            "📱 HAS BODY:",
            Boolean(req.body)
        );


        // ==========================================
        // VERIFY SIGNATURE
        // ==========================================

        const signatureValid =
            verifySignature(req);


        if (!signatureValid) {
            console.error(
                "❌ Rejecting webhook because signature is invalid."
            );

            return res
                .sendStatus(403);
        }


        // ==========================================
        // LOG BODY
        // ==========================================

        console.log(
            "\n📱 WEBHOOK BODY:"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );


        // ==========================================
        // BASIC META STRUCTURE CHECK
        // ==========================================

        const body =
            req.body;


        if (
            !body ||
            body.object !== "whatsapp_business_account"
        ) {
            console.log(
                "ℹ️ Ignoring non-WhatsApp webhook."
            );

            return res
                .sendStatus(200);
        }


        const entries =
            Array.isArray(body.entry)
                ? body.entry
                : [];


        console.log(
            "📱 Entries:",
            entries.length
        );


        // ==========================================
        // PROCESS ENTRIES
        // ==========================================

        for (
            const entry of entries
        ) {
            const changes =
                Array.isArray(
                    entry.changes
                )
                    ? entry.changes
                    : [];


            for (
                const change of changes
            ) {
                const value =
                    change.value;


                if (!value) {
                    continue;
                }


                // ==========================================
                // VERIFY PHONE NUMBER ID
                // ==========================================

                const metadataPhoneId =
                    getPhoneNumberId(
                        value?.metadata
                            ?.phone_number_id
                    );


                console.log(
                    "\n📱 META PHONE NUMBER ID:",
                    metadataPhoneId
                );

                console.log(
                    "📱 CONFIGURED PHONE NUMBER ID:",
                    WHATSAPP_PHONE_NUMBER_ID
                );


                if (
                    WHATSAPP_PHONE_NUMBER_ID &&
                    metadataPhoneId !==
                    WHATSAPP_PHONE_NUMBER_ID
                ) {
                    console.error(
                        "❌ Phone number ID mismatch."
                    );

                    continue;
                }


                // ==========================================
                // GET MESSAGES
                // ==========================================

                const messages =
                    Array.isArray(
                        value.messages
                    )
                        ? value.messages
                        : [];


                console.log(
                    "📱 MESSAGES RECEIVED:",
                    messages.length
                );


                for (
                    const message of messages
                ) {
                    console.log(
                        "\n------------------------------------------"
                    );

                    console.log(
                        "📩 PROCESSING MESSAGE"
                    );

                    console.log(
                        "------------------------------------------"
                    );


                    console.log(
                        "📱 Message ID:",
                        message.id
                    );

                    console.log(
                        "📱 Message type:",
                        message.type
                    );

                    console.log(
                        "📱 Sender:",
                        message.from
                    );


                    // ==========================================
                    // VERIFY ADMIN SENDER
                    // ==========================================

                    const senderNumber =
                        getSenderNumber(
                            message
                        );


                    console.log(
                        "📱 NORMALIZED SENDER:",
                        senderNumber
                    );

                    console.log(
                        "📱 CONFIGURED ADMIN:",
                        ADMIN_WHATSAPP_NUMBER
                    );


                    if (
                        ADMIN_WHATSAPP_NUMBER &&
                        senderNumber !==
                        ADMIN_WHATSAPP_NUMBER
                    ) {
                        console.error(
                            "❌ Message ignored: sender is not the configured admin number."
                        );

                        continue;
                    }


                    // ==========================================
                    // EXTRACT BUTTON PAYLOAD
                    // ==========================================

                    let buttonPayload =
                        null;


                    // ==========================================
                    // LEGACY BUTTON MESSAGE
                    // ==========================================

                    if (
                        message.type ===
                        "button"
                    ) {
                        buttonPayload =
                            message.button
                                ?.payload ||
                            null;


                        console.log(
                            "📱 LEGACY BUTTON PAYLOAD:",
                            buttonPayload
                        );
                    }


                    // ==========================================
                    // INTERACTIVE BUTTON REPLY
                    // ==========================================

                    if (
                        message.type ===
                        "interactive"
                    ) {
                        const interactive =
                            message.interactive;


                        console.log(
                            "📱 INTERACTIVE TYPE:",
                            interactive?.type
                        );


                        if (
                            interactive?.type ===
                            "button_reply"
                        ) {
                            buttonPayload =
                                interactive
                                    ?.button_reply
                                    ?.id ||
                                interactive
                                    ?.button_reply
                                    ?.payload ||
                                null;


                            console.log(
                                "📱 INTERACTIVE BUTTON ID:",
                                interactive
                                    ?.button_reply
                                    ?.id
                            );

                            console.log(
                                "📱 INTERACTIVE BUTTON TITLE:",
                                interactive
                                    ?.button_reply
                                    ?.title
                            );

                            console.log(
                                "📱 INTERACTIVE BUTTON PAYLOAD:",
                                buttonPayload
                            );
                        }
                    }


                    // ==========================================
                    // NO BUTTON
                    // ==========================================

                    if (
                        !buttonPayload
                    ) {
                        console.log(
                            "ℹ️ No approval/rejection button payload found."
                        );

                        continue;
                    }


                    console.log(
                        "\n🔥🔥🔥 BUTTON PAYLOAD FOUND 🔥🔥🔥"
                    );

                    console.log(
                        "🔥 BUTTON PAYLOAD:",
                        buttonPayload
                    );


                    // ==========================================
                    // APPROVE PAYMENT
                    // ==========================================

                    if (
                        String(
                            buttonPayload
                        ).startsWith(
                            "approve_"
                        )
                    ) {
                        const paymentId =
                            String(
                                buttonPayload
                            ).replace(
                                "approve_",
                                ""
                            );


                        console.log(
                            "\n=========================================="
                        );

                        console.log(
                            "💰💰💰 APPROVE BUTTON PRESSED 💰💰💰"
                        );

                        console.log(
                            "=========================================="
                        );

                        console.log(
                            "💰 PAYMENT ID:",
                            paymentId
                        );

                        console.log(
                            "💰 ADMIN ID:",
                            null
                        );


                        if (!paymentId) {
                            console.error(
                                "❌ Payment ID missing."
                            );

                            continue;
                        }


                        // ==========================================
                        // CALL APPROVAL SERVICE
                        // ==========================================

                        console.log(
                            "🔥 CALLING approvePaymentById()..."
                        );


                        const result =
                            await approvePaymentById({
                                paymentId,
                                adminId: null,
                            });


                        // ==========================================
                        // LOG RESULT
                        // ==========================================

                        console.log(
                            "\n🔥 APPROVAL SERVICE RESULT:"
                        );

                        console.log(
                            JSON.stringify(
                                result,
                                null,
                                2
                            )
                        );


                        if (
                            result.success
                        ) {
                            console.log(
                                "✅✅ PAYMENT APPROVED VIA WHATSAPP"
                            );

                            console.log(
                                "💰 CREDITED AMOUNT:",
                                result.creditedAmount
                            );

                            console.log(
                                "💰 CREDITED CURRENCY:",
                                result.creditedCurrency
                            );

                            console.log(
                                "💰 EXCHANGE RATE:",
                                result.exchangeRate
                            );

                            console.log(
                                "💰 USER BALANCE:",
                                result.balance
                            );
                        }
                        else {
                            console.error(
                                "❌ PAYMENT APPROVAL FAILED:",
                                result.message
                            );
                        }


                        continue;
                    }


                    // ==========================================
                    // REJECT PAYMENT
                    // ==========================================

                    if (
                        String(
                            buttonPayload
                        ).startsWith(
                            "reject_"
                        )
                    ) {
                        const paymentId =
                            String(
                                buttonPayload
                            ).replace(
                                "reject_",
                                ""
                            );


                        console.log(
                            "\n=========================================="
                        );

                        console.log(
                            "❌❌❌ REJECT BUTTON PRESSED ❌❌❌"
                        );

                        console.log(
                            "=========================================="
                        );

                        console.log(
                            "❌ PAYMENT ID:",
                            paymentId
                        );


                        if (!paymentId) {
                            console.error(
                                "❌ Payment ID missing."
                            );

                            continue;
                        }


                        console.log(
                            "❌ CALLING rejectPaymentById()..."
                        );


                        const result =
                            await rejectPaymentById({
                                paymentId,
                                adminId: null,
                                rejectionReason:
                                    "Rejected via WhatsApp.",
                            });


                        console.log(
                            "\n❌ REJECTION SERVICE RESULT:"
                        );

                        console.log(
                            JSON.stringify(
                                result,
                                null,
                                2
                            )
                        );


                        if (
                            result.success
                        ) {
                            console.log(
                                "✅ PAYMENT REJECTED VIA WHATSAPP"
                            );
                        }
                        else {
                            console.error(
                                "❌ PAYMENT REJECTION FAILED:",
                                result.message
                            );
                        }


                        continue;
                    }


                    // ==========================================
                    // UNKNOWN BUTTON
                    // ==========================================

                    console.log(
                        "ℹ️ Unknown button payload:",
                        buttonPayload
                    );
                }
            }
        }


        // ==========================================
        // ALWAYS ACKNOWLEDGE META
        // ==========================================

        console.log(
            "\n📱 Webhook processing finished."
        );

        console.log(
            "📱 Sending HTTP 200 to Meta."
        );


        return res
            .sendStatus(200);
    }


    // ==========================================
    // ERROR
    // ==========================================

    catch (error) {
        console.error(
            "\n❌❌❌ WHATSAPP WEBHOOK ERROR ❌❌❌"
        );

        console.error(
            error
        );


        // Meta expects a response.
        // We still return 200 to avoid
        // unnecessary repeated webhook delivery.
        return res
            .sendStatus(200);
    }
};