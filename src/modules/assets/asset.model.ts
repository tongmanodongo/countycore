const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(bodyParser.json());

// Middleware for authentication
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'];
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
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (username, password_hash, county_id) VALUES ($1, $2, $3) RETURNING id', [username, hashedPassword, county_id]);
    res.status(201).json({ id: result.rows[0].id });
});

// User login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password_hash)) {
        const token = jwt.sign({ id: user.rows[0].id }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.sendStatus(403);
    }
});

// Create transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { amount, county_id } = req.body;
    const result = await pool.query('INSERT INTO transactions (user_id, county_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING id', [req.user.id, county_id, amount, 'pending']);
    res.status(201).json({ id: result.rows[0].id });
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});