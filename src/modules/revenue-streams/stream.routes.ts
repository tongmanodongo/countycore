const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(bodyParser.json());

// Middleware for authentication
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// User registration
app.post('/api/auth/register', async (req, res) => {
    const { username, password, county_id } = req.body;
    // Hash password and save user to DB
});

// User login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Authenticate user and return JWT
});

// Get all counties
app.get('/api/counties', authenticateJWT, async (req, res) => {
    const result = await pool.query('SELECT * FROM counties');
    res.json(result.rows);
});

// Create a transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { amount, county_id } = req.body;
    const user_id = req.user.id;
    await pool.query('INSERT INTO transactions (user_id, county_id, amount) VALUES ($1, $2, $3)', [user_id, county_id, amount]);
    res.sendStatus(201);
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});