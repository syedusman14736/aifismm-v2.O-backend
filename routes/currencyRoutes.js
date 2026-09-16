import express from "express";

import {
    getActiveCurrencies,
} from "../controllers/publicCurrencyController.js";

const router = express.Router();

router.get(
    "/",
    getActiveCurrencies
);

export default router;