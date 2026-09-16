
import express from "express";

import {
    getUserCurrency,
    updateUserCurrency,
} from "../controllers/userCurrencyController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// USER AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// GET CURRENT CURRENCY
// ==========================================

router.get(
    "/",
    getUserCurrency
);

// ==========================================
// CHANGE CURRENCY
// ==========================================

router.patch(
    "/",
    updateUserCurrency
);

export default router;