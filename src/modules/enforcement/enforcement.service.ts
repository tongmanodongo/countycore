const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');

// Create a transaction
router.post('/transactions', TransactionController.createTransaction);

// Get all transactions for a county
router.get('/transactions/:countyId', TransactionController.getTransactions);

// Update a transaction
router.put('/transactions/:id', TransactionController.updateTransaction);

module.exports = router;