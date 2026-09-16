import Service from "../models/Service.js";

import { getProviderServices } from "./providerService.js";

// ============================================================
// GET NEXT AIFI SERVICE ID
// ============================================================

const getNextAiFiServiceId = async () => {
    const lastService = await Service.findOne()
        .sort({ serviceId: -1 })
        .select("serviceId")
        .lean();

    if (!lastService?.serviceId) {
        return 1001;
    }

    return lastService.serviceId + 1;
};

// ============================================================
// NORMALIZERS
// ============================================================

const normalizeString = (value) => {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const stringValue = String(value).trim();

    return stringValue || null;
};

const normalizeNumber = (
    value,
    fallback = null
) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

const normalizeBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "yes"
    ) {
        return true;
    }

    return false;
};

// ============================================================
// PLATFORM DETECTION
// ============================================================

const detectPlatform = (...values) => {
    const text = values
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (
        /\binstagram\b/.test(text) ||
        /\binsta\b/.test(text) ||
        /\big\b/.test(text)
    ) {
        return "instagram";
    }

    if (
        /\btiktok\b/.test(text) ||
        /\btik\s*tok\b/.test(text) ||
        /\btt\b/.test(text)
    ) {
        return "tiktok";
    }

    if (
        /\bfacebook\b/.test(text) ||
        /\bfb\b/.test(text)
    ) {
        return "facebook";
    }

    if (
        /\byoutube\b/.test(text) ||
        /\byt\b/.test(text)
    ) {
        return "youtube";
    }

    if (
        /\btelegram\b/.test(text) ||
        /\btg\b/.test(text)
    ) {
        return "telegram";
    }

    if (
        /\btwitter\b/.test(text) ||
        /\btwitter\s*\/\s*x\b/.test(text) ||
        /\bx\s*\/\s*twitter\b/.test(text)
    ) {
        return "twitter";
    }

    if (/\bsnapchat\b/.test(text)) {
        return "snapchat";
    }

    if (/\blinkedin\b/.test(text)) {
        return "linkedin";
    }

    if (/\bpinterest\b/.test(text)) {
        return "pinterest";
    }

    if (/\btwitch\b/.test(text)) {
        return "twitch";
    }

    if (/\bspotify\b/.test(text)) {
        return "spotify";
    }

    if (/\bdiscord\b/.test(text)) {
        return "discord";
    }

    if (/\breddit\b/.test(text)) {
        return "reddit";
    }

    if (/\bthreads\b/.test(text)) {
        return "threads";
    }

    if (/\bgoogle\b/.test(text)) {
        return "google";
    }

    if (/\bwhatsapp\b/.test(text)) {
        return "whatsapp";
    }

    if (/\bvk\b/.test(text)) {
        return "vk";
    }

    if (/\bquora\b/.test(text)) {
        return "quora";
    }

    if (/\bsoundcloud\b/.test(text)) {
        return "soundcloud";
    }

    if (/\bdailymotion\b/.test(text)) {
        return "dailymotion";
    }

    if (/\brumble\b/.test(text)) {
        return "rumble";
    }

    if (/\bkick\b/.test(text)) {
        return "kick";
    }

    if (/\bonlyfans\b/.test(text)) {
        return "onlyfans";
    }

    if (/\bpatreon\b/.test(text)) {
        return "patreon";
    }

    if (/\bmedium\b/.test(text)) {
        return "medium";
    }

    if (/\btumblr\b/.test(text)) {
        return "tumblr";
    }

    return null;
};

// ============================================================
// SYNC PROVIDER SERVICES
// ============================================================

export const syncProviderServices = async (
    provider
) => {
    if (!provider) {
        throw new Error(
            "Provider is required."
        );
    }

    // ========================================================
    // GET PROVIDER SERVICES
    // ========================================================

    const providerServices =
        await getProviderServices(provider);

    if (!Array.isArray(providerServices)) {
        throw new Error(
            "Provider services response is not an array."
        );
    }

    let nextServiceId =
        await getNextAiFiServiceId();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deactivated = 0;

    const syncedProviderServiceIds =
        new Set();

    // ========================================================
    // PROCESS PROVIDER SERVICES
    // ========================================================

    for (const providerService of providerServices) {
        const providerServiceId =
            normalizeString(
                providerService.service
            );

        const providerType =
            normalizeString(
                providerService.type
            );

        // Provider category is the
        // actual AiFi category.
        const providerCategory =
            normalizeString(
                providerService.category
            );

        const name =
            normalizeString(
                providerService.name
            );

        const description =
            normalizeString(
                providerService.description ||
                providerService.desc
            );

        // ====================================================
        // PROVIDER RATE
        // ====================================================

        // Provider sends rate in USD.
        //
        // IMPORTANT:
        // AiFi also stores service.rate in USD.
        //
        // NO USD → PKR conversion here.
        // NO currency conversion here.
        // NO profit calculation here.

        const providerRate =
            normalizeNumber(
                providerService.rate,
                NaN
            );

        // ====================================================
        // REQUIRED DATA VALIDATION
        // ====================================================

        if (
            !providerServiceId ||
            !name ||
            !providerCategory ||
            !Number.isFinite(providerRate) ||
            providerRate < 0
        ) {
            skipped++;
            continue;
        }

        syncedProviderServiceIds.add(
            providerServiceId
        );

        // ====================================================
        // AIFI RATE
        // ====================================================

        // Provider currency = USD
        // AiFi base currency = USD
        // Profit = 0%
        //
        // Therefore:
        //
        // providerRate = AiFi rate
        //
        // Example:
        //
        // Provider:
        // 0.001 USD / 1000
        //
        // AiFi:
        // 0.001 USD / 1000

        const aifiRate = Number(
            providerRate.toFixed(8)
        );

        // ====================================================
        // PLATFORM
        // ====================================================

        const platform =
            detectPlatform(
                name,
                providerCategory,
                description
            );

        // ====================================================
        // PROVIDER VALUES
        // ====================================================

        const min =
            normalizeNumber(
                providerService.min,
                1
            );

        const max =
            normalizeNumber(
                providerService.max,
                1
            );

        const dripfeed =
            normalizeBoolean(
                providerService.dripfeed
            );

        const cancel =
            normalizeBoolean(
                providerService.cancel
            );

        const providerRefill =
            normalizeBoolean(
                providerService.refill
            );

        const providerRefund =
            normalizeBoolean(
                providerService.refund
            );

        const averageTime =
            normalizeNumber(
                providerService.average_time
            );

        // ====================================================
        // FIND EXISTING SERVICE
        // ====================================================

        let existingService =
            await Service.findOne({
                provider: provider._id,
                providerServiceId,
            });

        // ====================================================
        // UPDATE EXISTING SERVICE
        // ====================================================

        if (existingService) {
            existingService.name =
                name;

            existingService.description =
                description;

            // Original provider type
            existingService.providerType =
                providerType;

            // Original provider category
            existingService.providerCategory =
                providerCategory;

            // Provider category itself is
            // AiFi category.
            existingService.category =
                providerCategory;

            // Detected platform
            existingService.platform =
                platform;

            // =================================================
            // PRICING
            // =================================================

            // Original provider rate in USD.
            existingService.providerRate =
                providerRate;

            // AiFi service rate in USD.
            //
            // 0% profit for now.
            existingService.rate =
                aifiRate;

            existingService.min =
                min;

            existingService.max =
                max;

            existingService.dripfeed =
                dripfeed;

            existingService.cancel =
                cancel;

            existingService.averageTime =
                averageTime;

            // =================================================
            // REFILL CAPABILITY
            // =================================================

            existingService.refill.enabled =
                providerRefill;

            if (!providerRefill) {
                existingService.refill.duration =
                    null;
            } else if (
                !existingService.refill.duration
            ) {
                existingService.refill.duration =
                    "lifetime";
            }

            // =================================================
            // REFUND CAPABILITY
            // =================================================

            existingService.refund.enabled =
                providerRefund;

            if (!providerRefund) {
                existingService.refund.duration =
                    null;
            } else if (
                !existingService.refund.duration
            ) {
                existingService.refund.duration =
                    "lifetime";
            }

            // =================================================
            // STATUS
            // =================================================

            existingService.status =
                "active";

            await existingService.save();

            updated++;

            continue;
        }

        // ====================================================
        // CREATE NEW SERVICE
        // ====================================================

        const newService =
            new Service({
                provider:
                    provider._id,

                providerServiceId,

                serviceId:
                    nextServiceId++,

                name,

                description,

                // Original provider type
                providerType,

                // Original provider category
                providerCategory,

                // Same provider category
                // becomes AiFi category
                category:
                    providerCategory,

                // Detected platform
                platform,

                // =================================================
                // PRICING
                // =================================================

                // Provider rate is USD.
                // AiFi rate is also USD.
                //
                // Profit = 0%

                rate:
                    aifiRate,

                // Original provider cost/rate
                // in USD.
                providerRate,

                min,

                max,

                dripfeed,

                cancel,

                averageTime,

                refill: {
                    enabled:
                        providerRefill,

                    duration:
                        providerRefill
                            ? "lifetime"
                            : null,
                },

                refund: {
                    enabled:
                        providerRefund,

                    duration:
                        providerRefund
                            ? "lifetime"
                            : null,
                },

                status: "active",
            });

        await newService.save();

        created++;
    }

    // ========================================================
    // DEACTIVATE REMOVED PROVIDER SERVICES
    // ========================================================

    const activeServices =
        await Service.find({
            provider: provider._id,
            status: "active",
        }).select(
            "_id providerServiceId"
        );

    for (const service of activeServices) {
        if (
            !syncedProviderServiceIds.has(
                service.providerServiceId
            )
        ) {
            service.status =
                "inactive";

            await service.save();

            deactivated++;
        }
    }

    // ========================================================
    // RESULT
    // ========================================================

    return {
        total:
            providerServices.length,

        valid:
            created + updated,

        created,

        updated,

        skipped,

        deactivated,

        pricing: {
            providerCurrency: "USD",

            aifiCurrency: "USD",

            profitPercent: 0,
        },
    };
};