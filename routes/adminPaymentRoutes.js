import express from "express";

import {
    getAdminPayments,
    approvePayment,
    rejectPayment,
} from "../controllers/paymentController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// ==========================================
// GET ALL PAYMENTS
// ==========================================

router.get(
    "/",
    authMiddleware,
    adminMiddleware,
    getAdminPayments
);

// ==========================================
// APPROVE PAYMENT
// ==========================================

router.patch(
    "/:id/approve",
    authMiddleware,
    adminMiddleware,
    approvePayment
);

// ==========================================
// REJECT PAYMENT
// ==========================================

router.patch(
    "/:id/reject",
    authMiddleware,
    adminMiddleware,
    rejectPayment
);

export default router;