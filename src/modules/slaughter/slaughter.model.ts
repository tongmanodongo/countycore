const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

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

// Create a transaction
app.post('/transactions', authenticateJWT, async (req, res) => {
  const { countyId, amount, description } = req.body;
  const result = await pool.query(
    'INSERT INTO transactions (county_id, amount, description) VALUES ($1, $2, $3) RETURNING *',
    [countyId, amount, description]
  );
  res.status(201).json(result.rows[0]);
});

// Get transactions
app.get('/transactions', authenticateJWT, async (req, res) => {
  const result = await pool.query('SELECT * FROM transactions WHERE county_id = $1', [req.user.countyId]);
  res.json(result.rows);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});