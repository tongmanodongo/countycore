const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
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

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  // Hash password and save user to the database
  const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password]);
  res.status(201).json({ userId: result.rows[0].id });
});

// Middleware to protect routes
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});