import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: 2,
            maxlength: 50,
        },

        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },

        whatsapp: {
            type: String,
            required: [true, "WhatsApp number is required"],
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false,
        },

        // ACCOUNT BALANCE
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },

        currency: {
            type: String,
            default: "PKR",
        },

        // ACCOUNT ROLE
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        // ACCOUNT STATUS
        status: {
            type: String,
            enum: ["active", "suspended", "blocked"],
            default: "active",
        },

        // EMAIL VERIFICATION
        emailVerified: {
            type: Boolean,
            default: false,
        },

        // WHATSAPP VERIFICATION
        whatsappVerified: {
            type: Boolean,
            default: false,
        },

        // WHATSAPP OTP
        whatsappOtp: {
            type: String,
            default: null,
            select: false,
        },

        whatsappOtpExpires: {
            type: Date,
            default: null,
            select: false,
        },

        // LAST LOGIN
        lastLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;