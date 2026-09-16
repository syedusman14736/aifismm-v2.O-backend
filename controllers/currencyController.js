import Currency from "../models/Currency.js";

// ==========================================
// GET ALL CURRENCIES
// ==========================================

export const getCurrencies = async (req, res) => {
    try {
        const currencies = await Currency.find({})
            .sort({ code: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            currencies,
        });
    } catch (error) {
        console.error("❌ Get Currencies Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch currencies.",
        });
    }
};

// ==========================================
// CREATE CURRENCY
// ==========================================

export const createCurrency = async (req, res) => {
    try {
        let {
            code,
            name,
            symbol,
            rate,
            status,
        } = req.body;

        code = String(code || "")
            .trim()
            .toUpperCase();

        name = String(name || "").trim();
        symbol = String(symbol || "").trim();

        rate = Number(rate);

        status =
            status === "inactive"
                ? "inactive"
                : "active";

        // ------------------------------
        // VALIDATION
        // ------------------------------

        if (!/^[A-Z]{3}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message:
                    "Currency code must contain exactly 3 letters.",
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Currency name is required.",
            });
        }

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Currency symbol is required.",
            });
        }

        if (!Number.isFinite(rate) || rate <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Currency rate must be greater than 0.",
            });
        }

        // ------------------------------
        // PKR IS ALWAYS BASE CURRENCY
        // ------------------------------

        if (code === "PKR") {
            return res.status(400).json({
                success: false,
                message:
                    "PKR is the base currency and cannot be added manually.",
            });
        }

        // ------------------------------
        // CHECK DUPLICATE
        // ------------------------------

        const existingCurrency =
            await Currency.findOne({ code });

        if (existingCurrency) {
            return res.status(409).json({
                success: false,
                message:
                    "Currency with this code already exists.",
            });
        }

        // ------------------------------
        // CREATE
        // ------------------------------

        const currency = await Currency.create({
            code,
            name,
            symbol,
            rate,
            status,
        });

        return res.status(201).json({
            success: true,
            message: "Currency created successfully.",
            currency,
        });
    } catch (error) {
        console.error("❌ Create Currency Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "Currency with this code already exists.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create currency.",
        });
    }
};

// ==========================================
// UPDATE CURRENCY
// ==========================================

export const updateCurrency = async (req, res) => {
    try {
        const code = String(req.params.code || "")
            .trim()
            .toUpperCase();

        const currency =
            await Currency.findOne({ code });

        if (!currency) {
            return res.status(404).json({
                success: false,
                message: "Currency not found.",
            });
        }

        const {
            name,
            symbol,
            rate,
            status,
        } = req.body;

        // ------------------------------
        // PKR PROTECTION
        // ------------------------------

        if (currency.code === "PKR") {
            if (rate !== undefined) {
                const newRate = Number(rate);

                if (newRate !== 1) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "PKR rate must always remain 1.",
                    });
                }
            }

            if (status === "inactive") {
                return res.status(400).json({
                    success: false,
                    message:
                        "PKR cannot be deactivated.",
                });
            }
        }

        // ------------------------------
        // UPDATE NAME
        // ------------------------------

        if (name !== undefined) {
            const newName = String(name).trim();

            if (!newName) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Currency name cannot be empty.",
                });
            }

            currency.name = newName;
        }

        // ------------------------------
        // UPDATE SYMBOL
        // ------------------------------

        if (symbol !== undefined) {
            const newSymbol = String(symbol).trim();

            if (!newSymbol) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Currency symbol cannot be empty.",
                });
            }

            currency.symbol = newSymbol;
        }

        // ------------------------------
        // UPDATE RATE
        // ------------------------------

        if (rate !== undefined) {
            const newRate = Number(rate);

            if (
                !Number.isFinite(newRate) ||
                newRate <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Currency rate must be greater than 0.",
                });
            }

            currency.rate =
                currency.code === "PKR"
                    ? 1
                    : newRate;
        }

        // ------------------------------
        // UPDATE STATUS
        // ------------------------------

        if (status !== undefined) {
            if (
                status !== "active" &&
                status !== "inactive"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Status must be active or inactive.",
                });
            }

            if (
                currency.code === "PKR" &&
                status === "inactive"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "PKR cannot be deactivated.",
                });
            }

            currency.status = status;
        }

        await currency.save();

        return res.status(200).json({
            success: true,
            message: "Currency updated successfully.",
            currency,
        });
    } catch (error) {
        console.error("❌ Update Currency Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update currency.",
        });
    }
};

// ==========================================
// DELETE CURRENCY
// ==========================================

export const deleteCurrency = async (req, res) => {
    try {
        const code = String(req.params.code || "")
            .trim()
            .toUpperCase();

        // ------------------------------
        // PKR PROTECTION
        // ------------------------------

        if (code === "PKR") {
            return res.status(400).json({
                success: false,
                message:
                    "PKR is the base currency and cannot be deleted.",
            });
        }

        const currency =
            await Currency.findOne({ code });

        if (!currency) {
            return res.status(404).json({
                success: false,
                message: "Currency not found.",
            });
        }

        // For now currencies can be deleted.
        // Once User.currency is added, we will
        // protect currencies currently selected
        // by users.

        await Currency.deleteOne({ code });

        return res.status(200).json({
            success: true,
            message: "Currency deleted successfully.",
        });
    } catch (error) {
        console.error("❌ Delete Currency Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete currency.",
        });
    }
};