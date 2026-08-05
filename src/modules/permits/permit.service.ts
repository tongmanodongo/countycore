const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/countycore', { useNewUrlParser: true, useUnifiedTopology: true });

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

// Sample route
app.post('/api/transactions', authenticateJWT, (req, res) => {
    // Logic to create a transaction
    res.status(201).send('Transaction created');
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});