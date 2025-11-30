// Simple smoke test for CoinGecko price fetch
const { fetchPrice } = require('../services/cryptoPriceService');

(async () => {
  try {
    const price = await fetchPrice('bitcoin');
    console.log('CoinGecko price:', price);
    const amount = 0.01; // example amount
    const valueIdr = amount * Number(price.idr || 0);
    console.log(`Example value for ${amount} BTC in IDR:`, valueIdr.toLocaleString('id-ID'));
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err.message);
    process.exit(1);
  }
})();
