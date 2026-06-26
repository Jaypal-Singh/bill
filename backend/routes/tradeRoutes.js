const express = require('express');
const { createTrade, getCustomerHoldings, getWeeklyRecords, deleteHolding, deleteExit } = require('../controllers/tradeController');
const router = express.Router();

router.post('/', createTrade);
router.get('/holdings/:customerId', getCustomerHoldings);
router.get('/weekly/:customerId', getWeeklyRecords);
router.delete('/holdings/:customerId/:symbol', deleteHolding);
router.delete('/weekly/:id', deleteExit);

module.exports = router;
