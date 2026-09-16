import Currency from "../models/Currency.js";
import User from "../models/User.js";

// ==========================================
// GET USER CURRENCY
// ==========================================

export const getUserCurrency = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("currency");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const currencyCode =
            user.currency || "PKR";

        const currency =
            await Currency.findOne({
                code: currencyCode,
                status: "active",
            }).lean();

        // Safety fallback
        if (!currency) {
            const pkr =
                await Currency.findOne({
                    code: "PKR",
                }).lean();

            return res.status(200).json({
                success: true,
                currency: pkr,
            });
        }

        return res.status(200).json({
            success: true,
            currency,
        });
    } catch (error) {
        console.error(
            "❌ Get User Currency Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch currency.",
        });
    }
};

// ==========================================
// UPDATE USER CURRENCY
// ==========================================

export const updateUserCurrency = async (req, res) => {
    try {
        const code = String(
            req.body.currency || ""
        )
            .trim()
            .toUpperCase();

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Currency is required.",
            });
        }

        // ----------------------------------
        // ONLY ACTIVE CURRENCIES
        // ----------------------------------

        const currency =
            await Currency.findOne({
                code,
                status: "active",
            });

        if (!currency) {
            return res.status(400).json({
                success: false,
                message:
                    "Currency is not available.",
            });
        }

        // ----------------------------------
        // UPDATE USER
        // ----------------------------------

        const user =
            await User.findByIdAndUpdate(
                req.user._id,
                {
                    $set: {
                        currency: currency.code,
                    },
                },
                {
                    returnDocument: "after",
                }
            ).select(
                "_id name username email currency"
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Currency updated successfully.",
            user,
            currency,
        });
    } catch (error) {
        console.error(
            "❌ Update User Currency Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update currency.",
        });
    }
};