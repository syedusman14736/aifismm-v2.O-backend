import Payment from "../models/Payment.js";
import User from "../models/User.js";

import sendPaymentNotification from "../services/paymentWhatsappService.js";

import {
    approvePaymentById,
    rejectPaymentById,
} from "../services/paymentApprovalService.js";


// ==========================================
// PAYMENT METHOD CONFIGURATION
// ==========================================
//
// This defines:
// - Pakistan vs International
// - Payment currency
// - Minimum payment amount
//
// Later, this can be moved into a PaymentMethod
// database model so admin can manage it dynamically.
// ==========================================

const PAYMENT_METHODS = {

    easypaisa: {
        region: "pakistan",
        currency: "PKR",
        minAmount: 100,
    },

    jazzcash: {
        region: "pakistan",
        currency: "PKR",
        minAmount: 100,
    },

    bank: {
        region: "pakistan",
        currency: "PKR",
        minAmount: 100,
    },

    other: {
        region: "international",
        currency: "USD",
        minAmount: 0.01,
    },
};


// ==========================================
// CREATE ADD FUNDS REQUEST
// ==========================================

export const createPayment = async (req, res) => {
    try {
        const {
            method,
            amount,
            transactionId,
        } = req.body;

        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (
            !method ||
            amount === undefined ||
            amount === null ||
            !transactionId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment method, amount and transaction ID are required.",
            });
        }

        const normalizedMethod =
            String(method)
                .trim()
                .toLowerCase();

        const normalizedTransactionId =
            String(transactionId).trim();

        const numericAmount =
            Number(amount);

        // ==========================================
        // VALIDATE PAYMENT METHOD
        // ==========================================

        const paymentMethod =
            PAYMENT_METHODS[
            normalizedMethod
            ];

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment method.",
            });
        }

        // ==========================================
        // VALIDATE AMOUNT
        // ==========================================

        if (
            !Number.isFinite(
                numericAmount
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid amount.",
            });
        }

        if (
            numericAmount <
            paymentMethod.minAmount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Minimum add funds amount is ${paymentMethod.currency} ${paymentMethod.minAmount}.`,
            });
        }

        // ==========================================
        // VALIDATE TRANSACTION ID
        // ==========================================

        if (
            normalizedTransactionId.length < 3
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid transaction ID.",
            });
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findById(
                req.user._id
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });
        }

        // ==========================================
        // CHECK USER STATUS
        // ==========================================

        if (
            user.status !== "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    `Your account is ${user.status}.`,
            });
        }

        // ==========================================
        // CHECK DUPLICATE TRANSACTION ID
        // ==========================================

        const existingPayment =
            await Payment.findOne({
                transactionId:
                    normalizedTransactionId,
            });

        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message:
                    "This transaction ID has already been submitted.",
            });
        }

        // ==========================================
        // CREATE PAYMENT
        // ==========================================
        //
        // IMPORTANT:
        //
        // amount = original amount user actually paid
        //
        // Pakistan:
        // 1000 PKR
        //
        // International:
        // 100 USD
        //
        // This amount is NOT converted here.
        //
        // Conversion happens only after admin approval.
        //
        // ==========================================

        const payment =
            await Payment.create({
                user: user._id,

                method:
                    normalizedMethod,

                region:
                    paymentMethod.region,

                currency:
                    paymentMethod.currency,

                amount:
                    numericAmount,

                transactionId:
                    normalizedTransactionId,

                status: "pending",
            });

        // ==========================================
        // SEND WHATSAPP ADMIN NOTIFICATION
        // ==========================================

        const whatsappResult =
            await sendPaymentNotification({
                payment,
                user,
            });

        if (
            !whatsappResult.success
        ) {
            console.warn(
                "WhatsApp payment notification failed:",
                whatsappResult.message
            );
        }

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,

            message:
                "Payment request submitted successfully. It is pending review.",

            payment: {
                id: payment._id,

                method:
                    payment.method,

                region:
                    payment.region,

                currency:
                    payment.currency,

                amount:
                    payment.amount,

                transactionId:
                    payment.transactionId,

                status:
                    payment.status,

                createdAt:
                    payment.createdAt,
            },
        });
    } catch (error) {
        console.error(
            "Create Payment Error:",
            error
        );

        // ==========================================
        // DUPLICATE KEY ERROR
        // ==========================================

        if (
            error.code === 11000
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This transaction ID has already been submitted.",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while submitting your payment request.",
        });
    }
};


// ==========================================
// GET MY PAYMENTS
// ==========================================

export const getMyPayments = async (
    req,
    res
) => {
    try {
        const payments =
            await Payment.find({
                user: req.user._id,
            })
                .sort({
                    createdAt: -1,
                })
                .select(
                    "method region currency amount exchangeRate creditedAmount creditedCurrency transactionId status rejectionReason reviewedAt createdAt updatedAt"
                );

        return res.status(200).json({
            success: true,
            payments,
        });
    } catch (error) {
        console.error(
            "Get My Payments Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch payment history.",
        });
    }
};


// ==========================================
// GET SINGLE PAYMENT
// ==========================================

export const getPaymentById = async (
    req,
    res
) => {
    try {
        const payment =
            await Payment.findOne({
                _id: req.params.id,
                user: req.user._id,
            }).select(
                "method region currency amount exchangeRate creditedAmount creditedCurrency transactionId status rejectionReason reviewedAt createdAt updatedAt"
            );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message:
                    "Payment request not found.",
            });
        }

        return res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        console.error(
            "Get Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch payment details.",
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
        const { id } = req.params;

        const result =
            await approvePaymentById({
                paymentId: id,
                adminId: req.user._id,
            });

        return res.status(
            result.statusCode
        ).json({
            success:
                result.success,

            message:
                result.message,

            ...(result.payment && {
                payment:
                    result.payment,
            }),

            ...(result.balance !==
                undefined && {
                balance:
                    result.balance,
            }),

            ...(result.creditedAmount !==
                undefined && {
                creditedAmount:
                    result.creditedAmount,
            }),
        });
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
        const { id } = req.params;

        const {
            rejectionReason,
        } = req.body;

        if (
            !rejectionReason ||
            !String(
                rejectionReason
            ).trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Rejection reason is required.",
            });
        }

        const result =
            await rejectPaymentById({
                paymentId: id,
                adminId: req.user._id,
                rejectionReason,
            });

        return res.status(
            result.statusCode
        ).json({
            success:
                result.success,

            message:
                result.message,

            ...(result.payment && {
                payment:
                    result.payment,
            }),
        });
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


// ==========================================
// GET ALL PAYMENTS - ADMIN
// ==========================================

export const getAdminPayments = async (
    req,
    res
) => {
    try {
        const {
            status,
            page = 1,
            limit = 20,
        } = req.query;

        // ==========================================
        // VALIDATE STATUS
        // ==========================================

        const allowedStatuses = [
            "pending",
            "completed",
            "rejected",
        ];

        const filter = {};

        if (status) {
            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment status.",
                });
            }

            filter.status = status;
        }

        // ==========================================
        // PAGINATION
        // ==========================================

        const currentPage =
            Math.max(
                Number(page),
                1
            );

        const perPage =
            Math.min(
                Math.max(
                    Number(limit),
                    1
                ),
                100
            );

        const skip =
            (currentPage - 1) *
            perPage;

        // ==========================================
        // FETCH PAYMENTS
        // ==========================================

        const [
            payments,
            totalPayments,
        ] = await Promise.all([
            Payment.find(filter)
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
                })
                .skip(skip)
                .limit(perPage)
                .select(
                    "user method region currency amount exchangeRate creditedAmount creditedCurrency transactionId status rejectionReason reviewedAt reviewedBy createdAt updatedAt"
                ),

            Payment.countDocuments(
                filter
            ),
        ]);

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            payments,

            pagination: {
                page:
                    currentPage,

                limit:
                    perPage,

                total:
                    totalPayments,

                totalPages:
                    Math.ceil(
                        totalPayments /
                        perPage
                    ),
            },
        });
    } catch (error) {
        console.error(
            "Get Admin Payments Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch payments.",
        });
    }
};