import express from "express";

import {
    signup,
    login,
    getMe,
    verifyWhatsapp,
    resendWhatsappOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// AUTH
// ==========================================

router.post("/signup", signup);

router.post("/login", login);

// ==========================================
// WHATSAPP VERIFICATION
// ==========================================

router.post(
    "/verify-whatsapp",
    verifyWhatsapp
);

router.post(
    "/resend-whatsapp-otp",
    resendWhatsappOtp
);

// ==========================================
// CURRENT USER
// ==========================================

router.get(
    "/me",
    authMiddleware,
    getMe
);

router.post(
    "/forgot-password",
    forgotPassword
);

router.post(
    "/verify-reset-otp",
    verifyResetOtp
);

router.post(
    "/reset-password",
    resetPassword
);

export default router;