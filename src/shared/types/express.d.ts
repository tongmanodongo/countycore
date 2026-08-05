const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { User, County, Transaction } = require('./models'); // Assuming Sequelize models

const app = express();
app.use(bodyParser.json());

// Middleware for authentication
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Example endpoint to create a transaction
app.post('/api/counties/:countyId/transactions', authenticateJWT, async (req, res) => {
    const { countyId } = req.params;
    const { transaction_data } = req.body;

    try {
        const transaction = await Transaction.create({
            county_id: countyId,
            user_id: req.user.id,
            transaction_data,
        });
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});