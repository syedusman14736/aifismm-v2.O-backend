// ======================================================
// SERVICE CLASSIFICATION
// ======================================================

// ======================================================
// NORMALIZE TEXT
// ======================================================

export const normalizeText = (value) => {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
};

// ======================================================
// NORMALIZE TYPE
// ======================================================

export const normalizeType = (value) => {
    const text = normalizeText(value);

    if (!text) {
        return null;
    }

    const genericTypes = new Set([
        "default",
        "general",
        "generic",
        "service",
        "unknown",
        "n/a",
        "na",
        "none",
        "other",
    ]);

    if (genericTypes.has(text)) {
        return null;
    }

    return text;
};

// ======================================================
// PLATFORM
// ======================================================

export const detectPlatform = (...values) => {
    const text = normalizeText(
        values.filter(Boolean).join(" ")
    );

    if (!text) {
        return null;
    }

    if (
        text.includes("instagram") ||
        /\binsta\b/.test(text)
    ) {
        return "instagram";
    }

    if (
        text.includes("tiktok") ||
        text.includes("tik tok")
    ) {
        return "tiktok";
    }

    if (
        text.includes("facebook") ||
        /\bfb\b/.test(text)
    ) {
        return "facebook";
    }

    if (
        text.includes("youtube") ||
        /\byt\b/.test(text)
    ) {
        return "youtube";
    }

    if (
        text.includes("telegram") ||
        /\btg\b/.test(text)
    ) {
        return "telegram";
    }

    if (
        /\btwitter\b/.test(text) ||
        /\bx\s*\(\s*twitter\s*\)/.test(text) ||
        /\btwitter\s*\/\s*x\b/.test(text)
    ) {
        return "twitter";
    }

    if (text.includes("snapchat")) {
        return "snapchat";
    }

    if (text.includes("linkedin")) {
        return "linkedin";
    }

    if (text.includes("pinterest")) {
        return "pinterest";
    }

    if (text.includes("twitch")) {
        return "twitch";
    }

    if (text.includes("spotify")) {
        return "spotify";
    }

    if (text.includes("discord")) {
        return "discord";
    }

    if (text.includes("reddit")) {
        return "reddit";
    }

    if (text.includes("threads")) {
        return "threads";
    }

    if (
        text.includes("google") ||
        /\bgmb\b/.test(text) ||
        /\bgbp\b/.test(text)
    ) {
        return "google";
    }

    if (text.includes("whatsapp")) {
        return "whatsapp";
    }

    if (text.includes("vk")) {
        return "vk";
    }

    if (text.includes("quora")) {
        return "quora";
    }

    if (text.includes("soundcloud")) {
        return "soundcloud";
    }

    if (text.includes("dailymotion")) {
        return "dailymotion";
    }

    if (text.includes("rumble")) {
        return "rumble";
    }

    if (/\bkick\b/.test(text)) {
        return "kick";
    }

    if (text.includes("onlyfans")) {
        return "onlyfans";
    }

    if (text.includes("patreon")) {
        return "patreon";
    }

    if (text.includes("medium")) {
        return "medium";
    }

    if (text.includes("tumblr")) {
        return "tumblr";
    }

    return null;
};

// ======================================================
// SERVICE TYPE
// ======================================================

export const detectServiceType = (
    name,
    providerType,
    providerCategory
) => {
    // --------------------------------------------------
    // FIRST: USE PROVIDER TYPE IF MEANINGFUL
    // --------------------------------------------------

    const normalizedProviderType =
        normalizeType(providerType);

    if (normalizedProviderType) {
        return normalizedProviderType;
    }

    // --------------------------------------------------
    // OTHERWISE DETECT FROM NAME + CATEGORY
    // --------------------------------------------------

    const text = normalizeText(
        `${name || ""} ${providerCategory || ""}`
    );

    if (!text) {
        return null;
    }

    // --------------------------------------------------
    // MOST SPECIFIC TYPES FIRST
    // --------------------------------------------------

    if (
        text.includes("page likes") &&
        text.includes("followers")
    ) {
        return "page likes + followers";
    }

    if (
        text.includes("followers") &&
        text.includes("likes")
    ) {
        return "followers + likes";
    }

    if (
        text.includes("followers") &&
        text.includes("views")
    ) {
        return "followers + views";
    }

    if (
        text.includes("likes") &&
        text.includes("views")
    ) {
        return "likes + views";
    }

    if (
        text.includes("subscribers") &&
        text.includes("views")
    ) {
        return "subscribers + views";
    }

    if (
        text.includes("comment likes")
    ) {
        return "comment likes";
    }

    if (
        text.includes("comment replies") ||
        text.includes("comment reply")
    ) {
        return "comment replies";
    }

    if (
        text.includes("story views") ||
        text.includes("story view")
    ) {
        return "story views";
    }

    if (
        text.includes("watch time")
    ) {
        return "watch time";
    }

    if (
        text.includes("page likes")
    ) {
        return "page likes";
    }

    // --------------------------------------------------
    // COMMON TYPES
    // --------------------------------------------------

    if (text.includes("followers")) {
        return "followers";
    }

    if (text.includes("subscribers")) {
        return "subscribers";
    }

    if (text.includes("comments")) {
        return "comments";
    }

    if (text.includes("likes")) {
        return "likes";
    }

    if (text.includes("views")) {
        return "views";
    }

    if (text.includes("shares")) {
        return "shares";
    }

    if (text.includes("saves")) {
        return "saves";
    }

    if (text.includes("reactions")) {
        return "reactions";
    }

    if (text.includes("retweets")) {
        return "retweets";
    }

    if (text.includes("mentions")) {
        return "mentions";
    }

    if (text.includes("members")) {
        return "members";
    }

    if (text.includes("impressions")) {
        return "impressions";
    }

    if (text.includes("streams")) {
        return "streams";
    }

    if (text.includes("plays")) {
        return "plays";
    }

    if (text.includes("listeners")) {
        return "listeners";
    }

    if (text.includes("connections")) {
        return "connections";
    }

    if (text.includes("votes")) {
        return "votes";
    }

    if (text.includes("reviews")) {
        return "reviews";
    }

    if (text.includes("ratings")) {
        return "ratings";
    }

    return null;
};

// ======================================================
// AIFI CATEGORY
// ======================================================

export const detectAiFiCategory = (
    name,
    providerCategory
) => {
    const text = normalizeText(
        `${name || ""} ${providerCategory || ""}`
    );

    if (!text) {
        return null;
    }

    // --------------------------------------------------
    // REFUND HAS HIGHEST PRIORITY
    // --------------------------------------------------

    if (
        text.includes("refund") ||
        text.includes("refundable")
    ) {
        return "refund";
    }

    // --------------------------------------------------
    // CHEAP
    // --------------------------------------------------

    if (
        text.includes("cheapest") ||
        text.includes("cheap") ||
        text.includes("no refill") ||
        text.includes("non refill") ||
        text.includes("non-refill") ||
        text.includes("nonrefill") ||
        text.includes("no guarantee")
    ) {
        return "cheap";
    }

    // --------------------------------------------------
    // REFILL
    // --------------------------------------------------

    if (
        text.includes("refill") ||
        text.includes("refillable")
    ) {
        return "refill";
    }

    return null;
};

// ======================================================
// COMPLETE CLASSIFICATION
// ======================================================

export const classifyProviderService = (
    providerService
) => {
    const name =
        providerService?.name || "";

    const providerType =
        providerService?.type || "";

    const providerCategory =
        providerService?.category || "";

    const combinedText = `
        ${name}
        ${providerCategory}
    `;

    return {
        platform: detectPlatform(
            combinedText
        ),

        type: detectServiceType(
            name,
            providerType,
            providerCategory
        ),

        category:
            detectAiFiCategory(
                name,
                providerCategory
            ) || "cheap",
    };
};