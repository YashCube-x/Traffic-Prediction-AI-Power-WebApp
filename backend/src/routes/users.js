const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { audit } = require('../audit');

const VALID_ROLES = ['ADMIN', 'OPERATOR', 'COMMUTER'];
const VALID_ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];
const adminOnly = [verifyToken, requireRoles(['ADMIN'])];

// GET /api/v1/users — list all accounts (ADMIN only)
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, email, full_name, role, assigned_zone, must_change_password, is_active, created_at
      FROM users ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users', details: err.message });
  }
});

// POST /api/v1/users — ADMIN creates an OPERATOR (or another ADMIN) with a
// temporary password. The new account is forced to change it on first login.
router.post('/users', ...adminOnly, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const fullName = (req.body.full_name || '').trim();
  const role = (req.body.role || 'OPERATOR').toUpperCase();
  const assignedZone = req.body.assigned_zone || null;
  const tempPassword = req.body.temp_password || crypto.randomBytes(6).toString('base64url');

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and full name are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (role === 'OPERATOR' && !VALID_ZONES.includes(assignedZone)) {
    return res.status(400).json({ error: `An operator must be assigned a zone: ${VALID_ZONES.join(', ')}` });
  }
  if (tempPassword.length < 6) {
    return res.status(400).json({ error: 'Temporary password must be at least 6 characters' });
  }

  try {
    const userId = `USR-${crypto.randomUUID()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // is_active/created_at are set explicitly because the legacy table may
    // lack server-side defaults (it was originally created by SQLAlchemy).
    const { rows } = await pool.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, assigned_zone, must_change_password, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, CURRENT_TIMESTAMP)
      RETURNING id, email, full_name, role, assigned_zone, must_change_password, is_active, created_at;
    `, [userId, email, passwordHash, fullName, role, role === 'OPERATOR' ? assignedZone : null]);

    audit(req.user, 'USER_CREATE', email, { role, assigned_zone: role === 'OPERATOR' ? assignedZone : null }, req);
    // temp_password is echoed back exactly once so the admin can hand it to
    // the new operator; it is never retrievable again (only the hash is stored).
    res.status(201).json({ ...rows[0], temp_password: tempPassword });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: 'Could not create user', details: err.message });
  }
});

// PATCH /api/v1/users/:id — update role/zone/active status (ADMIN only)
router.patch('/users/:id', ...adminOnly, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id && req.body.is_active === false) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const updates = [];
  const values = [];

  if (typeof req.body.is_active === 'boolean') {
    values.push(req.body.is_active);
    updates.push(`is_active = $${values.length}`);
  }
  if (req.body.assigned_zone !== undefined) {
    if (req.body.assigned_zone !== null && !VALID_ZONES.includes(req.body.assigned_zone)) {
      return res.status(400).json({ error: `Zone must be one of: ${VALID_ZONES.join(', ')} (or null)` });
    }
    values.push(req.body.assigned_zone);
    updates.push(`assigned_zone = $${values.length}`);
  }
  if (req.body.role !== undefined) {
    if (!VALID_ROLES.includes(req.body.role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    values.push(req.body.role);
    updates.push(`role = $${values.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nothing to update. Provide is_active, assigned_zone, or role.' });
  }

  try {
    values.push(id);
    const { rows } = await pool.query(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, email, full_name, role, assigned_zone, must_change_password, is_active, created_at;
    `, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    audit(req.user, 'USER_UPDATE', rows[0].email, req.body, req);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update user', details: err.message });
  }
});

// GET /api/v1/audit — latest privileged actions (ADMIN only)
router.get('/audit', ...adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, actor_email, actor_role, action, target, details, ip, created_at
      FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch audit log', details: err.message });
  }
});

module.exports = router;
