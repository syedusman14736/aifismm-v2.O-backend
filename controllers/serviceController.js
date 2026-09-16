import Service from "../models/Service.js";

// ============================================================
// GET ADMIN SERVICES
// ============================================================

export const getServices = async (req, res) => {
    try {
        const {
            status,
            provider,
            platform,
            category,
            search,
        } = req.query;

        const filter = {};

        // ----------------------------------------------------
        // Status filter
        // ----------------------------------------------------

        if (status) {
            filter.status = status;
        }

        // ----------------------------------------------------
        // Provider filter
        // ----------------------------------------------------

        if (provider) {
            filter.provider = provider;
        }

        // ----------------------------------------------------
        // Platform filter
        // ----------------------------------------------------

        if (platform) {
            filter.platform = platform;
        }

        // ----------------------------------------------------
        // Category filter
        // ----------------------------------------------------

        if (category) {
            filter.category = category;
        }

        // ----------------------------------------------------
        // Search
        // ----------------------------------------------------

        if (search?.trim()) {
            filter.$or = [
                {
                    name: {
                        $regex: search.trim(),
                        $options: "i",
                    },
                },
                {
                    providerCategory: {
                        $regex: search.trim(),
                        $options: "i",
                    },
                },
                {
                    providerType: {
                        $regex: search.trim(),
                        $options: "i",
                    },
                },
            ];
        }

        const services = await Service.find(filter)
            .populate(
                "provider",
                "name apiType status"
            )
            .sort({
                serviceId: 1,
            })
            .lean();

        return res.status(200).json({
            success: true,
            count: services.length,
            services,
        });
    } catch (error) {
        console.error(
            "Get Services Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch services.",
        });
    }
};

// ============================================================
// GET SERVICE BY ID
// ============================================================

export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(
            serviceId
        ).populate(
            "provider",
            "name apiType status"
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        return res.status(200).json({
            success: true,
            service,
        });
    } catch (error) {
        console.error(
            "Get Service By ID Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch service.",
        });
    }
};

// ============================================================
// UPDATE SERVICE
// ============================================================

export const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(
            serviceId
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        const {
            name,
            description,
            rate,
            min,
            max,
            speed,
            drop,
            quality,
            refill,
            refund,
        } = req.body;

        // ----------------------------------------------------
        // Admin editable fields
        // ----------------------------------------------------

        if (name !== undefined) {
            service.name = name;
        }

        if (description !== undefined) {
            service.description = description;
        }

        if (rate !== undefined) {
            const parsedRate = Number(rate);

            if (
                !Number.isFinite(parsedRate) ||
                parsedRate < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid rate.",
                });
            }

            service.rate = parsedRate;
        }

        if (min !== undefined) {
            const parsedMin = Number(min);

            if (
                !Number.isFinite(parsedMin) ||
                parsedMin < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid minimum quantity.",
                });
            }

            service.min = parsedMin;
        }

        if (max !== undefined) {
            const parsedMax = Number(max);

            if (
                !Number.isFinite(parsedMax) ||
                parsedMax < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum quantity.",
                });
            }

            service.max = parsedMax;
        }

        if (speed !== undefined) {
            service.speed = speed;
        }

        if (drop !== undefined) {
            service.drop = drop;
        }

        if (quality !== undefined) {
            service.quality = quality;
        }

        // ----------------------------------------------------
        // REFILL
        // ----------------------------------------------------

        if (refill !== undefined) {
            if (
                typeof refill !== "object" ||
                refill === null
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid refill data.",
                });
            }

            if (
                refill.enabled !== undefined
            ) {
                service.refill.enabled =
                    Boolean(refill.enabled);
            }

            if (
                refill.duration !== undefined
            ) {
                service.refill.duration =
                    refill.duration || null;
            }
        }

        // ----------------------------------------------------
        // REFUND
        // ----------------------------------------------------

        if (refund !== undefined) {
            if (
                typeof refund !== "object" ||
                refund === null
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid refund data.",
                });
            }

            if (
                refund.enabled !== undefined
            ) {
                service.refund.enabled =
                    Boolean(refund.enabled);
            }

            if (
                refund.duration !== undefined
            ) {
                service.refund.duration =
                    refund.duration || null;
            }
        }

        await service.save();

        return res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            service,
        });
    } catch (error) {
        console.error(
            "Update Service Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to update service.",
        });
    }
};

// ============================================================
// UPDATE SERVICE STATUS
// ============================================================

export const updateServiceStatus = async (
    req,
    res
) => {
    try {
        const { serviceId } = req.params;
        const { status } = req.body;

        if (
            !["active", "inactive"].includes(
                status
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be active or inactive.",
            });
        }

        const service = await Service.findById(
            serviceId
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        service.status = status;

        await service.save();

        return res.status(200).json({
            success: true,
            message:
                "Service status updated successfully.",
            service,
        });
    } catch (error) {
        console.error(
            "Update Service Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to update service status.",
        });
    }
};

// ============================================================
// DELETE SERVICE
// ============================================================

export const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(
            serviceId
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        await Service.findByIdAndDelete(
            serviceId
        );

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete Service Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to delete service.",
        });
    }
};

// ============================================================
// GET USER SERVICES
// ============================================================

export const getUserServices = async (
    req,
    res
) => {
    try {
        const services = await Service.find({
            status: "active",
        })
            .select(
                [
                    "serviceId",
                    "name",
                    "description",
                    "platform",
                    "category",
                    "rate",
                    "min",
                    "max",
                    "speed",
                    "drop",
                    "quality",
                    "refill",
                    "refund",
                    "averageTime",
                ].join(" ")
            )
            .sort({
                serviceId: 1,
            })
            .lean();

        // ----------------------------------------------------
        // Generate unique category combinations
        // ----------------------------------------------------

        const categoryMap = new Map();

        for (const service of services) {
            if (
                !service.platform ||
                !service.category
            ) {
                continue;
            }

            const id =
                `${service.platform}|${service.category}`;

            if (!categoryMap.has(id)) {
                categoryMap.set(id, {
                    id,
                    platform: service.platform,
                    category: service.category,
                });
            }
        }

        const categories = Array.from(
            categoryMap.values()
        );

        return res.status(200).json({
            success: true,
            count: services.length,
            categories,
            services,
        });
    } catch (error) {
        console.error(
            "Get User Services Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch user services.",
        });
    }
};