const db = require('../config/db');
const priceService = require('../services/investmentPriceService');

module.exports = {
  async index(req, res) {
    const userId = req.session.user_id;
    const [portfolioRaw] = await db.query(
      `SELECT p.id, a.name, a.provider_source, a.provider_id, p.amount
       FROM investment_portfolio p
       JOIN investment_assets a ON p.asset_id = a.id
       WHERE p.user_id = ?`,
      [userId]
    );
    const portfolio = portfolioRaw.map(row => ({
      ...row,
      asset_type: row.provider_source === 'coingecko' ? 'CRYPTO' : (row.provider_source === 'goldapi' ? 'EMAS' : 'ASSET')
    }));
    // Fetch real-time prices for all assets
    const prices = {};
    let total = 0;
    for (const item of portfolio) {
      try {
        const price = await priceService.getPrice(item.provider_source, item.provider_id);
        prices[item.id] = price;
        total += (item.amount * (price.idr || 0));
      } catch (e) {
        prices[item.id] = { idr: 0, usd: 0, error: true };
      }
    }
    res.render('invest/index', {
      portfolio,
      prices,
      total,
      username: req.session.username,
      active: 'invest'
    });
  },

  async addForm(req, res) {
    const [assets] = await db.query('SELECT * FROM investment_assets');
    res.render('invest/add', {
      assets,
      username: req.session.username,
      active: 'invest'
    });
  },

  async addAsset(req, res) {
    const userId = req.session.user_id;
    const { asset_id, amount, unit } = req.body;
    // Normalisasi jumlah: untuk emas, jika input gram, konversi ke troy ounce (1 ozt = 31.1034768 g)
    let normalizedAmount = Number(amount) || 0;
    try {
      const [[asset]] = await db.query('SELECT * FROM investment_assets WHERE id = ?', [asset_id]);
      if (asset && asset.provider_source === 'goldapi') {
        if (unit === 'gram') {
          normalizedAmount = normalizedAmount / 31.1034768;
        } else if (unit === 'troy_ounce') {
          // sudah dalam troy ounce, nothing to do
        } else {
          // default: treat as troy ounce for gold
        }
      }
    } catch (e) { /* ignore, fallback to raw amount */ }
    await db.query(
      'INSERT INTO investment_portfolio (user_id, asset_id, amount, input_unit) VALUES (?, ?, ?, ?)',
      [userId, asset_id, normalizedAmount, unit || null]
    );
    res.redirect('/invest');
  },

  async editForm(req, res) {
    const userId = req.session.user_id;
    const id = req.params.id;
    const [[portfolio]] = await db.query(
      `SELECT * FROM investment_portfolio WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    const [assets] = await db.query('SELECT * FROM investment_assets');
    res.render('invest/edit', {
      portfolio,
      assets,
      username: req.session.username,
      active: 'invest'
    });
  },

  async editAsset(req, res) {
    const userId = req.session.user_id;
    const id = req.params.id;
    const { asset_id, amount, unit } = req.body;
    let normalizedAmount = Number(amount) || 0;
    try {
      const [[asset]] = await db.query('SELECT * FROM investment_assets WHERE id = ?', [asset_id]);
      if (asset && asset.provider_source === 'goldapi') {
        if (unit === 'gram') {
          normalizedAmount = normalizedAmount / 31.1034768;
        } else if (unit === 'troy_ounce') {
          // already troy ounce
        }
      }
    } catch (e) { /* ignore */ }
    await db.query(
      'UPDATE investment_portfolio SET asset_id = ?, amount = ?, input_unit = ? WHERE id = ? AND user_id = ?',
      [asset_id, normalizedAmount, unit || null, id, userId]
    );
    res.redirect('/invest');
  },

  async deleteAsset(req, res) {
    const userId = req.session.user_id;
    const id = req.params.id;
    await db.query('DELETE FROM investment_portfolio WHERE id = ? AND user_id = ?', [id, userId]);
    res.redirect('/invest');
  },

  async getPrice(req, res) {
    const { asset_id } = req.query;
    const [[asset]] = await db.query('SELECT * FROM investment_assets WHERE id = ?', [asset_id]);
    if (!asset) return res.json({ error: 'Asset not found' });
    try {
      const price = await priceService.getPrice(asset.provider_source, asset.provider_id);
      res.json(price);
    } catch (e) {
      res.json({ error: 'Failed to fetch price' });
    }
  }
};
