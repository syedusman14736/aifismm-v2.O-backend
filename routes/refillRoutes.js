import express from "express";

import {
    createRefundRequest,
    getUserRefundRequests,
} from "../controllers/refundController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post(
    "/:orderId",
    createRefundRequest
);

router.get(
    "/",
    getUserRefundRequests
);

export default router;