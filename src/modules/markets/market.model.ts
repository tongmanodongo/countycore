const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/countycore', { useNewUrlParser: true, useUnifiedTopology: true });

// Define User and Transaction Models
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
});

const TransactionSchema = new mongoose.Schema({
    countyId: String,
    data: Object,
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// Middleware for authentication
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// API to create a transaction
app.post('/api/transactions', authenticateJWT, (req, res) => {
    const transaction = new Transaction({
        countyId: req.body.countyId,
        data: req.body.data,
    });
    transaction.save()
        .then(() => res.status(201).send('Transaction created'))
        .catch(err => res.status(400).send(err));
});

// API to get transactions
app.get('/api/transactions', authenticateJWT, (req, res) => {
    Transaction.find({ countyId: req.user.countyId })
        .then(transactions => res.json(transactions))
        .catch(err => res.status(500).send(err));
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});