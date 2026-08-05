const express = require('express');
const { Pool } = require('pg');
const app = express();
const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

app.use(express.json());

app.post('/api/transactions', async (req, res) => {
  const { county_id, amount, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO transactions (county_id, amount, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [county_id, amount, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});