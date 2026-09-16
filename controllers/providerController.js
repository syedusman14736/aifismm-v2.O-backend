import mongoose from "mongoose";
import Provider from "../models/Provider.js";

// ==========================================
// CREATE PROVIDER
// ==========================================

export const createProvider = async (req, res) => {
    try {
        const {
            name,
            apiUrl,
            apiKey,
            apiType,
            status,
        } = req.body;

        if (!name || !apiUrl || !apiKey) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, API URL and API key are required.",
            });
        }

        const existingProvider =
            await Provider.findOne({
                name: name.trim(),
            });

        if (existingProvider) {
            return res.status(409).json({
                success: false,
                message:
                    "Provider with this name already exists.",
            });
        }

        const provider = await Provider.create({
            name: name.trim(),
            apiUrl: apiUrl.trim(),
            apiKey: apiKey.trim(),
            apiType:
                apiType || "standard_smm",
            status: status || "active",
        });

        return res.status(201).json({
            success: true,
            message:
                "Provider created successfully.",
            provider: {
                id: provider._id,
                name: provider.name,
                apiUrl: provider.apiUrl,
                apiType: provider.apiType,
                status: provider.status,
            },
        });
    } catch (error) {
        console.error(
            "Create Provider Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to create provider.",
        });
    }
};

// ==========================================
// GET ALL PROVIDERS
// ==========================================

export const getProviders = async (req, res) => {
    try {
        const providers = await Provider.find()
            .select("-apiKey")
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            count: providers.length,
            providers,
        });
    } catch (error) {
        console.error(
            "Get Providers Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch providers.",
        });
    }
};

// ==========================================
// GET SINGLE PROVIDER
// ==========================================

export const getProviderById = async (
    req,
    res
) => {
    try {
        const { providerId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(
                providerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID.",
            });
        }

        const provider =
            await Provider.findById(providerId)
                .select("-apiKey");

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Provider not found.",
            });
        }

        return res.status(200).json({
            success: true,
            provider,
        });
    } catch (error) {
        console.error(
            "Get Provider Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch provider.",
        });
    }
};

// ==========================================
// UPDATE PROVIDER
// ==========================================

export const updateProvider = async (
    req,
    res
) => {
    try {
        const { providerId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(
                providerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID.",
            });
        }

        const provider =
            await Provider.findById(providerId)
                .select("+apiKey");

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Provider not found.",
            });
        }

        const {
            name,
            apiUrl,
            apiKey,
            apiType,
            status,
        } = req.body;

        if (name !== undefined) {
            const trimmedName =
                name.trim();

            const duplicate =
                await Provider.findOne({
                    name: trimmedName,
                    _id: {
                        $ne: providerId,
                    },
                });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Another provider with this name already exists.",
                });
            }

            provider.name = trimmedName;
        }

        if (apiUrl !== undefined) {
            provider.apiUrl =
                apiUrl.trim();
        }

        if (apiKey !== undefined) {
            provider.apiKey =
                apiKey.trim();
        }

        if (apiType !== undefined) {
            if (
                apiType !== "standard_smm"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Unsupported provider API type.",
                });
            }

            provider.apiType = apiType;
        }

        if (status !== undefined) {
            if (
                ![
                    "active",
                    "inactive",
                ].includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid provider status.",
                });
            }

            provider.status = status;
        }

        await provider.save();

        return res.status(200).json({
            success: true,
            message:
                "Provider updated successfully.",
            provider: {
                id: provider._id,
                name: provider.name,
                apiUrl: provider.apiUrl,
                apiType: provider.apiType,
                status: provider.status,
            },
        });
    } catch (error) {
        console.error(
            "Update Provider Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update provider.",
        });
    }
};

// ==========================================
// UPDATE PROVIDER STATUS
// ==========================================

export const updateProviderStatus = async (
    req,
    res
) => {
    try {
        const { providerId } = req.params;
        const { status } = req.body;

        if (
            !mongoose.Types.ObjectId.isValid(
                providerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID.",
            });
        }

        if (
            ![
                "active",
                "inactive",
            ].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be active or inactive.",
            });
        }

        const provider =
            await Provider.findByIdAndUpdate(
                providerId,
                {
                    status,
                },
                {
                    new: true,
                }
            ).select("-apiKey");

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Provider not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                `Provider ${status} successfully.`,
            provider,
        });
    } catch (error) {
        console.error(
            "Update Provider Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update provider status.",
        });
    }
};

// ==========================================
// DELETE PROVIDER
// ==========================================

export const deleteProvider = async (
    req,
    res
) => {
    try {
        const { providerId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(
                providerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID.",
            });
        }

        const provider =
            await Provider.findById(providerId);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Provider not found.",
            });
        }

        // --------------------------------------
        // SOFT DELETE
        // --------------------------------------

        provider.status = "inactive";

        await provider.save();

        return res.status(200).json({
            success: true,
            message:
                "Provider deactivated successfully.",
        });
    } catch (error) {
        console.error(
            "Delete Provider Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to deactivate provider.",
        });
    }
};

// ==========================================
// TEST PROVIDER CONNECTION
// ==========================================

export const testProviderConnection = async (
    req,
    res
) => {
    try {
        const { providerId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(
                providerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID.",
            });
        }

        const provider =
            await Provider.findById(
                providerId
            ).select("+apiKey");

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Provider not found.",
            });
        }

        if (
            provider.status !== "active"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider is inactive.",
            });
        }

        if (
            provider.apiType !==
            "standard_smm"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported provider API type.",
            });
        }

        const body =
            new URLSearchParams();

        body.append(
            "key",
            provider.apiKey
        );

        body.append(
            "action",
            "balance"
        );

        const response = await fetch(
            provider.apiUrl,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                body,
            }
        );

        let data;

        try {
            data =
                await response.json();
        } catch {
            return res.status(502).json({
                success: false,
                message:
                    "Provider returned invalid JSON.",
            });
        }

        if (data?.error) {
            return res.status(400).json({
                success: false,
                message: data.error,
            });
        }

        if (
            data?.balance !== undefined &&
            data?.balance !== null
        ) {
            return res.status(200).json({
                success: true,
                message:
                    "Provider connection successful.",
                provider: {
                    id: provider._id,
                    name: provider.name,
                    status: provider.status,
                },
                balance: data.balance,
                currency:
                    data.currency || null,
            });
        }

        return res.status(502).json({
            success: false,
            message:
                "Provider returned unexpected response.",
        });
    } catch (error) {
        console.error(
            "Test Provider Connection Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to connect to provider.",
        });
    }
};