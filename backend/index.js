const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const port = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());

// DB config from env
const pool = new Pool({
  host: process.env.PGHOST || 'postgres',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgrespw',
  database: process.env.PGDATABASE || 'digital_card'
});

// on startup ensure table exists
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        scheduled_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('DB initialized');
  } finally {
    client.release();
  }
})().catch(err => {
  console.error('DB init error', err);
  process.exit(1);
});

// Example personal info endpoint
app.get('/api/contact', (req, res) => {
  res.json({
    name: process.env.MY_NAME || 'Your Name',
    title: process.env.MY_TITLE || 'Trainer - Kubernetes (OpenShift)',
    email: process.env.MY_EMAIL || 'you@example.com',
    bio: process.env.MY_BIO || 'I teach Kubernetes & OpenShift.'
  });
});

// List meetings
app.get('/api/meetings', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM meetings ORDER BY scheduled_at');
  res.json(rows);
});

// Schedule meeting
app.post('/api/meetings', async (req, res) => {
  const { name, email, scheduled_at } = req.body;
  if (!name || !scheduled_at) return res.status(400).json({ error: 'name and scheduled_at required' });
  const { rows } = await pool.query(
    'INSERT INTO meetings (name, email, scheduled_at) VALUES ($1,$2,$3) RETURNING *',
    [name, email || null, scheduled_at]
  );
  res.json(rows[0]);
});

app.listen(port, () => console.log(`Backend listening on ${port}`));
