const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

app.use(express.json());

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
  const { amount, county_id } = req.body;
  const userCountyId = req.user.county_id; // Assuming user info contains county_id

  if (userCountyId !== county_id) {
    return res.status(403).send('Access denied.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO transactions (amount, county_id) VALUES ($1, $2) RETURNING *',
      [amount, county_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});