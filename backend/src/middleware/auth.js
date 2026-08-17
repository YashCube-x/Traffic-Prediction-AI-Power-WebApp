const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../db');

// JWT signing secret comes from backend/.env. The insecure hardcoded fallback
// only exists for local development and is refused outright in production.
if (!process.env.JWT_SECRET_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET_KEY environment variable must be set in production.');
  }
  console.warn('⚠️  JWT_SECRET_KEY is not set — using an insecure development-only fallback. Set it in backend/.env.');
}
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'dev-only-insecure-secret';

// The quick-login demo accounts (admin@/operator@/commuter@trafficvision.ai)
// issue real JWTs but are never inserted into Postgres, so they must be
// authenticated straight from the token payload instead of a DB lookup.
const DEMO_USERS = {
  'USR-ADMIN-01': { id: 'USR-ADMIN-01', email: 'admin@trafficvision.ai', full_name: 'System Administrator', role: 'ADMIN', assigned_zone: null, must_change_password: false, is_active: true },
  'USR-OPERATOR-01': { id: 'USR-OPERATOR-01', email: 'operator@trafficvision.ai', full_name: 'Traffic Operator', role: 'OPERATOR', assigned_zone: 'ZONE_NORTH', must_change_password: false, is_active: true },
  'USR-COMMUTER-01': { id: 'USR-COMMUTER-01', email: 'commuter@trafficvision.ai', full_name: 'City Commuter', role: 'COMMUTER', assigned_zone: null, must_change_password: false, is_active: true },
};

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

    if (DEMO_USERS[decoded.sub]) {
      req.user = DEMO_USERS[decoded.sub];
      return next();
    }

    try {
      const { rows } = await pool.query('SELECT id, email, full_name, role, assigned_zone, must_change_password, is_active FROM users WHERE id = $1', [decoded.sub]);
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

// For endpoints that are public for commuters but zone-scoped for operators:
// attaches req.user when a valid token is sent, continues anonymously when no
// token is present, and rejects only tokens that are present but invalid.
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }
  return verifyToken(req, res, next);
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
  optionalAuth,
  requireRoles
};
