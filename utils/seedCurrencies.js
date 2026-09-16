import Currency from "../models/Currency.js";

const currencies = [
    {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        rate: 1,
        status: "active",
    },

    {
        code: "PKR",
        name: "Pakistani Rupee",
        symbol: "Rs",
        rate: 280,
        status: "active",
    },

    {
        code: "INR",
        name: "Indian Rupee",
        symbol: "₹",
        rate: 83.5,
        status: "active",
    },

    {
        code: "AED",
        name: "UAE Dirham",
        symbol: "د.إ",
        rate: 3.67,
        status: "active",
    },

    {
        code: "EUR",
        name: "Euro",
        symbol: "€",
        rate: 0.85,
        status: "active",
    },
];

export const seedCurrencies = async () => {
    try {
        for (const currency of currencies) {
            await Currency.findOneAndUpdate(
                { code: currency.code },
                {
                    $setOnInsert: currency,
                },
                {
                    upsert: true,
                    returnDocument: "after",
                }
            );
        }

        console.log("✅ Currency data initialized.");
    } catch (error) {
        console.error(
            "❌ Currency seed error:",
            error
        );

        throw error;
    }
};

export default seedCurrencies;