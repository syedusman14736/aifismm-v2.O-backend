import Provider from "../models/Provider.js";

import {
    syncProviderServices,
} from "../services/serviceSyncService.js";

// ============================================================
// SYNC PROVIDER SERVICES
// ============================================================

export const syncServices = async (req, res) => {
    try {
        const { providerId } = req.params;

        // ----------------------------------------------------
        // Find provider
        // ----------------------------------------------------

        const provider = await Provider.findById(
            providerId
        ).select("+apiKey");

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found.",
            });
        }

        // ----------------------------------------------------
        // Provider status
        // ----------------------------------------------------

        if (provider.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Provider is inactive.",
            });
        }

        // ----------------------------------------------------
        // Provider API type
        // ----------------------------------------------------

        if (provider.apiType !== "standard_smm") {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported provider API type.",
            });
        }

        // ----------------------------------------------------
        // Sync services
        // ----------------------------------------------------

        const result =
            await syncProviderServices(provider);

        // ----------------------------------------------------
        // Success response
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,

            message:
                "Provider services synced successfully.",

            provider: {
                id: provider._id,
                name: provider.name,
            },

            result,
        });
    } catch (error) {
        console.error(
            "Sync Services Error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                error.message ||
                "Failed to sync provider services.",
        });
    }
};