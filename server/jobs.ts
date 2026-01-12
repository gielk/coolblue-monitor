import { getDb, addCheckHistory, updateMonitoredProduct } from "./db";
import { eq, and, lte, isNull } from "drizzle-orm";
import { monitoredProducts } from "../drizzle/schema";
import { scrapeProductData } from "./scraper";
import { sendProductAvailabilityEmail } from "./email";

interface JobResult {
  productId: number;
  success: boolean;
  message: string;
  tweedeKansAvailable?: boolean;
}

export async function runMonitoringJobs(): Promise<JobResult[]> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for monitoring jobs");
    return [];
  }

  const results: JobResult[] = [];

  try {
    // Get all active products that need checking
    const now = new Date();
    const productsToCheck = await db
      .select()
      .from(monitoredProducts)
      .where(
        and(
          eq(monitoredProducts.isActive, true),
          // Check if lastCheckedAt is null or older than checkIntervalMinutes
          // This is a simplified check - in production you might use a more sophisticated approach
        )
      );

    console.log(`Found ${productsToCheck.length} products to check`);

    for (const product of productsToCheck) {
      try {
        // Check if enough time has passed since last check
        if (product.lastCheckedAt) {
          const timeSinceLastCheck = now.getTime() - product.lastCheckedAt.getTime();
          const intervalMs = product.checkIntervalMinutes * 60 * 1000;
          
          if (timeSinceLastCheck < intervalMs) {
            results.push({
              productId: product.id,
              success: true,
              message: "Skipped - interval not reached yet",
            });
            continue;
          }
        }

        // Scrape product data
        const productData = await scrapeProductData(product.productUrl);
        
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

        // Send email if Tweede Kans became available and we haven't notified recently
        if (productData.tweedeKansAvailable && !product.lastNotifiedAt) {
          try {
            await sendProductAvailabilityEmail(product, productData);
            
            // Update lastNotifiedAt
            await updateMonitoredProduct(product.id, product.userId, {
              lastNotifiedAt: now,
            });
          } catch (emailError) {
            console.error(`Failed to send email for product ${product.id}:`, emailError);
          }
        }

        results.push({
          productId: product.id,
          success: true,
          message: "Successfully checked and updated",
          tweedeKansAvailable: productData.tweedeKansAvailable,
        });

      } catch (error) {
        console.error(`Error checking product ${product.id}:`, error);

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
  } catch (error) {
    console.error("Error in monitoring jobs:", error);
  }

  return results;
}

// Schedule monitoring jobs to run every 5 minutes
export function startMonitoringScheduler() {
  console.log("Starting monitoring scheduler...");
  
  // Run immediately on startup
  runMonitoringJobs().catch(console.error);
  
  // Then run every 5 minutes
  setInterval(() => {
    runMonitoringJobs().catch(console.error);
  }, 5 * 60 * 1000);
}
