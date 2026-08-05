const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(bodyParser.json());

// User login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password_hash)) {
        const token = jwt.sign({ id: user.rows[0].id }, 'your_jwt_secret', { expiresIn: '1h' });
        return res.json({ token });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
});

// Create transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
    const { county_id, transaction_details } = req.body;
    const userId = req.user.id; // Assuming user ID is stored in JWT

    const result = await pool.query('INSERT INTO transactions (user_id, county_id, transaction_details) VALUES ($1, $2, $3) RETURNING *', [userId, county_id, transaction_details]);
    res.status(201).json(result.rows[0]);
});

// Middleware to authenticate JWT
function authenticateJWT(req, res, next) {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
}

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});