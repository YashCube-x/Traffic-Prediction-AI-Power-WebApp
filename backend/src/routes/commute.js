// "My Commute" — saved favourite routes for daily commuters.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { audit } = require('../audit');

// GET /my-commute — the logged-in user's saved routes
router.get('/my-commute', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label, origin, destination, created_at FROM saved_routes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch saved commutes', details: err.message });
  }
});

// POST /my-commute { origin, destination, label? }
router.post('/my-commute', verifyToken, async (req, res) => {
  const origin = (req.body.origin || '').trim();
  const destination = (req.body.destination || '').trim();
  const label = (req.body.label || '').trim() || null;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO saved_routes (user_id, label, origin, destination)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, origin, destination)
        DO UPDATE SET label = COALESCE(EXCLUDED.label, saved_routes.label)
      RETURNING id, label, origin, destination, created_at;
    `, [req.user.id, label, origin, destination]);

    audit(req.user, 'COMMUTE_SAVE', `${origin} -> ${destination}`, null, req);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not save the commute', details: err.message });
  }
});

// DELETE /my-commute/:id — only the owner can remove their saved route
router.delete('/my-commute/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM saved_routes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Saved commute not found' });
    }
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(503).json({ error: 'Could not delete the commute', details: err.message });
  }
});

module.exports = router;
