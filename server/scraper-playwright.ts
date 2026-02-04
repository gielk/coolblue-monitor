import { chromium, Browser, Page } from 'playwright';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function scrapeProductData(url: string): Promise<{
  name: string;
  originalPrice?: number;
  currentPrice?: number;
  tweedeKansPrice?: number;
  tweedeKansAvailable: boolean;
  image?: string;
}> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    console.log(`[Scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('[Scraper] Page loaded, extracting data...');

    // Extract product name
    const name = await extractProductName(page);

    // Check if Tweede Kans page
    const isTweedeKansPage = url.includes('tweedekans');

    // Extract prices
    const prices = await extractPrices(page, isTweedeKansPage);

    // Extract image
    const image = await extractProductImage(page);

    // Check for Tweede Kans availability if not on TK page
    let tweedeKansAvailable = isTweedeKansPage;
    if (!isTweedeKansPage) {
      const tkUrl = url.replace('/product/', '/product-tweedekans/').split('.html')[0];
      try {
        const tkPage = await browser.newPage();
        await tkPage.goto(tkUrl, { waitUntil: 'networkidle', timeout: 5000 });
        console.log('[Scraper] ✓ Tweede Kans page exists! Extracting TK price...');
        const tkPrices = await extractPrices(tkPage, true);
        if (tkPrices.tweedeKansPrice) {
          prices.tweedeKansPrice = tkPrices.tweedeKansPrice;
          tweedeKansAvailable = true;
        }
        await tkPage.close();
      } catch (e) {
        console.log('[Scraper] Tweede Kans page not available');
      }
    }

    return {
      name: name || 'Unknown Product',
      originalPrice: prices.originalPrice,
      currentPrice: prices.currentPrice,
      tweedeKansPrice: prices.tweedeKansPrice,
      tweedeKansAvailable,
      image,
    };
  } finally {
    await page.close();
  }
}

async function extractProductName(page: Page): Promise<string | undefined> {
  const selectors = [
    'h1',
    '[data-test="product-title"]',
    '[class*="title"]',
    'meta[property="og:title"]',
  ];

  for (const selector of selectors) {
    try {
      if (selector.includes('meta')) {
        const content = await page.getAttribute(selector, 'content');
        if (content) return content;
      } else {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) return text.trim();
        }
      }
    } catch (e) {
      continue;
    }
  }

  return undefined;
}

async function extractProductImage(page: Page): Promise<string | undefined> {
  const selectors = [
    'img[alt*="product"]',
    'img[data-test*="image"]',
    '[class*="product"][class*="image"] img',
    'img[src*="product"]',
    'meta[property="og:image"]',
  ];

  for (const selector of selectors) {
    try {
      if (selector.includes('meta')) {
        const content = await page.getAttribute(selector, 'content');
        if (content) return content;
      } else {
        const element = await page.$(selector);
        if (element) {
          const src = await element.getAttribute('src') || await element.getAttribute('data-src');
          if (src && !src.includes('employee') && !src.includes('avatar')) {
            return src.startsWith('http') ? src : `https://www.coolblue.nl${src}`;
          }
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

  const prices = await extractAllPricesFromPage(page);
  console.log('[Scraper] Found prices:', prices);

  if (prices.length >= 2) {
    const sorted = [...prices].sort((a, b) => a - b);
    return {
      tweedeKansPrice: sorted[0],
      originalPrice: sorted[sorted.length - 1],
      currentPrice: sorted[0],
      tweedeKansAvailable: true,
    };
  } else if (prices.length === 1) {
    return {
      tweedeKansPrice: prices[0],
      originalPrice: prices[0],
      currentPrice: prices[0],
      tweedeKansAvailable: true,
    };
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

  const bodyText = await page.textContent('body');
  const hasTweedeKans = bodyText?.toLowerCase().includes('tweedekans') ||
                        bodyText?.toLowerCase().includes('tweede kans') ||
                        await page.$('a[href*="tweedekans"]') !== null;

  if (prices.length > 0) {
    // Filter out very small prices (likely not product prices)
    const validPrices = prices.filter(p => p >= 1000); // At least EUR 10

    if (validPrices.length > 0) {
      // Use the LARGEST price as main price
      const mainPrice = Math.max(...validPrices);
      console.log(`[Scraper] Using largest valid price: EUR ${(mainPrice / 100).toFixed(2)}`);

      return {
        currentPrice: mainPrice,
        originalPrice: mainPrice,
        tweedeKansAvailable: hasTweedeKans,
      };
    }
  }

  return {
    tweedeKansAvailable: hasTweedeKans,
  };
}

async function extractAllPricesFromPage(page: Page): Promise<number[]> {
  const prices: number[] = [];

  const priceSelectors = [
    '[data-test="price"]',
    '[data-testid="price"]',
    '.sales-price',
    '.price',
    '[class*="price"]',
    '[class*="Price"]',
    'strong:has-text("€")',
    'span:has-text("€")',
  ];

  for (const selector of priceSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        if (text) {
          const price = parsePriceFromText(text);
          if (price && price >= 100 && price <= 10000000) {
            prices.push(price);
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (prices.length === 0) {
    const bodyText = await page.textContent('body') || '';
    const textPrices = extractPricesFromText(bodyText);
    prices.push(...textPrices);
  }

  return Array.from(new Set(prices)).sort((a, b) => b - a);
}

function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];

  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/g,
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/g,
    /€\s?(\d{3,4}),-/g,
    /(\d{1,2})\.(\d{3}),-/g,
    /(\d{1,2})\.(\d{3}),(\d{2})/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let price: number | null = null;

      if (match[3]) {
        const euros = parseInt(match[1] + match[2]);
        const cents = parseInt(match[3]);
        price = euros * 100 + cents;
      } else if (match[2]) {
        const euros = parseInt(match[1] + match[2]);
        price = euros * 100;
      } else {
        const euros = parseInt(match[1]);
        price = euros * 100;
      }

      if (price && price >= 100 && price <= 10000000) {
        prices.push(price);
      }
    }
  }

  return prices;
}

function parsePriceFromText(text: string): number | null {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  const patterns = [
    /€\s?(\d{1,2})\.(\d{3}),-/,
    /€\s?(\d{1,2})\.(\d{3}),(\d{2})/,
    /€\s?(\d{3,4}),-/,
    /(\d{1,2})\.(\d{3}),-/,
    /(\d{1,2})\.(\d{3}),(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (match[3]) {
        const euros = parseInt(match[1] + match[2]);
        const cents = parseInt(match[3]);
        return euros * 100 + cents;
      } else if (match[2]) {
        const euros = parseInt(match[1] + match[2]);
        return euros * 100;
      } else {
        const euros = parseInt(match[1]);
        return euros * 100;
      }
    }
  }

  return null;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function extractProductIdFromUrl(url: string): Promise<string | null> {
  const match = url.match(/\/product(?:-tweedekans)?\/(\d+)\//);
  return match ? match[1] : null;
}

export async function testScraper(urls: string[]): Promise<void> {
  console.log("Testing scraper with Playwright...\n");

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const result = await scrapeProductData(url);
      console.log(`✓ ${result.name}`);
      console.log(`  Original: EUR ${result.originalPrice ? (result.originalPrice / 100).toFixed(2) : 'N/A'}`);
      console.log(`  Tweede Kans: EUR ${result.tweedeKansPrice ? (result.tweedeKansPrice / 100).toFixed(2) : 'N/A'}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await closeBrowser();
}
