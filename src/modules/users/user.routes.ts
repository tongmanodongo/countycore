const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

app.use(bodyParser.json());

// Create a new county
app.post('/counties', async (req, res) => {
  const { name } = req.body;
  const result = await pool.query('INSERT INTO counties (name) VALUES ($1) RETURNING *', [name]);
  res.status(201).json(result.rows[0]);
});

// Get all counties
app.get('/counties', async (req, res) => {
  const result = await pool.query('SELECT * FROM counties');
  res.status(200).json(result.rows);
});

// Get a specific county
app.get('/counties/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM counties WHERE id = $1', [id]);
  res.status(200).json(result.rows[0]);
});

// Update a specific county
app.put('/counties/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const result = await pool.query('UPDATE counties SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  res.status(200).json(result.rows[0]);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});