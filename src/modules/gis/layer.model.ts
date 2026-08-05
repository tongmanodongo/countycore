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

// Create a transaction
app.post('/transactions', async (req, res) => {
  const { countyId, amount, description } = req.body;
  const result = await pool.query(
    'INSERT INTO transactions (county_id, amount, description) VALUES ($1, $2, $3) RETURNING *',
    [countyId, amount, description]
  );
  res.status(201).json(result.rows[0]);
});

// Get all transactions for a county
app.get('/transactions/:countyId', async (req, res) => {
  const { countyId } = req.params;
  const result = await pool.query('SELECT * FROM transactions WHERE county_id = $1', [countyId]);
  res.json(result.rows);
});

// Prevent delete operation
app.delete('/transactions/:id', (req, res) => {
  res.status(403).json({ error: 'Delete operation is not allowed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});