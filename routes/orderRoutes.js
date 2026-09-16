import express from "express";

import {
    createOrder,
    getUserOrders,
    getUserOrderById,
    syncOrderStatus,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// CREATE ORDER
// ==========================================

router.post("/", createOrder);

// ==========================================
// USER ORDER HISTORY
// ==========================================

router.get("/", getUserOrders);

// ==========================================
// SYNC ORDER STATUS
// ==========================================

router.post("/:orderId/sync", syncOrderStatus);

// ==========================================
// SINGLE ORDER
// ==========================================

router.get("/:orderId", getUserOrderById);

export default router;