import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import User from "../models/User.js";

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
    const session =
        await mongoose.startSession();

    try {
        session.startTransaction();

        // ==========================================
        // FIND PENDING PAYMENT
        // ==========================================

        const payment =
            await Payment.findOne({
                _id: req.params.id,
                status: "pending",
            }).session(session);

        if (!payment) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message:
                    "Pending payment request not found.",
            });
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findById(
                payment.user
            ).session(session);

        if (!user) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message:
                    "User associated with this payment was not found.",
            });
        }

        // ==========================================
        // CHECK USER STATUS
        // ==========================================

        if (user.status !== "active") {
            await session.abortTransaction();

            return res.status(403).json({
                success: false,
                message:
                    `Cannot approve payment because user account is ${user.status}.`,
            });
        }

        // ==========================================
        // UPDATE PAYMENT
        // ==========================================

        payment.status = "completed";

        payment.reviewedAt =
            new Date();

        payment.reviewedBy =
            req.user._id;

        payment.rejectionReason = "";

        await payment.save({
            session,
        });

        // ==========================================
        // ADD BALANCE
        // ==========================================

        user.balance =
            Number(user.balance || 0) +
            Number(payment.amount);

        await user.save({
            session,
        });

        // ==========================================
        // COMMIT TRANSACTION
        // ==========================================

        await session.commitTransaction();

        return res.status(200).json({
            success: true,

            message:
                "Payment approved and user balance updated successfully.",

            payment: {
                id: payment._id,

                amount: payment.amount,

                status: payment.status,

                reviewedAt:
                    payment.reviewedAt,
            },

            user: {
                id: user._id,

                balance: user.balance,

                currency: user.currency,
            },
        });
    } catch (error) {
        await session.abortTransaction();

        console.error(
            "Approve Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to approve payment.",
        });
    } finally {
        session.endSession();
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

        // ==========================================
        // FIND PENDING PAYMENT
        // ==========================================

        const payment =
            await Payment.findOne({
                _id: req.params.id,
                status: "pending",
            });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message:
                    "Pending payment request not found.",
            });
        }

        // ==========================================
        // UPDATE PAYMENT
        // ==========================================

        payment.status = "rejected";

        payment.reviewedAt =
            new Date();

        payment.reviewedBy =
            req.user._id;

        payment.rejectionReason =
            String(
                rejectionReason
            ).trim();

        await payment.save();

        return res.status(200).json({
            success: true,

            message:
                "Payment request rejected successfully.",

            payment: {
                id: payment._id,

                amount: payment.amount,

                status: payment.status,

                rejectionReason:
                    payment.rejectionReason,

                reviewedAt:
                    payment.reviewedAt,
            },
        });
    } catch (error) {
        console.error(
            "Reject Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to reject payment.",
        });
    }
};