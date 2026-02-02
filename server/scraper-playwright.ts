import { chromium, Browser, Page } from "playwright";

export interface ProductData {
  name: string;
  image?: string;
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}

// Browser instance reuse voor betere performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  }
  return browserInstance;
}

export async function scrapeProductData(productUrl: string): Promise<ProductData> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  const page = await context.newPage();

  try {
    console.log(`[Scraper] Navigating to: ${productUrl}`);

    // Navigate met retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(productUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`[Scraper] Retry navigation... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Wait voor belangrijke elementen
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('[Scraper] Network not idle, continuing anyway...');
    });

    // Extra wait voor dynamic content
    await page.waitForTimeout(2000);

    console.log('[Scraper] Page loaded, extracting data...');

    // Extract product name
    const name = await extractProductName(page);

    // Extract image
    const image = await extractProductImage(page);

    // Check of dit een Tweede Kans pagina is
    const isTweedeKansPage = productUrl.includes('/product-tweedekans/');

    // Extract prijzen
    const prices = await extractPrices(page, isTweedeKansPage);

    console.log('[Scraper] Extracted data:', { name, ...prices, image: !!image });

    await context.close();

    return {
      name,
      image,
      ...prices,
    };
  } catch (error) {
    await context.close();
    console.error(`[Scraper] Error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function extractProductName(page: Page): Promise<string> {
  // Probeer verschillende selectors
  const selectors = [
    'h1',
    '[data-test="product-title"]',
    '.product-title',
    'h1.page-title',
    '[class*="product-name"]',
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: title tag
  const title = await page.title();
  return title.split('|')[0].trim() || 'Unknown Product';
}

async function extractProductImage(page: Page): Promise<string | undefined> {
  const selectors = [
    'picture img',
    '[data-test="product-image"]',
    '.product-image img',
    'img[src*="product"]',
    'main img',
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const src = await element.getAttribute('src') || await element.getAttribute('data-src');
        if (src && !src.includes('employee') && !src.includes('avatar')) {
          return src.startsWith('http') ? src : `https://www.coolblue.nl${src}`;
        }
      }
    } catch (e) {
      continue;
    }
  }

  return undefined;
}

async function extractPrices(page: Page, isTweedeKansPage: boolean): Promise<{
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}> {
  if (isTweedeKansPage) {
    return extractTweedeKansPrices(page);
  } else {
    return extractRegularProductPrices(page);
  }
}

async function extractTweedeKansPrices(page: Page): Promise<{
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}> {
  console.log('[Scraper] Extracting Tweede Kans prices...');

  // Probeer prijzen te vinden met verschillende strategieën
  const prices = await extractAllPricesFromPage(page);

  console.log('[Scraper] Found prices:', prices);

  // Op Tweede Kans pagina verwachten we 2 prijzen:
  // - Nieuwprijs (hoger)
  // - Tweedekans prijs (lager)

  if (prices.length >= 2) {
    // Sort: laagste eerst
    const sortedPrices = [...prices].sort((a, b) => a - b);

    return {
      tweedeKansPrice: sortedPrices[0], // Laagste = Tweede Kans
      originalPrice: sortedPrices[sortedPrices.length - 1], // Hoogste = Nieuwprijs
      currentPrice: sortedPrices[0],
      tweedeKansAvailable: true,
    };
  } else if (prices.length === 1) {
    // Alleen 1 prijs gevonden
    return {
      tweedeKansPrice: prices[0],
      originalPrice: prices[0],
      currentPrice: prices[0],
      tweedeKansAvailable: true,
    };
  }

  // Fallback: probeer text-based extractie
  const textContent = await page.textContent('body');
  if (textContent) {
    const textPrices = extractPricesFromText(textContent);
    if (textPrices.length >= 2) {
      const sorted = textPrices.sort((a, b) => a - b);
      return {
        tweedeKansPrice: sorted[0],
        originalPrice: sorted[sorted.length - 1],
        currentPrice: sorted[0],
        tweedeKansAvailable: true,
      };
    }
  }

  return {
    tweedeKansAvailable: true,
  };
}

async function extractRegularProductPrices(page: Page): Promise<{
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
}> {
  console.log('[Scraper] Extracting regular product prices...');

  const prices = await extractAllPricesFromPage(page);

  // Check of Tweede Kans beschikbaar is
  const bodyText = await page.textContent('body');
  const hasTweedeKans = bodyText?.toLowerCase().includes('tweedekans') ||
                        bodyText?.toLowerCase().includes('tweede kans') ||
                        await page.$('a[href*="tweedekans"]') !== null;

  if (prices.length > 0) {
    const mainPrice = prices[0]; // Eerste prijs is meestal de huidige prijs

    if (hasTweedeKans && prices.length >= 2) {
      // Als Tweede Kans beschikbaar is en we hebben 2 prijzen
      const sorted = [...prices].sort((a, b) => a - b);
      return {
        currentPrice: mainPrice,
        originalPrice: mainPrice,
        tweedeKansPrice: sorted[0], // Laagste = Tweede Kans
        tweedeKansAvailable: true,
      };
    }

    return {
      currentPrice: mainPrice,
      originalPrice: mainPrice,
      tweedeKansAvailable: hasTweedeKans,
    };
  }

  return {
    tweedeKansAvailable: hasTweedeKans,
  };
}

async function extractAllPricesFromPage(page: Page): Promise<number[]> {
  const prices: number[] = [];

  // Strategie 1: Zoek naar specifieke price selectors (ONLY visible price elements)
  const priceSelectors = [
    '[data-test="price"]',
    '[data-testid="price"]',
    '.sales-price__current',
    '.sales-price',
    '[class*="SalesPrice"]',
    'div.product-order strong',
    'strong:has-text("€")',
  ];

  for (const selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        // Check if element is visible
        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        const text = await element.textContent();
        if (text) {
          const price = parsePriceFromText(text);
          // Stricter validation: realistic product prices between €50 and €50,000
          if (price && price >= 5000 && price <= 5000000) {
            prices.push(price);
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  // If we found prices in specific selectors, return those (most reliable)
  if (prices.length > 0) {
    console.log('[Scraper] Found prices from selectors:', prices.map(p => `€${(p/100).toFixed(2)}`));
    return Array.from(new Set(prices)).sort((a, b) => b - a);
  }

  // Fallback: Only search in main product area, not entire body
  try {
    const productArea = await page.$('main, [role="main"], .product-detail, .product-header');
    if (productArea) {
      const areaText = await productArea.textContent() || '';
      const textPrices = extractPricesFromText(areaText);
      prices.push(...textPrices);
      console.log('[Scraper] Found prices from text:', prices.map(p => `€${(p/100).toFixed(2)}`));
    }
  } catch (e) {
    console.log('[Scraper] Could not extract from product area:', e);
  }

  // Return unieke prijzen
  return Array.from(new Set(prices)).sort((a, b) => b - a);
}

function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];

  // ONLY match prices with € symbol (more reliable)
  // Nederlandse prijs formats met € symbool
  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/g,           // €1.234,-
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/g,     // €1.234,99
    /€\s?(\d{3,4}),-/g,                    // €1234,- or €650,-
    /€\s?(\d{3,4}),(\d{2})/g,              // €650,00 or €1234,99
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let priceInCents: number;

      if (match[3]) {
        // Format: €1.234,99 (with thousands separator)
        const euros = parseInt(match[1] + match[2]);
        const cents = parseInt(match[3]);
        priceInCents = euros * 100 + cents;
      } else if (match[2]) {
        // Could be: €1.234,- OR €650,00
        const firstNum = parseInt(match[1]);
        const secondNum = parseInt(match[2]);

        if (secondNum === 0 || secondNum < 100) {
          // This is cents: €650,00
          priceInCents = firstNum * 100 + secondNum;
        } else {
          // This is thousands: €1.234,-
          priceInCents = (firstNum * 1000 + secondNum) * 100;
        }
      } else {
        // Format: €1234,-
        const euros = parseInt(match[1]);
        priceInCents = euros * 100;
      }

      // Filter realistic product prices (€50 tot €50,000)
      if (priceInCents >= 5000 && priceInCents <= 5000000) {
        prices.push(priceInCents);
      }
    }
  }

  return Array.from(new Set(prices));
}

function parsePriceFromText(text: string): number | null {
  // Remove alle whitespace en newlines
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // ONLY match prices with € symbol
  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/,              // €1.234,-
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/,        // €1.234,99
    /€\s?(\d{3,4}),-/,                       // €650,-
    /€\s?(\d{3,4}),(\d{2})/,                 // €650,00
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let priceInCents: number;

      if (match[3]) {
        // Format: €1.234,99 (with thousands)
        const euros = parseInt(match[1] + match[2]);
        const cents = parseInt(match[3]);
        priceInCents = euros * 100 + cents;
      } else if (match[2]) {
        // Could be: €1.234,- OR €650,00
        const firstNum = parseInt(match[1]);
        const secondNum = parseInt(match[2]);

        if (secondNum === 0 || secondNum < 100) {
          // This is cents: €650,00
          priceInCents = firstNum * 100 + secondNum;
        } else {
          // This is thousands: €1.234,-
          priceInCents = (firstNum * 1000 + secondNum) * 100;
        }
      } else {
        // Format: €650,-
        const euros = parseInt(match[1]);
        priceInCents = euros * 100;
      }

      // Validate realistic price range
      if (priceInCents >= 5000 && priceInCents <= 5000000) {
        return priceInCents;
      }
    }
  }

  return null;
}

// Cleanup functie
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Helper voor testing
export async function extractProductIdFromUrl(url: string): Promise<string | null> {
  const match = url.match(/\/product(?:-tweedekans)?\/(\d+)\//);
  return match ? match[1] : null;
}

// Test functie
export async function testScraper(urls: string[]): Promise<void> {
  console.log("Testing scraper with Playwright...\n");

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const data = await scrapeProductData(url);
      console.log("Result:", {
        name: data.name,
        tweedeKansAvailable: data.tweedeKansAvailable,
        originalPrice: data.originalPrice ? `€${(data.originalPrice / 100).toFixed(2)}` : "N/A",
        currentPrice: data.currentPrice ? `€${(data.currentPrice / 100).toFixed(2)}` : "N/A",
        tweedeKansPrice: data.tweedeKansPrice ? `€${(data.tweedeKansPrice / 100).toFixed(2)}` : "N/A",
        image: data.image ? "✓" : "✗",
      });
      console.log("---\n");
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      console.log("---\n");
    }
  }

  await closeBrowser();
}
