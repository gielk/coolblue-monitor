const { scrapeProductData } = require('./server/scraper.ts');

async function test() {
  console.log('Testing scraper with Samsung oven...\n');
  
  // Test regular product page
  console.log('=== TEST 1: Regular product page ===');
  try {
    const data = await scrapeProductData('https://www.coolblue.nl/product/918088/samsung-nq5b4553fbk.html');
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n=== TEST 2: Tweede Kans page ===');
  try {
    const data = await scrapeProductData('https://www.coolblue.nl/product-tweedekans/918088/');
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test().catch(console.error);
