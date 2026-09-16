import Currency from "../models/Currency.js";

// ==========================================
// GET ACTIVE CURRENCIES
// ==========================================

export const getActiveCurrencies = async (
    req,
    res
) => {
    try {
        const currencies =
            await Currency.find({
                status: "active",
            })
                .select(
                    "code name symbol rate status"
                )
                .sort({ code: 1 })
                .lean();

        return res.status(200).json({
            success: true,
            currencies,
        });
    } catch (error) {
        console.error(
            "❌ Get Active Currencies Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch currencies.",
        });
    }
};