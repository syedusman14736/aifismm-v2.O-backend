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
        // PAYMENT REGION
        // ==========================================
        //
        // pakistan:
        // Payment is made in PKR
        //
        // international:
        // Payment is made in USD
        //
        // ==========================================

        region: {
            type: String,
            enum: [
                "pakistan",
                "international",
            ],
            required: true,
        },

        // ==========================================
        // ORIGINAL PAYMENT CURRENCY
        // ==========================================
        //
        // This is the currency the user actually paid.
        //
        // Pakistan      → PKR
        // International → USD
        //
        // This value must NEVER be changed after payment
        // creation.
        //
        // ==========================================

        currency: {
            type: String,
            enum: [
                "PKR",
                "USD",
            ],
            required: true,
            uppercase: true,
            trim: true,
        },

        // ==========================================
        // ORIGINAL PAYMENT AMOUNT
        // ==========================================
        //
        // Exact amount submitted by the user.
        //
        // Pakistan:
        // amount = 1000 PKR
        //
        // International:
        // amount = 100 USD
        //
        // This is the original payment amount and should
        // never be replaced by the converted USD amount.
        //
        // ==========================================

        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        // ==========================================
        // EXCHANGE RATE
        // ==========================================
        //
        // Saved when payment is approved.
        //
        // Example:
        // 1 USD = 280 PKR
        //
        // PKR payment:
        // exchangeRate = 280
        //
        // USD payment:
        // exchangeRate = 1
        //
        // ==========================================

        exchangeRate: {
            type: Number,
            default: null,
            min: 0,
        },

        // ==========================================
        // CREDITED AMOUNT
        // ==========================================
        //
        // Actual USD amount added to user's wallet.
        //
        // Example:
        //
        // 1000 PKR / 280
        // = 3.57142857 USD
        //
        // International:
        //
        // 100 USD
        // = 100 USD
        //
        // ==========================================

        creditedAmount: {
            type: Number,
            default: null,
            min: 0,
        },

        // ==========================================
        // CREDITED CURRENCY
        // ==========================================
        //
        // User wallet is always USD.
        //
        // ==========================================

        creditedCurrency: {
            type: String,
            enum: ["USD"],
            default: "USD",
            uppercase: true,
            trim: true,
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