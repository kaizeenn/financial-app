const axios = require('axios');
require('dotenv').config();
const db = require('../config/db');

// Harga emas dari MetalPriceAPI, cache per 24 jam
// Cache disimpan dalam gold_price_cache

async function fetchGoldFromAPI() {
  const key = process.env.METALAPI_KEY;
  if (!key) throw new Error('METALAPI_KEY belum diset');
  const url = `https://api.metalpriceapi.com/v1/latest?api_key=${key}&base=USD&symbols=XAU`;
  const resp = await axios.get(url, { validateStatus: () => true });
  if (resp.status !== 200) {
    console.warn('Gold API error:', resp.status, resp.data && JSON.stringify(resp.data));
    throw new Error('Gagal mengambil harga emas');
  }
  const rateRaw = resp.data?.rates?.XAU;
  if (!rateRaw || Number(rateRaw) === 0) {
    throw new Error('Data emas tidak valid');
  }
  const price_usd = 1 / Number(rateRaw);
  // gunakan kurs aktual jika tersedia, jika tidak 15000
  let usdIdr = Number(process.env.USD_IDR_RATE) || 0;
  if (!usdIdr) {
    try {
      const fx = await axios.get('https://api.exchangerate.host/latest?base=USD&symbols=IDR');
      usdIdr = Number(fx?.data?.rates?.IDR) || 15000;
    } catch (e) {
      usdIdr = 15000;
    }
  }
  const price_idr = Math.round(price_usd * usdIdr);
  return { price_usd, price_idr, rate: Number(rateRaw) };
}

async function getCachedGoldPrice() {
  // Ambil cache terbaru
  const [rows] = await db.query('SELECT * FROM gold_price_cache ORDER BY updated_at DESC LIMIT 1');
  const latest = rows && rows[0];
  const todaySame = latest ? (new Date(latest.updated_at)).toDateString() === (new Date()).toDateString() : false;
  if (latest && todaySame) {
    return { usd: Number(latest.price_usd), idr: Number(latest.price_idr), rate: Number(latest.rate) };
  }
  // Perlu refresh atau belum ada cache
  try {
    const fresh = await fetchGoldFromAPI();
    if (latest) {
      await db.query(
        'UPDATE gold_price_cache SET price_usd = ?, price_idr = ?, rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fresh.price_usd, fresh.price_idr, fresh.rate, latest.id]
      );
    } else {
      await db.query(
        'INSERT INTO gold_price_cache (price_usd, price_idr, rate) VALUES (?, ?, ?)',
        [fresh.price_usd, fresh.price_idr, fresh.rate]
      );
    }
    return { usd: fresh.price_usd, idr: fresh.price_idr, rate: fresh.rate };
  } catch (err) {
    console.warn('Gold API error:', err.message);
    if (latest) {
      // fallback ke cache lama
      return { usd: Number(latest.price_usd), idr: Number(latest.price_idr), rate: Number(latest.rate) };
    }
    throw new Error('Gagal mengambil harga emas');
  }
}

/**
 * Handle provider berbeda dan kembalikan struktur seragam.
 * Untuk crypto: kembalikan { usd, idr, rate:null }
 * Untuk emas: gunakan getGoldPrice()
 */
async function getPriceByProvider(source, provider_id, assetType) {
  switch (source) {
    case 'coingecko':
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${provider_id}&vs_currencies=idr,usd`;
        const { data } = await axios.get(url);
        if (!data || !data[provider_id]) throw new Error('CoinGecko: empty response');
        const idr = Number(data[provider_id].idr) || 0;
        const usd = Number(data[provider_id].usd) || 0;
        return { usd, idr, rate: null };
      } catch (e) {
        console.error('Crypto price error:', provider_id, e.message);
        throw new Error('Gagal mengambil harga crypto');
      }
    case 'goldapi':
    case 'yellow_metal':
    case 'metalprice':
    case 'gold':
      return await getCachedGoldPrice();
    default:
      throw new Error('Provider tidak didukung');
  }
}

/**
 * Ambil asset dari DB berdasarkan id, kemudian panggil provider.
 */
async function getPriceByAssetId(assetId) {
  const [[asset]] = await db.query('SELECT * FROM investment_assets WHERE id = ?', [assetId]);
  if (!asset) throw new Error('Asset tidak ditemukan');
  const { provider_source, provider_id, type } = asset;
  return await getPriceByProvider(provider_source, provider_id, type);
}

/**
 * Wrapper lama agar kompatibel dengan pemanggilan eksisting di controller.
 * Mengembalikan { idr, usd } atau bentuk seragam tanpa rate jika crypto.
 */
async function getPrice(provider_source, provider_id) {
  try {
    const result = await getPriceByProvider(provider_source, provider_id, null);
    // Controller lama hanya butuh usd & idr
    return { idr: result.idr, usd: result.usd };
  } catch (e) {
    console.error('Price service error:', provider_source, provider_id, e.message);
    return { idr: 0, usd: 0, error: e.message };
  }
}

module.exports = { fetchGoldFromAPI, getCachedGoldPrice, getPriceByProvider, getPriceByAssetId, getPrice };
