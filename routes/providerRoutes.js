import express from "express";

import {
    createProvider,
    getProviders,
    getProviderById,
    updateProvider,
    updateProviderStatus,
    deleteProvider,
    testProviderConnection,
} from "../controllers/providerController.js";

import {
    syncServices,
} from "../controllers/serviceSyncController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// ==========================================
// ADMIN PROTECTION
// ==========================================

router.use(authMiddleware);
router.use(adminMiddleware);

// ==========================================
// PROVIDER ROUTES
// ==========================================

// Create provider
router.post("/", createProvider);

// Get all providers
router.get("/", getProviders);

// Test provider connection
router.post(
    "/:providerId/test",
    testProviderConnection
);

// Sync provider services
router.post(
    "/:providerId/sync-services",
    syncServices
);

// Get single provider
router.get(
    "/:providerId",
    getProviderById
);

// Update provider
router.put(
    "/:providerId",
    updateProvider
);

// Update provider status
router.patch(
    "/:providerId/status",
    updateProviderStatus
);

// Deactivate provider
router.delete(
    "/:providerId",
    deleteProvider
);

// ==========================================
// DEFAULT EXPORT
// ==========================================

export default router;