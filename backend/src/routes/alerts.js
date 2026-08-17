const express = require('express');
const router = express.Router();
const { verifyToken, optionalAuth, requireRoles } = require('../middleware/auth');
const alertsStore = require('../store/alertsStore');

// GET /alerts — public for commuters (city-wide warning banner), but an
// OPERATOR is zone-scoped and only sees incidents in their assigned zone.
router.get('/alerts', optionalAuth, async (req, res) => {
  try {
    let alerts = await alertsStore.getAllAlerts();
    if (req.user && req.user.role === 'OPERATOR' && req.user.assigned_zone) {
      alerts = alerts.filter(a => a.zone_id === req.user.assigned_zone);
    }
    res.json(alerts);
  } catch (err) {
    console.error('Alerts fetch error:', err.message);
    res.status(503).json({ error: 'Alerts database unavailable', details: err.message });
  }
});

// POST /alerts — Restricted to ADMIN and OPERATOR roles.
// An OPERATOR can only log incidents inside their own assigned zone.
router.post('/alerts', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  const isZonedOperator = req.user.role === 'OPERATOR' && req.user.assigned_zone;
  const zoneId = isZonedOperator ? req.user.assigned_zone : (req.body.zone_id || "ZONE_CENTRAL");

  try {
    const newAlert = await alertsStore.addAlert({
      alert_id: await alertsStore.nextAlertId(),
      title: req.body.title || "Unspecified Traffic Incident",
      location: req.body.location || "City Arterial Road",
      zone_id: zoneId,
      severity: req.body.severity || "MODERATE",
      category: req.body.category || "CONGESTION",
      description: req.body.description || "Alert reported by traffic operator.",
      estimated_delay_mins: req.body.estimated_delay_mins || 15,
      reported_by: req.user.email,
    });
    res.status(201).json(newAlert);
  } catch (err) {
    console.error('Alert create error:', err.message);
    res.status(503).json({ error: 'Could not save the incident', details: err.message });
  }
});

// PATCH /alerts/:id/resolve — Restricted to ADMIN and OPERATOR roles.
// An OPERATOR can only resolve incidents inside their own assigned zone.
router.patch('/alerts/:id/resolve', verifyToken, requireRoles(['ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const target = await alertsStore.findAlert(req.params.id);
    if (!target) {
      return res.status(404).json({ error: "Alert ID not found" });
    }
    if (req.user.role === 'OPERATOR' && req.user.assigned_zone && target.zone_id !== req.user.assigned_zone) {
      return res.status(403).json({ error: `You can only resolve incidents in your assigned zone (${req.user.assigned_zone})` });
    }
    const alert = await alertsStore.resolveAlert(req.params.id);
    res.json(alert);
  } catch (err) {
    console.error('Alert resolve error:', err.message);
    res.status(503).json({ error: 'Could not update the incident', details: err.message });
  }
});

module.exports = router;
