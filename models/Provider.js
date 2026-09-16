import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        apiUrl: {
            type: String,
            required: true,
            trim: true,
        },

        apiKey: {
            type: String,
            required: true,
            select: false,
        },

        apiType: {
            type: String,
            enum: ["standard_smm"],
            default: "standard_smm",
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

const Provider = mongoose.model("Provider", providerSchema);

export default Provider;