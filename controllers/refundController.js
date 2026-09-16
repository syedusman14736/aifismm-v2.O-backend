import RefundRequest from "../models/RefundRequest.js";
import Order from "../models/Order.js";


// ==========================================
// CREATE REFUND REQUEST
// ==========================================

export const createRefundRequest = async (
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
                    "Refund can only be requested for completed orders.",
            });
        }

        // --------------------------------------
        // CHECK REFUND ELIGIBILITY
        // --------------------------------------

        if (!order.service) {
            return res.status(400).json({
                success: false,
                message:
                    "Service information not available.",
            });
        }

        if (
            order.service.refund !== true
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This service is not eligible for refund.",
            });
        }

        // --------------------------------------
        // CHECK EXISTING REQUEST
        // --------------------------------------

        const existingRequest =
            await RefundRequest.findOne({
                order: order._id,
                status: {
                    $in: [
                        "pending",
                        "approved",
                        "completed",
                    ],
                },
            });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message:
                    "A refund request already exists for this order.",
            });
        }

        // --------------------------------------
        // CREATE REQUEST
        // --------------------------------------

        const refundRequest =
            await RefundRequest.create({
                user: req.user._id,

                order: order._id,

                orderId: order.orderId,

                amount: order.charge,

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
                "Refund request submitted successfully. It is pending admin approval.",

            request: {
                id: refundRequest._id,

                orderId:
                    refundRequest.orderId,

                amount:
                    refundRequest.amount,

                reason:
                    refundRequest.reason,

                status:
                    refundRequest.status,

                createdAt:
                    refundRequest.createdAt,
            },
        });

    } catch (error) {

        console.error(
            "Create Refund Request Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create refund request.",
        });
    }
};

// ==========================================
// GET USER REFUND REQUESTS
// ==========================================

export const getUserRefundRequests = async (
    req,
    res
) => {
    try {
        const requests =
            await RefundRequest.find({
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

                    amount:
                        request.amount,

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
            "Get User Refund Requests Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch refund requests.",
        });
    }
};