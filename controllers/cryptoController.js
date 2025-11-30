const db = require('../config/db');
const { fetchPrice, fetchPrices } = require('../services/cryptoPriceService');

// Helpers
async function getUserCryptoAssets(userId) {
  const [rows] = await db.query(
    `SELECT ca.id, ca.user_id, ca.crypto_id, ca.amount, cl.name, cl.symbol, cl.coingecko_id
     FROM crypto_assets ca
     JOIN crypto_list cl ON ca.crypto_id = cl.id
     WHERE ca.user_id = ?
     ORDER BY cl.name ASC`,
    [userId]
  );
  return rows;
}

async function getCryptoList() {
  const [rows] = await db.query(
    'SELECT id, symbol, name, coingecko_id FROM crypto_list ORDER BY name ASC'
  );
  return rows;
}

async function getAssetById(id, userId) {
  const [rows] = await db.query(
    `SELECT ca.id, ca.user_id, ca.crypto_id, ca.amount, cl.name, cl.symbol, cl.coingecko_id
     FROM crypto_assets ca
     JOIN crypto_list cl ON ca.crypto_id = cl.id
     WHERE ca.id = ? AND ca.user_id = ?`,
    [id, userId]
  );
  return rows[0];
}

// Controller methods
async function listCryptoAssets(req, res) {
  try {
    const userId = req.session.user_id;
    const assets = await getUserCryptoAssets(userId);

    // Batch fetch prices and compute totals
    const ids = assets.map(a => a.coingecko_id);
    const priceMap = await fetchPrices(ids);
    let totalValueIdr = 0;
    const assetsWithPrices = assets.map(a => {
      const price = priceMap[a.coingecko_id] || { idr: 0 };
      const valueIdr = Number(a.amount) * Number(price.idr || 0);
      totalValueIdr += valueIdr;
      return { ...a, price_idr: price.idr || 0, value_idr: valueIdr };
    });

    res.render('crypto/index', {
      layout: 'layout/main',
      title: 'Aset Crypto',
      username: req.session.username,
      assets: assetsWithPrices,
      totalValueIdr,
      active: 'crypto',
      messages: req.flash(),
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal memuat aset crypto');
    res.redirect('/crypto');
  }
}

async function addForm(req, res) {
  try {
    const cryptoList = await getCryptoList();
    res.render('crypto/add', {
      layout: 'layout/main',
      title: 'Tambah Aset Crypto',
      username: req.session.username,
      cryptoList,
      active: 'crypto',
      messages: req.flash(),
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal memuat form tambah');
    res.redirect('/crypto');
  }
}

async function addAsset(req, res) {
  try {
    const userId = req.session.user_id;
    const { crypto_id, amount } = req.body;

    if (!crypto_id || !amount) {
      req.flash('error', 'Crypto dan amount wajib diisi');
      return res.redirect('/crypto/add');
    }

    await db.query(
      'INSERT INTO crypto_assets (user_id, crypto_id, amount, created_at) VALUES (?, ?, ?, NOW())',
      [userId, crypto_id, amount]
    );
    req.flash('success', 'Aset crypto berhasil ditambahkan');
    res.redirect('/crypto');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal menambahkan aset');
    res.redirect('/crypto/add');
  }
}

async function editForm(req, res) {
  try {
    const userId = req.session.user_id;
    const id = req.params.id;
    const asset = await getAssetById(id, userId);
    if (!asset) {
      req.flash('error', 'Aset tidak ditemukan');
      return res.redirect('/crypto');
    }
    const cryptoList = await getCryptoList();
    res.render('crypto/edit', {
      layout: 'layout/main',
      title: 'Edit Aset Crypto',
      username: req.session.username,
      asset,
      cryptoList,
      active: 'crypto',
      messages: req.flash(),
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal memuat form edit');
    res.redirect('/crypto');
  }
}

async function editAsset(req, res) {
  try {
    const userId = req.session.user_id;
    const id = req.params.id;
    const { crypto_id, amount } = req.body;

    const asset = await getAssetById(id, userId);
    if (!asset) {
      req.flash('error', 'Aset tidak ditemukan');
      return res.redirect('/crypto');
    }

    await db.query(
      'UPDATE crypto_assets SET crypto_id = ?, amount = ? WHERE id = ? AND user_id = ?',
      [crypto_id, amount, id, userId]
    );
    req.flash('success', 'Aset crypto berhasil diperbarui');
    res.redirect('/crypto');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal memperbarui aset');
    res.redirect(`/crypto/edit/${req.params.id}`);
  }
}

async function deleteAsset(req, res) {
  try {
    const userId = req.session.user_id;
    const id = req.params.id;
    await db.query('DELETE FROM crypto_assets WHERE id = ? AND user_id = ?', [id, userId]);
    req.flash('success', 'Aset crypto berhasil dihapus');
    res.redirect('/crypto');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal menghapus aset');
    res.redirect('/crypto');
  }
}

async function getPrice(req, res) {
  try {
    const coin = req.query.coin; // coingecko_id
    if (!coin) {
      return res.status(400).json({ error: 'coin (coingecko_id) diperlukan' });
    }
    const price = await fetchPrice(coin);
    res.json(price);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil harga' });
  }
}

module.exports = {
  listCryptoAssets,
  addForm,
  addAsset,
  editForm,
  editAsset,
  deleteAsset,
  getPrice,
};
