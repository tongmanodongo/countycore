const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'county_db',
  password: 'your_db_password',
  port: 5432,
});

app.use(bodyParser.json());

// Middleware for authentication
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
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
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password]);
  res.status(201).json({ id: result.rows[0].id });
});

// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
  if (result.rows.length > 0) {
    const token = jwt.sign({ id: result.rows[0].id }, 'your_jwt_secret');
    res.json({ token });
  } else {
    res.sendStatus(403);
  }
});

// Protected route
app.get('/transactions', authenticateJWT, async (req, res) => {
  const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1', [req.user.id]);
  res.json(result.rows);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});