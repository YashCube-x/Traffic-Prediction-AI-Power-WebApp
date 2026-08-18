// Citizen traffic reporting (Waze-style crowdsourcing).
//
// Any logged-in user can report a jam/accident; it lands as PENDING and does
// NOT affect routing. An OPERATOR (own zone only) or ADMIN reviews it:
// approving converts it into a real alert (which then drives rerouting and
// the public warning banner), dismissing archives it.
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const alertsStore = require('../store/alertsStore');
const { audit } = require('../audit');
const { broadcast } = require('../events');

const VALID_ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];
const VALID_CATEGORIES = ['ACCIDENT', 'CONGESTION', 'CONSTRUCTION', 'SIGNAL_FAILURE', 'WEATHER', 'HARASSMENT', 'UNSAFE_AREA'];

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10, // 10 citizen reports / hour / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports submitted. Please try again later.' },
});

// POST /reports — any authenticated user submits a report
router.post('/reports', reportLimiter, verifyToken, async (req, res) => {
  const title = (req.body.title || '').trim();
  const location = (req.body.location || '').trim();
  const zoneId = req.body.zone_id;
  const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'CONGESTION';

  if (!title || !location) {
    return res.status(400).json({ error: 'Title and location are required' });
  }
  if (!VALID_ZONES.includes(zoneId)) {
    return res.status(400).json({ error: `zone_id must be one of: ${VALID_ZONES.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO citizen_reports (reporter_id, reporter_email, title, location, zone_id, category, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [req.user.id, req.user.email, title, location, zoneId, category, (req.body.description || '').trim() || null]);

    audit(req.user, 'REPORT_SUBMIT', `report#${rows[0].id}`, { title, zone: zoneId }, req);
    broadcast('reports_changed', { kind: 'submitted' });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(503).json({ error: 'Could not save the report', details: err.message });
  }
});

// GET /my-reports — the logged-in citizen's own submissions, with live
// status: PENDING (awaiting review) / DISMISSED / or, once approved, the
// real lifecycle of the alert it became (IN_PROGRESS while the alert is
// REPORTED/VERIFIED/DISPATCHED/RESPONDING, RESOLVED once closed out).
router.get('/my-reports', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, a.status AS alert_status, a.estimated_delay_mins AS alert_delay_mins
      FROM citizen_reports r
      LEFT JOIN alerts a ON a.alert_id = r.alert_id
      WHERE r.reporter_id = $1
      ORDER BY r.created_at DESC LIMIT 50;
    `, [req.user.id]);

    const withTrackingStatus = rows.map((r) => {
      let tracking_status = r.status; // PENDING | DISMISSED
      if (r.status === 'APPROVED') {
        tracking_status = r.alert_status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS';
      }
      return { ...r, tracking_status };
    });
    res.json(withTrackingStatus);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch your reports', details: err.message });
  }
});

// GET /reports — operator (own zone) / admin review queue.
// ?status=PENDING (default) | APPROVED | DISMISSED | ALL
router.get('/reports', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  const status = (req.query.status || 'PENDING').toUpperCase();
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
      `SELECT * FROM citizen_reports ${where} ORDER BY created_at DESC LIMIT 100`, params
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch reports', details: err.message });
  }
});

async function loadReportForReview(req, res) {
  const { rows } = await pool.query('SELECT * FROM citizen_reports WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Report not found' });
    return null;
  }
  const report = rows[0];
  if (report.status !== 'PENDING') {
    res.status(400).json({ error: `Report already ${report.status.toLowerCase()}` });
    return null;
  }
  if (req.user.role === 'OPERATOR' && req.user.assigned_zone && report.zone_id !== req.user.assigned_zone) {
    res.status(403).json({ error: `You can only review reports in your assigned zone (${req.user.assigned_zone})` });
    return null;
  }
  return report;
}

// PATCH /reports/:id/approve — verified report becomes a live alert
router.patch('/reports/:id/approve', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const report = await loadReportForReview(req, res);
    if (!report) return;

    const alert = await alertsStore.addAlert({
      alert_id: await alertsStore.nextAlertId(),
      title: report.title,
      location: report.location,
      zone_id: report.zone_id,
      severity: ['CRITICAL', 'HIGH', 'MODERATE', 'INFO'].includes(req.body.severity) ? req.body.severity : 'MODERATE',
      category: report.category,
      description: report.description || `Citizen report by ${report.reporter_email}, verified by ${req.user.email}.`,
      estimated_delay_mins: parseInt(req.body.estimated_delay_mins, 10) || 10,
      reported_by: `${report.reporter_email} (citizen), verified by ${req.user.email}`,
    });

    await pool.query(
      `UPDATE citizen_reports SET status = 'APPROVED', reviewed_by = $1, alert_id = $2 WHERE id = $3`,
      [req.user.email, alert.alert_id, report.id]
    );

    audit(req.user, 'REPORT_APPROVE', `report#${report.id}`, { became_alert: alert.alert_id }, req);
    broadcast('alerts_changed', { kind: 'created' });
    broadcast('reports_changed', { kind: 'reviewed' });
    res.json({ report_id: report.id, status: 'APPROVED', alert });
  } catch (err) {
    res.status(503).json({ error: 'Could not approve the report', details: err.message });
  }
});

// PATCH /reports/:id/dismiss
router.patch('/reports/:id/dismiss', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const report = await loadReportForReview(req, res);
    if (!report) return;

    await pool.query(
      `UPDATE citizen_reports SET status = 'DISMISSED', reviewed_by = $1 WHERE id = $2`,
      [req.user.email, report.id]
    );
    audit(req.user, 'REPORT_DISMISS', `report#${report.id}`, { title: report.title }, req);
    broadcast('reports_changed', { kind: 'reviewed' });
    res.json({ report_id: report.id, status: 'DISMISSED' });
  } catch (err) {
    res.status(503).json({ error: 'Could not dismiss the report', details: err.message });
  }
});

module.exports = router;
