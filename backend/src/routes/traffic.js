const express = require('express');
const router = express.Router();
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');

// Same 8 corridors used by the AI forecasting model (see ml_common.py) so the
// sensor map, route optimizer, and forecasting tabs all reference one
// consistent set of real Bengaluru locations.
let activeSensors = [
  {
    sensor_id: "SN-SOUTH-02",
    location: { latitude: 12.9172, longitude: 77.6238, road_name: "Central Silk Board Junction", zone_id: "ZONE_SOUTH" },
    metrics: { vehicle_count: 480, avg_speed_kmh: 9.5, occupancy_rate: 0.92, congestion_level: "SEVERE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-NORTH-04",
    location: { latitude: 13.0358, longitude: 77.5970, road_name: "Hebbal Flyover to Airport Expressway", zone_id: "ZONE_NORTH" },
    metrics: { vehicle_count: 210, avg_speed_kmh: 22.0, occupancy_rate: 0.55, congestion_level: "MODERATE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-EAST-03",
    location: { latitude: 12.9569, longitude: 77.7011, road_name: "Outer Ring Road (Marathahalli - Bellandur)", zone_id: "ZONE_EAST" },
    metrics: { vehicle_count: 390, avg_speed_kmh: 11.0, occupancy_rate: 0.88, congestion_level: "SEVERE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-EAST-05",
    location: { latitude: 12.9987, longitude: 77.6952, road_name: "Tin Factory & K.R. Puram Junction", zone_id: "ZONE_EAST" },
    metrics: { vehicle_count: 340, avg_speed_kmh: 8.4, occupancy_rate: 0.9, congestion_level: "SEVERE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-CENTRAL-01",
    location: { latitude: 12.9716, longitude: 77.5946, road_name: "M.G. Road & Trinity Circle Corridor", zone_id: "ZONE_CENTRAL" },
    metrics: { vehicle_count: 185, avg_speed_kmh: 14.2, occupancy_rate: 0.85, congestion_level: "HEAVY" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-EAST-08",
    location: { latitude: 12.9698, longitude: 77.7500, road_name: "Whitefield ITPB Main Road", zone_id: "ZONE_EAST" },
    metrics: { vehicle_count: 260, avg_speed_kmh: 15.5, occupancy_rate: 0.7, congestion_level: "HEAVY" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-WEST-06",
    location: { latitude: 13.0280, longitude: 77.5460, road_name: "Goraguntepalya Tumkur Road Junction", zone_id: "ZONE_WEST" },
    metrics: { vehicle_count: 150, avg_speed_kmh: 26.0, occupancy_rate: 0.4, congestion_level: "MODERATE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-SOUTH-07",
    location: { latitude: 12.8452, longitude: 77.6602, road_name: "Electronic City Elevated Expressway", zone_id: "ZONE_SOUTH" },
    metrics: { vehicle_count: 90, avg_speed_kmh: 45.0, occupancy_rate: 0.2, congestion_level: "LOW" },
    timestamp: new Date().toISOString()
  }
];

// GET /api/v1/traffic/status
// Zone-scoped RBAC: an OPERATOR only ever sees the sensors of their own
// assigned zone; ADMIN (and anonymous/commuter dashboards) see the full city.
router.get('/traffic/status', optionalAuth, (req, res) => {
  let visibleSensors = activeSensors;
  let scopedZone = null;

  if (req.user && req.user.role === 'OPERATOR' && req.user.assigned_zone) {
    scopedZone = req.user.assigned_zone;
    visibleSensors = activeSensors.filter(s => s.location.zone_id === scopedZone);
  }

  const avgSpeed = visibleSensors.length
    ? (visibleSensors.reduce((acc, s) => acc + (s.metrics.avg_speed_kmh || 0), 0) / visibleSensors.length).toFixed(1)
    : '0.0';

  res.json({
    total_active_sensors: visibleSensors.length,
    avg_city_speed_kmh: parseFloat(avgSpeed),
    active_congestion_alerts: visibleSensors.filter(s => s.metrics.congestion_level === 'HEAVY' || s.metrics.congestion_level === 'SEVERE').length,
    system_status: "OPERATIONAL",
    scoped_zone: scopedZone,
    recent_telemetry: visibleSensors
  });
});

// POST /api/v1/traffic/telemetry - Feed new IoT sensor readings
router.post('/traffic/telemetry', (req, res) => {
  const { sensor_id, road_name, zone_id, vehicle_count, avg_speed_kmh, congestion_level } = req.body;

  if (!sensor_id || !road_name) {
    return res.status(400).json({ error: "sensor_id and road_name are required" });
  }

  const existingIdx = activeSensors.findIndex(s => s.sensor_id === sensor_id);
  const newSensorData = {
    sensor_id,
    location: {
      road_name,
      zone_id: zone_id || "ZONE_GENERAL",
      latitude: req.body.latitude || 12.9716,
      longitude: req.body.longitude || 77.5946
    },
    metrics: {
      vehicle_count: parseInt(vehicle_count) || 100,
      avg_speed_kmh: parseFloat(avg_speed_kmh) || 25.0,
      occupancy_rate: req.body.occupancy_rate || 0.5,
      congestion_level: congestion_level || (avg_speed_kmh < 15 ? 'SEVERE' : avg_speed_kmh < 25 ? 'HEAVY' : 'MODERATE')
    },
    timestamp: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    activeSensors[existingIdx] = newSensorData;
  } else {
    activeSensors.unshift(newSensorData);
  }

  res.status(201).json({
    message: "Telemetry sensor feed received successfully",
    sensor: newSensorData
  });
});

module.exports = router;
