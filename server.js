import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import seedCurrencies from "./utils/seedCurrencies.js";


import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminPaymentRoutes from "./routes/adminPaymentRoutes.js";
import whatsappWebhookRoutes from "./routes/whatsappWebhookRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import userServiceRoutes from "./routes/userServiceRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";
import refillRoutes from "./routes/refillRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import {
    startServiceSyncCron,
} from "./services/serviceSyncScheduler.js";

import {
    startOrderStatusCron,
} from "./services/orderStatusSyncService.js";
import adminCurrencyRoutes from "./routes/adminCurrencyRoutes.js";
import userCurrencyRoutes from "./routes/userCurrencyRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";

dotenv.config();

const app = express();


// ==========================================
// DATABASE
// ==========================================

await connectDB();
await seedCurrencies();

// ==========================================
// ORDER STATUS CRON
// ==========================================
//
// Automatically syncs active orders with
// the provider every 2 minutes.
//
// ==========================================

startOrderStatusCron();
startServiceSyncCron();


// ==========================================
// CORS
// ==========================================

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173" ||
            "http://192.168.1.102:5173",

        credentials: true,
    })
);


// ==========================================
// WHATSAPP WEBHOOK
// ==========================================
//
// IMPORTANT:
// WhatsApp webhook signature verification
// requires the ORIGINAL raw request body.
//
// Therefore express.raw() MUST come before
// normal express.json().
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

app.use(
    "/api/dashboard",
    dashboardRoutes
);

// ==========================================
// ADMIN PAYMENT ROUTES
// ==========================================

app.use(
    "/api/admin/payments",
    adminPaymentRoutes
);

app.use(
    "/api/admin/currencies",
    adminCurrencyRoutes
);

// ==========================================
// PROVIDER ROUTES
// ==========================================

app.use(
    "/api/providers",
    providerRoutes
);


// ==========================================
// SERVICE ROUTES
// ==========================================

app.use(
    "/api/services",
    serviceRoutes
);



// ==========================================
// USER SERVICE ROUTES
// ==========================================

app.use(
    "/api/currencies",
    currencyRoutes
);

app.use(
    "/api/user/services",
    userServiceRoutes
);

app.use(
    "/api/refund-requests",
    refundRoutes
);

app.use(
    "/api/refill-requests",
    refillRoutes
);

app.use(
    "/api/user/currency",
    userCurrencyRoutes
);

// ==========================================
// ORDER ROUTES
// ==========================================

app.use(
    "/api/orders",
    orderRoutes
);

app.use(
    "/api/dashboard",
    dashboardRoutes
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
        "🔌 Provider API:"
    );

    console.log(
        "/api/providers"
    );

    console.log(
        "🛠️ Service API:"
    );

    console.log(
        "/api/services"
    );

    console.log(
        "👤 User Service API:"
    );

    console.log(
        "/api/user/services"
    );

    console.log(
        "📦 Order API:"
    );

    console.log(
        "/api/orders"
    );

    console.log(
        "⏰ Order Status Cron:"
    );

    console.log(
        "Every 2 minutes"
    );

    console.log(
        "=========================================="
    );

});