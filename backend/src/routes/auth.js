const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { SECRET_KEY, verifyToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../mailer');
const { audit } = require('../audit');
const crypto = require('crypto');

// Brute-force protection. Limits are per client IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 login attempts / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5, // 5 reset-link requests / hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again after an hour.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10, // 10 registrations / hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this device. Please try again later.' },
});

// POST /api/v1/auth/login
router.post('/auth/login', loginLimiter, async (req, res) => {
  const emailInput = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!emailInput || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Instant local match for quick demo presets
  if (
    (emailInput.includes('admin') || emailInput === 'admin@trafficvision.ai') && password === 'admin'
  ) {
    const token = jwt.sign({ sub: 'USR-ADMIN-01', email: 'admin@trafficvision.ai', role: 'ADMIN', zone: null }, SECRET_KEY, { expiresIn: '24h' });
    audit({ id: 'USR-ADMIN-01', email: 'admin@trafficvision.ai', role: 'ADMIN' }, 'LOGIN', 'admin@trafficvision.ai', 'demo preset', req);
    return res.json({ access_token: token, token_type: 'bearer', user_id: 'USR-ADMIN-01', email: 'admin@trafficvision.ai', full_name: 'System Administrator', role: 'ADMIN', assigned_zone: null, must_change_password: false });
  }

  if (
    (emailInput.includes('operator') || emailInput === 'operator@trafficvision.ai') && password === 'operator'
  ) {
    const token = jwt.sign({ sub: 'USR-OPERATOR-01', email: 'operator@trafficvision.ai', role: 'OPERATOR', zone: 'ZONE_NORTH' }, SECRET_KEY, { expiresIn: '24h' });
    audit({ id: 'USR-OPERATOR-01', email: 'operator@trafficvision.ai', role: 'OPERATOR' }, 'LOGIN', 'operator@trafficvision.ai', 'demo preset', req);
    return res.json({ access_token: token, token_type: 'bearer', user_id: 'USR-OPERATOR-01', email: 'operator@trafficvision.ai', full_name: 'Traffic Operator', role: 'OPERATOR', assigned_zone: 'ZONE_NORTH', must_change_password: false });
  }

  if (
    (emailInput.includes('commuter') || emailInput === 'commuter@trafficvision.ai') && password === 'commuter'
  ) {
    const token = jwt.sign({ sub: 'USR-COMMUTER-01', email: 'commuter@trafficvision.ai', role: 'COMMUTER', zone: null }, SECRET_KEY, { expiresIn: '24h' });
    return res.json({ access_token: token, token_type: 'bearer', user_id: 'USR-COMMUTER-01', email: 'commuter@trafficvision.ai', full_name: 'City Commuter', role: 'COMMUTER', assigned_zone: null, must_change_password: false });
  }

  // Database query for custom accounts
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [emailInput]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, zone: user.assigned_zone || null },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    audit(user, 'LOGIN', user.email, null, req);
    res.json({
      access_token: token,
      token_type: 'bearer',
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      assigned_zone: user.assigned_zone || null,
      must_change_password: !!user.must_change_password
    });

  } catch (err) {
    console.error('Database query fallback during login:', err.message);
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// POST /api/v1/auth/register
// SECURITY: public self-registration always creates a COMMUTER. OPERATOR and
// ADMIN accounts can only be created by an ADMIN via POST /api/v1/users.
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

router.post('/auth/register', registerLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const fullName = req.body.full_name || 'Smart City User';
  const role = 'COMMUTER';

  const gender = VALID_GENDERS.includes((req.body.gender || '').toUpperCase()) ? req.body.gender.toUpperCase() : null;
  const dateOfBirth = req.body.date_of_birth || null;
  const age = Number.isFinite(parseInt(req.body.age, 10)) ? parseInt(req.body.age, 10) : null;
  const phone = (req.body.phone || '').trim() || null;
  const address = (req.body.address || '').trim() || null;
  const aadharNumber = (req.body.aadhar_number || '').replace(/\s+/g, '') || null;
  const aadharPhoto = req.body.aadhar_photo || null; // base64 data URL, or null if not provided

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    return res.status(400).json({ error: 'Aadhaar number must be exactly 12 digits' });
  }
  if (age !== null && (age < 0 || age > 120)) {
    return res.status(400).json({ error: 'Please enter a valid age' });
  }

  try {
    const userId = `USR-${crypto.randomUUID()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const { rows } = await pool.query(`
        INSERT INTO users (
          id, email, password_hash, full_name, role, is_active, created_at,
          gender, date_of_birth, age, phone, address, aadhar_number, aadhar_photo
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, email, full_name, role;
      `, [userId, email, passwordHash, fullName, role, gender, dateOfBirth, age, phone, address, aadharNumber, aadharPhoto]);

      const newUser = rows[0];
      const token = jwt.sign(
        { sub: newUser.id, email: newUser.email, role: newUser.role, zone: null },
        SECRET_KEY,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        user_id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        assigned_zone: null,
        must_change_password: false
      });
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      console.warn('DB registration fallback:', dbErr.message);
    }

    // In-memory token generation if DB write is offline
    const token = jwt.sign(
      { sub: userId, email, role, zone: null },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user_id: userId,
      email,
      full_name: fullName,
      role,
      assigned_zone: null,
      must_change_password: false
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// GET /api/v1/auth/me
router.get('/auth/me', verifyToken, (req, res) => {
  const user = req.user;
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, zone: user.assigned_zone || null },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({
    access_token: token,
    token_type: 'bearer',
    user_id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    assigned_zone: user.assigned_zone || null,
    must_change_password: !!user.must_change_password
  });
});

const DEMO_EMAILS = ['admin@trafficvision.ai', 'operator@trafficvision.ai', 'commuter@trafficvision.ai'];
const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:2000';

// POST /api/v1/auth/forgot-password
// Always responds with the same generic message so attackers can't probe
// which emails exist. In development (no SMTP configured) the reset link is
// printed to the server console and returned as dev_reset_link.
router.post('/auth/forgot-password', resetLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const genericResponse = { message: 'If an account exists for this email, a password reset link has been sent.' };

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (DEMO_EMAILS.includes(email)) {
    // Demo preset accounts have fixed passwords and never need resets.
    return res.json(genericResponse);
  }

  try {
    const { rows } = await pool.query('SELECT id, is_active FROM users WHERE LOWER(email) = $1', [email]);
    if (rows.length === 0 || !rows[0].is_active) {
      return res.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, rows[0].id, expiresAt]
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    // With SMTP configured (backend/.env) a real email is sent; otherwise the
    // link is printed to the console and, outside production, also returned
    // to the client for easy local testing.
    const { sent } = await sendPasswordResetEmail(email, resetLink);

    const response = { ...genericResponse };
    if (!sent && process.env.NODE_ENV !== 'production') {
      response.dev_reset_link = resetLink;
    }
    return res.json(response);
  } catch (err) {
    console.error('Forgot-password error:', err.message);
    return res.json(genericResponse);
  }
});

// POST /api/v1/auth/reset-password  { token, new_password }
router.post('/auth/reset-password', resetLimiter, async (req, res) => {
  const token = (req.body.token || '').trim();
  const newPassword = req.body.new_password || '';

  if (!token || newPassword.length < 6) {
    return res.status(400).json({ error: 'A valid token and a password of at least 6 characters are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [passwordHash, rows[0].user_id]
    );
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [rows[0].user_id]);

    audit({ id: rows[0].user_id }, 'PASSWORD_RESET', rows[0].user_id, 'via emailed reset link', req);
    return res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    console.error('Reset-password error:', err.message);
    return res.status(500).json({ error: 'Could not reset password', details: err.message });
  }
});

// POST /api/v1/auth/change-password  { current_password, new_password }
// Used both voluntarily and for the forced first-login change on
// admin-created accounts (must_change_password = TRUE).
router.post('/auth/change-password', verifyToken, async (req, res) => {
  const currentPassword = req.body.current_password || '';
  const newPassword = req.body.new_password || '';

  if (DEMO_EMAILS.includes((req.user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Demo preset accounts cannot change their password.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [passwordHash, req.user.id]
    );

    audit(req.user, 'PASSWORD_CHANGE', req.user.email, null, req);
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change-password error:', err.message);
    return res.status(500).json({ error: 'Could not change password', details: err.message });
  }
});

module.exports = router;
