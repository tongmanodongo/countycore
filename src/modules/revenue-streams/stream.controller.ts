const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_db_password',
  port: 5432,
});

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

// User login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  // Authenticate user and generate JWT
});

// Get counties
app.get('/api/counties', authenticateJWT, async (req, res) => {
  const result = await pool.query('SELECT * FROM counties');
  res.json(result.rows);
});

// Get transactions for a county
app.get('/api/counties/:id/transactions', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM transactions WHERE county_id = $1', [id]);
  res.json(result.rows);
});

// Create a new transaction
app.post('/api/counties/:id/transactions', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const result = await pool.query('INSERT INTO transactions (county_id, amount, transaction_date) VALUES ($1, $2, NOW()) RETURNING *', [id, amount]);
  res.status(201).json(result.rows[0]);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});