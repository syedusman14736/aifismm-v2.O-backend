import Order from "../models/Order.js";
import User from "../models/User.js";

// ==========================================
// GET DASHBOARD STATS
// ==========================================

export const getDashboardStats = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("username balance currency name")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // ==========================================
        // TOTAL ORDERS
        // ==========================================

        const totalOrders = await Order.countDocuments({
            user: req.user._id,
        });

        // ==========================================
        // TOTAL SPENT
        // Only successfully deducted orders
        // ==========================================

        const totalSpentResult = await Order.aggregate([
            {
                $match: {
                    user: req.user._id,
                    balanceDeducted: true,
                },
            },
            {
                $group: {
                    _id: null,
                    totalSpent: {
                        $sum: "$charge",
                    },
                },
            },
        ]);

        const totalSpent =
            totalSpentResult[0]?.totalSpent || 0;

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            stats: {
                username: user.username,
                name: user.name,
                totalOrders,
                balance: user.balance,
                currency: user.currency,
                totalSpent: Number(
                    totalSpent.toFixed(6)
                ),
            },
        });
    } catch (error) {
        console.error(
            "Get Dashboard Stats Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch dashboard stats.",
        });
    }
};

// ==========================================
// GET DASHBOARD SPENDING
// ==========================================

export const getDashboardSpending = async (req, res) => {
    try {
        const userId = req.user._id;

        const now = new Date();

        // ==========================================
        // CURRENT 30 DAYS
        // ==========================================

        const currentStart = new Date(now);

        currentStart.setHours(0, 0, 0, 0);

        currentStart.setDate(
            currentStart.getDate() - 29
        );

        // ==========================================
        // PREVIOUS 30 DAYS
        // ==========================================

        const previousStart = new Date(currentStart);

        previousStart.setDate(
            previousStart.getDate() - 30
        );

        const previousEnd = new Date(currentStart);

        previousEnd.setMilliseconds(
            previousEnd.getMilliseconds() - 1
        );

        // ==========================================
        // CURRENT 30 DAYS SPENDING
        // ==========================================

        const currentSpending = await Order.aggregate([
            {
                $match: {
                    user: userId,
                    balanceDeducted: true,
                    createdAt: {
                        $gte: currentStart,
                        $lte: now,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: {
                            $year: "$createdAt",
                        },
                        month: {
                            $month: "$createdAt",
                        },
                        day: {
                            $dayOfMonth: "$createdAt",
                        },
                    },

                    total: {
                        $sum: "$charge",
                    },
                },
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1,
                },
            },
        ]);

        // ==========================================
        // PREVIOUS 30 DAYS SPENDING
        // ==========================================

        const previousSpendingResult =
            await Order.aggregate([
                {
                    $match: {
                        user: userId,
                        balanceDeducted: true,
                        createdAt: {
                            $gte: previousStart,
                            $lte: previousEnd,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,

                        total: {
                            $sum: "$charge",
                        },
                    },
                },
            ]);

        // ==========================================
        // CURRENT TOTAL SPENDING
        // ==========================================

        const currentTotal =
            currentSpending.reduce(
                (sum, item) =>
                    sum + Number(item.total || 0),
                0
            );

        // ==========================================
        // PREVIOUS TOTAL SPENDING
        // ==========================================

        const previousTotal =
            previousSpendingResult[0]?.total || 0;

        // ==========================================
        // PERCENTAGE CHANGE
        // ==========================================

        let percentageChange = 0;

        if (previousTotal > 0) {
            percentageChange =
                ((currentTotal - previousTotal) /
                    previousTotal) *
                100;
        } else if (currentTotal > 0) {
            percentageChange = 100;
        }

        // ==========================================
        // CREATE ALL 30 DAYS
        // Including days with zero spending
        // ==========================================

        const chartData = [];

        for (let i = 0; i < 30; i++) {
            const date = new Date(currentStart);

            date.setDate(
                currentStart.getDate() + i
            );

            const year = date.getFullYear();

            const month =
                date.getMonth() + 1;

            const day =
                date.getDate();

            // Find spending for this date
            const found = currentSpending.find(
                (item) =>
                    item._id.year === year &&
                    item._id.month === month &&
                    item._id.day === day
            );

            chartData.push({
                date: date.toLocaleDateString(
                    "en-US",
                    {
                        month: "short",
                        day: "2-digit",
                    }
                ),

                spending: Number(
                    (found?.total || 0).toFixed(6)
                ),
            });
        }

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            spending: {
                total: Number(
                    currentTotal.toFixed(6)
                ),

                previousTotal: Number(
                    previousTotal.toFixed(6)
                ),

                percentageChange: Number(
                    percentageChange.toFixed(1)
                ),

                chartData,
            },
        });
    } catch (error) {
        console.error(
            "Get Dashboard Spending Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch spending data.",
        });
    }
};