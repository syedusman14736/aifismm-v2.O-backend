// services/providerService.js

// ==========================================
// GENERIC PROVIDER REQUEST
// ==========================================

const providerRequest = async ({
    provider,
    params = {},
}) => {
    try {
        // ------------------------------------------
        // VALIDATE PROVIDER
        // ------------------------------------------

        if (!provider) {
            throw new Error("Provider is required");
        }

        if (provider.status !== "active") {
            throw new Error("Provider is inactive");
        }

        if (!provider.apiUrl) {
            throw new Error("Provider API URL is missing");
        }

        if (!provider.apiKey) {
            throw new Error("Provider API key is missing");
        }

        // ------------------------------------------
        // BUILD REQUEST BODY
        // ------------------------------------------

        const body = new URLSearchParams();

        body.append("key", provider.apiKey);

        Object.entries(params).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                body.append(key, String(value));
            }
        });

        // ------------------------------------------
        // DEBUG LOG
        // API KEY IS NOT LOGGED
        // ------------------------------------------

        console.log("==========================================");
        console.log("🔥 PROVIDER REQUEST");
        console.log("==========================================");
        console.log("URL:", provider.apiUrl);
        console.log("PARAMS:", params);

        // Safe body log without API key
        const safeBody = new URLSearchParams(body);
        safeBody.set("key", "[REDACTED]");

        console.log("BODY:", safeBody.toString());
        console.log("==========================================");

        // ------------------------------------------
        // SEND REQUEST
        // ------------------------------------------

        const response = await fetch(provider.apiUrl, {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },

            body,
        });

        // ------------------------------------------
        // PARSE JSON
        // ------------------------------------------

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "Provider returned invalid JSON"
            );
        }

        // ------------------------------------------
        // LOG RESPONSE
        // ------------------------------------------

        console.log("==========================================");
        console.log("🔥 PROVIDER RESPONSE");
        console.log("==========================================");
        console.log(data);
        console.log("==========================================");

        // ------------------------------------------
        // HTTP ERROR
        // ------------------------------------------

        if (!response.ok) {
            throw new Error(
                data?.error ||
                data?.message ||
                `Provider API error: ${response.status}`
            );
        }

        // ------------------------------------------
        // PROVIDER-LEVEL ERROR
        // ------------------------------------------

        if (data?.error) {
            throw new Error(data.error);
        }

        if (
            data?.success === false &&
            (data?.message || data?.error)
        ) {
            throw new Error(
                data.message ||
                data.error ||
                "Provider request failed"
            );
        }

        return data;
    } catch (error) {
        console.error(
            "=========================================="
        );

        console.error(
            "❌ PROVIDER REQUEST ERROR"
        );

        console.error(
            error.message
        );

        console.error(
            "=========================================="
        );

        throw error;
    }
};


// ==========================================
// GET PROVIDER SERVICES
// ==========================================

export const getProviderServices = async (
    provider
) => {
    return await providerRequest({
        provider,

        params: {
            action: "services",
        },
    });
};


// ==========================================
// ADD PROVIDER ORDER
// ==========================================

export const addProviderOrder = async ({
    provider,
    service,
    url,
    quantity,
    comments,
    runs,
    interval,
}) => {
    return await providerRequest({
        provider,

        params: {
            action: "add",

            service,

            // Official docs use `url`
            url,

            // Live PakStarSMM response asked for `link`
            // so send both for compatibility.
            link: url,

            quantity,

            comments,

            runs,

            interval,
        },
    });
};


// ==========================================
// GET SINGLE ORDER STATUS
// ==========================================

export const getProviderOrderStatus = async ({
    provider,
    order,
}) => {
    return await providerRequest({
        provider,

        params: {
            action: "status",
            order,
        },
    });
};


// ==========================================
// GET MULTIPLE ORDER STATUS
// ==========================================

export const getProviderMultipleOrderStatus =
    async ({
        provider,
        orders,
    }) => {
        return await providerRequest({
            provider,

            params: {
                action: "status",
                orders,
            },
        });
    };


// ==========================================
// GET PROVIDER BALANCE
// ==========================================

export const getProviderBalance = async (
    provider
) => {
    return await providerRequest({
        provider,

        params: {
            action: "balance",
        },
    });
};


// ==========================================
// REFILL PROVIDER ORDER
// ==========================================

export const refillProviderOrder = async ({
    provider,
    order,
}) => {
    return await providerRequest({
        provider,

        params: {
            action: "refill",
            order,
        },
    });
};


// ==========================================
// CANCEL PROVIDER ORDER
// ==========================================

export const cancelProviderOrder = async ({
    provider,
    order,
}) => {
    return await providerRequest({
        provider,

        params: {
            action: "cancel",
            order,
        },
    });
};


// ==========================================
// DEFAULT EXPORT
// ==========================================

export default providerRequest;