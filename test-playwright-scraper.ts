import { scrapeProductData, closeBrowser } from './server/scraper-playwright';

const testUrls = [
  'https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html',
  'https://www.coolblue.nl/product-tweedekans/946998/2868467',
  'https://www.coolblue.nl/product/941518/samsung-galaxy-s24-ultra-256gb-zwart-5g.html',
];

async function main() {
  console.log("🧪 Testing Playwright Scraper\n");
  console.log("=" .repeat(80));

  for (const url of testUrls) {
    try {
      console.log(`\n📍 URL: ${url}`);
      console.log("-".repeat(80));

      const result = await scrapeProductData(url);

      console.log("\n✅ Scrape Results:");
      console.log(`  📦 Product Name: ${result.name}`);
      console.log(`  💰 Current Price: ${result.currentPrice ? `€${(result.currentPrice / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`  💵 Original Price: ${result.originalPrice ? `€${(result.originalPrice / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`  🏷️  Tweede Kans Price: ${result.tweedeKansPrice ? `€${(result.tweedeKansPrice / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`  ✨ Tweede Kans Available: ${result.tweedeKansAvailable ? 'YES' : 'NO'}`);
      console.log(`  🖼️  Image: ${result.image ? 'Found' : 'Not found'}`);

      if (result.image) {
        console.log(`  🔗 Image URL: ${result.image.substring(0, 60)}...`);
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("\n" + "=".repeat(80));
  }

  await closeBrowser();
  console.log("\n✅ Test completed!");
}

main().catch(console.error);
