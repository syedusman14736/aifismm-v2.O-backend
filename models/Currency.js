import mongoose from "mongoose";

const currencySchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 3,
            maxlength: 3,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        symbol: {
            type: String,
            required: true,
            trim: true,
        },

        // Value of 1 USD in this currency
        //
        // USD = 1
        // PKR = 280
        // INR = 83.5
        // AED = 3.67
        // EUR = 0.85
        rate: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const Currency = mongoose.model(
    "Currency",
    currencySchema
);

export default Currency;