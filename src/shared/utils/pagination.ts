const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // PostgreSQL client
const jwt = require('jsonwebtoken');

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

// Create a new transaction
app.post('/api/transactions', authenticateJWT, async (req, res) => {
  const { amount, countyId } = req.body;
  const result = await pool.query('INSERT INTO transactions (amount, county_id) VALUES ($1, $2) RETURNING *', [amount, countyId]);
  res.status(201).json(result.rows[0]);
});

// Get transaction details
app.get('/api/transactions/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
  res.json(result.rows[0]);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});