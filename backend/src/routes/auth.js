const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { SECRET_KEY, verifyToken } = require('../middleware/auth');
const crypto = require('crypto');

// POST /api/v1/auth/login
router.post('/auth/login', async (req, res) => {
  const emailInput = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!emailInput || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check direct email match
    let { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [emailInput]);

    // Fallback shorthand check for demo users (e.g. typing "admin", "operator", "commuter")
    if (rows.length === 0) {
      if (emailInput.includes('admin')) {
        ({ rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['admin@trafficvision.ai']));
      } else if (emailInput.includes('operator')) {
        ({ rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['operator@trafficvision.ai']));
      } else if (emailInput.includes('commuter')) {
        ({ rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['commuter@trafficvision.ai']));
      }
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      access_token: token,
      token_type: 'bearer',
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server authentication error', details: err.message });
  }
});

// POST /api/v1/auth/register
router.post('/auth/register', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const fullName = req.body.full_name || 'Smart City User';
  const role = req.body.role || 'COMMUTER';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const userId = `USR-${crypto.randomUUID()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role;
    `, [userId, email, passwordHash, fullName, role]);

    const newUser = rows[0];

    const token = jwt.sign(
      { sub: newUser.id, email: newUser.email, role: newUser.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user_id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// GET /api/v1/auth/me
router.get('/auth/me', verifyToken, (req, res) => {
  const user = req.user;
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({
    access_token: token,
    token_type: 'bearer',
    user_id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role
  });
});

module.exports = router;
