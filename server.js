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

await connectDB();

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        credentials: true,
    })
);


// ==========================================
// JSON BODY + RAW BODY
// ==========================================

app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody =
                Buffer.from(buf);
        },
    })
);

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
        message:
            "AiFi SMM API is running",
    });
});


// ==========================================
// AUTH
// ==========================================

app.use(
    "/api/auth",
    authRoutes
);


// ==========================================
// USER PAYMENTS
// ==========================================

app.use(
    "/api/payments",
    paymentRoutes
);


// ==========================================
// ADMIN PAYMENTS
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
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `🚀 Server running on port ${PORT}`
    );
});