const axios = require('axios');

// Simple in-memory cache with TTL
const cache = new Map(); // key: coin id, value: { usd, idr, expiresAt }
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

function setCache(id, price) {
  cache.set(id, { ...price, expiresAt: Date.now() + DEFAULT_TTL_MS });
}

function getCache(id) {
  const entry = cache.get(id);
  if (entry && entry.expiresAt > Date.now()) return entry;
  if (entry) cache.delete(id);
  return null;
}

async function fetchPrice(coingecko_id) {
  if (!coingecko_id) throw new Error('coingecko_id is required');
  const cached = getCache(coingecko_id);
  if (cached) return { usd: cached.usd, idr: cached.idr };

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingecko_id)}&vs_currencies=usd,idr`;
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const price = data[coingecko_id];
    if (!price) throw new Error('Price not found for given coingecko_id');
    setCache(coingecko_id, price);
    return { usd: price.usd, idr: price.idr };
  } catch (err) {
    if (err.response && err.response.status === 429) {
      // Rate limited: try to use stale cache if available
      const stale = cache.get(coingecko_id);
      if (stale) return { usd: stale.usd, idr: stale.idr };
    }
    throw err;
  }
}

async function fetchPrices(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  // Split into chunks to avoid very long requests (CoinGecko supports multiple ids)
  const CHUNK_SIZE = 50;
  const result = {};

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const idsParam = chunk.join(',');

    // Try cache first
    const missing = chunk.filter(id => !getCache(id));
    if (missing.length === 0) {
      chunk.forEach(id => {
        const c = getCache(id);
        if (c) result[id] = { usd: c.usd, idr: c.idr };
      });
      continue;
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idsParam)}&vs_currencies=usd,idr`;
    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      chunk.forEach(id => {
        const price = data[id];
        if (price) {
          setCache(id, price);
          result[id] = { usd: price.usd, idr: price.idr };
        } else {
          // fallback to cache if exists
          const c = getCache(id);
          if (c) result[id] = { usd: c.usd, idr: c.idr };
        }
      });
    } catch (err) {
      if (err.response && err.response.status === 429) {
        // Rate limited: use any available cache
        chunk.forEach(id => {
          const c = cache.get(id);
          if (c) result[id] = { usd: c.usd, idr: c.idr };
        });
      } else {
        throw err;
      }
    }
  }

  // Ensure cached-only ids are included
  unique.forEach(id => {
    if (!result[id]) {
      const c = getCache(id) || cache.get(id);
      if (c) result[id] = { usd: c.usd, idr: c.idr };
    }
  });

  return result;
}

module.exports = { fetchPrice, fetchPrices };
