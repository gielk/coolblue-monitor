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
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Referer": "https://www.google.com/",
};

export async function scrapeProductData(productUrl: string): Promise<ProductData> {
  try {
    const response = await axios.get(productUrl, {
      headers: COOLBLUE_HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const html = response.data;
    
    // Extract product name from h1 or title
    let name = $("h1").first().text().trim();
    if (!name) {
      const titleMatch = html.match(/<title>([^|]+)/);
      name = titleMatch ? titleMatch[1].trim() : "Unknown Product";
    }

    // Extract product image
    const image = extractMainProductImage($, html);
    
    // Detect if this is a Tweede Kans product page
    const isProductTweedeKansPage = productUrl.includes("/product-tweedekans/");

    let tweedeKansAvailable = false;
    let originalPrice: number | undefined;
    let currentPrice: number | undefined;
    let tweedeKansPrice: number | undefined;

    // Extract all prices from the page using multiple strategies
    const extractedPrices = extractPricesFromPage($, html);

    if (isProductTweedeKansPage) {
      // This is a Tweede Kans product page
      tweedeKansAvailable = true;

      // Look for price containers with specific class names or data attributes
      const priceElements = $('[data-test="price"], .sales-price, [class*="price"]').toArray();
      const pricesFromElements: number[] = [];

      priceElements.forEach((el) => {
        const text = $(el).text();
        const priceMatch = text.match(/€?\s*(\d{1,4})[,.]?(\d{2})?/);
        if (priceMatch) {
          const euros = parseInt(priceMatch[1]);
          const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0;
          const priceInCents = euros * 100 + cents;
          if (priceInCents > 10000 && priceInCents < 500000) { // Between €100 and €5000
            pricesFromElements.push(priceInCents);
          }
        }
      });

      // Combine with text-based extraction
      const allPrices = Array.from(new Set([...pricesFromElements, ...extractedPrices])).sort((a, b) => a - b);

      if (allPrices.length >= 2) {
        // First price is usually Tweede Kans (lower), second is original (higher)
        tweedeKansPrice = allPrices[0];
        originalPrice = allPrices[1];
      } else if (allPrices.length === 1) {
        tweedeKansPrice = allPrices[0];
      }
    } else {
      // This is a regular product page
      const pageText = $.text();

      // Check if Tweede Kans is available
      const hasTweedeKansSection =
        pageText.includes("Voordelige Tweedekans") ||
        pageText.includes("Tweede Kans") ||
        pageText.includes("tweedekans") ||
        $('[href*="tweedekans"]').length > 0;

      if (hasTweedeKansSection) {
        tweedeKansAvailable = true;

        // Try to find Tweede Kans price
        const tweedeKansLink = $('a[href*="tweedekans"]').first();
        if (tweedeKansLink.length) {
          const linkText = tweedeKansLink.text();
          const priceMatch = linkText.match(/€?\s*(\d{1,4})[,.]?(\d{2})?/);
          if (priceMatch) {
            const euros = parseInt(priceMatch[1]);
            const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0;
            tweedeKansPrice = euros * 100 + cents;
          }
        }
      }

      // Extract current/original price
      const priceElement = $('[data-test="price"], .sales-price, [class*="product-price"]').first();
      if (priceElement.length) {
        const text = priceElement.text();
        const priceMatch = text.match(/€?\s*(\d{1,4})[,.]?(\d{2})?/);
        if (priceMatch) {
          const euros = parseInt(priceMatch[1]);
          const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0;
          currentPrice = euros * 100 + cents;
          originalPrice = currentPrice;
        }
      } else if (extractedPrices.length > 0) {
        // Fallback to text extraction
        currentPrice = extractedPrices[0];
        originalPrice = extractedPrices[0];
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

function extractPricesFromPage($: cheerio.CheerioAPI, html: string): number[] {
  const prices: number[] = [];
  const textContent = $.text();

  // Remove script and SVG content to avoid false matches
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<svg[\s\S]*?<\/svg>/gi, "");
  const cleanText = cheerio.load(cleanHtml).text();

  // Match price patterns like €1.234,56 or €1234,- or 1.234,-
  const pricePatterns = [
    /€\s*(\d{1,2})\.(\d{3})[,.](\d{2})/g, // €1.234,56
    /€\s*(\d{3,4}),-/g, // €1234,-
    /(\d{1,2})\.(\d{3}),-/g, // 1.234,-
  ];

  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      let priceInCents: number;

      if (match[1] && match[2] && match[3]) {
        // Format: €1.234,56
        const euros = parseInt(match[1] + match[2]);
        const cents = parseInt(match[3]);
        priceInCents = euros * 100 + cents;
      } else if (match[1] && !match[2]) {
        // Format: €1234,-
        const euros = parseInt(match[1]);
        priceInCents = euros * 100;
      } else if (match[1] && match[2]) {
        // Format: 1.234,-
        const euros = parseInt(match[1] + match[2]);
        priceInCents = euros * 100;
      } else {
        continue;
      }

      // Filter reasonable product prices (€100 to €10,000)
      if (priceInCents >= 10000 && priceInCents <= 1000000) {
        prices.push(priceInCents);
      }
    }
  }

  // Return unique prices sorted ascending
  return Array.from(new Set(prices)).sort((a, b) => a - b);
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
