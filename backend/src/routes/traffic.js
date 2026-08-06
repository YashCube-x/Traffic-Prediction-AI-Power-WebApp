const express = require('express');
const router = express.Router();
const pool = require('../db');

let activeSensors = [
  {
    sensor_id: "SN-CENTRAL-01",
    location: { latitude: 12.9716, longitude: 77.5946, road_name: "M.G. Road", zone_id: "ZONE_CENTRAL" },
    metrics: { vehicle_count: 185, avg_speed_kmh: 14.2, occupancy_rate: 0.85, congestion_level: "HEAVY" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-NORTH-04",
    location: { latitude: 13.0358, longitude: 77.5970, road_name: "Hebbal Flyover", zone_id: "ZONE_NORTH" },
    metrics: { vehicle_count: 210, avg_speed_kmh: 9.5, occupancy_rate: 0.92, congestion_level: "SEVERE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-SOUTH-02",
    location: { latitude: 12.9165, longitude: 77.6101, road_name: "Silk Board Junction", zone_id: "ZONE_SOUTH" },
    metrics: { vehicle_count: 120, avg_speed_kmh: 32.0, occupancy_rate: 0.45, congestion_level: "MODERATE" },
    timestamp: new Date().toISOString()
  },
  {
    sensor_id: "SN-EAST-08",
    location: { latitude: 12.9784, longitude: 77.6408, road_name: "Indiranagar 100ft Rd", zone_id: "ZONE_EAST" },
    metrics: { vehicle_count: 65, avg_speed_kmh: 48.0, occupancy_rate: 0.25, congestion_level: "LOW" },
    timestamp: new Date().toISOString()
  }
];

// GET /api/v1/traffic/status
router.get('/traffic/status', (req, res) => {
  const avgSpeed = (
    activeSensors.reduce((acc, s) => acc + (s.metrics.avg_speed_kmh || 0), 0) / activeSensors.length
  ).toFixed(1);

  res.json({
    total_active_sensors: activeSensors.length,
    avg_city_speed_kmh: parseFloat(avgSpeed),
    active_congestion_alerts: activeSensors.filter(s => s.metrics.congestion_level === 'HEAVY' || s.metrics.congestion_level === 'SEVERE').length,
    system_status: "OPERATIONAL",
    recent_telemetry: activeSensors
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
