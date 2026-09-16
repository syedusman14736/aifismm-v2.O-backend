import mongoose from "mongoose";

const refillRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },

        orderId: {
            type: Number,
            required: true,
            index: true,
        },

        providerRefillId: {
            type: String,
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "processing",
                "completed",
                "failed",
            ],
            default: "pending",
            index: true,
        },

        reason: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        adminNote: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);


refillRequestSchema.index(
    {
        order: 1,
        status: 1,
    }
);


const RefillRequest =
    mongoose.model(
        "RefillRequest",
        refillRequestSchema
    );

export default RefillRequest;