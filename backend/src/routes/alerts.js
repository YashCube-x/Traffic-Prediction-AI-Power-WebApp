const express = require('express');
const router = express.Router();

let MOCK_ALERTS = [
  {
    alert_id: "ALT-2026-001",
    title: "Multi-Vehicle Collision near Hebbal Junction",
    location: "Hebbal Flyover, North Corridor",
    zone_id: "ZONE_NORTH",
    severity: "CRITICAL",
    category: "ACCIDENT",
    description: "Collision blocking 2 center lanes. Emergency services dispatched. Expect heavy gridlock.",
    estimated_delay_mins: 35,
    is_resolved: false,
    reported_at: new Date().toISOString()
  },
  {
    alert_id: "ALT-2026-002",
    title: "Traffic Signal Controller Failure at Silk Board",
    location: "Central Silk Board Junction",
    zone_id: "ZONE_SOUTH",
    severity: "HIGH",
    category: "SIGNAL_FAILURE",
    description: "Signal lights operating on yellow flashing. Traffic personnel directing manual flow.",
    estimated_delay_mins: 20,
    is_resolved: false,
    reported_at: new Date().toISOString()
  },
  {
    alert_id: "ALT-2026-003",
    title: "Metro Construction Lane Restriction",
    location: "Outer Ring Road - Marathahalli",
    zone_id: "ZONE_EAST",
    severity: "MODERATE",
    category: "CONSTRUCTION",
    description: "Single lane narrowed for pillar casting work. Moderate slowdown observed.",
    estimated_delay_mins: 12,
    is_resolved: false,
    reported_at: new Date().toISOString()
  },
  {
    alert_id: "ALT-2026-004",
    title: "Monsoon Waterlogging Warning",
    location: "M.G. Road Underpass",
    zone_id: "ZONE_CENTRAL",
    severity: "INFO",
    category: "WEATHER",
    description: "Water accumulation reduced traffic speed to 15 km/h. Pumps deployed.",
    estimated_delay_mins: 8,
    is_resolved: true,
    reported_at: new Date().toISOString()
  }
];

router.get('/alerts', (req, res) => {
  res.json(MOCK_ALERTS);
});

router.post('/alerts', (req, res) => {
  const newAlert = {
    alert_id: `ALT-2026-00${MOCK_ALERTS.length + 1}`,
    title: req.body.title || "Unspecified Traffic Incident",
    location: req.body.location || "City Arterial Road",
    zone_id: req.body.zone_id || "ZONE_CENTRAL",
    severity: req.body.severity || "MODERATE",
    category: req.body.category || "CONGESTION",
    description: req.body.description || "Alert reported by traffic operator.",
    estimated_delay_mins: req.body.estimated_delay_mins || 15,
    is_resolved: false,
    reported_at: new Date().toISOString()
  };
  MOCK_ALERTS.unshift(newAlert);
  res.status(201).json(newAlert);
});

router.patch('/alerts/:id/resolve', (req, res) => {
  const alertId = req.params.id;
  const alert = MOCK_ALERTS.find(a => a.alert_id === alertId);
  if (alert) {
    alert.is_resolved = true;
    res.json(alert);
  } else {
    res.status(404).json({ error: "Alert ID not found" });
  }
});

module.exports = router;
