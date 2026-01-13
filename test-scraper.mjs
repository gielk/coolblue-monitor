import { scrapeProductData } from './server/scraper.ts';

const urls = [
  'https://www.coolblue.nl/product-tweedekans/946998/2868467',
  'https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html'
];

console.log('Testing Coolblue scraper...\n');

for (const url of urls) {
  try {
    console.log(`Testing: ${url}`);
    const data = await scrapeProductData(url);
    console.log('Result:', {
      name: data.name,
      tweedeKansAvailable: data.tweedeKansAvailable,
      originalPrice: data.originalPrice ? `€${(data.originalPrice / 100).toFixed(2)}` : 'N/A',
      tweedeKansPrice: data.tweedeKansPrice ? `€${(data.tweedeKansPrice / 100).toFixed(2)}` : 'N/A',
    });
    console.log('---\n');
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    console.log('---\n');
  }
}
