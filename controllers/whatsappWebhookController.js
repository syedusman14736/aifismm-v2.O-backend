import crypto from "crypto";

import {
    approvePaymentById,
    rejectPaymentById,
} from "../services/paymentApprovalService.js";


// ======================================================
// HELPERS
// ======================================================

const normalizePhoneNumber = (number = "") => {
    return String(number)
        .replace(/\D/g, "")
        .replace(/^00/, "");
};


// ======================================================
// VERIFY WHATSAPP WEBHOOK
// ======================================================

export const verifyWhatsAppWebhook = (req, res) => {
    try {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        const verifyToken =
            process.env.WHATSAPP_VERIFY_TOKEN;

        if (!verifyToken) {
            console.error(
                "❌ WHATSAPP_VERIFY_TOKEN is missing."
            );

            return res.sendStatus(500);
        }

        if (
            mode === "subscribe" &&
            token === verifyToken
        ) {
            console.log(
                "✅ WhatsApp Webhook Verified."
            );

            return res
                .status(200)
                .send(challenge);
        }

        console.error(
            "❌ WhatsApp Webhook Verification Failed."
        );

        return res.sendStatus(403);

    } catch (error) {
        console.error(
            "❌ WhatsApp Webhook Verification Error:",
            error
        );

        return res.sendStatus(500);
    }
};


// ======================================================
// VERIFY META WEBHOOK SIGNATURE
// ======================================================

const verifyWhatsAppSignature = (req) => {
    try {
        const signature =
            req.headers["x-hub-signature-256"];

        const appSecret =
            process.env.WHATSAPP_APP_SECRET;

        if (
            !signature ||
            !appSecret ||
            !req.rawBody
        ) {
            console.error(
                "❌ WhatsApp signature data missing."
            );

            return false;
        }

        const expectedSignature =
            "sha256=" +
            crypto
                .createHmac(
                    "sha256",
                    appSecret
                )
                .update(req.rawBody)
                .digest("hex");

        const receivedBuffer =
            Buffer.from(signature);

        const expectedBuffer =
            Buffer.from(expectedSignature);

        if (
            receivedBuffer.length !==
            expectedBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        );

    } catch (error) {
        console.error(
            "❌ WhatsApp Signature Error:",
            error
        );

        return false;
    }
};


// ======================================================
// VERIFY ADMIN WHATSAPP NUMBER
// ======================================================

const isAdminWhatsAppNumber = (message) => {
    try {
        const configuredAdmin =
            process.env.ADMIN_WHATSAPP_NUMBER;

        if (!configuredAdmin) {
            console.error(
                "❌ ADMIN_WHATSAPP_NUMBER is missing."
            );

            return false;
        }

        const sender =
            normalizePhoneNumber(
                message?.from
            );

        const admin =
            normalizePhoneNumber(
                configuredAdmin
            );

        console.log(
            "WhatsApp Sender:",
            sender
        );

        console.log(
            "Configured Admin:",
            admin
        );

        return sender === admin;

    } catch (error) {
        console.error(
            "❌ Admin WhatsApp Verification Error:",
            error
        );

        return false;
    }
};


// ======================================================
// VERIFY WHATSAPP PHONE NUMBER ID
// ======================================================

const isCorrectPhoneNumber = (value) => {
    const configuredId =
        process.env.WHATSAPP_PHONE_NUMBER_ID;

    const incomingId =
        value?.metadata?.phone_number_id;

    if (
        !configuredId ||
        !incomingId
    ) {
        console.error(
            "❌ WhatsApp Phone Number ID missing."
        );

        return false;
    }

    if (
        configuredId !==
        incomingId
    ) {
        console.error(
            "❌ WhatsApp Phone Number ID mismatch."
        );

        console.error(
            "Incoming:",
            incomingId
        );

        console.error(
            "Configured:",
            configuredId
        );

        return false;
    }

    return true;
};


// ======================================================
// MAIN WHATSAPP WEBHOOK
// ======================================================

export const handleWhatsAppWebhook = async (
    req,
    res
) => {
    try {

        // ------------------------------------------------
        // 1. VERIFY META SIGNATURE
        // ------------------------------------------------

        if (!verifyWhatsAppSignature(req)) {
            console.error(
                "❌ Invalid WhatsApp webhook signature."
            );

            return res.sendStatus(401);
        }


        // ------------------------------------------------
        // 2. GET BODY
        // ------------------------------------------------

        const body = req.body;


        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "📩 WHATSAPP WEBHOOK RECEIVED"
        );
        console.log(
            "=========================================="
        );

        console.log(
            JSON.stringify(
                body,
                null,
                2
            )
        );


        // ------------------------------------------------
        // 3. VERIFY OBJECT
        // ------------------------------------------------

        if (
            body?.object !==
            "whatsapp_business_account"
        ) {
            console.warn(
                "⚠️ Unknown webhook object."
            );

            return res.sendStatus(200);
        }


        // ------------------------------------------------
        // 4. ENTRIES
        // ------------------------------------------------

        const entries =
            Array.isArray(body.entry)
                ? body.entry
                : [];


        // ------------------------------------------------
        // 5. PROCESS ENTRIES
        // ------------------------------------------------

        for (const entry of entries) {

            const changes =
                Array.isArray(entry?.changes)
                    ? entry.changes
                    : [];


            // --------------------------------------------
            // PROCESS CHANGES
            // --------------------------------------------

            for (const change of changes) {

                const value =
                    change?.value;

                if (!value) {
                    continue;
                }


                // ----------------------------------------
                // VERIFY PHONE NUMBER ID
                // ----------------------------------------

                if (
                    !isCorrectPhoneNumber(
                        value
                    )
                ) {
                    console.warn(
                        "⚠️ Ignoring webhook: wrong Phone Number ID."
                    );

                    continue;
                }


                // ----------------------------------------
                // ONLY MESSAGES
                // ----------------------------------------

                if (
                    change?.field !==
                    "messages"
                ) {
                    console.log(
                        "ℹ️ Webhook field:",
                        change?.field
                    );

                    continue;
                }


                // ----------------------------------------
                // NO MESSAGES
                // ----------------------------------------

                if (
                    !Array.isArray(
                        value.messages
                    )
                ) {
                    console.log(
                        "ℹ️ No messages array. Event ignored."
                    );

                    continue;
                }


                // ----------------------------------------
                // PROCESS MESSAGES
                // ----------------------------------------

                for (
                    const message of value.messages
                ) {
                    await processWhatsAppMessage(
                        message,
                        value
                    );
                }
            }
        }


        // ------------------------------------------------
        // 6. ACKNOWLEDGE META
        // ------------------------------------------------

        console.log(
            "=========================================="
        );

        console.log(
            "✅ WHATSAPP WEBHOOK PROCESSING COMPLETE"
        );

        console.log(
            "=========================================="
        );

        console.log("");

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ WhatsApp Webhook Handler Error:"
        );

        console.error(error);

        console.error(
            "=========================================="
        );

        if (!res.headersSent) {
            return res.sendStatus(500);
        }

        return;
    }
};


// ======================================================
// PROCESS WHATSAPP MESSAGE
// ======================================================

const processWhatsAppMessage = async (
    message,
    value
) => {
    try {

        console.log("");
        console.log(
            "------------------------------------------"
        );

        console.log(
            "📨 INCOMING WHATSAPP MESSAGE"
        );

        console.log(
            "From:",
            message?.from
        );

        console.log(
            "Type:",
            message?.type
        );

        console.log(
            "Message ID:",
            message?.id
        );

        console.log(
            "------------------------------------------"
        );


        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            !isAdminWhatsAppNumber(
                message
            )
        ) {
            console.warn(
                "🚫 Message ignored: sender is NOT admin."
            );

            return;
        }


        console.log(
            "✅ ADMIN WHATSAPP MESSAGE VERIFIED"
        );


        // ==================================================
        // TEXT MESSAGE
        // ==================================================

        if (
            message?.type ===
            "text"
        ) {
            console.log(
                "📝 Admin Text:",
                message?.text?.body || ""
            );

            // Future:
            // whatsappMessageController
            // whatsappChatController

            return;
        }


        // ==================================================
        // BUTTON DATA
        // ==================================================

        let payload = null;
        let buttonText = null;


        // ==================================================
        // LEGACY BUTTON
        // ==================================================

        if (
            message?.type ===
            "button"
        ) {
            buttonText =
                message?.button?.text;

            payload =
                message?.button?.payload;

            console.log(
                "🔘 Button Text:",
                buttonText
            );

            console.log(
                "🔑 Button Payload:",
                payload
            );
        }


        // ==================================================
        // INTERACTIVE BUTTON
        // ==================================================

        if (
            message?.type ===
            "interactive"
        ) {

            const interactive =
                message?.interactive;

            console.log(
                "Interactive Type:",
                interactive?.type
            );


            if (
                interactive?.type ===
                "button_reply"
            ) {

                buttonText =
                    interactive
                        ?.button_reply
                        ?.title;

                payload =
                    interactive
                        ?.button_reply
                        ?.id;


                console.log(
                    "🔘 Interactive Button:",
                    buttonText
                );

                console.log(
                    "🔑 Interactive Payload:",
                    payload
                );
            }
        }


        // ==================================================
        // NO PAYLOAD
        // ==================================================

        if (!payload) {
            console.log(
                "ℹ️ No button payload found."
            );

            return;
        }


        // ==================================================
        // APPROVE PAYMENT
        // ==================================================

        if (
            payload.startsWith(
                "approve_"
            )
        ) {

            const paymentId =
                payload.substring(
                    "approve_".length
                );


            if (!paymentId) {
                console.error(
                    "❌ Payment ID missing from approve payload."
                );

                return;
            }


            console.log("");
            console.log(
                "=========================================="
            );

            console.log(
                "✅ APPROVE BUTTON RECEIVED"
            );

            console.log(
                "Payment ID:",
                paymentId
            );

            console.log(
                "Admin:",
                message?.from
            );

            console.log(
                "=========================================="
            );


            // --------------------------------------------
            // APPROVE PAYMENT
            // --------------------------------------------

            const result =
                await approvePaymentById({
                    paymentId,
                    adminId: null,
                });


            console.log(
                "✅ WhatsApp Approval Result:",
                result
            );

            return;
        }


        // ==================================================
        // REJECT PAYMENT
        // ==================================================

        if (
            payload.startsWith(
                "reject_"
            )
        ) {

            const paymentId =
                payload.substring(
                    "reject_".length
                );


            if (!paymentId) {
                console.error(
                    "❌ Payment ID missing from reject payload."
                );

                return;
            }


            console.log("");
            console.log(
                "=========================================="
            );

            console.log(
                "❌ REJECT BUTTON RECEIVED"
            );

            console.log(
                "Payment ID:",
                paymentId
            );

            console.log(
                "Admin:",
                message?.from
            );

            console.log(
                "=========================================="
            );


            // --------------------------------------------
            // REJECT PAYMENT
            // --------------------------------------------

            const result =
                await rejectPaymentById({
                    paymentId,
                    adminId: null,
                    rejectionReason:
                        "Rejected via WhatsApp.",
                });


            console.log(
                "❌ WhatsApp Rejection Result:",
                result
            );

            return;
        }


        // ==================================================
        // UNKNOWN PAYLOAD
        // ==================================================

        console.warn(
            "⚠️ Unknown WhatsApp button payload:",
            payload
        );

    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ Process WhatsApp Message Error:"
        );

        console.error(error);

        console.error(
            "=========================================="
        );
    }
};