// System Settings — admin-editable platform configuration, persisted in
// the system_settings table (real persistence, not a UI-only mock).
//
// IMPORTANT LIMITATION: these values are genuinely saved and read back
// correctly, but nothing else in the codebase currently *consumes* them —
// congestion-level classification (backend/src/routes/traffic.js,
// ml_common.py's speed thresholds) and the hardcoded "Target: 35 km/h"
// labels elsewhere still use their own fixed constants. Wiring every
// consumer to read from here is separate follow-up work, called out in
// the Settings UI itself rather than silently implied.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { audit } = require('../audit');

const adminOnly = [verifyToken, requireRoles(['ADMIN'])];
const VALID_KEYS = ['city_name', 'target_avg_speed_kmh', 'congestion_thresholds', 'alert_settings'];

router.get('/settings', ...adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT setting_key, setting_value, updated_by, updated_at FROM system_settings');
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = { value: JSON.parse(row.setting_value), updated_by: row.updated_by, updated_at: row.updated_at };
    }
    res.json(settings);
  } catch (err) {
    res.status(503).json({ error: 'Could not fetch settings', details: err.message });
  }
});

router.put('/settings', ...adminOnly, async (req, res) => {
  const updates = Object.entries(req.body || {}).filter(([key]) => VALID_KEYS.includes(key));
  if (updates.length === 0) {
    return res.status(400).json({ error: `No valid setting keys in body. Valid keys: ${VALID_KEYS.join(', ')}` });
  }

  try {
    for (const [key, value] of updates) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP;`,
        [key, JSON.stringify(value), req.user.email]
      );
    }
    audit(req.user, 'SETTINGS_UPDATE', updates.map(([k]) => k).join(', '), req.body, req);

    const { rows } = await pool.query('SELECT setting_key, setting_value, updated_by, updated_at FROM system_settings');
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = { value: JSON.parse(row.setting_value), updated_by: row.updated_by, updated_at: row.updated_at };
    }
    res.json(settings);
  } catch (err) {
    res.status(503).json({ error: 'Could not save settings', details: err.message });
  }
});

module.exports = router;
