const express = require('express');
const router = express.Router();

router.get('/traffic/status', (req, res) => {
  const mockSensors = [
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

  res.json({
    total_active_sensors: 42,
    avg_city_speed_kmh: 25.9,
    active_congestion_alerts: 5,
    system_status: "OPERATIONAL",
    recent_telemetry: mockSensors
  });
});

module.exports = router;
