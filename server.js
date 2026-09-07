import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminPaymentRoutes from "./routes/adminPaymentRoutes.js";
import whatsappWebhookRoutes from "./routes/whatsappWebhookRoutes.js";

dotenv.config();

const app = express();

// ==========================================
// DATABASE
// ==========================================

await connectDB();

// ==========================================
// CORS
// ==========================================

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        credentials: true,
    })
);

// ==========================================
// JSON BODY PARSER
// ==========================================

app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = Buffer.from(buf);
        },
        strict: false,
    })
);

// ==========================================
// URL ENCODED BODY
// ==========================================

app.use(
    express.urlencoded({
        extended: true,
    })
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AiFi SMM API is running",
    });
});

// ==========================================
// AUTH ROUTES
// ==========================================

app.use(
    "/api/auth",
    authRoutes
);

// ==========================================
// USER PAYMENT ROUTES
// ==========================================

app.use(
    "/api/payments",
    paymentRoutes
);

// ==========================================
// ADMIN PAYMENT ROUTES
// ==========================================

app.use(
    "/api/admin/payments",
    adminPaymentRoutes
);

// ==========================================
// WHATSAPP WEBHOOK
// ==========================================

app.use(
    "/api/webhook/whatsapp",
    whatsappWebhookRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error("==========================================");
    console.error("❌ GLOBAL ERROR");
    console.error("==========================================");
    console.error(err);
    console.error("==========================================");

    // JSON parsing error
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON body",
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message:
            err.message ||
            "Internal Server Error",
    });
});

// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 4040;

app.listen(PORT, () => {
    console.log("==========================================");
    console.log("🚀 AiFi SMM Backend Started");
    console.log(`📡 Port: ${PORT} `);
    console.log(
        `🌐 Webhook: /api/webhook / whatsapp`
    );
    console.log("==========================================");
});