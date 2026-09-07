import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        // ==========================================
        // USER
        // ==========================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // ==========================================
        // PAYMENT METHOD
        // ==========================================

        method: {
            type: String,
            enum: [
                "easypaisa",
                "jazzcash",
                "bank",
                "other",
            ],
            required: true,
        },

        // ==========================================
        // AMOUNT
        // ==========================================

        amount: {
            type: Number,
            required: true,
            min: 100,
        },

        // ==========================================
        // TRANSACTION ID
        // ==========================================

        transactionId: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // PAYMENT STATUS
        // ==========================================

        status: {
            type: String,
            enum: [
                "pending",
                "completed",
                "rejected",
            ],
            default: "pending",
            index: true,
        },

        // ==========================================
        // ADMIN REVIEW
        // ==========================================

        reviewedAt: {
            type: Date,
            default: null,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        rejectionReason: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// ==========================================
// PREVENT DUPLICATE TRANSACTION IDs
// ==========================================

paymentSchema.index(
    { transactionId: 1 },
    { unique: true }
);

const Payment = mongoose.model(
    "Payment",
    paymentSchema
);

export default Payment;