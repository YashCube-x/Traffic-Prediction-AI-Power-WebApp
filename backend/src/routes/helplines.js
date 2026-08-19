// Admin-managed helpline directory — single source of truth consumed by
// the Safety Center, the dedicated Helpline tab, and any public page that
// shows emergency numbers.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { audit } = require('../audit');

const adminOnly = [verifyToken, requireRoles(['ADMIN'])];
const VALID_CATEGORIES = ['Emergency', 'Health', 'Safety', 'Traffic', 'Transport', 'Utility'];

// GET /helplines — public, active only, in display order
router.get('/helplines', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label, number, category, sort_order FROM helplines WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch helpline directory', details: err.message });
  }
});

// POST /helplines — admin adds a new entry
router.post('/helplines', ...adminOnly, async (req, res) => {
  const label = (req.body.label || '').trim();
  const number = (req.body.number || '').trim();
  const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'Emergency';

  if (!label || !number) {
    return res.status(400).json({ error: 'Label and number are required' });
  }

  try {
    const { rows: maxRow } = await pool.query('SELECT COALESCE(MAX(sort_order), -1) AS max FROM helplines');
    const sortOrder = maxRow[0].max + 1;
    const { rows } = await pool.query(
      `INSERT INTO helplines (label, number, category, sort_order, updated_by) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [label, number, category, sortOrder, req.user.email]
    );
    audit(req.user, 'HELPLINE_ADD', label, { number, category }, req);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not add helpline', details: err.message });
  }
});

// PATCH /helplines/:id — admin edits an entry
router.patch('/helplines/:id', ...adminOnly, async (req, res) => {
  const label = (req.body.label || '').trim();
  const number = (req.body.number || '').trim();
  const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'Emergency';

  if (!label || !number) {
    return res.status(400).json({ error: 'Label and number are required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE helplines SET label = $1, number = $2, category = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *;`,
      [label, number, category, req.user.email, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Helpline not found' });
    audit(req.user, 'HELPLINE_UPDATE', label, { number, category }, req);
    res.json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not update helpline', details: err.message });
  }
});

// DELETE /helplines/:id — admin removes an entry
router.delete('/helplines/:id', ...adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM helplines WHERE id = $1 RETURNING *;', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Helpline not found' });
    audit(req.user, 'HELPLINE_DELETE', rows[0].label, null, req);
    res.json({ success: true });
  } catch (err) {
    res.status(503).json({ error: 'Could not delete helpline', details: err.message });
  }
});

module.exports = router;
