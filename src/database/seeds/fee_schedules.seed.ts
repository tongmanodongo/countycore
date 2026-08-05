const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

app.use(bodyParser.json());

// Create a new user
app.post('/api/v1/users', async (req, res) => {
  const { username, email } = req.body;
  const result = await pool.query('INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *', [username, email]);
  res.status(201).json(result.rows[0]);
});

// Create a new transaction
app.post('/api/v1/transactions', async (req, res) => {
  const { userId, amount } = req.body;
  const result = await pool.query('INSERT INTO transactions (user_id, amount) VALUES ($1, $2) RETURNING *', [userId, amount]);
  res.status(201).json(result.rows[0]);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});