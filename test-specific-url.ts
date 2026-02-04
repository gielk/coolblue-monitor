import { scrapeProductData, closeBrowser } from './server/scraper-playwright';

async function main() {
  const url = 'https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html';
  
  console.log(`Testing URL: ${url}\n`);
  
  try {
    const result = await scrapeProductData(url);
    console.log('Scrape Results:');
    console.log(`  Product Name: ${result.name}`);
    console.log(`  Current Price: ${result.currentPrice ? `€${(result.currentPrice / 100).toFixed(2)}` : 'N/A'}`);
    console.log(`  Original Price: ${result.originalPrice ? `€${(result.originalPrice / 100).toFixed(2)}` : 'N/A'}`);
    console.log(`  Tweede Kans Price: ${result.tweedeKansPrice ? `€${(result.tweedeKansPrice / 100).toFixed(2)}` : 'N/A'}`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  await closeBrowser();
}

main().catch(console.error);
