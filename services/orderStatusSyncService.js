import cron from "node-cron";

import Order from "../models/Order.js";

import {
    getProviderOrderStatus,
} from "./providerService.js";


// ==========================================
// MAP PROVIDER STATUS
// ==========================================

const mapProviderStatus = (status) => {
    if (!status) {
        return "processing";
    }

    const normalizedStatus = String(status)
        .trim()
        .toLowerCase();

    switch (normalizedStatus) {
        case "pending":
            return "pending";

        case "in progress":
        case "in-progress":
        case "processing":
        case "progress":
            return "processing";

        case "completed":
        case "complete":
        case "success":
            return "completed";

        case "partial":
            return "partial";

        case "canceled":
        case "cancelled":
        case "cancel":
            return "canceled";

        case "refunded":
        case "refund":
            return "refunded";

        default:
            return "processing";
    }
};


// ==========================================
// SYNC ONE ORDER
// ==========================================

const syncSingleOrder = async (order) => {
    try {
        if (!order.provider) {
            console.log(
                `⚠️ Order ${order.orderId}: provider missing`
            );

            return;
        }

        if (!order.providerOrderId) {
            console.log(
                `⚠️ Order ${order.orderId}: provider order ID missing`
            );

            return;
        }

        if (
            order.provider.status !==
            "active"
        ) {
            console.log(
                `⚠️ Order ${order.orderId}: provider inactive`
            );

            return;
        }

        // ==========================================
        // PROVIDER STATUS
        // ==========================================

        const providerResponse =
            await getProviderOrderStatus({
                provider:
                    order.provider,

                order:
                    order.providerOrderId,
            });

        if (
            !providerResponse ||
            providerResponse.error
        ) {
            console.log(
                `❌ Order ${order.orderId}: provider error`,
                providerResponse?.error
            );

            return;
        }

        // ==========================================
        // MAP STATUS
        // ==========================================

        const newStatus =
            mapProviderStatus(
                providerResponse.status
            );

        order.status =
            newStatus;

        // ==========================================
        // START COUNT
        // ==========================================

        if (
            providerResponse.start_count !==
            undefined &&
            providerResponse.start_count !==
            null &&
            providerResponse.start_count !==
            ""
        ) {
            const startCount =
                Number(
                    providerResponse.start_count
                );

            if (
                Number.isFinite(
                    startCount
                )
            ) {
                order.startCount =
                    startCount;
            }
        }

        // ==========================================
        // REMAINS
        // ==========================================

        if (
            providerResponse.remains !==
            undefined &&
            providerResponse.remains !==
            null &&
            providerResponse.remains !==
            ""
        ) {
            const remains =
                Number(
                    providerResponse.remains
                );

            if (
                Number.isFinite(
                    remains
                )
            ) {
                order.remains =
                    remains;
            }
        }

        // ==========================================
        // PROVIDER CHARGE
        // INTERNAL ONLY
        // ==========================================

        if (
            providerResponse.charge !==
            undefined &&
            providerResponse.charge !==
            null &&
            providerResponse.charge !==
            ""
        ) {
            const providerCharge =
                Number(
                    providerResponse.charge
                );

            if (
                Number.isFinite(
                    providerCharge
                )
            ) {
                order.providerCharge =
                    providerCharge;
            }
        }

        // ==========================================
        // CURRENCY
        // ==========================================

        if (
            providerResponse.currency
        ) {
            order.currency =
                String(
                    providerResponse.currency
                );
        }

        // ==========================================
        // COMPLETED DATE
        // ==========================================

        if (
            newStatus ===
            "completed" &&
            !order.completedAt
        ) {
            order.completedAt =
                new Date();
        }

        // ==========================================
        // SAVE
        // ==========================================

        await order.save();

        console.log(
            `✅ Order ${order.orderId} synced → ${newStatus}`
        );
    } catch (error) {
        console.error(
            `❌ Order ${order.orderId} sync failed:`,
            error.message
        );
    }
};


// ==========================================
// SYNC ALL ACTIVE ORDERS
// ==========================================

export const syncActiveOrders = async () => {
    try {
        console.log(
            "=========================================="
        );

        console.log(
            "🔄 ORDER STATUS SYNC STARTED"
        );

        console.log(
            "=========================================="
        );

        const orders =
            await Order.find({
                status: {
                    $in: [
                        "pending",
                        "processing",
                        "partial",
                    ],
                },

                providerOrderId: {
                    $ne: null,
                },
            }).populate({
                path: "provider",

                select:
                    "+apiKey name apiUrl apiType status",
            });

        console.log(
            `📦 Active orders found: ${orders.length}`
        );

        for (
            const order of orders
        ) {
            await syncSingleOrder(
                order
            );
        }

        console.log(
            "=========================================="
        );

        console.log(
            "✅ ORDER STATUS SYNC FINISHED"
        );

        console.log(
            "=========================================="
        );
    } catch (error) {
        console.error(
            "❌ ORDER STATUS SYNC ERROR:",
            error.message
        );
    }
};


// ==========================================
// START CRON
// ==========================================

export const startOrderStatusCron = () => {
    // Every 2 minutes
    cron.schedule(
        "*/2 * * * *",
        async () => {
            await syncActiveOrders();
        }
    );

    console.log(
        "⏰ Order status cron started."
    );

    console.log(
        "⏱️ Status sync interval: every 2 minutes."
    );
};