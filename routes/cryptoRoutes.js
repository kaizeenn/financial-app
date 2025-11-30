const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');
const cryptoController = require('../controllers/cryptoController');

// Protect all routes
router.use(isAuthenticated);

// List assets
router.get('/', cryptoController.listCryptoAssets);

// Add
router.get('/add', cryptoController.addForm);
router.post('/add', cryptoController.addAsset);

// Edit
router.get('/edit/:id', cryptoController.editForm);
router.post('/edit/:id', cryptoController.editAsset);

// Delete
router.post('/delete/:id', cryptoController.deleteAsset);

// Price fetch
router.get('/get-price', cryptoController.getPrice);

module.exports = router;
