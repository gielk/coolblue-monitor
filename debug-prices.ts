// Use native fetch (Node 18+)

async function debugPrices() {
  const urls = [
    "https://www.coolblue.nl/product/918088/samsung-nq5b4553fbk.html",
    "https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html",
    "https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html",
  ];

  for (const url of urls) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`URL: ${url}`);
    console.log("=".repeat(80));

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const html = await response.text();

      // Find all price-like patterns with context
      const priceRegex = /(?:€\s*)?(\d{2,4})[,.-](?:\d{2})?/g;
      const matches: Array<{ price: string; context: string }> = [];

      let match;
      while ((match = priceRegex.exec(html)) !== null) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(html.length, match.index + match[0].length + 100);
        const context = html.substring(start, end).replace(/\n/g, " ");
        matches.push({
          price: match[0],
          context: context,
        });
      }

      // Find unique prices
      const uniquePrices = [...new Set(matches.map((m) => m.price))];
      console.log(`\nFound ${uniquePrices.length} unique price patterns:`);
      uniquePrices.slice(0, 10).forEach((p) => {
        console.log(`  - ${p}`);
      });

      // Look for specific indicators
      console.log("\nPrice indicators:");
      const indicators = [
        { name: "data-test=price", regex: /data-test="price"[\s\S]{0,200}/ },
        { name: "In mijn winkelwagen", regex: /In mijn winkelwagen[\s\S]{0,300}/ },
        { name: "Voordelige Tweedekans", regex: /Voordelige Tweedekans[\s\S]{0,300}/ },
        { name: "main-information", regex: /main-information[^>]*>([^<]*650[^<]*)</ },
      ];

      for (const ind of indicators) {
        const m = html.match(ind.regex);
        if (m) {
          console.log(`\n${ind.name}:`);
          console.log(`  ${m[0].substring(0, 150).replace(/\n/g, " ")}`);
        }
      }

      // Save a snippet for analysis
      const cartIdx = html.indexOf("In mijn winkelwagen");
      if (cartIdx > -1) {
        const snippet = html.substring(Math.max(0, cartIdx - 1000), cartIdx + 500);
        console.log("\n\nCart button context (last 1000 chars before button):");
        console.log(snippet.substring(0, 500).replace(/\n/g, " "));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

debugPrices();
