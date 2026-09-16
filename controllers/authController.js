import bcrypt from "bcryptjs";

import User from "../models/User.js";

import generateToken from "../utils/generateToken.js";
import generateOtp from "../utils/generateOtp.js";

import sendWhatsappOtp, {
    sendPasswordResetOtp,
} from "../services/whatsappService.js";

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
            username
                .trim()
                .toLowerCase();

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        const normalizedWhatsapp =
            whatsapp.trim();

        // ==========================================
        // WHATSAPP NUMBER VALIDATION
        // ==========================================
        //
        // International E.164 format:
        //
        // Pakistan:
        // +923331080018
        //
        // USA:
        // +14155552671
        //
        // UK:
        // +447911123456
        //
        // UAE:
        // +971501234567
        //
        // All countries are accepted.
        //
        // ==========================================

        const whatsappRegex =
            /^\+[1-9]\d{7,14}$/;

        if (
            !whatsappRegex.test(
                normalizedWhatsapp
            )
        ) {
            return res.status(400).json({
                success: false,
                field: "whatsapp",
                message:
                    "Please enter a valid WhatsApp number with country code.",
            });
        }

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

        const otp =
            generateOtp();

        const otpExpires =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        // ==========================================
        // CREATE USER
        // ==========================================

        const user =
            await User.create({
                name:
                    normalizedName,

                username:
                    normalizedUsername,

                email:
                    normalizedEmail,

                whatsapp:
                    normalizedWhatsapp,

                password:
                    hashedPassword,

                whatsappVerified:
                    false,

                whatsappOtp:
                    otp,

                whatsappOtpExpires:
                    otpExpires,
            });

        // ==========================================
        // SEND WHATSAPP OTP
        // ==========================================

        const whatsappResponse =
            await sendWhatsappOtp(
                normalizedWhatsapp,
                otp,
                normalizedName
            );

        // ==========================================
        // OTP SEND FAILED
        // ==========================================

        if (
            !whatsappResponse.success
        ) {
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

        if (
            error.code === 11000
        ) {
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

export const login = async (
    req,
    res
) => {
    try {
        const {
            email,
            password,
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email/username and password are required.",
            });
        }

        const identifier =
            email
                .trim()
                .toLowerCase();

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                $or: [
                    {
                        email:
                            identifier,
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

        // OTP is generated only after
        // password is correct.

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
            // Generate a NEW OTP.
            // Previous OTP becomes invalid.

            const otp =
                generateOtp();

            const otpExpires =
                new Date(
                    Date.now() +
                    5 * 60 * 1000
                );

            // ==========================================
            // SEND OTP
            // ==========================================

            const whatsappResponse =
                await sendWhatsappOtp(
                    user.whatsapp,
                    otp,
                    user.name
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
            // SAVE OTP
            // ==========================================

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
        // GENERATE JWT
        // ==========================================

        const token =
            generateToken(
                user._id
            );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            token,

            user: {
                id:
                    user._id,

                name:
                    user.name,

                username:
                    user.username,

                email:
                    user.email,

                whatsapp:
                    user.whatsapp,

                balance:
                    user.balance,

                currency:
                    user.currency,

                role:
                    user.role,

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

        if (
            !whatsapp ||
            !otp
        ) {
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
            user.whatsappOtpExpires.getTime() <
            Date.now()
        ) {
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

        user.whatsappOtp =
            null;

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
        const {
            whatsapp,
        } = req.body;

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
                otp,
                user.name
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
                id:
                    req.user._id,

                name:
                    req.user.name,

                username:
                    req.user.username,

                email:
                    req.user.email,

                whatsapp:
                    req.user.whatsapp,

                balance:
                    req.user.balance,

                currency:
                    req.user.currency,

                role:
                    req.user.role,

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

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (req, res) => {
    try {
        // ==========================================
        // GET WHATSAPP FROM REQUEST
        // ==========================================

        const { whatsapp } = req.body;

        if (!whatsapp) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number is required",
            });
        }

        // ==========================================
        // NORMALIZE WHATSAPP NUMBER
        // DATABASE FORMAT:
        // +923333108018
        //
        // Supported inputs:
        // 03333108018
        // 923333108018
        // +923333108018
        // ==========================================

        let normalizedWhatsapp =
            whatsapp
                .trim()
                .replace(/\s+/g, "");

        if (
            normalizedWhatsapp.startsWith("03")
        ) {
            normalizedWhatsapp =
                "+92" +
                normalizedWhatsapp.slice(1);
        } else if (
            normalizedWhatsapp.startsWith("92")
        ) {
            normalizedWhatsapp =
                "+" +
                normalizedWhatsapp;
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            }).select(
                "+passwordResetOtp +passwordResetOtpExpires"
            );

        // ==========================================
        // USER NOT FOUND
        // ==========================================

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "No account found with this WhatsApp number",
            });
        }

        // ==========================================
        // CHECK ACCOUNT STATUS
        // ==========================================

        if (
            user.status !== "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    `Your account is ${user.status}`,
            });
        }

        // ==========================================
        // GENERATE OTP
        // ==========================================

        const otp = generateOtp();

        // ==========================================
        // SAVE OTP
        // ==========================================

        user.passwordResetOtp = otp;

        user.passwordResetOtpExpires =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        await user.save();

        // ==========================================
        // SEND PASSWORD RESET OTP
        // ==========================================

        const whatsappResult =
            await sendPasswordResetOtp(
                user.whatsapp,
                otp,
                user.name
            );

        // ==========================================
        // WHATSAPP SEND FAILED
        // ==========================================

        if (
            !whatsappResult.success
        ) {
            // Clear OTP if WhatsApp failed
            user.passwordResetOtp = null;

            user.passwordResetOtpExpires =
                null;

            await user.save();

            return res.status(500).json({
                success: false,
                message:
                    "Failed to send password reset OTP",
            });
        }

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({
            success: true,
            message:
                "Password reset OTP sent successfully",
        });

    } catch (error) {
        // ==========================================
        // SERVER ERROR
        // ==========================================

        console.error(
            "Forgot Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error",
        });
    }
};

// ==========================================
// VERIFY PASSWORD RESET OTP
// ==========================================

export const verifyResetOtp = async (req, res) => {
    try {
        const { whatsapp, otp } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!whatsapp || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp number and OTP are required",
            });
        }

        // ==========================================
        // NORMALIZE WHATSAPP
        // DATABASE FORMAT:
        // +923333108018
        // ==========================================

        let normalizedWhatsapp =
            whatsapp
                .trim()
                .replace(/\s+/g, "");

        if (
            normalizedWhatsapp.startsWith("03")
        ) {
            normalizedWhatsapp =
                "+92" +
                normalizedWhatsapp.slice(1);
        } else if (
            normalizedWhatsapp.startsWith("92")
        ) {
            normalizedWhatsapp =
                "+" +
                normalizedWhatsapp;
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            }).select(
                "+passwordResetOtp +passwordResetOtpExpires"
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "No account found with this WhatsApp number",
            });
        }

        // ==========================================
        // CHECK RESET REQUEST
        // ==========================================

        if (
            !user.passwordResetOtp
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No password reset request found. Please request a new OTP.",
            });
        }

        // ==========================================
        // CHECK OTP EXPIRY
        // ==========================================

        if (
            !user.passwordResetOtpExpires ||
            user.passwordResetOtpExpires <
            new Date()
        ) {
            user.passwordResetOtp = null;

            user.passwordResetOtpExpires =
                null;

            await user.save();

            return res.status(400).json({
                success: false,
                message:
                    "OTP has expired. Please request a new OTP.",
            });
        }

        // ==========================================
        // CHECK OTP
        // ==========================================

        if (
            String(user.passwordResetOtp) !==
            String(otp).trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid OTP",
            });
        }

        // ==========================================
        // OTP VERIFIED
        // ==========================================

        return res.status(200).json({
            success: true,
            message:
                "OTP verified successfully",
        });

    } catch (error) {
        console.error(
            "Verify Reset OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error",
        });
    }
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (
    req,
    res
) => {
    try {
        const {
            whatsapp,
            otp,
            newPassword,
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            !whatsapp ||
            !otp ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "WhatsApp, OTP and new password are required",
            });
        }

        // ==========================================
        // PASSWORD VALIDATION
        // ==========================================

        if (
            newPassword.length < 6
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters",
            });
        }

        // ==========================================
        // NORMALIZE WHATSAPP
        // ==========================================
        //
        // Database format:
        // +923333108018
        //
        // Supported inputs:
        // 03333108018
        // 923333108018
        // +923333108018
        //
        // ==========================================

        let normalizedWhatsapp =
            whatsapp
                .trim()
                .replace(/\s+/g, "");

        if (
            normalizedWhatsapp.startsWith("03")
        ) {
            normalizedWhatsapp =
                "+92" +
                normalizedWhatsapp.slice(1);
        } else if (
            normalizedWhatsapp.startsWith("92")
        ) {
            normalizedWhatsapp =
                "+" +
                normalizedWhatsapp;
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                whatsapp:
                    normalizedWhatsapp,
            }).select(
                "+password +passwordResetOtp +passwordResetOtpExpires"
            );

        // ==========================================
        // USER NOT FOUND
        // ==========================================

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "No account found with this WhatsApp number",
            });
        }

        // ==========================================
        // CHECK RESET REQUEST
        // ==========================================

        if (
            !user.passwordResetOtp
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No password reset request found. Please request a new OTP.",
            });
        }

        // ==========================================
        // CHECK OTP EXPIRY
        // ==========================================

        if (
            !user.passwordResetOtpExpires ||
            user.passwordResetOtpExpires <
            new Date()
        ) {
            user.passwordResetOtp = null;

            user.passwordResetOtpExpires =
                null;

            await user.save();

            return res.status(400).json({
                success: false,
                message:
                    "OTP has expired. Please request a new OTP.",
            });
        }

        // ==========================================
        // CHECK OTP
        // ==========================================

        if (
            String(
                user.passwordResetOtp
            ) !==
            String(otp).trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid OTP",
            });
        }

        // ==========================================
        // HASH NEW PASSWORD
        // ==========================================

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                12
            );

        // ==========================================
        // UPDATE PASSWORD
        // ==========================================

        user.password =
            hashedPassword;

        // ==========================================
        // CLEAR RESET OTP
        // ==========================================

        user.passwordResetOtp =
            null;

        user.passwordResetOtpExpires =
            null;

        await user.save();

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully",
        });

    } catch (error) {
        console.error(
            "Reset Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error",
        });
    }
};