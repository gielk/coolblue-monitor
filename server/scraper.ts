import axios from "axios";
import * as cheerio from "cheerio";

export interface ProductData {
  name: string;
  image?: string;
  originalPrice?: number; // in cents
  tweedeKansPrice?: number; // in cents
  tweedeKansAvailable: boolean;
}

const COOLBLUE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9",
};

export async function scrapeProductData(productUrl: string): Promise<ProductData> {
  try {
    const response = await axios.get(productUrl, {
      headers: COOLBLUE_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Extract product name
    const name = $("h1").first().text().trim() || "Unknown Product";
    
    // Extract product image
    const image = $("img[alt*='product']").first().attr("src") || 
                  $("img[alt*='Product']").first().attr("src");
    
    // Extract prices - look for price patterns
    let originalPrice: number | undefined;
    let tweedeKansPrice: number | undefined;
    let tweedeKansAvailable = false;
    
    // Look for "Voordelige Tweedekans" section
    const pageText = $.text();
    const tweedeKansMatch = pageText.match(/Voordelige\s+Tweedekans|Tweede\s+Kans/i);
    
    if (tweedeKansMatch) {
      tweedeKansAvailable = true;
      
      // Extract prices from the page
      const priceMatches = pageText.match(/€\s*(\d+[.,]\d{2})/g);
      if (priceMatches && priceMatches.length >= 2) {
        // Usually first price is original, second is Tweede Kans
        originalPrice = parsePriceTocents(priceMatches[0]);
        tweedeKansPrice = parsePriceTocents(priceMatches[1]);
      }
    }
    
    return {
      name,
      image,
      originalPrice,
      tweedeKansPrice,
      tweedeKansAvailable,
    };
  } catch (error) {
    console.error(`Error scraping ${productUrl}:`, error);
    throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function parsePriceTocents(priceStr: string): number {
  // Convert "€ 123,45" or "€ 123.45" to cents (12345)
  const cleaned = priceStr.replace(/[€\s]/g, "").replace(/[.,]/, ".");
  const price = parseFloat(cleaned);
  return Math.round(price * 100);
}

export async function extractProductIdFromUrl(url: string): Promise<string | null> {
  // Coolblue URLs typically have format: /product/{id}/{product-name}
  const match = url.match(/\/product\/(\d+)\//);
  return match ? match[1] : null;
}
