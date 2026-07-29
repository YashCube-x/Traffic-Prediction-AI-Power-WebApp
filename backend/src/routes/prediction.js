const express = require('express');
const router = express.Router();

router.get('/traffic/predictions', (req, res) => {
  res.json([
    {
      corridor_id: "CORRIDOR_MG_ROAD",
      corridor_name: "M.G. Road Corridor (Central)",
      current_status: "HEAVY",
      peak_hour_warning: true,
      estimated_peak_start: "05:30 PM",
      ai_confidence_score: 0.94,
      forecast_timeline: [
        { time_label: "04:00 PM", predicted_speed_kmh: 24.5, predicted_vehicle_count: 160, congestion_risk: "MODERATE", bottleneck_probability: 0.35 },
        { time_label: "05:00 PM", predicted_speed_kmh: 18.0, predicted_vehicle_count: 210, congestion_risk: "HEAVY", bottleneck_probability: 0.72 },
        { time_label: "06:00 PM", predicted_speed_kmh: 11.2, predicted_vehicle_count: 285, congestion_risk: "SEVERE", bottleneck_probability: 0.91 },
        { time_label: "07:00 PM", predicted_speed_kmh: 15.0, predicted_vehicle_count: 240, congestion_risk: "HEAVY", bottleneck_probability: 0.80 },
        { time_label: "08:00 PM", predicted_speed_kmh: 32.0, predicted_vehicle_count: 130, congestion_risk: "LOW", bottleneck_probability: 0.20 }
      ],
      recommendations: [
        "Reroute commercial heavy vehicles to Outer Ring Road.",
        "Adjust traffic signal green duration by +15s at Trinity Junction.",
        "Notify commuters about 18-minute expected delay between 05:45 PM and 06:45 PM."
      ]
    },
    {
      corridor_id: "CORRIDOR_HEBBAL_FLYOVER",
      corridor_name: "Hebbal Flyover to Airport Expressway",
      current_status: "SEVERE",
      peak_hour_warning: true,
      estimated_peak_start: "04:45 PM",
      ai_confidence_score: 0.96,
      forecast_timeline: [
        { time_label: "04:00 PM", predicted_speed_kmh: 14.0, predicted_vehicle_count: 230, congestion_risk: "HEAVY", bottleneck_probability: 0.78 },
        { time_label: "05:00 PM", predicted_speed_kmh: 9.5, predicted_vehicle_count: 310, congestion_risk: "SEVERE", bottleneck_probability: 0.95 },
        { time_label: "06:00 PM", predicted_speed_kmh: 8.0, predicted_vehicle_count: 340, congestion_risk: "SEVERE", bottleneck_probability: 0.98 },
        { time_label: "07:00 PM", predicted_speed_kmh: 19.5, predicted_vehicle_count: 190, congestion_risk: "MODERATE", bottleneck_probability: 0.45 },
        { time_label: "08:00 PM", predicted_speed_kmh: 42.0, predicted_vehicle_count: 90, congestion_risk: "LOW", bottleneck_probability: 0.10 }
      ],
      recommendations: [
        "Activate express bypass lane for airport taxis.",
        "Recommend Hennur Main Road alternate route for North-bound commuters."
      ]
    }
  ]);
});

module.exports = router;
