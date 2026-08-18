// Public notices / circulars — admin-managed announcements shown on the
// landing page, the public route-check page and the commuter dashboard,
// the way a government transport portal publishes circulars.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { audit } = require('../audit');
const { broadcast } = require('../events');

const VALID_TYPES = ['INFO', 'ADVISORY', 'URGENT'];

// GET /notices — public, active notices only
router.get('/notices', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, body, notice_type, published_by, created_at FROM notices WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20'
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch notices', details: err.message });
  }
});

// GET /notices/all — admin: including archived
router.get('/notices/all', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notices ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch notices', details: err.message });
  }
});

// POST /notices — admin publishes a circular
router.post('/notices', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const title = (req.body.title || '').trim();
  const body = (req.body.body || '').trim();
  const noticeType = VALID_TYPES.includes(req.body.notice_type) ? req.body.notice_type : 'INFO';

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO notices (title, body, notice_type, published_by) VALUES ($1, $2, $3, $4) RETURNING *;`,
      [title, body, noticeType, req.user.email]
    );
    audit(req.user, 'NOTICE_PUBLISH', title, { type: noticeType }, req);
    broadcast('notices_changed', { kind: 'published' });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not publish notice', details: err.message });
  }
});

// PATCH /notices/:id/archive — admin retracts a notice
router.patch('/notices/:id/archive', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notices SET is_active = FALSE WHERE id = $1 RETURNING *;`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Notice not found' });
    audit(req.user, 'NOTICE_ARCHIVE', rows[0].title, null, req);
    broadcast('notices_changed', { kind: 'archived' });
    res.json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not archive notice', details: err.message });
  }
});

module.exports = router;
