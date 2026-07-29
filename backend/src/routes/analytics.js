const express = require('express');
const router = express.Router();

router.get('/analytics/overview', (req, res) => {
  res.json({
    generated_at: new Date().toISOString(),
    total_incidents_today: 23,
    active_critical_alerts: 2,
    city_efficiency_rating: 7.4,
    heatmaps: [
      { zone_id: "ZONE_CENTRAL", zone_name: "Central CBD (M.G. Road)", congestion_index: 84.5, avg_speed_kmh: 16.2, total_vehicles: 4820, status: "HEAVY" },
      { zone_id: "ZONE_NORTH", zone_name: "North Hub (Hebbal / Airport)", congestion_index: 92.0, avg_speed_kmh: 11.5, total_vehicles: 6150, status: "SEVERE" },
      { zone_id: "ZONE_SOUTH", zone_name: "South Hub (Silk Board / ORR)", congestion_index: 65.0, avg_speed_kmh: 28.4, total_vehicles: 3400, status: "MODERATE" },
      { zone_id: "ZONE_EAST", zone_name: "East Hub (Indiranagar / Whitefield)", congestion_index: 32.0, avg_speed_kmh: 42.0, total_vehicles: 1950, status: "LOW" }
    ],
    hourly_trends: [
      { hour_label: "06:00 AM", avg_speed_kmh: 45.0, vehicle_density: 1200, congestion_rate: 15.0 },
      { hour_label: "09:00 AM", avg_speed_kmh: 18.5, vehicle_density: 5200, congestion_rate: 78.0 },
      { hour_label: "12:00 PM", avg_speed_kmh: 32.0, vehicle_density: 2800, congestion_rate: 40.0 },
      { hour_label: "03:00 PM", avg_speed_kmh: 28.0, vehicle_density: 3400, congestion_rate: 52.0 },
      { hour_label: "06:00 PM", avg_speed_kmh: 12.0, vehicle_density: 6400, congestion_rate: 92.0 },
      { hour_label: "09:00 PM", avg_speed_kmh: 38.0, vehicle_density: 2100, congestion_rate: 25.0 }
    ],
    corridor_performance: [
      { corridor_name: "Outer Ring Road (ORR)", efficiency_score: 5.8, total_incidents_24h: 8, avg_delay_mins: 22, status: "HEAVY" },
      { corridor_name: "Hebbal Airport Expressway", efficiency_score: 4.2, total_incidents_24h: 11, avg_delay_mins: 34, status: "SEVERE" },
      { corridor_name: "Hosur Road Highway", efficiency_score: 7.6, total_incidents_24h: 3, avg_delay_mins: 10, status: "MODERATE" },
      { corridor_name: "Old Airport Road Eco Corridor", efficiency_score: 9.1, total_incidents_24h: 1, avg_delay_mins: 4, status: "LOW" }
    ]
  });
});

module.exports = router;
