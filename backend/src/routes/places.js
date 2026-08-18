// Saved Places ("Home", "Office", "College") for the Smart Commute Planner.
// Distinct from /my-commute (commute.js), which stores an origin+destination
// PAIR: a place is a single named location a user can pick as either end of
// a route without retyping the address. New endpoint — nothing existing
// modelled a single reusable named location.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /my-places — the logged-in user's saved places
router.get('/my-places', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label, address, created_at FROM saved_places WHERE user_id = $1 ORDER BY created_at ASC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch saved places', details: err.message });
  }
});

// POST /my-places { label, address } — upserts by (user, label)
router.post('/my-places', verifyToken, async (req, res) => {
  const label = (req.body.label || '').trim();
  const address = (req.body.address || '').trim();

  if (!label || !address) {
    return res.status(400).json({ error: 'Label and address are required' });
  }
  if (label.length > 60) {
    return res.status(400).json({ error: 'Label must be 60 characters or fewer' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO saved_places (user_id, label, address)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, label) DO UPDATE SET address = EXCLUDED.address
      RETURNING id, label, address, created_at;
    `, [req.user.id, label, address]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not save the place', details: err.message });
  }
});

// DELETE /my-places/:id — only the owner can remove their saved place
router.delete('/my-places/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM saved_places WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Saved place not found' });
    }
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(503).json({ error: 'Could not delete the place', details: err.message });
  }
});

module.exports = router;
