// Site-wide public stats (visitor counter) + admin system statistics /
// CSV exports — the "Reports" section of a government-style portal.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const alertsStore = require('../store/alertsStore');

// POST /stats/visit — increments the public visitor counter (fire-and-forget
// on the frontend; no auth so anonymous commuters count too)
router.post('/stats/visit', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE site_stats SET stat_value = stat_value + 1 WHERE stat_key = 'visitors' RETURNING stat_value;`
    );
    res.json({ visitors: parseInt(rows[0]?.stat_value || 0, 10) });
  } catch (err) {
    res.status(503).json({ error: 'Could not record visit' });
  }
});

// GET /stats/visit — current counter value, no increment
router.get('/stats/visit', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT stat_value FROM site_stats WHERE stat_key = 'visitors';`);
    res.json({ visitors: parseInt(rows[0]?.stat_value || 0, 10) });
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch visitor count' });
  }
});

// GET /stats/system — admin dashboard summary tiles
router.get('/stats/system', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  try {
    const [users, alerts, reports, visitors] = await Promise.all([
      pool.query(`SELECT role, COUNT(*) AS count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count FROM users GROUP BY role`),
      pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN is_resolved THEN 0 ELSE 1 END) AS active FROM alerts`),
      pool.query(`SELECT COUNT(*) AS pending FROM citizen_reports WHERE status = 'PENDING'`),
      pool.query(`SELECT stat_value FROM site_stats WHERE stat_key = 'visitors'`),
    ]);

    res.json({
      users_by_role: users.rows.reduce((acc, r) => {
        acc[r.role] = { total: parseInt(r.count, 10), active: parseInt(r.active_count, 10) };
        return acc;
      }, {}),
      alerts_total: parseInt(alerts.rows[0]?.total || 0, 10),
      alerts_active: parseInt(alerts.rows[0]?.active || 0, 10),
      reports_pending: parseInt(reports.rows[0]?.pending || 0, 10),
      total_visitors: parseInt(visitors.rows[0]?.stat_value || 0, 10),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ error: 'Could not compute system stats', details: err.message });
  }
});

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function sendCsv(res, filename, rows) {
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(rows));
}

// GET /export/alerts.csv | /export/audit.csv | /export/users.csv | /export/reports.csv
router.get('/export/alerts.csv', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const rows = await alertsStore.getAllAlerts();
  sendCsv(res, `alerts_${Date.now()}.csv`, rows);
});

router.get('/export/audit.csv', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5000');
  sendCsv(res, `audit_log_${Date.now()}.csv`, rows);
});

router.get('/export/users.csv', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, full_name, role, assigned_zone, is_active, created_at FROM users ORDER BY created_at DESC');
  sendCsv(res, `users_${Date.now()}.csv`, rows);
});

router.get('/export/reports.csv', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM citizen_reports ORDER BY created_at DESC LIMIT 5000');
  sendCsv(res, `citizen_reports_${Date.now()}.csv`, rows);
});

module.exports = router;
