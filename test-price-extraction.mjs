import axios from 'axios';

const url = 'https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html';

console.log('Fetching:', url);
const response = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  timeout: 10000,
});

const html = response.data;

// Find all price patterns
const priceMatches = html.match(/€\s*\d+[,.-]\d{2}/g) || [];
console.log('\nAll price patterns found:');
priceMatches.slice(0, 20).forEach(p => console.log('  ', p));

// Find context around "Normale prijs"
const normalePrijsIdx = html.indexOf('Normale prijs');
if (normalePrijsIdx > 0) {
  console.log('\nContext around "Normale prijs":');
  console.log(html.substring(normalePrijsIdx - 100, normalePrijsIdx + 200));
}

// Find context around "999"
const idx999 = html.indexOf('999');
if (idx999 > 0) {
  console.log('\nContext around "999":');
  console.log(html.substring(idx999 - 100, idx999 + 100));
}
