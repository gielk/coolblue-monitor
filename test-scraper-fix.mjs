import { scrapeProductData } from './server/scraper.ts';

const testUrls = [
  'https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html',
  'https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html',
  'https://www.coolblue.nl/product-tweedekans/946998/2868467'
];

async function test() {
  for (const url of testUrls) {
    try {
      console.log(`\nTesting: ${url}`);
      const data = await scrapeProductData(url);
      console.log('Product:', data.name);
      console.log('Current Price:', data.currentPrice, 'EUR');
      console.log('Original Price:', data.originalPrice, 'EUR');
      console.log('Tweede Kans Price:', data.tweedeKansPrice, 'EUR');
      console.log('Tweede Kans Available:', data.tweedeKansAvailable);
      console.log('Image:', data.image ? '✓' : '✗');
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

test();
