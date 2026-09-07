import Payment from "../models/Payment.js";
import User from "../models/User.js";

// ==========================================
// APPROVE PAYMENT
// ==========================================

export const approvePaymentById = async ({
    paymentId,
    adminId = null,
}) => {
    try {
        // ------------------------------------------
        // Find pending payment
        // ------------------------------------------

        const payment = await Payment.findOne({
            _id: paymentId,
            status: "pending",
        });

        if (!payment) {
            return {
                success: false,
                statusCode: 404,
                message:
                    "Payment not found or already reviewed.",
            };
        }

        // ------------------------------------------
        // Find user
        // ------------------------------------------

        const user = await User.findById(
            payment.user
        );

        if (!user) {
            return {
                success: false,
                statusCode: 404,
                message: "Payment user not found.",
            };
        }

        if (user.status !== "active") {
            return {
                success: false,
                statusCode: 403,
                message:
                    "User account is not active.",
            };
        }

        // ------------------------------------------
        // Atomically mark payment completed
        // ------------------------------------------

        const lockedPayment =
            await Payment.findOneAndUpdate(
                {
                    _id: paymentId,
                    status: "pending",
                },
                {
                    $set: {
                        status: "completed",
                        reviewedAt: new Date(),
                        reviewedBy: adminId,
                        rejectionReason: "",
                    },
                },
                {
                    new: true,
                }
            );

        // ------------------------------------------
        // Another request already processed it
        // ------------------------------------------

        if (!lockedPayment) {
            return {
                success: false,
                statusCode: 409,
                message:
                    "Payment has already been reviewed.",
            };
        }

        // ------------------------------------------
        // Add amount to user balance
        // ------------------------------------------

        const updatedUser =
            await User.findByIdAndUpdate(
                user._id,
                {
                    $inc: {
                        balance: payment.amount,
                    },
                },
                {
                    new: true,
                }
            );

        if (!updatedUser) {
            console.error(
                "CRITICAL: Payment completed but balance update failed.",
                payment._id
            );

            return {
                success: false,
                statusCode: 500,
                message:
                    "Payment completed but balance update failed.",
            };
        }

        // ------------------------------------------
        // Success
        // ------------------------------------------

        return {
            success: true,
            statusCode: 200,
            message:
                "Payment approved successfully.",
            payment: lockedPayment,
            balance: updatedUser.balance,
        };
    } catch (error) {
        console.error(
            "Approve Payment Service Error:",
            error
        );

        return {
            success: false,
            statusCode: 500,
            message:
                "Unable to approve payment.",
        };
    }
};


// ==========================================
// REJECT PAYMENT
// ==========================================

export const rejectPaymentById = async ({
    paymentId,
    adminId = null,
    rejectionReason = "Payment rejected.",
}) => {
    try {
        // ------------------------------------------
        // Validate payment
        // ------------------------------------------

        const payment = await Payment.findOne({
            _id: paymentId,
            status: "pending",
        });

        if (!payment) {
            return {
                success: false,
                statusCode: 404,
                message:
                    "Payment not found or already reviewed.",
            };
        }

        // ------------------------------------------
        // Atomically reject payment
        // ------------------------------------------

        const rejectedPayment =
            await Payment.findOneAndUpdate(
                {
                    _id: paymentId,
                    status: "pending",
                },
                {
                    $set: {
                        status: "rejected",
                        reviewedAt: new Date(),
                        reviewedBy: adminId,
                        rejectionReason:
                            rejectionReason.trim(),
                    },
                },
                {
                    new: true,
                }
            );

        if (!rejectedPayment) {
            return {
                success: false,
                statusCode: 409,
                message:
                    "Payment has already been reviewed.",
            };
        }

        return {
            success: true,
            statusCode: 200,
            message:
                "Payment rejected successfully.",
            payment: rejectedPayment,
        };
    } catch (error) {
        console.error(
            "Reject Payment Service Error:",
            error
        );

        return {
            success: false,
            statusCode: 500,
            message:
                "Unable to reject payment.",
        };
    }
};