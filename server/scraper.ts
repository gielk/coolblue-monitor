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
    const html = response.data;
    
    // Extract product name
    const name = $("h1").first().text().trim() || "Unknown Product";
    
    // Extract product image
    const image = $("img[alt*='product']").first().attr("src") || 
                  $("img[alt*='Product']").first().attr("src") ||
                  $("img[alt*='Samsung']").first().attr("src");
    
    // Detect if this is a Tweede Kans product
    const isProductTweedeKansPage = productUrl.includes("/product-tweedekans/");
    const pageTitle = $("title").text();
    const isTweedeKansTitle = pageTitle.toLowerCase().includes("tweedekans") || pageTitle.toLowerCase().includes("tweede kans");
    
    let tweedeKansAvailable = false;
    let originalPrice: number | undefined;
    let tweedeKansPrice: number | undefined;

    if (isProductTweedeKansPage || isTweedeKansTitle) {
      // This is a Tweede Kans product page
      tweedeKansAvailable = true;
      
      // Extract prices from Tweede Kans page
      // Look for "Nieuwprijs" pattern
      const nieuwprijsPattern = /Nieuwprijs[^€]*€\s*([\d.,]+)[^€]*€\s*([\d.,]+)/i;
      const nieuwprijsMatch = html.match(nieuwprijsPattern);
      
      if (nieuwprijsMatch) {
        originalPrice = parsePriceTocents(nieuwprijsMatch[1]);
        tweedeKansPrice = parsePriceTocents(nieuwprijsMatch[2]);
      } else {
        // Fallback: look for all prices
        const allPrices = html.match(/€\s*([\d.,]+)/g);
        if (allPrices && allPrices.length >= 2) {
          // On Tweede Kans pages, usually first is original, second is Tweede Kans
          originalPrice = parsePriceTocents(allPrices[0]);
          tweedeKansPrice = parsePriceTocents(allPrices[1]);
        } else if (allPrices && allPrices.length === 1) {
          tweedeKansPrice = parsePriceTocents(allPrices[0]);
        }
      }
    } else {
      // This is a regular product page - check if Tweede Kans is available
      const pageText = $.text();
      
      // Look for "Voordelige Tweedekans" or "Tweede Kans" section
      const hasTweedeKansSection = pageText.match(/Voordelige\s+Tweedekans|Tweede\s+Kans|tweedekans/i);
      
      if (hasTweedeKansSection) {
        tweedeKansAvailable = true;
        
        // Extract prices from the section
        // Pattern: "Voordelige Tweedekans" followed by "van" and then the price
        const tweedeKansPattern = /Voordelige\s+Tweedekans[^€]*van[^€]*€\s*([\d.,]+)/i;
        const tweedeKansMatch = html.match(tweedeKansPattern);
        
        if (tweedeKansMatch) {
          tweedeKansPrice = parsePriceTocents(tweedeKansMatch[1]);
        }
        
        // Extract original price (usually the main price on the page)
        // Look for "Adviesprijs" or the first prominent price
        const adviesprijs = html.match(/Adviesprijs[^€]*€\s*([\d.,]+)[^€]*€\s*([\d.,]+)/i);
        if (adviesprijs) {
          originalPrice = parsePriceTocents(adviesprijs[2]); // Second price is usually the current price
        } else {
          // Fallback: get all prices and use the first one
          const allPrices = html.match(/€\s*([\d.,]+)/g);
          if (allPrices && allPrices.length >= 1) {
            originalPrice = parsePriceTocents(allPrices[0]);
          }
        }
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
  // Convert "€ 123,45" or "€ 123.45" or "123,45" to cents (12345)
  const cleaned = priceStr.replace(/[€\s]/g, "");
  // Handle both comma and dot as decimal separator
  const normalized = cleaned.replace(/,/, ".");
  const price = parseFloat(normalized);
  return Math.round(price * 100);
}

export async function extractProductIdFromUrl(url: string): Promise<string | null> {
  // Coolblue URLs typically have format: /product/{id}/ or /product-tweedekans/{id}/
  const match = url.match(/\/product(?:-tweedekans)?\/(\d+)\//);
  return match ? match[1] : null;
}

export async function testScraper(urls: string[]): Promise<void> {
  console.log("Testing scraper with provided URLs...\n");
  
  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const data = await scrapeProductData(url);
      console.log("Result:", {
        name: data.name,
        tweedeKansAvailable: data.tweedeKansAvailable,
        originalPrice: data.originalPrice ? `€${(data.originalPrice / 100).toFixed(2)}` : "N/A",
        tweedeKansPrice: data.tweedeKansPrice ? `€${(data.tweedeKansPrice / 100).toFixed(2)}` : "N/A",
      });
      console.log("---\n");
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      console.log("---\n");
    }
  }
}
