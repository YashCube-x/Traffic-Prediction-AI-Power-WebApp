// Postgres-backed alerts store shared by the alerts router (CRUD) and the
// route optimizer (so a logged incident actually affects routing). Alerts
// were previously kept in-memory and vanished on every server restart —
// they now persist in the `alerts` table (created/seeded in ../db.js).
const pool = require('../db');

// Forward lifecycle a real incident actually goes through. Kept in one
// place so both the validation below and the frontend progress UI agree
// on the canonical order.
const LIFECYCLE_STATUSES = ['REPORTED', 'VERIFIED', 'DISPATCHED', 'RESPONDING', 'RESOLVED'];

function rowToAlert(row) {
  return {
    alert_id: row.alert_id,
    title: row.title,
    location: row.location,
    zone_id: row.zone_id,
    severity: row.severity,
    category: row.category,
    description: row.description,
    estimated_delay_mins: row.estimated_delay_mins,
    reported_by: row.reported_by || undefined,
    status: row.status || 'REPORTED',
    assigned_operator: row.assigned_operator || undefined,
    is_resolved: row.is_resolved,
    reported_at: row.reported_at instanceof Date ? row.reported_at.toISOString() : row.reported_at,
  };
}

async function getAllAlerts() {
  const { rows } = await pool.query('SELECT * FROM alerts ORDER BY reported_at DESC');
  return rows.map(rowToAlert);
}

async function getActiveAlerts() {
  const { rows } = await pool.query('SELECT * FROM alerts WHERE is_resolved = FALSE ORDER BY reported_at DESC');
  return rows.map(rowToAlert);
}

async function addAlert(alert) {
  const { rows } = await pool.query(`
    INSERT INTO alerts (alert_id, title, location, zone_id, severity, category, description, estimated_delay_mins, reported_by, is_resolved, reported_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, CURRENT_TIMESTAMP)
    RETURNING *;
  `, [
    alert.alert_id, alert.title, alert.location, alert.zone_id,
    alert.severity, alert.category, alert.description,
    alert.estimated_delay_mins, alert.reported_by || null,
  ]);
  return rowToAlert(rows[0]);
}

async function resolveAlert(alertId) {
  const { rows } = await pool.query(
    "UPDATE alerts SET is_resolved = TRUE, status = 'RESOLVED' WHERE alert_id = $1 RETURNING *;",
    [alertId]
  );
  return rows.length ? rowToAlert(rows[0]) : null;
}

// Advances (or, for an admin correction, sets) the incident lifecycle
// status. Keeps is_resolved in sync so existing resolved-filtering logic
// (route rerouting, alert feeds) keeps working unchanged.
async function updateStatus(alertId, status, operatorEmail) {
  const isResolved = status === 'RESOLVED';
  const { rows } = await pool.query(
    `UPDATE alerts
     SET status = $1,
         is_resolved = $2,
         assigned_operator = COALESCE(assigned_operator, $3)
     WHERE alert_id = $4
     RETURNING *;`,
    [status, isResolved, operatorEmail || null, alertId]
  );
  return rows.length ? rowToAlert(rows[0]) : null;
}

async function findAlert(alertId) {
  const { rows } = await pool.query('SELECT * FROM alerts WHERE alert_id = $1', [alertId]);
  return rows.length ? rowToAlert(rows[0]) : null;
}

// Generates the next sequential ALT-<year>-NNN id from what's in the table.
async function nextAlertId() {
  const year = new Date().getFullYear();
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(alert_id, '-', 3) AS INTEGER)), 0) AS max_seq
     FROM alerts WHERE alert_id LIKE $1`,
    [`ALT-${year}-%`]
  );
  const next = parseInt(rows[0].max_seq, 10) + 1;
  return `ALT-${year}-${String(next).padStart(3, '0')}`;
}

module.exports = { getAllAlerts, getActiveAlerts, addAlert, resolveAlert, findAlert, nextAlertId, updateStatus, LIFECYCLE_STATUSES };
