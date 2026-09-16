import mongoose from "mongoose";

const refundRequestSchema = new mongoose.Schema(
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

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        reason: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "completed",
                "failed",
            ],
            default: "pending",
            index: true,
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


// One active refund request per order
refundRequestSchema.index(
    {
        order: 1,
        status: 1,
    }
);


const RefundRequest =
    mongoose.model(
        "RefundRequest",
        refundRequestSchema
    );

export default RefundRequest;