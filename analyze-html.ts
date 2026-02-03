// Use native fetch (Node 18+)

async function analyzeHTML() {
  const url = "https://www.coolblue.nl/product/918088/samsung-nq5b4553fbk.html";
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const html = await response.text();
    console.log(`Fetched ${html.length} bytes`);
    
    // Look for price patterns
    const priceMatches = html.match(/\d{2,4}[,.-]/g) || [];
    console.log("\nPrice-like patterns found:");
    priceMatches.slice(0, 20).forEach((m, i) => {
      console.log(`  ${i}: ${m}`);
    });
    
    // Look for JSON data
    const jsonMatches = html.match(/window\.__[A-Z_]+\s*=\s*\{[\s\S]{0,500}\}/g) || [];
    console.log(`\nJSON data blocks found: ${jsonMatches.length}`);
    
    // Look for specific price indicators
    const indicators = [
      "data-test",
      "price",
      "€",
      "650",
      "999",
      "Voordelige",
      "Tweedekans",
    ];
    
    for (const indicator of indicators) {
      const regex = new RegExp(`.{0,100}${indicator}.{0,100}`, "gi");
      const matches = html.match(regex) || [];
      if (matches.length > 0) {
        console.log(`\n"${indicator}" context (first 3 matches):`);
        matches.slice(0, 3).forEach((m) => {
          console.log(`  ${m.replace(/\n/g, " ").substring(0, 150)}`);
        });
      }
    }
    
    // Extract JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      console.log("\n\nJSON-LD found:");
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        console.log(JSON.stringify(jsonLd, null, 2).substring(0, 500));
      } catch (e) {
        console.log("Failed to parse JSON-LD");
      }
    } else {
      console.log("\n\nNo JSON-LD found");
    }
    
    // Save a snippet for manual inspection
    const snippet = html.substring(html.indexOf("In mijn winkelwagen") - 500, html.indexOf("In mijn winkelwagen") + 500);
    if (snippet.length > 100) {
      console.log("\n\nCart section context:");
      console.log(snippet);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

analyzeHTML();
