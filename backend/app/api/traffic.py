from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import TrafficStatusSummary, SensorTelemetry, Location, TelemetryMetrics, CongestionLevel

router = APIRouter(prefix="/traffic", tags=["Traffic Monitoring"])


@router.get("/status", response_model=TrafficStatusSummary)
def get_traffic_status():
    """
    Get real-time traffic status summary and sample sensor telemetry.
    """
    mock_sensors = [
        SensorTelemetry(
            sensor_id="SN-CENTRAL-01",
            location=Location(latitude=12.9716, longitude=77.5946, road_name="M.G. Road", zone_id="ZONE_CENTRAL"),
            metrics=TelemetryMetrics(vehicle_count=185, avg_speed_kmh=14.2, occupancy_rate=0.85, congestion_level=CongestionLevel.HEAVY),
            timestamp=datetime.utcnow()
        ),
        SensorTelemetry(
            sensor_id="SN-NORTH-04",
            location=Location(latitude=13.0358, longitude=77.5970, road_name="Hebbal Flyover", zone_id="ZONE_NORTH"),
            metrics=TelemetryMetrics(vehicle_count=210, avg_speed_kmh=9.5, occupancy_rate=0.92, congestion_level=CongestionLevel.SEVERE),
            timestamp=datetime.utcnow()
        ),
        SensorTelemetry(
            sensor_id="SN-SOUTH-02",
            location=Location(latitude=12.9165, longitude=77.6101, road_name="Silk Board Junction", zone_id="ZONE_SOUTH"),
            metrics=TelemetryMetrics(vehicle_count=120, avg_speed_kmh=32.0, occupancy_rate=0.45, congestion_level=CongestionLevel.MODERATE),
            timestamp=datetime.utcnow()
        ),
        SensorTelemetry(
            sensor_id="SN-EAST-08",
            location=Location(latitude=12.9784, longitude=77.6408, road_name="Indiranagar 100ft Rd", zone_id="ZONE_EAST"),
            metrics=TelemetryMetrics(vehicle_count=65, avg_speed_kmh=48.0, occupancy_rate=0.25, congestion_level=CongestionLevel.LOW),
            timestamp=datetime.utcnow()
        ),
    ]

    return TrafficStatusSummary(
        total_active_sensors=42,
        avg_city_speed_kmh=25.9,
        active_congestion_alerts=5,
        system_status="OPERATIONAL",
        recent_telemetry=mock_sensors
    )
