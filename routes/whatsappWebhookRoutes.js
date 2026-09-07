import express from "express";

import {
    verifyWhatsAppWebhook,
    handleWhatsAppWebhook,
} from "../controllers/whatsappWebhookController.js";

const router = express.Router();


// ==========================================
// META WEBHOOK VERIFICATION
// ==========================================

router.get(
    "/",
    verifyWhatsAppWebhook
);


// ==========================================
// WHATSAPP EVENTS
// ==========================================

router.post(
    "/",
    handleWhatsAppWebhook
);

export default router;