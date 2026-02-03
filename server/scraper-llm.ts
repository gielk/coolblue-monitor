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
 * LLM-based scraper using Claude to intelligently extract product data from HTML
 * Much more reliable than regex patterns for complex Coolblue pages
 */
export async function scrapeProductDataWithLLM(
  productUrl: string,
  htmlContent: string
): Promise<ProductData> {
  try {
    console.log(`[LLM Scraper] Analyzing: ${productUrl}`);

    // Prepare the HTML for LLM analysis (limit size to avoid token limits)
    const htmlToAnalyze = htmlContent.substring(0, 50000); // Limit to 50KB

    const prompt = `Extract product information from this Coolblue HTML.

EXTRACT:
1. Product name
2. Current price (main price in euros, as number only, e.g. 650 not "650,-")
3. Tweede Kans price (if available, as number only)
4. Is Tweede Kans available (true/false)
5. Product image URL

PRICE RULES:
- Prices shown as "650,-" should be extracted as 650
- Current price is the main price shown prominently
- Tweede Kans price appears after "Voordelige Tweedekans" text
- Return null if price not found

HTML:
${htmlToAnalyze}

Return ONLY this JSON (no other text):
{"name":"string","currentPrice":number or null,"tweedeKansPrice":number or null,"tweedeKansAvailable":boolean,"imageUrl":"string or null"}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Extract product data from HTML. Return only valid JSON, no other text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = response.choices[0]?.message.content;
    const responseText = typeof content === "string" ? content : "{}";

    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[LLM Scraper] Response text:", responseText);
      throw new Error("No JSON found in LLM response");
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    console.log("[LLM Scraper] Extracted data:", {
      name: extractedData.name,
      currentPrice: extractedData.currentPrice,
      tweedeKansPrice: extractedData.tweedeKansPrice,
      tweedeKansAvailable: extractedData.tweedeKansAvailable,
    });

    return {
      name: extractedData.name || "Unknown Product",
      image: extractedData.imageUrl,
      originalPrice: extractedData.currentPrice,
      currentPrice: extractedData.currentPrice,
      tweedeKansPrice: extractedData.tweedeKansPrice,
      tweedeKansAvailable: extractedData.tweedeKansAvailable || false,
    };
  } catch (error) {
    console.error(
      "[LLM Scraper] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Fetch HTML content from a URL using native fetch
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
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    console.log(`[LLM Scraper] Fetched ${html.length} bytes from ${url}`);
    return html;
  } catch (error) {
    console.error(
      "[LLM Scraper] Fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}
