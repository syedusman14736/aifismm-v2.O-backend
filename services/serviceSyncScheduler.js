import cron from "node-cron";

import Provider from "../models/Provider.js";
import { syncProviderServices } from "./serviceSyncService.js";

// ============================================================
// SERVICE SYNC CRON
// ============================================================

let isSyncRunning = false;

export const startServiceSyncCron = () => {
    // ========================================================
    // SERVICE SYNC
    // ========================================================
    //
    // Runs automatically every 1 hour.
    //
    // Cron:
    // 0 * * * *
    //
    // Examples:
    // 1:00
    // 2:00
    // 3:00
    // 4:00
    // ...
    //
    // ========================================================

    cron.schedule(
        "0 * * * *",
        async () => {
            // ====================================================
            // PREVENT OVERLAPPING SYNC
            // ====================================================

            if (isSyncRunning) {
                console.log(
                    "⚠️ Previous service sync is still running. Skipping this cycle."
                );

                return;
            }

            isSyncRunning = true;

            console.log(
                "\n=========================================="
            );

            console.log(
                "🔄 AUTOMATIC SERVICE SYNC STARTED"
            );

            console.log(
                "=========================================="
            );

            try {
                // ==================================================
                // GET ACTIVE PROVIDERS
                // ==================================================

                const providers =
                    await Provider.find({
                        status: "active",
                        apiType: "standard_smm",
                    }).select("+apiKey");

                // ==================================================
                // NO PROVIDERS
                // ==================================================

                if (providers.length === 0) {
                    console.log(
                        "ℹ️ No active providers found."
                    );

                    return;
                }

                console.log(
                    `📡 Providers found: ${providers.length}`
                );

                // ==================================================
                // SYNC EACH PROVIDER
                // ==================================================

                for (const provider of providers) {
                    try {
                        console.log(
                            `\n🔄 Syncing provider: ${provider.name ||
                            provider._id
                            }`
                        );

                        const result =
                            await syncProviderServices(
                                provider
                            );

                        console.log(
                            `✅ ${provider.name ||
                            provider._id
                            } synced successfully`
                        );

                        console.log(
                            "📊 Sync result:",
                            result
                        );
                    } catch (error) {
                        console.error(
                            `❌ ${provider.name ||
                            provider._id
                            } sync failed:`,
                            error.message
                        );
                    }
                }

                console.log(
                    "\n=========================================="
                );

                console.log(
                    "🏁 AUTOMATIC SERVICE SYNC COMPLETED"
                );

                console.log(
                    "==========================================\n"
                );
            } catch (error) {
                console.error(
                    "❌ Service sync cron error:",
                    error.message
                );
            } finally {
                // ==================================================
                // ALWAYS RELEASE LOCK
                // ==================================================

                isSyncRunning = false;
            }
        },
        {
            timezone: "Asia/Karachi",
        }
    );

    console.log(
        "⏰ Service Sync Cron Started"
    );

    console.log(
        "📅 Provider services will sync every 1 hour"
    );

    console.log(
        "🕐 Cron timezone: Asia/Karachi"
    );
};

export default startServiceSyncCron;