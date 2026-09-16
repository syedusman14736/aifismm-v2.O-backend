import express from "express";

import {
    getServices,
    getServiceById,
    updateService,
    updateServiceStatus,
    deleteService,
} from "../controllers/serviceController.js";

import {
    syncServices,
} from "../controllers/serviceSyncController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// ============================================================
// ADMIN AUTH
// ============================================================

router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================================
// GET ALL SERVICES
// ============================================================

router.get(
    "/",
    getServices
);

// ============================================================
// SYNC PROVIDER SERVICES
// ============================================================

router.post(
    "/provider/:providerId/sync",
    syncServices
);

// ============================================================
// GET SINGLE SERVICE
// ============================================================

router.get(
    "/:serviceId",
    getServiceById
);

// ============================================================
// UPDATE SERVICE
// ============================================================

router.put(
    "/:serviceId",
    updateService
);

// ============================================================
// UPDATE SERVICE STATUS
// ============================================================

router.patch(
    "/:serviceId/status",
    updateServiceStatus
);

// ============================================================
// DELETE SERVICE
// ============================================================

router.delete(
    "/:serviceId",
    deleteService
);

export default router;