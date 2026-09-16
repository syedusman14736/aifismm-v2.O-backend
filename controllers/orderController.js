import Order from "../models/Order.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import Counter from "../models/Counter.js";

import {
    addProviderOrder,
    getProviderOrderStatus,
} from "../services/providerService.js";

// ============================================================
// GET NEXT ORDER ID
// ============================================================

const getNextOrderId = async () => {
    const counter = await Counter.findOneAndUpdate(
        {
            _id: "orderId",
        },
        {
            $inc: {
                sequence: 1,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );

    return counter.sequence;
};

// ============================================================
// RESTORE USER BALANCE
// ============================================================

const restoreUserBalance = async ({
    userId,
    amount,
}) => {
    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return;
    }

    await User.findByIdAndUpdate(
        userId,
        {
            $inc: {
                balance: amount,
            },
        }
    );
};

// ============================================================
// MAP PROVIDER STATUS
// ============================================================

const mapProviderStatus = (status) => {
    const normalized = String(
        status || ""
    )
        .trim()
        .toLowerCase();

    switch (normalized) {
        case "pending":
            return "pending";

        case "processing":
        case "in progress":
        case "in-progress":
        case "inprogress":
        case "progress":
            return "processing";

        case "completed":
        case "complete":
        case "success":
            return "completed";

        case "partial":
        case "partialed":
            return "partial";

        case "cancelled":
        case "canceled":
        case "cancel":
            return "canceled";

        case "refunded":
        case "refund":
            return "refunded";

        case "failed":
        case "error":
            return "failed";

        default:
            return "processing";
    }
};

// ============================================================
// CREATE ORDER
// ============================================================

export const createOrder = async (
    req,
    res
) => {
    let order = null;

    let balanceDeducted = false;
    let balanceRestored = false;
    let providerOrderCreated = false;

    // IMPORTANT:
    // All internal pricing is USD.
    let charge = 0;

    try {
        const {
            serviceId,
            link,
            quantity,
            comments,
            runs,
            interval,
        } = req.body;

        // ====================================================
        // BASIC VALIDATION
        // ====================================================

        const parsedServiceId =
            Number(serviceId);

        const parsedQuantity =
            Number(quantity);

        if (
            !Number.isInteger(
                parsedServiceId
            ) ||
            parsedServiceId < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid service ID.",
            });
        }

        if (
            typeof link !== "string" ||
            !link.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Link is required.",
            });
        }

        if (
            !Number.isInteger(
                parsedQuantity
            ) ||
            parsedQuantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid quantity.",
            });
        }

        // ====================================================
        // FIND ACTIVE SERVICE
        // ====================================================

        const service =
            await Service.findOne({
                serviceId:
                    parsedServiceId,

                status: "active",
            }).populate({
                path: "provider",

                select:
                    "+apiKey name apiUrl apiType status",
            });

        if (!service) {
            return res.status(404).json({
                success: false,
                message:
                    "Service not found or inactive.",
            });
        }

        // ====================================================
        // PROVIDER VALIDATION
        // ====================================================

        if (!service.provider) {
            return res.status(400).json({
                success: false,
                message:
                    "Service provider is unavailable.",
            });
        }

        if (
            service.provider.status !==
            "active"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Service provider is inactive.",
            });
        }

        if (
            service.provider.apiType !==
            "standard_smm"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported provider type.",
            });
        }

        if (
            !service.providerServiceId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider service ID is missing.",
            });
        }

        // ====================================================
        // QUANTITY VALIDATION
        // ====================================================

        const min =
            Number(service.min);

        const max =
            Number(service.max);

        if (
            !Number.isFinite(min) ||
            !Number.isFinite(max)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid service quantity limits.",
            });
        }

        if (
            parsedQuantity < min
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Minimum quantity is ${min.toLocaleString()}.`,
            });
        }

        if (
            parsedQuantity > max
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Maximum quantity is ${max.toLocaleString()}.`,
            });
        }

        // ====================================================
        // PRICE CALCULATION
        // ====================================================

        /*
         * IMPORTANT:
         *
         * service.rate is ALWAYS USD.
         *
         * Example:
         *
         * service.rate = 0.001 USD / 1000
         * quantity     = 10,000
         *
         * charge =
         * (10,000 / 1000) × 0.001
         *
         * charge = $0.01
         *
         * User-selected currency is NOT used here.
         *
         * Currency conversion is presentation-only.
         */

        const serviceRate =
            Number(service.rate);

        /*
         * rate = 0 is allowed.
         *
         * A rate of 0 means the service is free.
         *
         * Negative rates are invalid.
         */

        if (
            !Number.isFinite(
                serviceRate
            ) ||
            serviceRate < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unable to calculate order price.",
            });
        }

        // Use 8 decimal places because
        // SMM service prices can be extremely small.

        charge = Number(
            (
                (parsedQuantity / 1000) *
                serviceRate
            ).toFixed(8)
        );

        if (
            !Number.isFinite(charge) ||
            charge < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unable to calculate order price.",
            });
        }

        // ====================================================
        // GENERATE ORDER ID
        // ====================================================

        const orderId =
            await getNextOrderId();

        // ====================================================
        // DEDUCT USER BALANCE
        // ====================================================

        /*
         * User balance is stored in USD.
         *
         * Therefore:
         *
         * balance = $10.00
         * charge  = $0.50
         *
         * new balance = $9.50
         *
         * The user's selected display currency
         * does not affect this calculation.
         */

        if (charge > 0) {
            const updatedUser =
                await User.findOneAndUpdate(
                    {
                        _id:
                            req.user._id,

                        balance: {
                            $gte: charge,
                        },
                    },
                    {
                        $inc: {
                            balance:
                                -charge,
                        },
                    },
                    {
                        new: true,
                    }
                );

            if (!updatedUser) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient balance.",
                });
            }

            balanceDeducted = true;
        }

        // ====================================================
        // CREATE LOCAL ORDER
        // ====================================================

        order = new Order({
            user:
                req.user._id,

            orderId,

            service:
                service._id,

            serviceId:
                service.serviceId,

            serviceName:
                service.name,

            link:
                link.trim(),

            quantity:
                parsedQuantity,

            // Internal/base currency = USD
            rate:
                serviceRate,

            // Internal/base charge = USD
            charge,

            // IMPORTANT:
            // This must not be changed according
            // to the user's display currency.
            currency:
                "USD",

            comments:
                typeof comments ===
                    "string" &&
                    comments.trim()
                    ? comments.trim()
                    : null,

            runs:
                runs !== undefined &&
                    runs !== null &&
                    runs !== ""
                    ? Number(runs)
                    : null,

            interval:
                interval !== undefined &&
                    interval !== null &&
                    interval !== ""
                    ? Number(interval)
                    : null,

            provider:
                service.provider._id,

            providerServiceId:
                service.providerServiceId,

            providerOrderId:
                null,

            status:
                "pending",

            balanceDeducted,

            submittedAt:
                null,

            completedAt:
                null,
        });

        await order.save();

        // ====================================================
        // SEND ORDER TO PROVIDER
        // ====================================================

        const providerResponse =
            await addProviderOrder({
                provider:
                    service.provider,

                service:
                    service.providerServiceId,

                url:
                    link.trim(),

                quantity:
                    parsedQuantity,

                comments:
                    typeof comments ===
                        "string" &&
                        comments.trim()
                        ? comments.trim()
                        : undefined,

                runs:
                    runs !== undefined &&
                        runs !== null &&
                        runs !== ""
                        ? Number(runs)
                        : undefined,

                interval:
                    interval !== undefined &&
                        interval !== null &&
                        interval !== ""
                        ? Number(interval)
                        : undefined,
            });

        // ====================================================
        // VALIDATE PROVIDER RESPONSE
        // ====================================================

        if (!providerResponse) {
            throw new Error(
                "Provider returned an empty response."
            );
        }

        if (
            providerResponse.success ===
            false &&
            !providerResponse.order
        ) {
            throw new Error(
                providerResponse.message ||
                providerResponse.error ||
                "Provider rejected the order."
            );
        }

        if (
            providerResponse.error &&
            !providerResponse.order
        ) {
            throw new Error(
                providerResponse.error
            );
        }

        if (
            providerResponse.order ===
            undefined ||
            providerResponse.order ===
            null ||
            providerResponse.order ===
            ""
        ) {
            throw new Error(
                "Provider did not return an order ID."
            );
        }

        // ====================================================
        // PROVIDER ACCEPTED ORDER
        // ====================================================

        providerOrderCreated =
            true;

        order.providerOrderId =
            String(
                providerResponse.order
            );

        order.status =
            "processing";

        order.submittedAt =
            new Date();

        await order.save();

        // ====================================================
        // GET UPDATED USER BALANCE
        // ====================================================

        const updatedUser =
            await User.findById(
                req.user._id
            ).select(
                "balance currency"
            );

        // ====================================================
        // SUCCESS RESPONSE
        // ====================================================

        return res.status(201).json({
            success: true,

            message:
                "Order placed successfully.",

            order: {
                orderId:
                    order.orderId,

                serviceId:
                    order.serviceId,

                serviceName:
                    order.serviceName,

                link:
                    order.link,

                quantity:
                    order.quantity,

                // USD base rate
                rate:
                    order.rate,

                // USD base charge
                charge:
                    order.charge,

                // Internal order currency
                currency:
                    "USD",

                status:
                    order.status,

                createdAt:
                    order.createdAt,

                submittedAt:
                    order.submittedAt,
            },

            // Balance is stored in USD.
            balance:
                updatedUser?.balance ??
                null,

            // User's display currency can be
            // handled by frontend CurrencyContext.
            displayCurrency:
                updatedUser?.currency ??
                "USD",
        });
    } catch (error) {
        console.error(
            "❌ Create Order Error:",
            error
        );

        // ====================================================
        // RESTORE BALANCE IF PROVIDER
        // DID NOT ACCEPT ORDER
        // ====================================================

        if (
            balanceDeducted &&
            !providerOrderCreated &&
            !balanceRestored &&
            charge > 0
        ) {
            try {
                await restoreUserBalance({
                    userId:
                        req.user._id,

                    amount:
                        charge,
                });

                balanceRestored =
                    true;

                console.log(
                    `💰 Balance restored: $${charge}`
                );
            } catch (
            refundError
            ) {
                console.error(
                    "❌ Failed to restore balance:",
                    refundError
                );
            }
        }

        // ====================================================
        // MARK LOCAL ORDER FAILED
        // ====================================================

        if (
            order &&
            !providerOrderCreated
        ) {
            try {
                order.status =
                    "failed";

                order.failureReason =
                    error.message ||
                    "Provider rejected the order.";

                order.balanceDeducted =
                    false;

                await order.save();
            } catch (
            saveError
            ) {
                console.error(
                    "❌ Failed to update failed order:",
                    saveError
                );
            }
        }

        // ====================================================
        // PROVIDER ACCEPTED BUT LOCAL
        // PROCESSING FAILED
        // ====================================================

        if (
            providerOrderCreated
        ) {
            console.error(
                "⚠️ Provider accepted order but local processing failed.",
                {
                    providerOrderId:
                        order?.providerOrderId,

                    orderId:
                        order?.orderId,
                }
            );
        }

        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(500).json({
            success: false,

            message:
                error.message ||
                "Failed to place order.",
        });
    }
};

// ============================================================
// SYNC ORDER STATUS
// ============================================================

export const syncOrderStatus = async (
    req,
    res
) => {
    try {
        const orderId =
            Number(
                req.params.orderId
            );

        // ====================================================
        // VALIDATE ORDER ID
        // ====================================================

        if (
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID.",
            });
        }

        // ====================================================
        // FIND USER ORDER
        // ====================================================

        const order =
            await Order.findOne({
                orderId,

                user:
                    req.user._id,
            }).populate({
                path:
                    "provider",

                select:
                    "+apiKey name apiUrl apiType status",
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message:
                    "Order not found.",
            });
        }

        // ====================================================
        // VALIDATE PROVIDER ORDER ID
        // ====================================================

        if (
            !order.providerOrderId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider order ID is missing.",
            });
        }

        // ====================================================
        // VALIDATE PROVIDER
        // ====================================================

        if (!order.provider) {
            return res.status(400).json({
                success: false,
                message:
                    "Order provider is unavailable.",
            });
        }

        if (
            order.provider.status !==
            "active"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Order provider is inactive.",
            });
        }

        // ====================================================
        // GET PROVIDER ORDER STATUS
        // ====================================================

        const providerResponse =
            await getProviderOrderStatus({
                provider:
                    order.provider,

                order:
                    order.providerOrderId,
            });

        if (!providerResponse) {
            throw new Error(
                "Provider returned an empty status response."
            );
        }

        // ====================================================
        // MAP PROVIDER STATUS
        // ====================================================

        const mappedStatus =
            mapProviderStatus(
                providerResponse.status
            );

        order.status =
            mappedStatus;

        // ====================================================
        // START COUNT
        // ====================================================

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

                // ==============================================
                // FINAL QUANTITY
                //
                // Final Quantity =
                // Start Count + Ordered Quantity
                // ==============================================

                const quantity =
                    Number(
                        order.quantity
                    );

                if (
                    Number.isFinite(
                        quantity
                    )
                ) {
                    order.finalQuantity =
                        startCount +
                        quantity;
                }
            }
        }

        // ====================================================
        // REMAINS
        // ====================================================

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

        // ====================================================
        // PROVIDER CHARGE
        // INTERNAL ONLY
        // ====================================================

        /*
         * providerCharge is kept separate from
         * customer charge.
         *
         * order.charge      = AiFi customer charge
         * order.providerCharge = provider's charge
         *
         * Both may currently be USD, but they
         * represent different values.
         */

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

        // ====================================================
        // DO NOT CHANGE ORDER CURRENCY
        // ====================================================

        /*
         * IMPORTANT:
         *
         * Order currency is our internal
         * base currency.
         *
         * It must remain USD.
         *
         * We intentionally DO NOT do:
         *
         * order.currency =
         *     providerResponse.currency;
         *
         * Provider currency is not the same
         * thing as user's display currency.
         */

        order.currency =
            "USD";

        // ====================================================
        // COMPLETION DATE
        // ====================================================

        if (
            (
                mappedStatus ===
                "completed" ||
                mappedStatus ===
                "partial" ||
                mappedStatus ===
                "canceled" ||
                mappedStatus ===
                "refunded"
            ) &&
            !order.completedAt
        ) {
            order.completedAt =
                new Date();
        }

        // ====================================================
        // SAVE ORDER
        // ====================================================

        await order.save();

        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(200).json({
            success: true,

            message:
                "Order status synced successfully.",

            order: {
                orderId:
                    order.orderId,

                serviceId:
                    order.serviceId,

                serviceName:
                    order.serviceName,

                link:
                    order.link,

                quantity:
                    order.quantity,

                finalQuantity:
                    order.finalQuantity,

                // USD base rate
                rate:
                    order.rate,

                // USD base charge
                charge:
                    order.charge,

                currency:
                    "USD",

                status:
                    order.status,

                startCount:
                    order.startCount,

                remains:
                    order.remains,

                createdAt:
                    order.createdAt,

                submittedAt:
                    order.submittedAt,

                completedAt:
                    order.completedAt,
            },
        });
    } catch (error) {
        console.error(
            "❌ Sync Order Error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                error.message ||
                "Failed to sync order status.",
        });
    }
};

// ============================================================
// GET USER ORDERS
// ============================================================

export const getUserOrders = async (
    req,
    res
) => {
    try {
        const orders =
            await Order.find({
                user:
                    req.user._id,
            })
                .sort({
                    createdAt: -1,
                })
                .populate({
                    path:
                        "service",

                    select:
                        "name platform category",
                })
                .select(
                    "-provider -providerServiceId -providerOrderId -providerCharge"
                )
                .lean();

        return res.status(200).json({
            success: true,

            count:
                orders.length,

            orders,
        });
    } catch (error) {
        console.error(
            "❌ Get Orders Error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch orders.",
        });
    }
};

// ============================================================
// GET SINGLE USER ORDER
// ============================================================

export const getUserOrderById = async (
    req,
    res
) => {
    try {
        const orderId =
            Number(
                req.params.orderId
            );

        // ====================================================
        // VALIDATE ORDER ID
        // ====================================================

        if (
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID.",
            });
        }

        // ====================================================
        // FIND USER ORDER
        // ====================================================

        const order =
            await Order.findOne({
                orderId,

                user:
                    req.user._id,
            })
                .select(
                    "-provider -providerServiceId -providerOrderId"
                )
                .lean();

        if (!order) {
            return res.status(404).json({
                success: false,

                message:
                    "Order not found.",
            });
        }

        return res.status(200).json({
            success: true,

            order,
        });
    } catch (error) {
        console.error(
            "❌ Get Single Order Error:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Failed to fetch order.",
        });
    }
};