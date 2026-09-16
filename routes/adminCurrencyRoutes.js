import express from "express";

import {
    getCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
} from "../controllers/currencyController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// ==========================================
// ADMIN PROTECTION
// ==========================================

router.use(
    authMiddleware,
    adminMiddleware
);

// ==========================================
// CURRENCY ROUTES
// ==========================================

// Get all currencies
router.get("/", getCurrencies);

// Add currency
router.post("/", createCurrency);

// Update currency
router.patch("/:code", updateCurrency);

// Delete currency
router.delete("/:code", deleteCurrency);

export default router;