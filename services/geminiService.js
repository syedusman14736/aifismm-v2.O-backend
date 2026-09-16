import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// ======================================================
// GEMINI CONFIG
// ======================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error(
        "GEMINI_API_KEY is missing from backend .env"
    );
}

const ai = new GoogleGenAI({
    apiKey,
});

const MODEL = "gemini-3.6-flash";

// Retry only temporary errors
const MAX_RETRIES = 3;

// ======================================================
// ALLOWED VALUES
// ======================================================

const ALLOWED_PLATFORMS = new Set([
    "instagram",
    "tiktok",
    "facebook",
    "youtube",
    "telegram",
    "twitter",
    "snapchat",
    "linkedin",
    "pinterest",
    "twitch",
    "spotify",
    "discord",
    "reddit",
    "threads",
    "google",
    "whatsapp",
    "vk",
    "quora",
    "soundcloud",
    "dailymotion",
    "rumble",
    "kick",
    "onlyfans",
    "patreon",
    "medium",
    "tumblr",
]);

const ALLOWED_CATEGORIES = new Set([
    "cheap",
    "refill",
    "refund",
]);

const ALLOWED_QUALITIES = new Set([
    "real",
    "organic",
    "bot",
    "fake",
    "premium",
    "high quality",
    "low quality",
]);

const ALLOWED_SPEEDS = new Set([
    "instant",
    "very fast",
    "fast",
    "medium",
    "slow",
]);

const ALLOWED_DROPS = new Set([
    "low",
    "medium",
    "high",
    "no drop",
    "guaranteed",
]);

// ======================================================
// NORMALIZE VALUE
// ======================================================

const normalizeValue = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value)
        .trim()
        .toLowerCase();

    return normalized || null;
};

// ======================================================
// PREPARE SERVICE DATA
// ======================================================

const prepareServiceData = (services) => {
    return services.map((service) => ({
        id: String(service.service),

        name: service.name
            ? String(service.name).trim()
            : null,

        providerType: service.type
            ? String(service.type).trim()
            : null,

        providerCategory: service.category
            ? String(service.category).trim()
            : null,
    }));
};

// ======================================================
// SLEEP
// ======================================================

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

// ======================================================
// GET RETRY DELAY FROM GEMINI ERROR
// ======================================================

const getRetryDelay = (error, attempt) => {
    const message = String(
        error?.message ||
        error?.error?.message ||
        ""
    );

    // Gemini may return something like:
    // "Please retry in 5.751108912s."

    const retryMatch = message.match(
        /retry in\s+([\d.]+)s/i
    );

    if (retryMatch) {
        const seconds =
            Number(retryMatch[1]);

        if (
            Number.isFinite(seconds) &&
            seconds > 0
        ) {
            return (
                Math.ceil(seconds * 1000) +
                500
            );
        }
    }

    // Default delays for temporary errors
    if (attempt === 1) {
        return 3000;
    }

    return 6000;
};

// ======================================================
// GEMINI REQUEST WITH RETRY
// ======================================================

const generateWithRetry = async (request) => {
    let lastError;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
        try {
            console.log(
                `🤖 Gemini request attempt ${attempt}/${MAX_RETRIES}...`
            );

            const response =
                await ai.models.generateContent(
                    request
                );

            return response;
        } catch (error) {
            lastError = error;

            const status =
                error?.status ||
                error?.error?.status ||
                error?.response?.status;

            const message = String(
                error?.message ||
                error?.error?.message ||
                ""
            );

            const lowerMessage =
                message.toLowerCase();

            const isRetryable =
                status === 503 ||
                status === 429 ||
                message.includes("503") ||
                message.includes("429") ||
                lowerMessage.includes(
                    "high demand"
                ) ||
                lowerMessage.includes(
                    "temporarily unavailable"
                ) ||
                lowerMessage.includes(
                    "resource exhausted"
                );

            // ------------------------------------------
            // DO NOT RETRY OTHER ERRORS
            // ------------------------------------------

            if (!isRetryable) {
                throw error;
            }

            // ------------------------------------------
            // LAST ATTEMPT
            // ------------------------------------------

            if (attempt === MAX_RETRIES) {
                console.error(
                    `❌ Gemini failed after ${MAX_RETRIES} attempts.`
                );

                throw error;
            }

            // ------------------------------------------
            // WAIT
            // ------------------------------------------

            const delay =
                getRetryDelay(
                    error,
                    attempt
                );

            console.warn(
                `⚠️ Gemini temporarily unavailable. ` +
                `Retrying in ${(delay / 1000).toFixed(1)}s...`
            );

            await sleep(delay);
        }
    }

    throw lastError;
};

// ======================================================
// BUILD GEMINI PROMPT
// ======================================================

const buildPrompt = (services) => {
    return `
You are the classification engine for an SMM panel.

Classify EVERY service in the JSON array.

STRICT REQUIREMENTS:

1. Return exactly ONE result for EVERY input service.
2. Never omit a service.
3. Never create a new service ID.
4. Never duplicate a service ID.
5. Keep every original ID exactly unchanged.
6. Return ONLY valid JSON.
7. Do NOT return markdown.
8. Do NOT return explanations.
9. Do NOT return extra text.
10. Use null ONLY when the information genuinely cannot be
    determined from the provided service data.

==================================================
PLATFORM
==================================================

Determine the platform from the COMPLETE service name.

Allowed platforms:

instagram
tiktok
facebook
youtube
telegram
twitter
snapchat
linkedin
pinterest
twitch
spotify
discord
reddit
threads
google
whatsapp
vk
quora
soundcloud
dailymotion
rumble
kick
onlyfans
patreon
medium
tumblr

Examples:

Instagram / Insta / IG → instagram
TikTok / Tik Tok / TT → tiktok
Facebook / FB → facebook
YouTube / YT → youtube
Telegram / TG → telegram

Twitter:

Twitter → twitter
X (Twitter) → twitter
Twitter / X → twitter

Do NOT classify as twitter simply because the letter "X"
appears somewhere in the name.

If a clear platform is present in the service name,
DO NOT return null.

==================================================
TYPE
==================================================

Determine the ACTUAL service type from the COMPLETE
service name.

The service name is the PRIMARY source for type.

Do NOT return null when a recognizable service type
appears anywhere in the service name.

Allowed service types include:

followers
subscribers
likes
page likes
comment likes
comments
comment replies
views
shares
saves
story views
reactions
retweets
mentions
members
impressions
watch time
streams
plays
listeners
connections
votes
reviews
ratings

==================================================
COMBINED TYPES
==================================================

When multiple service types are present, combine them
using:

" + "

Examples:

Page Likes + Followers
→ page likes + followers

Facebook Page Likes + Followers
→ page likes + followers

Followers + Likes
→ followers + likes

Followers + Views
→ followers + views

Likes + Views
→ likes + views

Followers + Likes + Views
→ followers + likes + views

Comment Likes + Comments
→ comment likes + comments

Subscribers + Views
→ subscribers + views

IMPORTANT:

"Page Likes" MUST remain:

→ page likes

NOT:

→ likes

"Comment Likes" MUST remain:

→ comment likes

NOT:

→ likes

"Facebook Page Likes + Followers"

MUST become:

→ page likes + followers

The platform name must NOT be included in type.

Marketing text such as:

Drop
Speed
Start
Refill
Guarantee
Lifetime
Emojis
Numbers

must NOT interfere with type detection.

Examples:

Facebook Page Likes + Followers | Drop - Low
→ page likes + followers

Tiktok Comment Likes | Non Drop
→ comment likes

Instagram Followers | Lifetime Refill
→ followers

Youtube Subscribers + Views | Fast
→ subscribers + views

ONLY return null when there is genuinely no recognizable
service type.

==================================================
CATEGORY
==================================================

Choose exactly ONE:

cheap
refill
refund

Priority:

refund > cheap > refill

REFUND signals:

refund
refundable
refund guarantee
refund guaranteed
instant refund
refund if drop

If explicit refund wording exists:

→ refund

CHEAP signals:

cheap
cheapest
no refill
non refill
non-refill
nonrefill
no guarantee

If explicit cheap/no-refill wording exists:

→ cheap

REFILL signals:

refill
refillable
refill guarantee
refill guaranteed
refill available
lifetime refill
lifetime refill guarantee
30 days refill
60 days refill
90 days refill
365 days refill

If explicit refill wording exists:

→ refill

Examples:

Lifetime Refill
→ refill

Lifetime Refill Guarantee
→ refill

Refill Guaranteed
→ refill

IMPORTANT:

The provider boolean "refill" field is NOT a category signal.

Do NOT classify as refill simply because provider refill=true.

If no clear category signal exists:

→ cheap

==================================================
QUALITY
==================================================

Identify quality only when clearly stated.

Allowed:

real
organic
bot
fake
premium
high quality
low quality

Examples:

Real Followers → real
Organic Followers → organic
Premium Followers → premium
Bot Followers → bot

Otherwise:

null

==================================================
SPEED
==================================================

Identify speed from explicit speed information.

Allowed:

instant
very fast
fast
medium
slow

Examples:

Instant → instant
Instant Start → instant
Very Fast → very fast
Fast → fast

Daily delivery signals:

50K+ Per Day → fast
100K+ Per Day → fast
200K+ Per Day → fast
500K+ Per Day → very fast
1M+ Per Day → very fast

Examples:

Speed: 50K+ Per Day
→ fast

Speed: 100K+ Per Day
→ fast

Speed: 1M+ Per Day
→ very fast

If no speed information exists:

→ null

==================================================
DROP
==================================================

Identify drop characteristics.

Allowed:

low
medium
high
no drop
guaranteed

Normalize variations.

Examples:

Drop - Low → low
Drop: Low → low
Low Drop → low
𝐃𝐫𝐨𝐩 - 𝐋𝐨𝐰 → low

Drop - Medium → medium
Drop: Medium → medium
Medium Drop → medium

Drop - High → high
High Drop → high

No Drop → no drop
Non Drop → no drop
Non-Drop → no drop

Guaranteed → guaranteed
Guaranteed No Drop → guaranteed

If explicit drop information exists:

DO NOT return null.

==================================================
REFILL
==================================================

Return true when the service clearly indicates a refill
feature.

Explicit refill signals include:

Refill
Refillable
Refill Guarantee
Refill Guaranteed
Lifetime Refill
Lifetime Refill Guarantee
30 Days Refill
60 Days Refill
90 Days Refill
365 Days Refill

Examples:

Lifetime Refill → true
Lifetime Refill Guarantee → true
30 Days Refill → true
Refill Guaranteed → true

If explicit refill wording exists:

→ true

If no refill information exists:

→ false

IMPORTANT:

The provider boolean "refill" field is NOT the classification
signal.

Use the service name/category text.

==================================================
REFUND
==================================================

Return true when the service clearly indicates refund
or refundable behavior.

Examples:

Refundable → true
Refund Guarantee → true
Instant Refund → true
Refund if Drop → true

Otherwise:

→ false

==================================================
OUTPUT FORMAT
==================================================

Return exactly this JSON structure:

[
  {
    "id": "SERVICE_ID",
    "platform": "facebook",
    "type": "page likes + followers",
    "category": "refill",
    "quality": null,
    "speed": "fast",
    "drop": "low",
    "refill": true,
    "refund": false
  }
]

Use null ONLY when information genuinely cannot be
determined.

==================================================
SERVICES
==================================================

${JSON.stringify(services)}
`;
};

// ======================================================
// VALIDATE GEMINI RESPONSE
// ======================================================

const validateClassification = (
    result,
    originalServices
) => {
    if (!Array.isArray(result)) {
        throw new Error(
            "Gemini response is not an array"
        );
    }

    // --------------------------------------------------
    // EXACT COUNT
    // --------------------------------------------------

    if (
        result.length !==
        originalServices.length
    ) {
        throw new Error(
            `Gemini returned ${result.length} classifications ` +
            `for ${originalServices.length} services`
        );
    }

    const originalIds =
        originalServices.map(
            (service) =>
                String(service.service)
        );

    const resultIds =
        result.map(
            (item) =>
                String(item?.id || "")
        );

    // --------------------------------------------------
    // DUPLICATES
    // --------------------------------------------------

    const uniqueIds =
        new Set(resultIds);

    if (
        uniqueIds.size !==
        resultIds.length
    ) {
        throw new Error(
            "Gemini returned duplicate service IDs"
        );
    }

    const originalIdSet =
        new Set(originalIds);

    // --------------------------------------------------
    // EXTRA IDS
    // --------------------------------------------------

    for (const id of resultIds) {
        if (!originalIdSet.has(id)) {
            throw new Error(
                `Gemini returned unknown service ID: ${id}`
            );
        }
    }

    // --------------------------------------------------
    // MISSING IDS
    // --------------------------------------------------

    for (const id of originalIds) {
        if (!uniqueIds.has(id)) {
            throw new Error(
                `Gemini did not return classification for service ${id}`
            );
        }
    }

    // --------------------------------------------------
    // VALIDATE EACH RESULT
    // --------------------------------------------------

    return result.map((item) => {
        const platform =
            normalizeValue(item.platform);

        const type =
            normalizeValue(item.type);

        const category =
            normalizeValue(item.category);

        const quality =
            normalizeValue(item.quality);

        const speed =
            normalizeValue(item.speed);

        const drop =
            normalizeValue(item.drop);

        // ----------------------------------------------
        // PLATFORM
        // ----------------------------------------------

        if (
            platform !== null &&
            !ALLOWED_PLATFORMS.has(platform)
        ) {
            throw new Error(
                `Invalid platform "${platform}" ` +
                `for service ${item.id}`
            );
        }

        // ----------------------------------------------
        // CATEGORY
        // ----------------------------------------------

        if (
            category !== null &&
            !ALLOWED_CATEGORIES.has(category)
        ) {
            throw new Error(
                `Invalid category "${category}" ` +
                `for service ${item.id}`
            );
        }

        // ----------------------------------------------
        // QUALITY
        // ----------------------------------------------

        if (
            quality !== null &&
            !ALLOWED_QUALITIES.has(quality)
        ) {
            throw new Error(
                `Invalid quality "${quality}" ` +
                `for service ${item.id}`
            );
        }

        // ----------------------------------------------
        // SPEED
        // ----------------------------------------------

        if (
            speed !== null &&
            !ALLOWED_SPEEDS.has(speed)
        ) {
            throw new Error(
                `Invalid speed "${speed}" ` +
                `for service ${item.id}`
            );
        }

        // ----------------------------------------------
        // DROP
        // ----------------------------------------------

        if (
            drop !== null &&
            !ALLOWED_DROPS.has(drop)
        ) {
            throw new Error(
                `Invalid drop "${drop}" ` +
                `for service ${item.id}`
            );
        }

        // ----------------------------------------------
        // BOOLEAN VALUES
        // ----------------------------------------------

        if (
            typeof item.refill !==
            "boolean"
        ) {
            throw new Error(
                `Invalid refill value ` +
                `for service ${item.id}`
            );
        }

        if (
            typeof item.refund !==
            "boolean"
        ) {
            throw new Error(
                `Invalid refund value ` +
                `for service ${item.id}`
            );
        }

        return {
            id: String(item.id),
            platform,
            type,
            category,
            quality,
            speed,
            drop,
            refill: item.refill,
            refund: item.refund,
        };
    });
};

// ======================================================
// MAIN CLASSIFICATION FUNCTION
// ======================================================

const classifyServicesWithGemini = async (
    providerServices
) => {
    if (
        !Array.isArray(providerServices) ||
        providerServices.length === 0
    ) {
        return new Map();
    }

    console.log(
        `🤖 Gemini: classifying ` +
        `${providerServices.length} services in ONE request...`
    );

    // ==================================================
    // PREPARE DATA
    // ==================================================

    const services =
        prepareServiceData(
            providerServices
        );

    // ==================================================
    // BUILD PROMPT
    // ==================================================

    const prompt =
        buildPrompt(services);

    // ==================================================
    // SINGLE GEMINI REQUEST
    // ==================================================

    let response;

    try {
        response =
            await generateWithRetry({
                model: MODEL,

                contents: prompt,

                config: {
                    responseMimeType:
                        "application/json",

                    temperature: 0,
                },
            });
    } catch (error) {
        console.error(
            "❌ Gemini classification failed."
        );

        console.error(
            error?.message ||
            error
        );

        // IMPORTANT:
        // NO DETERMINISTIC FALLBACK.
        // Gemini failure means sync failure.

        throw error;
    }

    // ==================================================
    // GET RESPONSE TEXT
    // ==================================================

    const text =
        typeof response?.text === "function"
            ? response.text
            : response?.text;

    if (!text) {
        throw new Error(
            "Gemini returned an empty response"
        );
    }

    // ==================================================
    // PARSE JSON
    // ==================================================

    let parsed;

    try {
        parsed =
            JSON.parse(text);
    } catch (error) {
        console.error(
            "❌ Gemini returned invalid JSON."
        );

        console.error(text);

        throw new Error(
            "Gemini returned invalid JSON"
        );
    }

    // ==================================================
    // VALIDATE
    // ==================================================

    const validated =
        validateClassification(
            parsed,
            providerServices
        );

    // ==================================================
    // CREATE MAP
    // ==================================================

    const classificationMap =
        new Map();

    for (const item of validated) {
        const id =
            String(item.id);

        if (
            classificationMap.has(id)
        ) {
            throw new Error(
                `Duplicate classification detected for service ${id}`
            );
        }

        classificationMap.set(
            id,
            item
        );
    }

    // ==================================================
    // FINAL CHECK
    // ==================================================

    for (const service of providerServices) {
        const id =
            String(service.service);

        if (
            !classificationMap.has(id)
        ) {
            throw new Error(
                `Missing Gemini classification for service ${id}`
            );
        }
    }

    console.log(
        `✅ Gemini successfully classified ` +
        `${validated.length} services in ONE request.`
    );

    return classificationMap;
};

export default classifyServicesWithGemini;