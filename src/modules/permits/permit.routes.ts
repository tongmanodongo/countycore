const express = require('express');
const { body, validationResult } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mock database
let transactions = [];

// Create a transaction
app.post('/api/counties/:countyId/transactions', [
    body('amount').isNumeric(),
    body('description').isString().notEmpty(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { countyId } = req.params;
    const { amount, description } = req.body;

    const transaction = { id: transactions.length + 1, countyId, amount, description };
    transactions.push(transaction);
    res.status(201).json(transaction);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});