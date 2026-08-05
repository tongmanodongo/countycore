const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(bodyParser.json());

// User Registration
app.post('/api/users/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).send('User registered');
});

// User Login
app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password)) {
        const token = jwt.sign({ id: user.rows[0].id }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// Create Transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { amount, county_id } = req.body;
    const result = await pool.query('INSERT INTO transactions (amount, county_id, user_id) VALUES ($1, $2, $3)', [amount, county_id, req.user.id]);
    res.status(201).send('Transaction created');
});

// Middleware for JWT Authentication
function authenticateJWT(req, res, next) {
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
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});