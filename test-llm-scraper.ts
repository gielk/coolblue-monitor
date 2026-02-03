import { scrapeProductDataWithLLM, fetchPageHTML } from "./server/scraper-llm";

async function testLLMScraper() {
  const testUrls = [
    "https://www.coolblue.nl/product/918088/samsung-nq5b4553fbk.html",
    "https://www.coolblue.nl/product-tweedekans/918088/",
    "https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html",
  ];

  for (const url of testUrls) {
    console.log("\n" + "=".repeat(80));
    console.log(`📍 Testing: ${url}`);
    console.log("=".repeat(80));

    try {
      // Fetch HTML
      const html = await fetchPageHTML(url);
      console.log(`✓ Fetched ${html.length} bytes`);

      // Analyze with LLM
      const productData = await scrapeProductDataWithLLM(url, html);

      console.log("\n✅ Extracted Product Data:");
      console.log(`  Name: ${productData.name}`);
      console.log(`  Current Price: €${productData.currentPrice}`);
      console.log(`  Tweede Kans Available: ${productData.tweedeKansAvailable}`);
      if (productData.tweedeKansPrice) {
        console.log(`  Tweede Kans Price: €${productData.tweedeKansPrice}`);
      }
      if (productData.image) {
        console.log(`  Image: ${productData.image}`);
      }
    } catch (error) {
      console.error(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Test completed!");
}

testLLMScraper().catch(console.error);
