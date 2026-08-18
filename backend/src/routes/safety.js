// Safety Center — SOS distress signal, emergency-contact profile, and a
// public feed of community-reported safety concerns (harassment / unsafe,
// poorly-lit areas). Built on the same patterns as citizen_reports/alerts:
// zone-scoped review for operators, SSE for live updates, audit trail for
// every SOS trigger and resolution.
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { audit } = require('../audit');
const { broadcast } = require('../events');

const VALID_ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];

// GET /api/v1/me/safety-profile — a user's own phone + emergency contact
router.get('/me/safety-profile', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT phone, emergency_contact_name, emergency_contact_phone FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(rows[0] || { phone: null, emergency_contact_name: null, emergency_contact_phone: null });
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch safety profile', details: err.message });
  }
});

// PATCH /api/v1/me/safety-profile — set/update phone + emergency contact
router.patch('/me/safety-profile', verifyToken, async (req, res) => {
  const phone = (req.body.phone || '').trim() || null;
  const emergencyContactName = (req.body.emergency_contact_name || '').trim() || null;
  const emergencyContactPhone = (req.body.emergency_contact_phone || '').trim() || null;

  try {
    const { rows } = await pool.query(`
      UPDATE users SET phone = $1, emergency_contact_name = $2, emergency_contact_phone = $3
      WHERE id = $4
      RETURNING phone, emergency_contact_name, emergency_contact_phone;
    `, [phone, emergencyContactName, emergencyContactPhone, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not save safety profile', details: err.message });
  }
});

// SOS is a distress signal — cap it well above normal use but stop abuse/spam.
const sosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SOS signals sent. If this is a real emergency, call 112.' },
});

// POST /api/v1/sos — one-tap distress signal from a logged-in user.
// Falls back gracefully with no location if the browser denies geolocation.
router.post('/sos', sosLimiter, verifyToken, async (req, res) => {
  const zoneId = VALID_ZONES.includes(req.body.zone_id) ? req.body.zone_id : null;
  const latitude = Number.isFinite(req.body.latitude) ? req.body.latitude : null;
  const longitude = Number.isFinite(req.body.longitude) ? req.body.longitude : null;

  try {
    // Pull the user's saved emergency contact so operators see it without a
    // second lookup, but let the request override phone for this signal only.
    const { rows: profileRows } = await pool.query(
      `SELECT phone, emergency_contact_name, emergency_contact_phone FROM users WHERE id = $1`,
      [req.user.id]
    );
    const profile = profileRows[0] || {};

    const { rows } = await pool.query(`
      INSERT INTO sos_alerts (user_id, user_email, user_phone, emergency_contact_name, emergency_contact_phone, location, latitude, longitude, zone_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      req.user.id, req.user.email,
      (req.body.phone || '').trim() || profile.phone || null,
      profile.emergency_contact_name || null,
      profile.emergency_contact_phone || null,
      (req.body.location || '').trim() || null,
      latitude, longitude, zoneId,
    ]);

    audit(req.user, 'SOS_TRIGGERED', `sos#${rows[0].id}`, { zone: zoneId, has_location: !!(latitude && longitude) }, req);
    // Only the event type is broadcast (no payload) — matches the alerts/reports
    // pattern so zone-scoping can't leak through SSE; clients refetch via GET /sos.
    broadcast('sos_changed', { kind: 'triggered' });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not send SOS signal', details: err.message });
  }
});

// GET /api/v1/sos — active SOS alerts (ADMIN sees all, OPERATOR own zone only)
router.get('/sos', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  const status = (req.query.status || 'ACTIVE').toUpperCase();
  try {
    const params = [];
    let where = '';
    if (status !== 'ALL') {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }
    if (req.user.role === 'OPERATOR' && req.user.assigned_zone) {
      params.push(req.user.assigned_zone);
      where += `${where ? ' AND' : 'WHERE'} zone_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT * FROM sos_alerts ${where} ORDER BY created_at DESC LIMIT 100`, params
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch SOS alerts', details: err.message });
  }
});

// PATCH /api/v1/sos/:id/resolve
router.patch('/sos/:id/resolve', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM sos_alerts WHERE id = $1', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }
    if (req.user.role === 'OPERATOR' && req.user.assigned_zone && existing[0].zone_id !== req.user.assigned_zone) {
      return res.status(403).json({ error: `You can only resolve SOS alerts in your assigned zone (${req.user.assigned_zone})` });
    }

    const { rows } = await pool.query(`
      UPDATE sos_alerts SET status = 'RESOLVED', resolved_by = $1 WHERE id = $2 RETURNING *;
    `, [req.user.email, req.params.id]);

    audit(req.user, 'SOS_RESOLVE', `sos#${req.params.id}`, {}, req);
    broadcast('sos_changed', { kind: 'resolved' });
    res.json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not resolve SOS alert', details: err.message });
  }
});

// GET /api/v1/safety-reports — public feed of approved community safety
// concerns (harassment / unsafe or poorly-lit areas). No auth required, same
// as the public alert banner, so anyone planning a route can see them.
router.get('/safety-reports', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title, location, zone_id, category, description, created_at
      FROM citizen_reports
      WHERE status = 'APPROVED' AND category IN ('HARASSMENT', 'UNSAFE_AREA')
      ORDER BY created_at DESC LIMIT 100;
    `);
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch safety reports', details: err.message });
  }
});

module.exports = router;
