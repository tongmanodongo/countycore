const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ /* Database config */ });

app.use(express.json());

// User Registration
app.post('/api/users/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);
    res.status(201).json({ userId: result.rows[0].id });
});

// User Login
app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            const token = jwt.sign({ userId: user.id }, 'your_jwt_secret');
            return res.json({ token });
        }
    }
    res.status(401).json({ message: 'Invalid credentials' });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});