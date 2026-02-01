import axios from 'axios';

const url = 'https://www.coolblue.nl/product/965916/samsung-dv90db7845gbu3-bespoke-quickdrive.html';

const response = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  timeout: 10000,
});

const html = response.data;

// Look for JSON-LD structured data
const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (jsonLdMatch) {
  try {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    console.log('JSON-LD Data found');
    if (jsonLd.offers) {
      console.log('Offers:', jsonLd.offers);
    }
  } catch (e) {
    console.log('Could not parse JSON-LD');
  }
}

// Look for price in window.__INITIAL_STATE__ or similar
const initialStateMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (initialStateMatch) {
  try {
    const initialState = JSON.parse(initialStateMatch[1]);
    console.log('\nFound Next.js data');
    // Look for prices in the data
    const dataStr = JSON.stringify(initialState);
    const prices = dataStr.match(/\d{3,4}\.\d{2}/g) || [];
    console.log('Prices found:', prices.slice(0, 10));
  } catch (e) {
    console.log('Could not parse Next.js data:', e.message);
  }
}
