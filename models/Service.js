import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
    {
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
            index: true,
        },

        providerServiceId: {
            type: String,
            required: true,
            trim: true,
        },

        serviceId: {
            type: Number,
            unique: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: null,
            trim: true,
        },

        // Original type received from provider
        providerType: {
            type: String,
            default: null,
            trim: true,
            lowercase: true,
        },

        providerCategory: {
            type: String,
            default: null,
            trim: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        // Detected platform
        platform: {
            type: String,
            default: null,
            trim: true,
            lowercase: true,
            index: true,
        },

        // AiFi selling rate
        rate: {
            type: Number,
            required: true,
            min: 0,
        },

        // Provider cost/rate
        providerRate: {
            type: Number,
            required: true,
            min: 0,
        },

        min: {
            type: Number,
            required: true,
            min: 1,
        },

        max: {
            type: Number,
            required: true,
            min: 1,
        },

        speed: {
            type: String,
            default: null,
            trim: true,
        },

        drop: {
            type: String,
            default: null,
            trim: true,
        },

        quality: {
            type: String,
            default: null,
            trim: true,
        },

        refill: {
            enabled: {
                type: Boolean,
                default: false,
            },

            duration: {
                type: String,
                default: null,
                trim: true,
            },
        },

        refund: {
            enabled: {
                type: Boolean,
                default: false,
            },

            duration: {
                type: String,
                default: null,
                trim: true,
            },
        },

        dripfeed: {
            type: Boolean,
            default: false,
        },

        cancel: {
            type: Boolean,
            default: false,
        },

        averageTime: {
            type: Number,
            default: null,
            min: 0,
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

// Same provider cannot have duplicate provider service IDs
serviceSchema.index(
    {
        provider: 1,
        providerServiceId: 1,
    },
    {
        unique: true,
    }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;