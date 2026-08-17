// Audit trail for privileged actions. Fire-and-forget: an audit failure is
// logged to the console but never blocks or fails the action itself.
const pool = require('./db');

/**
 * @param {object|null} actor  req.user (or null for anonymous events)
 * @param {string} action      e.g. 'LOGIN', 'ALERT_CREATE', 'USER_DEACTIVATE'
 * @param {string} [target]    what was acted on (alert id, user email, ...)
 * @param {object|string} [details] extra context, stored as JSON text
 * @param {object} [req]       Express request, used for the client IP
 */
function audit(actor, action, target, details, req) {
  const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || null;
  pool.query(
    `INSERT INTO audit_log (actor_id, actor_email, actor_role, action, target, details, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actor?.id || null,
      actor?.email || null,
      actor?.role || null,
      action,
      target || null,
      details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      ip,
    ]
  ).catch(err => console.warn('Audit write failed:', err.message));
}

module.exports = { audit };
