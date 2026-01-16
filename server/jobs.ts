import { getDb, addCheckHistory, updateMonitoredProduct, getMonitoredProducts, addPriceHistory, getEmailSettings } from "./db";
import { eq, and } from "drizzle-orm";
import { monitoredProducts } from "../drizzle/schema";
import { scrapeProductData } from "./scraper";
import { sendProductAvailabilityEmail, getEmailConfig } from "./email";

interface JobResult {
  productId: number;
  success: boolean;
  message: string;
  tweedeKansAvailable?: boolean;
}

let monitoringInterval: NodeJS.Timeout | null = null;

export async function runMonitoringJobs(): Promise<JobResult[]> {
  const db = await getDb();
  if (!db) {
    console.error("[Jobs] Database not available for monitoring jobs");
    return [];
  }

  const results: JobResult[] = [];

  try {
    console.log(`[Jobs] Running monitoring jobs at ${new Date().toISOString()}`);

    // Get all active products
    const productsToCheck = await db
      .select()
      .from(monitoredProducts)
      .where(eq(monitoredProducts.isActive, true));

    console.log(`[Jobs] Found ${productsToCheck.length} products to check`);

    const now = new Date();

    for (const product of productsToCheck) {
      try {
        // Check if enough time has passed since last check
        if (product.lastCheckedAt) {
          const timeSinceLastCheck = now.getTime() - new Date(product.lastCheckedAt).getTime();
          const intervalMs = product.checkIntervalMinutes * 60 * 1000;

          if (timeSinceLastCheck < intervalMs) {
            console.log(
              `[Jobs] Skipping product ${product.id} - interval not reached (${Math.round(timeSinceLastCheck / 1000 / 60)} / ${product.checkIntervalMinutes} minutes)`
            );
            results.push({
              productId: product.id,
              success: true,
              message: "Skipped - interval not reached yet",
            });
            continue;
          }
        }

        console.log(`[Jobs] Checking product ${product.id}: ${product.productUrl}`);

        // Scrape product data
        const productData = await scrapeProductData(product.productUrl);

        // Record price history
        await addPriceHistory({
          productId: product.id,
          originalPrice: productData.originalPrice,
          tweedeKansPrice: productData.tweedeKansPrice,
          tweedeKansAvailable: productData.tweedeKansAvailable,
        });

        // Check if Tweede Kans became available
        const wasAvailable = product.tweedeKansAvailable;
        const isNowAvailable = productData.tweedeKansAvailable;

        if (isNowAvailable && !wasAvailable) {
          console.log(`[Jobs] 🎉 Tweede Kans became available for product ${product.id}!`);

          // Get user's email settings
          const emailSettings = await getEmailSettings(product.userId);
          const emailConfig = getEmailConfig();

          if (emailSettings?.notificationsEnabled && emailConfig) {
            console.log(`[Jobs] Sending email notification to ${product.userEmail}`);
            const emailSent = await sendProductAvailabilityEmail(product, productData);

            if (emailSent) {
              console.log(`[Jobs] ✅ Email sent successfully to ${product.userEmail}`);
            } else {
              console.warn(`[Jobs] ⚠️ Failed to send email for product ${product.id}`);
            }
          } else if (!emailSettings?.notificationsEnabled) {
            console.log(`[Jobs] Notifications disabled for user ${product.userId}`);
          } else {
            console.log(`[Jobs] Email config not configured`);
          }
        }

        // Update product with latest data
        await updateMonitoredProduct(product.id, product.userId, {
          productName: productData.name,
          productImage: productData.image,
          originalPrice: productData.originalPrice,
          tweedeKansPrice: productData.tweedeKansPrice,
          tweedeKansAvailable: productData.tweedeKansAvailable,
          lastCheckedAt: now,
        });

        // Add check history
        await addCheckHistory({
          productId: product.id,
          tweedeKansAvailable: productData.tweedeKansAvailable,
          originalPrice: productData.originalPrice,
          tweedeKansPrice: productData.tweedeKansPrice,
          checkStatus: "success",
        });

        results.push({
          productId: product.id,
          success: true,
          message: "Successfully checked and updated",
          tweedeKansAvailable: productData.tweedeKansAvailable,
        });

        console.log(`[Jobs] ✅ Product ${product.id} checked successfully`);
      } catch (error) {
        console.error(`[Jobs] ❌ Error checking product ${product.id}:`, error);

        // Add failed check history
        await addCheckHistory({
          productId: product.id,
          tweedeKansAvailable: false,
          checkStatus: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });

        results.push({
          productId: product.id,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(`[Jobs] Monitoring jobs completed. Results: ${results.length} products checked`);
  } catch (error) {
    console.error("[Jobs] Error in monitoring jobs:", error);
  }

  return results;
}

export function startMonitoringScheduler(intervalSeconds: number = 300) {
  console.log(`[Jobs] Starting monitoring scheduler (interval: ${intervalSeconds}s)`);

  // Run immediately on startup
  runMonitoringJobs().catch(console.error);

  // Then run periodically
  monitoringInterval = setInterval(() => {
    runMonitoringJobs().catch(console.error);
  }, intervalSeconds * 1000);
}

export function stopMonitoringScheduler() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log("[Jobs] Monitoring scheduler stopped");
  }
}
