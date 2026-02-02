import axios from "axios";
import * as cheerio from "cheerio";

export interface ProductData {
  name: string;
  image?: string;
  originalPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}

// Try to import Playwright scraper (may not be available in all environments)
let playwrightScraper: any = null;
try {
  playwrightScraper = require('./scraper-playwright');
  console.log('[Scraper] Playwright scraper available ✓');
} catch (e) {
  console.log('[Scraper] Playwright not available, using fallback axios scraper');
}

const COOLBLUE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

/**
 * Main scraper function - tries Playwright first, falls back to Axios
 */
export async function scrapeProductData(productUrl: string): Promise<ProductData> {
  // Try Playwright first (most reliable)
  if (playwrightScraper) {
    try {
      console.log('[Scraper] Using Playwright scraper (primary)');
      const data = await playwrightScraper.scrapeProductData(productUrl);

      // Validate we got useful data
      if (data.name && data.name !== 'Unknown Product') {
        return data;
      }

      console.log('[Scraper] Playwright returned incomplete data, trying fallback...');
    } catch (error) {
      console.error('[Scraper] Playwright failed:', error instanceof Error ? error.message : String(error));
      console.log('[Scraper] Falling back to Axios scraper...');
    }
  }

  // Fallback to Axios scraper
  return scrapeProductDataWithAxios(productUrl);
}

/**
 * Parse Dutch price format correctly
 * Examples: €650,- → 65000, €1.234,99 → 123499, €1234 → 123400
 */
function parseDutchPrice(text: string): number | null {
  // Clean up text
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Dutch price patterns (MUST have € symbol)
  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/,           // €1.234,-
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/,     // €1.234,99
    /€\s?(\d{3,4}),-/,                    // €650,-
    /€\s?(\d{3,4}),(\d{2})/,              // €650,99
    /€\s?(\d{3,4})/,                      // €650
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    let priceInCents: number;

    if (match[3]) {
      // Format: €1.234,99 (thousands + cents)
      const euros = parseInt(match[1] + match[2]);
      const cents = parseInt(match[3]);
      priceInCents = euros * 100 + cents;
    } else if (match[2]) {
      // Could be: €1.234,- (thousands) OR €650,99 (cents)
      const firstNum = parseInt(match[1]);
      const secondNum = parseInt(match[2]);

      if (secondNum < 100) {
        // This is cents: €650,99
        priceInCents = firstNum * 100 + secondNum;
      } else {
        // This is thousands: €1.234,-
        priceInCents = (firstNum * 1000 + secondNum) * 100;
      }
    } else {
      // Format: €650,- or €650
      const euros = parseInt(match[1]);
      priceInCents = euros * 100;
    }

    // Validate realistic price range (€10 - €50,000)
    if (priceInCents >= 1000 && priceInCents <= 5000000) {
      return priceInCents;
    }
  }

  return null;
}

/**
 * Extract all valid prices from page text
 */
function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];

  // Dutch price patterns with € symbol
  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/g,           // €1.234,-
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/g,     // €1.234,99
    /€\s?(\d{3,4}),-/g,                    // €650,-
    /€\s?(\d{3,4}),(\d{2})/g,              // €650,99
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const price = parseDutchPrice(match[0]);
      if (price) {
        prices.push(price);
      }
    }
  }

  return Array.from(new Set(prices)).sort((a, b) => a - b);
}

/**
 * Axios fallback scraper with automatic Tweede Kans URL checking
 */
async function scrapeProductDataWithAxios(productUrl: string): Promise<ProductData> {
  try {
    console.log(`[Scraper] Fetching: ${productUrl}`);

    const response = await axios.get(productUrl, {
      headers: COOLBLUE_HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const html = response.data;

    // Extract product name
    let name = $("h1").first().text().trim();
    if (!name) {
      const titleMatch = html.match(/<title>([^|]+)/);
      name = titleMatch ? titleMatch[1].trim() : "Unknown Product";
    }

    // Extract product image
    const image = extractMainProductImage($);

    // Extract product ID for Tweede Kans URL
    const productId = extractProductIdFromUrl(productUrl);

    // Detect if this is already a Tweede Kans product page
    const isTweedeKansPage = productUrl.includes("/product-tweedekans/");

    let tweedeKansAvailable = false;
    let originalPrice: number | undefined;
    let tweedeKansPrice: number | undefined;

    if (isTweedeKansPage) {
      // Already on Tweede Kans page - scrape both prices
      console.log('[Scraper] This is a Tweede Kans page');
      tweedeKansAvailable = true;

      const prices = extractPricesFromText($.text());

      if (prices.length >= 2) {
        tweedeKansPrice = prices[0]; // Lowest = Tweede Kans
        originalPrice = prices[prices.length - 1]; // Highest = Original
      } else if (prices.length === 1) {
        tweedeKansPrice = prices[0];
      }
    } else {
      // Regular product page - get original price
      console.log('[Scraper] Regular product page');

      const prices = extractPricesFromText($.text());
      if (prices.length > 0) {
        originalPrice = prices[0]; // First visible price is usually current price
      }

      // Check for Tweede Kans availability
      // Method 1: Look for text mentions
      const pageText = $.text();
      const hasTweedeKansMention =
        pageText.includes("Voordelige Tweedekans") ||
        pageText.includes("Tweede Kans") ||
        pageText.includes("tweedekans");

      // Method 2: Try to scrape the Tweede Kans URL directly
      if (productId) {
        const tweedeKansUrl = `https://www.coolblue.nl/product-tweedekans/${productId}/`;
        console.log(`[Scraper] Checking Tweede Kans URL: ${tweedeKansUrl}`);

        try {
          const tkResponse = await axios.get(tweedeKansUrl, {
            headers: COOLBLUE_HEADERS,
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500, // Accept 404 as valid response
          });

          if (tkResponse.status === 200) {
            // Tweede Kans page exists!
            tweedeKansAvailable = true;
            console.log('[Scraper] Tweede Kans page found!');

            const tk$ = cheerio.load(tkResponse.data);
            const tkPrices = extractPricesFromText(tk$.text());

            if (tkPrices.length > 0) {
              tweedeKansPrice = tkPrices[0]; // Lowest = Tweede Kans price
              console.log(`[Scraper] Tweede Kans price: €${(tweedeKansPrice / 100).toFixed(2)}`);
            }
          } else {
            console.log(`[Scraper] Tweede Kans page returned ${tkResponse.status}`);
          }
        } catch (tkError) {
          console.log('[Scraper] Tweede Kans page not accessible');
        }
      }

      // Method 3: Parse Tweede Kans link on page
      if (!tweedeKansAvailable && hasTweedeKansMention) {
        const tweedeKansLink = $('a[href*="tweedekans"]').first();
        if (tweedeKansLink.length) {
          tweedeKansAvailable = true;
          const linkText = tweedeKansLink.text();
          const price = parseDutchPrice(linkText);
          if (price) {
            tweedeKansPrice = price;
          }
        }
      }
    }

    console.log('[Scraper] Results:', {
      name,
      originalPrice: originalPrice ? `€${(originalPrice/100).toFixed(2)}` : 'N/A',
      tweedeKansPrice: tweedeKansPrice ? `€${(tweedeKansPrice/100).toFixed(2)}` : 'N/A',
      tweedeKansAvailable,
    });

    return {
      name,
      image,
      originalPrice,
      tweedeKansPrice,
      tweedeKansAvailable,
    };
  } catch (error) {
    console.error(`[Scraper] Error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function extractMainProductImage($: cheerio.CheerioAPI): string | undefined {
  // Look for main product image
  const selectors = [
    "picture img",
    "img[data-src]",
    'img[alt*="product"]',
    'img[alt*="Product"]',
  ];

  for (const selector of selectors) {
    const img = $(selector).first();
    const src = img.attr("src") || img.attr("data-src");
    if (src && !src.includes("employee")) {
      return src.startsWith("http") ? src : `https://www.coolblue.nl${src}`;
    }
  }

  return undefined;
}

export function extractProductIdFromUrl(url: string): string | null {
  // Coolblue URLs: /product/{id}/ or /product-tweedekans/{id}/
  const match = url.match(/\/product(?:-tweedekans)?\/(\d+)\//);
  return match ? match[1] : null;
}

export async function testScraper(urls: string[]): Promise<void> {
  console.log("Testing scraper...\n");

  for (const url of urls) {
    try {
      console.log(`\nTesting: ${url}`);
      const data = await scrapeProductData(url);
      console.log("Result:", {
        name: data.name,
        tweedeKansAvailable: data.tweedeKansAvailable,
        originalPrice: data.originalPrice ? `€${(data.originalPrice/100).toFixed(2)}` : "N/A",
        tweedeKansPrice: data.tweedeKansPrice ? `€${(data.tweedeKansPrice/100).toFixed(2)}` : "N/A",
        image: data.image ? "✓" : "✗",
      });
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
