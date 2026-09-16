import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
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
        // AIFI ORDER ID
        // ==========================================

        orderId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },

        // ==========================================
        // SERVICE
        // ==========================================

        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },

        serviceId: {
            type: Number,
            required: true,
            index: true,
        },

        serviceName: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // ORDER DETAILS
        // ==========================================

        link: {
            type: String,
            required: true,
            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        rate: {
            type: Number,
            required: true,
            min: 0,
        },

        charge: {
            type: Number,
            required: true,
            min: 0,
        },

        comments: {
            type: String,
            default: null,
            trim: true,
        },

        runs: {
            type: Number,
            default: null,
            min: 1,
        },

        interval: {
            type: Number,
            default: null,
            min: 1,
        },

        // ==========================================
        // PROVIDER INTERNAL DATA
        // ==========================================

        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
        },

        providerServiceId: {
            type: String,
            required: true,
            trim: true,
        },

        providerOrderId: {
            type: String,
            default: null,
            index: true,
        },

        // ==========================================
        // STATUS
        // ==========================================

        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "completed",
                "partial",
                "canceled",
                "refunded",
                "failed",
            ],
            default: "pending",
            index: true,
        },

        // ==========================================
        // PROVIDER STATUS DATA
        // ==========================================

        startCount: {
            type: Number,
            default: null,
        },

        remains: {
            type: Number,
            default: null,
        },

        finalQuantity: {
            type: Number,
            default: null,
            min: 0,
        },

        providerCharge: {
            type: Number,
            default: null,
        },

        currency: {
            type: String,
            enum: ["USD"],
            default: "USD",
            uppercase: true,
            trim: true,
        },

        // ==========================================
        // FAILURE
        // ==========================================

        failureReason: {
            type: String,
            default: null,
            trim: true,
        },

        // ==========================================
        // BALANCE
        // ==========================================

        balanceDeducted: {
            type: Boolean,
            default: false,
        },

        // ==========================================
        // DATES
        // ==========================================

        submittedAt: {
            type: Date,
            default: null,
        },

        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ==========================================
// INDEXES
// ==========================================

orderSchema.index({
    user: 1,
    createdAt: -1,
});

orderSchema.index({
    status: 1,
    createdAt: -1,
});

const Order = mongoose.model("Order", orderSchema);

export default Order;