const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const investmentController = require('../controllers/investmentController');

router.use(auth);

router.get('/', investmentController.index);
router.get('/add', investmentController.addForm);
router.post('/add', investmentController.addAsset);
router.get('/edit/:id', investmentController.editForm);
router.post('/edit/:id', investmentController.editAsset);
router.post('/delete/:id', investmentController.deleteAsset);
router.get('/get-price', investmentController.getPrice);

module.exports = router;
