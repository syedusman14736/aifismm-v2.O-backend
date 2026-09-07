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
// WHATSAPP WEBHOOK
// ==========================================
//
// IMPORTANT:
// WhatsApp sends X-Hub-Signature-256.
// Therefore we must preserve the ORIGINAL
// raw request body before parsing JSON.
//
// Webhook uses express.raw()
// instead of global express.json().
//
// ==========================================

app.use(
    "/api/webhook/whatsapp",
    express.raw({
        type: "application/json",
    }),
    (req, res, next) => {
        try {
            console.log(
                "=========================================="
            );

            console.log(
                "🔥 WHATSAPP WEBHOOK REQUEST"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "Body type:",
                typeof req.body
            );

            console.log(
                "Is Buffer:",
                Buffer.isBuffer(req.body)
            );

            // --------------------------------------
            // SAVE ORIGINAL RAW BODY
            // --------------------------------------

            if (Buffer.isBuffer(req.body)) {
                console.log(
                    "Raw length:",
                    req.body.length
                );

                console.log(
                    "Raw text:",
                    req.body.toString("utf8")
                );

                req.rawBody = req.body;
            } else {
                req.rawBody = Buffer.from("");
            }

            // --------------------------------------
            // PARSE JSON
            // --------------------------------------

            if (req.rawBody.length > 0) {
                req.body = JSON.parse(
                    req.rawBody.toString("utf8")
                );
            } else {
                req.body = {};
            }

            console.log(
                "Parsed body:",
                req.body
            );

            console.log(
                "=========================================="
            );

            next();

        } catch (error) {
            console.error(
                "=========================================="
            );

            console.error(
                "❌ WhatsApp JSON Parse Error"
            );

            console.error(error);

            console.error(
                "=========================================="
            );

            return res.status(400).json({
                success: false,
                message: "Invalid JSON body",
            });
        }
    },

    whatsappWebhookRoutes
);

// ==========================================
// NORMAL JSON BODY
// ==========================================
//
// All other API routes use normal JSON.
//
// ==========================================

app.use(
    express.json()
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

app.use(
    (err, req, res, next) => {
        console.error(
            "=========================================="
        );

        console.error(
            "❌ GLOBAL ERROR"
        );

        console.error(
            "=========================================="
        );

        console.error(err);

        console.error(
            "=========================================="
        );

        return res.status(
            err.status || 500
        ).json({
            success: false,
            message:
                err.message ||
                "Internal Server Error",
        });
    }
);

// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 4040;

app.listen(PORT, () => {
    console.log(
        "=========================================="
    );

    console.log(
        "🚀 AiFi SMM Backend Started"
    );

    console.log(
        `📡 Port: ${PORT}`
    );

    console.log(
        "🌐 API: /api"
    );

    console.log(
        "📱 WhatsApp Webhook:"
    );

    console.log(
        "/api/webhook/whatsapp"
    );

    console.log(
        "=========================================="
    );
});