import express from "express";

import {
    createPayment,
    getMyPayments,
    getPaymentById,
} from "../controllers/paymentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// USER PAYMENT ROUTES
// ==========================================

// Submit Add Funds request
router.post(
    "/",
    authMiddleware,
    createPayment
);

// Get logged-in user's payment history
router.get(
    "/my",
    authMiddleware,
    getMyPayments
);

// Get single payment details
router.get(
    "/:id",
    authMiddleware,
    getPaymentById
);

export default router;