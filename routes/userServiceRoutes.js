import express from "express";

import {
    getUserServices,
} from "../controllers/serviceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// USER AUTH
// ============================================================

router.use(authMiddleware);

// ============================================================
// GET USER SERVICES
// ============================================================

router.get(
    "/",
    getUserServices
);

export default router;