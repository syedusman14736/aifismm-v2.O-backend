import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true,
        },

        sequence: {
            type: Number,
            required: true,
            default: 1999,
        },
    },
    {
        timestamps: true,
    }
);

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;