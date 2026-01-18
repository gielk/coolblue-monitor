import axios from 'axios';

const url = 'https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html';

const response = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  timeout: 10000,
});

const html = response.data;

// Find all prices
const priceRegex = /€?\s*(\d{3,4})[,.](\d{2}|-)/g;
let match;
const prices = [];

while ((match = priceRegex.exec(html)) !== null) {
  prices.push({
    full: match[0],
    price: match[1],
    position: match.index
  });
}

console.log('Found prices:');
prices.forEach(p => {
  const context = html.substring(Math.max(0, p.position - 50), Math.min(html.length, p.position + 50));
  console.log(`${p.full} - Context: ...${context}...`);
});
