import RefillRequest from "../models/RefillRequest.js";
import Order from "../models/Order.js";


// ==========================================
// CREATE REFILL REQUEST
// ==========================================

export const createRefillRequest = async (
    req,
    res
) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body || {};

        // --------------------------------------
        // FIND ORDER
        // --------------------------------------

        const order = await Order.findOne({
            orderId: Number(orderId),
            user: req.user._id,
        }).populate("service");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        // --------------------------------------
        // ORDER MUST BE COMPLETED
        // --------------------------------------

        if (
            order.status !== "completed"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Refill can only be requested for completed orders.",
            });
        }

        // --------------------------------------
        // SERVICE CHECK
        // --------------------------------------

        if (!order.service) {
            return res.status(400).json({
                success: false,
                message:
                    "Service information not available.",
            });
        }

        // --------------------------------------
        // REFILL ENABLED?
        // --------------------------------------

        if (
            !order.service.refill?.enabled
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Refill is not available for this service.",
            });
        }

        // --------------------------------------
        // PROVIDER ORDER CHECK
        // --------------------------------------

        if (
            !order.providerOrderId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider order information is missing.",
            });
        }

        // --------------------------------------
        // CHECK EXISTING REQUEST
        // --------------------------------------

        const existingRequest =
            await RefillRequest.findOne({
                order: order._id,
                status: {
                    $in: [
                        "pending",
                        "approved",
                        "processing",
                        "completed",
                    ],
                },
            });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message:
                    "A refill request already exists for this order.",
            });
        }

        // --------------------------------------
        // CREATE REQUEST
        // --------------------------------------

        const refillRequest =
            await RefillRequest.create({
                user: req.user._id,

                order: order._id,

                orderId: order.orderId,

                reason:
                    reason?.trim() ||
                    null,

                status: "pending",
            });

        // --------------------------------------
        // RESPONSE
        // --------------------------------------

        return res.status(201).json({
            success: true,

            message:
                "Refill request submitted successfully. It is pending admin approval.",

            request: {
                id: refillRequest._id,

                orderId:
                    refillRequest.orderId,

                reason:
                    refillRequest.reason,

                status:
                    refillRequest.status,

                createdAt:
                    refillRequest.createdAt,
            },
        });

    } catch (error) {

        console.error(
            "Create Refill Request Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create refill request.",
        });
    }
};


// ==========================================
// GET USER REFILL REQUESTS
// ==========================================

export const getUserRefillRequests = async (
    req,
    res
) => {
    try {
        const requests =
            await RefillRequest.find({
                user: req.user._id,
            })
                .populate({
                    path: "order",
                    select:
                        "orderId serviceName quantity charge status link",
                })
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            count: requests.length,

            requests: requests.map(
                (request) => ({
                    id: request._id,

                    orderId:
                        request.orderId,

                    providerRefillId:
                        request.providerRefillId,

                    reason:
                        request.reason,

                    status:
                        request.status,

                    adminNote:
                        request.adminNote,

                    order:
                        request.order
                            ? {
                                orderId:
                                    request.order.orderId,

                                serviceName:
                                    request.order.serviceName,

                                quantity:
                                    request.order.quantity,

                                charge:
                                    request.order.charge,

                                status:
                                    request.order.status,

                                link:
                                    request.order.link,
                            }
                            : null,

                    createdAt:
                        request.createdAt,

                    processedAt:
                        request.processedAt,
                })
            ),
        });
    } catch (error) {
        console.error(
            "Get User Refill Requests Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch refill requests.",
        });
    }
};