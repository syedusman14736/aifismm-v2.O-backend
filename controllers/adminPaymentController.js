import Payment from "../models/Payment.js";

import {
    approvePaymentById,
    rejectPaymentById,
} from "../services/paymentApprovalService.js";

// ==========================================
// GET ALL PAYMENTS - ADMIN
// ==========================================

export const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate(
                "user",
                "name username email whatsapp"
            )
            .populate(
                "reviewedBy",
                "name username email"
            )
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            payments,
        });
    } catch (error) {
        console.error(
            "Get All Payments Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch payment requests.",
        });
    }
};

// ==========================================
// APPROVE PAYMENT
// ==========================================

export const approvePayment = async (
    req,
    res
) => {
    try {
        const result =
            await approvePaymentById({
                paymentId: req.params.id,
                adminId: req.user._id,
            });

        return res
            .status(result.statusCode)
            .json(result);
    } catch (error) {
        console.error(
            "Approve Payment Controller Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to approve payment.",
        });
    }
};

// ==========================================
// REJECT PAYMENT
// ==========================================

export const rejectPayment = async (
    req,
    res
) => {
    try {
        const {
            rejectionReason = "",
        } = req.body;

        const result =
            await rejectPaymentById({
                paymentId: req.params.id,
                adminId: req.user._id,
                rejectionReason,
            });

        return res
            .status(result.statusCode)
            .json(result);
    } catch (error) {
        console.error(
            "Reject Payment Controller Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to reject payment.",
        });
    }
};