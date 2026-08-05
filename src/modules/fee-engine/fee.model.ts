const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(bodyParser.json());

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

// Register User
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    // Hash password and save user to database
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Authenticate user and return JWT
});

// Create Transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { amount, county_id } = req.body;
    const user_id = req.user.id; // Get user ID from JWT
    // Insert transaction into database
});

// Get Transactions
app.get('/api/transactions', authenticateJWT, async (req, res) => {
    const user_id = req.user.id;
    // Fetch transactions for the user
});

// Start Server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});