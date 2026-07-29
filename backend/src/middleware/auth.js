const jwt = require('jsonwebtoken');
const pool = require('../db');

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'trafficvision-secret-key-2026-super-secure';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      const { rows } = await pool.query('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1', [decoded.sub]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'User account not found' });
      }

      if (!rows[0].is_active) {
        return res.status(403).json({ error: 'User account is inactive' });
      }

      req.user = rows[0];
      next();
    } catch (dbErr) {
      return res.status(500).json({ error: 'Database verification error', details: dbErr.message });
    }
  });
}

function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient privileges', 
        required_roles: allowedRoles,
        user_role: req.user.role 
      });
    }

    next();
  };
}

module.exports = {
  SECRET_KEY,
  verifyToken,
  requireRoles
};
