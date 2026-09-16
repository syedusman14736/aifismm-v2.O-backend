
import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Currency from "../models/Currency.js";


// ==========================================
// APPROVE PAYMENT
// ==========================================

export const approvePaymentById = async ({
    paymentId,
    adminId = null,
}) => {
    console.log(
        "\n🔥🔥🔥 CURRENT APPROVAL SERVICE RUNNING 🔥🔥🔥"
    );

    console.log(
        "🔥 PAYMENT ID:",
        paymentId
    );

    console.log(
        "🔥 ADMIN ID:",
        adminId
    );


    const session =
        await mongoose.startSession();


    try {
        session.startTransaction();


        // ==========================================
        // FIND PENDING PAYMENT
        // ==========================================

        const payment =
            await Payment.findOne({
                _id: paymentId,
                status: "pending",
            })
                .session(session);


        if (!payment) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 404,
                message:
                    "Payment not found or already processed.",
            };
        }


        console.log(
            "🔥 PAYMENT FOUND:",
            payment._id.toString()
        );

        console.log(
            "🔥 ORIGINAL AMOUNT:",
            payment.amount
        );

        console.log(
            "🔥 ORIGINAL CURRENCY:",
            payment.currency
        );

        console.log(
            "🔥 PAYMENT METHOD:",
            payment.method
        );

        console.log(
            "🔥 PAYMENT REGION:",
            payment.region
        );


        // ==========================================
        // FIND USER
        // ==========================================

        const user =
            await User.findOne({
                _id: payment.user,
                status: "active",
            })
                .session(session);


        if (!user) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 404,
                message:
                    "Active user not found.",
            };
        }


        // ==========================================
        // ORIGINAL PAYMENT DATA
        // ==========================================

        const paymentAmount =
            Number(payment.amount);

        const paymentCurrency =
            String(payment.currency)
                .toUpperCase();


        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 400,
                message:
                    "Invalid payment amount.",
            };
        }


        console.log(
            "🔥 PAYMENT AMOUNT:",
            paymentAmount
        );

        console.log(
            "🔥 PAYMENT CURRENCY:",
            paymentCurrency
        );


        // ==========================================
        // USD CREDIT CALCULATION
        // ==========================================

        let exchangeRate;
        let creditedAmount;


        // ==========================================
        // USD PAYMENT
        // ==========================================

        if (
            paymentCurrency === "USD"
        ) {
            exchangeRate = 1;

            creditedAmount =
                Number(
                    paymentAmount.toFixed(8)
                );


            console.log(
                "💵 USD PAYMENT"
            );

            console.log(
                "🔥 EXCHANGE RATE:",
                exchangeRate
            );

            console.log(
                "🔥 CREDITED AMOUNT:",
                creditedAmount
            );
        }


        // ==========================================
        // PKR PAYMENT
        // ==========================================

        else if (
            paymentCurrency === "PKR"
        ) {
            const pkrCurrency =
                await Currency.findOne({
                    code: "PKR",
                    status: "active",
                })
                    .session(session)
                    .lean();


            if (!pkrCurrency) {
                await session.abortTransaction();

                return {
                    success: false,
                    statusCode: 500,
                    message:
                        "PKR currency configuration not found.",
                };
            }


            exchangeRate =
                Number(
                    pkrCurrency.rate
                );


            if (
                !Number.isFinite(
                    exchangeRate
                ) ||
                exchangeRate <= 0
            ) {
                await session.abortTransaction();

                return {
                    success: false,
                    statusCode: 500,
                    message:
                        "Invalid PKR exchange rate.",
                };
            }


            creditedAmount =
                Number(
                    (
                        paymentAmount /
                        exchangeRate
                    ).toFixed(8)
                );


            console.log(
                "🇵🇰 PKR PAYMENT"
            );

            console.log(
                "🔥 PKR RATE:",
                exchangeRate
            );

            console.log(
                "🔥 PKR AMOUNT:",
                paymentAmount
            );

            console.log(
                "🔥 USD CREDIT:",
                creditedAmount
            );
        }


        // ==========================================
        // UNSUPPORTED CURRENCY
        // ==========================================

        else {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 400,
                message:
                    `Unsupported payment currency: ${paymentCurrency}.`,
            };
        }


        // ==========================================
        // FINAL VALIDATION
        // ==========================================

        if (
            !Number.isFinite(
                creditedAmount
            ) ||
            creditedAmount <= 0
        ) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 500,
                message:
                    "Unable to calculate credited USD amount.",
            };
        }


        console.log(
            "🔥🔥 FINAL EXCHANGE RATE:",
            exchangeRate
        );

        console.log(
            "🔥🔥 FINAL CREDITED AMOUNT:",
            creditedAmount
        );


        // ==========================================
        // UPDATE PAYMENT
        // ==========================================

        payment.status =
            "completed";

        payment.reviewedAt =
            new Date();

        payment.reviewedBy =
            adminId || null;

        payment.rejectionReason =
            "";

        payment.exchangeRate =
            exchangeRate;

        payment.creditedAmount =
            creditedAmount;

        payment.creditedCurrency =
            "USD";


        await payment.save({
            session,
        });


        console.log(
            "✅ PAYMENT UPDATED:"
        );

        console.log(
            "   status:",
            payment.status
        );

        console.log(
            "   exchangeRate:",
            payment.exchangeRate
        );

        console.log(
            "   creditedAmount:",
            payment.creditedAmount
        );

        console.log(
            "   creditedCurrency:",
            payment.creditedCurrency
        );


        // ==========================================
        // CREDIT USER USD WALLET
        // ==========================================

        console.log(
            "\n🔥🔥 ADDING TO USER BALANCE:",
            creditedAmount
        );

        console.log(
            "🔥 USER BALANCE BEFORE:",
            Number(user.balance || 0)
        );


        const updatedUser =
            await User.findByIdAndUpdate(
                user._id,
                {
                    $inc: {
                        balance:
                            creditedAmount,
                    },
                },
                {
                    new: true,
                    session,
                }
            );


        if (!updatedUser) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 404,
                message:
                    "Unable to update user balance.",
            };
        }


        console.log(
            "🔥 USER BALANCE AFTER:",
            Number(
                updatedUser.balance || 0
            )
        );


        // ==========================================
        // COMMIT TRANSACTION
        // ==========================================

        await session.commitTransaction();


        console.log(
            "\n✅✅ PAYMENT APPROVED SUCCESSFULLY"
        );

        console.log(
            "💰 USD CREDITED:",
            creditedAmount
        );

        console.log(
            "💰 NEW USER BALANCE:",
            updatedUser.balance
        );


        return {
            success: true,
            statusCode: 200,

            message:
                "Payment approved successfully.",

            payment,

            balance:
                updatedUser.balance,

            creditedAmount,

            creditedCurrency:
                "USD",

            exchangeRate,
        };
    }


    // ==========================================
    // ERROR
    // ==========================================

    catch (error) {
        await session.abortTransaction();

        console.error(
            "\n❌ APPROVE PAYMENT SERVICE ERROR:",
            error
        );

        return {
            success: false,
            statusCode: 500,
            message:
                "Unable to approve payment.",
        };
    }


    // ==========================================
    // END SESSION
    // ==========================================

    finally {
        await session.endSession();
    }
};


// ==========================================
// REJECT PAYMENT
// ==========================================

export const rejectPaymentById = async ({
    paymentId,
    adminId = null,
    rejectionReason = "",
}) => {
    console.log(
        "\n❌ REJECT PAYMENT SERVICE RUNNING"
    );

    console.log(
        "❌ PAYMENT ID:",
        paymentId
    );

    console.log(
        "❌ ADMIN ID:",
        adminId
    );


    const session =
        await mongoose.startSession();


    try {
        session.startTransaction();


        // ==========================================
        // FIND PENDING PAYMENT
        // ==========================================

        const payment =
            await Payment.findOne({
                _id: paymentId,
                status: "pending",
            })
                .session(session);


        if (!payment) {
            await session.abortTransaction();

            return {
                success: false,
                statusCode: 404,
                message:
                    "Payment not found or already processed.",
            };
        }


        // ==========================================
        // UPDATE PAYMENT
        // ==========================================

        payment.status =
            "rejected";

        payment.reviewedAt =
            new Date();

        payment.reviewedBy =
            adminId || null;

        payment.rejectionReason =
            String(
                rejectionReason || ""
            ).trim();


        await payment.save({
            session,
        });


        // ==========================================
        // COMMIT
        // ==========================================

        await session.commitTransaction();


        console.log(
            "✅ PAYMENT REJECTED SUCCESSFULLY"
        );


        return {
            success: true,
            statusCode: 200,

            message:
                "Payment rejected successfully.",

            payment,
        };
    }


    // ==========================================
    // ERROR
    // ==========================================

    catch (error) {
        await session.abortTransaction();

        console.error(
            "❌ Reject Payment Service Error:",
            error
        );

        return {
            success: false,
            statusCode: 500,
            message:
                "Unable to reject payment.",
        };
    }


    // ==========================================
    // END SESSION
    // ==========================================

    finally {
        await session.endSession();
    }
};