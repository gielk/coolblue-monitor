import axios from "axios";
import * as cheerio from "cheerio";

export interface ProductData {
  name: string;
  image?: string;
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
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
    let html = response.data;
    
    // Remove SVG and script tags to avoid false price matches
    html = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
    html = html.replace(/<script[\s\S]*?<\/script>/g, "");
    
    // Extract product name from h1 or title
    let name = $("h1").first().text().trim();
    if (!name) {
      const titleMatch = html.match(/<title>([^|]+)/);
      name = titleMatch ? titleMatch[1].trim() : "Unknown Product";
    }
    
    // Extract product image - look for main product image, skip employee photos
    const image = extractMainProductImage($, response.data); // Use original html for images
    
    // Detect if this is a Tweede Kans product
    const isProductTweedeKansPage = productUrl.includes("/product-tweedekans/");
    
    let tweedeKansAvailable = false;
    let originalPrice: number | undefined;
    let currentPrice: number | undefined;
    let tweedeKansPrice: number | undefined;

    if (isProductTweedeKansPage) {
      // This is a Tweede Kans product page
      tweedeKansAvailable = true;
      
      // Extract prices from Tweede Kans page
      // Look for "Nieuwprijs" section and "Tweedekans" section
      const nieuwprijsMatch = html.match(/Nieuwprijs[^€]*€\s*(\d+)[,.](\ d{2}|-)/i);
      const tweedeKansMatch = html.match(/(?:Tweedekans|Tweede Kans)[^€]*€\s*(\d+)[,.](\ d{2}|-)/i);
      
      if (nieuwprijsMatch) {
        originalPrice = parseInt(nieuwprijsMatch[1]);
      } else {
        // Fallback: extract prices from text
        const textLines = $.text().split('\n');
        for (const line of textLines) {
          const priceMatch = line.match(/€?\s*(\d{3,4})[,.](\ d{2}|-)/);
          if (priceMatch) {
            const price = parseInt(priceMatch[1]);
            if (price > 300 && price < 3000 && !originalPrice) {
              originalPrice = price;
            }
          }
        }
      }
      
      if (tweedeKansMatch) {
        tweedeKansPrice = parseInt(tweedeKansMatch[1]);
      } else {
        // Fallback: extract prices from text
        const textLines = $.text().split('\n');
        const prices: number[] = [];
        for (const line of textLines) {
          const priceMatch = line.match(/€?\s*(\d{3,4})[,.](\ d{2}|-)/);
          if (priceMatch) {
            const price = parseInt(priceMatch[1]);
            if (price > 300 && price < 3000) {
              prices.push(price);
            }
          }
        }
        // Get the second unique price (first is original, second is Tweede Kans)
        const uniquePrices = Array.from(new Set(prices)).sort((a, b) => a - b);
        if (uniquePrices.length > 1) {
          // Usually first is Tweede Kans (lower), second is original (higher)
          tweedeKansPrice = uniquePrices[0];
          originalPrice = uniquePrices[1];
        } else if (uniquePrices.length === 1) {
          tweedeKansPrice = uniquePrices[0];
        }
      }
    } else {
      // This is a regular product page - check if Tweede Kans is available
      const pageText = $.text();
      
      // Look for "Voordelige Tweedekans" or "Tweede Kans" section
      const hasTweedeKansSection = pageText.match(/Voordelige\s+Tweedekans|Tweede\s+Kans|tweedekans/i);
      
      if (hasTweedeKansSection) {
        tweedeKansAvailable = true;
        
        // Extract Tweede Kans price from "Voordelige Tweedekans van €XXX,-" pattern
        const tweedeKansPattern = /Voordelige\s+Tweedekans[^€]*van\s+€?\s*(\d+)[,.](\d{2}|-)/i;
        const tweedeKansMatch = html.match(tweedeKansPattern);
        
        if (tweedeKansMatch) {
          tweedeKansPrice = parseInt(tweedeKansMatch[1]);
        }
      }
      
      // Extract current price - look for prices in text content (not SVG)
      // Split by lines and look for price patterns
      const textLines = $.text().split('\n');
      const prices: number[] = [];
      
      for (const line of textLines) {
        const priceMatch = line.match(/€?\s*(\d{3,4})[,.](\d{2}|-)/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1]);
          // Filter to reasonable product prices
          if (price > 300 && price < 3000 && price !== 1999 && price !== 2026) {
            prices.push(price);
          }
        }
      }
      
      // Get unique prices
      const uniquePrices = Array.from(new Set(prices));
      if (uniquePrices.length > 0) {
        currentPrice = uniquePrices[0];
        originalPrice = uniquePrices[0];
      }
    }
    
    return {
      name,
      image,
      originalPrice,
      currentPrice,
      tweedeKansPrice,
      tweedeKansAvailable,
    };
  } catch (error) {
    console.error(`Error scraping ${productUrl}:`, error);
    throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function extractMainProductImage($: cheerio.CheerioAPI, html: string): string | undefined {
  // Look for main product image - typically in a picture tag or specific img elements
  let imageUrl: string | undefined;

  // Try to find image in picture tag (most reliable)
  const pictureImg = $("picture img").first().attr("src");
  if (pictureImg && !pictureImg.includes("employee")) {
    imageUrl = pictureImg;
  }

  // If not found, try to find image with data-src attribute (lazy loading)
  if (!imageUrl) {
    const lazyImg = $("img[data-src]").first().attr("data-src");
    if (lazyImg && !lazyImg.includes("employee")) {
      imageUrl = lazyImg;
    }
  }

  // Try to find main product image by looking for images with product-related alt text
  if (!imageUrl) {
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      const alt = $(el).attr("alt") || "";

      // Skip employee/service images
      if (
        src &&
        !src.includes("employee") &&
        !alt.includes("employee") &&
        (alt.toLowerCase().includes("main") ||
          alt.toLowerCase().includes("product") ||
          alt.toLowerCase().includes("samsung"))
      ) {
        imageUrl = src;
        return false; // break
      }
    });
  }

  // Make sure URL is absolute
  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = "https://www.coolblue.nl" + imageUrl;
  }

  return imageUrl;
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
        originalPrice: data.originalPrice ? `€${data.originalPrice}` : "N/A",
        currentPrice: data.currentPrice ? `€${data.currentPrice}` : "N/A",
        tweedeKansPrice: data.tweedeKansPrice ? `€${data.tweedeKansPrice}` : "N/A",
        image: data.image ? "✓" : "✗",
      });
      console.log("---\n");
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      console.log("---\n");
    }
  }
}
