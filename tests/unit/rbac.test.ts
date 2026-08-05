const express = require('express');
const bodyParser = require('body-parser');
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

app.post('/api/counties', async (req, res) => {
  const { name, state } = req.body;
  try {
    const result = await pool.query('INSERT INTO counties (name, state) VALUES ($1, $2) RETURNING *', [name, state]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});