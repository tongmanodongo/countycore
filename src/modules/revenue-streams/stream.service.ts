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

// Create a new transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { county_id, amount } = req.body;
    const user_id = req.user.id; // Get user ID from JWT

    try {
        const result = await pool.query(
            'INSERT INTO transactions (county_id, user_id, amount, transaction_date, status) VALUES ($1, $2, $3, NOW(), $4) RETURNING *',
            [county_id, user_id, amount, 'pending']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});