const express = require('express');
const { createCustomer, getCustomers, deleteCustomer } = require('../controllers/customerController');
const router = express.Router();

router.post('/', createCustomer);
router.get('/', getCustomers);
router.delete('/:id', deleteCustomer);

module.exports = router;
