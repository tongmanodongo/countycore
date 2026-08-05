const express = require('express');
const router = express.Router();
const { Transaction } = require('../models/Transaction');

// Create a new transaction
router.post('/transactions', async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        await transaction.save();
        res.status(201).send(transaction);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Get transactions for a specific county
router.get('/transactions/:countyId', async (req, res) => {
    try {
        const transactions = await Transaction.find({ countyId: req.params.countyId });
        res.status(200).send(transactions);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;