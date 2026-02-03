import { invokeLLM } from "./_core/llm";

export interface ProductData {
  name: string;
  image?: string;
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}

/**
 * Hybrid scraper: First try JSON extraction, then regex patterns, then fallback to LLM
 */
export async function scrapeProductDataHybrid(
  productUrl: string,
  htmlContent: string
): Promise<ProductData> {
  try {
    console.log(`[Hybrid Scraper] Analyzing: ${productUrl}`);

    // Step 1: Extract product name
    const nameMatch = htmlContent.match(
      /<h1[^>]*>([^<]+)<\/h1>|<title>([^|]+)/i
    );
    const name = nameMatch ? (nameMatch[1] || nameMatch[2]).trim() : "Unknown";

    // Step 2: Extract image URL
    let imageUrl: string | undefined;
    const imgMatch = htmlContent.match(
      /https:\/\/image\.coolblue\.nl[^"'\s<>]+/
    );
    if (imgMatch) {
      imageUrl = imgMatch[0];
    }

    // Step 3: Try to extract prices
    let currentPrice: number | undefined;
    let tweedeKansPrice: number | undefined;
    let tweedeKansAvailable = false;

    // Try to find price in escaped JSON (Coolblue uses this)
    // Look for patterns like "price":650 or "price": 650
    const priceJsonMatch = htmlContent.match(/"price"\s*:\s*(\d+)/);
    if (priceJsonMatch) {
      currentPrice = parseInt(priceJsonMatch[1]);
      console.log(
        `[Hybrid Scraper] Extracted price from JSON: ${currentPrice}`
      );
    }

    // Check for Tweede Kans section in HTML
    const tweedeKansSection = htmlContent.match(
      /Voordelige Tweedekans[\s\S]{0,1000}/i
    );
    if (tweedeKansSection) {
      tweedeKansAvailable = true;
      console.log("[Hybrid Scraper] Found Tweede Kans section");

      // Try to extract Tweede Kans price from the section
      // Look for patterns like "€ 586,-" or "586<!-- -->,-" or "price":586
      const tkPriceMatch = tweedeKansSection[0].match(
        /(?:"price"\s*:\s*(\d{2,4})|(?:€\s*)?(\d{2,4})(?:<!--.*?-->)?[,-])/
      );
      if (tkPriceMatch) {
        const price = tkPriceMatch[1] || tkPriceMatch[2];
        if (price) {
          tweedeKansPrice = parseInt(price);
          console.log(
            `[Hybrid Scraper] Extracted Tweede Kans price: ${tweedeKansPrice}`
          );
        }
      }
    }

    // If we didn't find prices with JSON/regex, use LLM as fallback
    if (currentPrice === undefined || tweedeKansPrice === undefined) {
      console.log("[Hybrid Scraper] Fallback to LLM for missing prices");
      const llmData = await scrapeWithLLMFallback(productUrl, htmlContent);

      if (currentPrice === undefined && llmData.currentPrice !== undefined) {
        currentPrice = llmData.currentPrice;
      }
      if (tweedeKansPrice === undefined && llmData.tweedeKansPrice !== undefined) {
        tweedeKansPrice = llmData.tweedeKansPrice;
      }
      if (!tweedeKansAvailable && llmData.tweedeKansAvailable) {
        tweedeKansAvailable = llmData.tweedeKansAvailable;
      }
    }

    return {
      name,
      image: imageUrl,
      originalPrice: currentPrice,
      currentPrice: currentPrice,
      tweedeKansPrice: tweedeKansPrice,
      tweedeKansAvailable,
    };
  } catch (error) {
    console.error(
      "[Hybrid Scraper] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * LLM fallback for complex price extraction
 */
async function scrapeWithLLMFallback(
  productUrl: string,
  htmlContent: string
): Promise<ProductData> {
  try {
    // Limit HTML size for LLM
    const htmlToAnalyze = htmlContent.substring(0, 30000);

    const prompt = `Extract prices from this Coolblue HTML.

FIND:
1. Current price (main price, number only, e.g. 650 not "650,-")
2. Tweede Kans price (if exists, number only)
3. Is Tweede Kans available (true/false)

RULES:
- Prices shown as "650,-" extract as 650
- Current price is main price shown prominently
- Tweede Kans price after "Voordelige Tweedekans" text
- Return null if not found

HTML:
${htmlToAnalyze}

Return ONLY JSON:
{"currentPrice":number or null,"tweedeKansPrice":number or null,"tweedeKansAvailable":boolean}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Extract prices from HTML. Return only JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    const responseText = typeof content === "string" ? content : "{}";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in LLM response");
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      name: "Unknown",
      currentPrice: data.currentPrice || undefined,
      tweedeKansPrice: data.tweedeKansPrice || undefined,
      tweedeKansAvailable: data.tweedeKansAvailable || false,
    };
  } catch (error) {
    console.error(
      "[LLM Fallback] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Return empty data on LLM error
    return {
      name: "Unknown",
      currentPrice: undefined,
      tweedeKansPrice: undefined,
      tweedeKansAvailable: false,
    };
  }
}

/**
 * Fetch HTML content from a URL
 */
export async function fetchPageHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nl-NL,nl;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`[Hybrid Scraper] Fetched ${html.length} bytes`);
    return html;
  } catch (error) {
    console.error(
      "[Hybrid Scraper] Fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}
