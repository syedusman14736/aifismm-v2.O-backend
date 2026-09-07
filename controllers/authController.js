import bcrypt from "bcryptjs";

import User from "../models/User.js";

import generateToken from "../utils/generateToken.js";
import generateOtp from "../utils/generateOtp.js";

import sendWhatsappOtp from "../services/whatsappService.js";

// ==========================================
// SIGNUP
// ==========================================

export const signup = async (req, res) => {
    try {
        const {
            name,
            username,
            email,
            whatsapp,
            password,
        } = req.body;

        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (
            !name ||
            !username ||
            !email ||
            !whatsapp ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "All required fields must be provided.",
            });
        }

        const normalizedName =
            name.trim();

        const normalizedUsername =
            username.trim().toLowerCase();

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedWhatsapp =
            whatsapp.trim();

        // ==========================================
        // CHECK EXISTING USERNAME
        // ==========================================

        const existingUsername =
            await User.findOne({
                username:
                    normalizedUsername,
            });

        if (existingUsername) {
            return res.status(409).json({
                success: false,
                field: "username",
                message:
                    "Username is already taken.",
            });
        }

        // ==========================================
        // CHECK EXISTING EMAIL
        // ==========================================

        const existingEmail =
            await User.findOne({
                email:
                    normalizedEmail,
            });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                field: "email",
                message:
                    "Email is already registered.",
            });
        }

        // ==========================================
        // CHECK EXISTING WHATSAPP
        // ==========================================

        const existingWhatsapp =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            });

        if (existingWhatsapp) {
            return res.status(409).json({
                success: false,
                field: "whatsapp",
                message:
                    "WhatsApp number is already registered.",
            });
        }

        // ==========================================
        // HASH PASSWORD
        // ==========================================

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        // ==========================================
        // GENERATE OTP
        // ==========================================

        const otp = generateOtp();

        const otpExpires = new Date(
            Date.now() +
            5 * 60 * 1000
        );

        // ==========================================
        // CREATE USER
        // ==========================================

        const user = await User.create({
            name: normalizedName,

            username:
                normalizedUsername,

            email:
                normalizedEmail,

            whatsapp:
                normalizedWhatsapp,

            password:
                hashedPassword,

            whatsappVerified: false,

            whatsappOtp: otp,

            whatsappOtpExpires:
                otpExpires,
        });

        // ==========================================
        // SEND WHATSAPP OTP
        // ==========================================

        const whatsappResponse =
            await sendWhatsappOtp(
                normalizedWhatsapp,
                otp
            );

        // ==========================================
        // OTP SEND FAILED
        // ==========================================

        if (!whatsappResponse.success) {
            // Remove newly-created account
            // because verification could not start.

            await User.findByIdAndDelete(
                user._id
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to send verification code. Please try again.",
            });
        }

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(201).json({
            success: true,

            verificationRequired:
                true,

            whatsapp:
                normalizedWhatsapp,

            message:
                "Account created successfully. A verification code has been sent to your WhatsApp.",
        });
    } catch (error) {
        console.error(
            "Signup Error:",
            error
        );

        // ==========================================
        // MONGOOSE DUPLICATE ERROR
        // ==========================================

        if (error.code === 11000) {
            const duplicateField =
                Object.keys(
                    error.keyPattern || {}
                )[0];

            return res.status(409).json({
                success: false,
                field:
                    duplicateField ||
                    "general",
                message:
                    `${duplicateField || "Value"} is already registered.`,
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while creating your account.",
        });
    }
};

// ==========================================
// LOGIN
// ==========================================

export const login = async (req, res) => {
    try {
        const {
            email,
            password,
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email/username and password are required.",
            });
        }

        const identifier =
            email.trim().toLowerCase();

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                $or: [
                    {
                        email: identifier,
                    },
                    {
                        username:
                            identifier,
                    },
                ],
            }).select(
                "+password +whatsappOtp +whatsappOtpExpires"
            );

        // ==========================================
        // USER NOT FOUND
        // ==========================================

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email/username or password.",
            });
        }

        // ==========================================
        // ACCOUNT STATUS
        // ==========================================

        if (
            user.status !==
            "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    `Your account is ${user.status}.`,
            });
        }

        // ==========================================
        // PASSWORD CHECK
        // ==========================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        // IMPORTANT:
        // OTP is generated ONLY after
        // the password is correct.

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email/username or password.",
            });
        }

        // ==========================================
        // WHATSAPP VERIFICATION
        // ==========================================

        if (
            !user.whatsappVerified
        ) {
            // Always generate a NEW OTP.
            // This invalidates the previous OTP.

            const otp =
                generateOtp();

            const otpExpires =
                new Date(
                    Date.now() +
                    5 * 60 * 1000
                );

            // Send first
            const whatsappResponse =
                await sendWhatsappOtp(
                    user.whatsapp,
                    otp
                );

            if (
                !whatsappResponse.success
            ) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to send verification code. Please try again.",
                });
            }

            // Save only after successful send.
            user.whatsappOtp =
                otp;

            user.whatsappOtpExpires =
                otpExpires;

            await user.save();

            return res.status(403).json({
                success: false,

                verificationRequired:
                    true,

                whatsapp:
                    user.whatsapp,

                message:
                    "Please verify your WhatsApp number before logging in.",
            });
        }

        // ==========================================
        // SUCCESSFUL LOGIN
        // ==========================================

        user.lastLogin =
            new Date();

        await user.save();

        // ==========================================
        // JWT
        // ==========================================

        const token =
            generateToken(
                user._id
            );

        return res.status(200).json({
            success: true,

            token,

            user: {
                id: user._id,
                name: user.name,
                username:
                    user.username,
                email: user.email,
                whatsapp:
                    user.whatsapp,
                balance:
                    user.balance,
                currency:
                    user.currency,
                role: user.role,
                status:
                    user.status,
                emailVerified:
                    user.emailVerified,
                whatsappVerified:
                    user.whatsappVerified,
                lastLogin:
                    user.lastLogin,
            },

            message:
                "Login successful.",
        });
    } catch (error) {
        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while logging in.",
        });
    }
};

// ==========================================
// VERIFY WHATSAPP
// ==========================================

export const verifyWhatsapp = async (
    req,
    res
) => {
    try {
        const {
            whatsapp,
            otp,
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!whatsapp || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number and OTP are required.",
            });
        }

        const normalizedWhatsapp =
            whatsapp.trim();

        const normalizedOtp =
            otp.trim();

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            }).select(
                "+whatsappOtp +whatsappOtpExpires"
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "Account not found.",
            });
        }

        // ==========================================
        // ALREADY VERIFIED
        // ==========================================

        if (
            user.whatsappVerified
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number is already verified.",
            });
        }

        // ==========================================
        // OTP EXISTS?
        // ==========================================

        if (
            !user.whatsappOtp ||
            !user.whatsappOtpExpires
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification code not found. Please request a new code.",
            });
        }

        // ==========================================
        // OTP EXPIRED?
        // ==========================================

        if (
            user.whatsappOtpExpires
                .getTime() <
            Date.now()
        ) {
            // Clear expired OTP

            user.whatsappOtp =
                null;

            user.whatsappOtpExpires =
                null;

            await user.save();

            return res.status(400).json({
                success: false,
                message:
                    "Verification code has expired. Please request a new code.",
            });
        }

        // ==========================================
        // OTP MATCH
        // ==========================================

        if (
            user.whatsappOtp !==
            normalizedOtp
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification code.",
            });
        }

        // ==========================================
        // VERIFY USER
        // ==========================================

        user.whatsappVerified =
            true;

        // Clear OTP immediately
        // so it cannot be reused.

        user.whatsappOtp = null;

        user.whatsappOtpExpires =
            null;

        await user.save();

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({
            success: true,

            message:
                "WhatsApp number verified successfully.",
        });
    } catch (error) {
        console.error(
            "Verify WhatsApp Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while verifying your WhatsApp number.",
        });
    }
};

// ==========================================
// RESEND WHATSAPP OTP
// ==========================================

export const resendWhatsappOtp = async (
    req,
    res
) => {
    try {
        const { whatsapp } =
            req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!whatsapp) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number is required.",
            });
        }

        const normalizedWhatsapp =
            whatsapp.trim();

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "Account not found.",
            });
        }

        // ==========================================
        // ALREADY VERIFIED
        // ==========================================

        if (
            user.whatsappVerified
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number is already verified.",
            });
        }

        // ==========================================
        // GENERATE NEW OTP
        // ==========================================

        const otp =
            generateOtp();

        const otpExpires =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        // ==========================================
        // SEND NEW OTP
        // ==========================================

        const whatsappResponse =
            await sendWhatsappOtp(
                normalizedWhatsapp,
                otp
            );

        if (
            !whatsappResponse.success
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Unable to send verification code. Please try again.",
            });
        }

        // ==========================================
        // SAVE NEW OTP
        // ==========================================

        user.whatsappOtp =
            otp;

        user.whatsappOtpExpires =
            otpExpires;

        await user.save();

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({
            success: true,

            message:
                "A new verification code has been sent to your WhatsApp.",
        });
    } catch (error) {
        console.error(
            "Resend WhatsApp OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while resending the verification code.",
        });
    }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getMe = async (
    req,
    res
) => {
    try {
        return res.status(200).json({
            success: true,

            user: {
                id: req.user._id,
                name: req.user.name,
                username:
                    req.user.username,
                email: req.user.email,
                whatsapp:
                    req.user.whatsapp,
                balance:
                    req.user.balance,
                currency:
                    req.user.currency,
                role: req.user.role,
                status:
                    req.user.status,
                emailVerified:
                    req.user.emailVerified,
                whatsappVerified:
                    req.user.whatsappVerified,
                lastLogin:
                    req.user.lastLogin,
                createdAt:
                    req.user.createdAt,
            },
        });
    } catch (error) {
        console.error(
            "Get Me Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch user information.",
        });
    }
};