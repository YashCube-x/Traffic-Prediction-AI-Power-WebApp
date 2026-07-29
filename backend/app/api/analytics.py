from fastapi import APIRouter
from typing import List
from datetime import datetime
from app.models.schemas import (
    AnalyticsOverviewResponse,
    ZoneHeatmapMetric,
    HourlyTrendMetric,
    CorridorPerformanceItem,
    CongestionLevel
)

router = APIRouter(prefix="/analytics", tags=["Traffic Analytics & Heatmaps"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview():
    """
    Get city-wide traffic analytics overview, congestion heatmaps, and hourly trend data.
    """
    heatmaps = [
        ZoneHeatmapMetric(zone_id="ZONE_CENTRAL", zone_name="Central CBD (M.G. Road)", congestion_index=84.5, avg_speed_kmh=16.2, total_vehicles=4820, status=CongestionLevel.HEAVY),
        ZoneHeatmapMetric(zone_id="ZONE_NORTH", zone_name="North Hub (Hebbal / Airport)", congestion_index=92.0, avg_speed_kmh=11.5, total_vehicles=6150, status=CongestionLevel.SEVERE),
        ZoneHeatmapMetric(zone_id="ZONE_SOUTH", zone_name="South Hub (Silk Board / ORR)", congestion_index=65.0, avg_speed_kmh=28.4, total_vehicles=3400, status=CongestionLevel.MODERATE),
        ZoneHeatmapMetric(zone_id="ZONE_EAST", zone_name="East Hub (Indiranagar / Whitefield)", congestion_index=32.0, avg_speed_kmh=42.0, total_vehicles=1950, status=CongestionLevel.LOW),
    ]

    trends = [
        HourlyTrendMetric(hour_label="06:00 AM", avg_speed_kmh=45.0, vehicle_density=1200, congestion_rate=15.0),
        HourlyTrendMetric(hour_label="09:00 AM", avg_speed_kmh=18.5, vehicle_density=5200, congestion_rate=78.0),
        HourlyTrendMetric(hour_label="12:00 PM", avg_speed_kmh=32.0, vehicle_density=2800, congestion_rate=40.0),
        HourlyTrendMetric(hour_label="03:00 PM", avg_speed_kmh=28.0, vehicle_density=3400, congestion_rate=52.0),
        HourlyTrendMetric(hour_label="06:00 PM", avg_speed_kmh=12.0, vehicle_density=6400, congestion_rate=92.0),
        HourlyTrendMetric(hour_label="09:00 PM", avg_speed_kmh=38.0, vehicle_density=2100, congestion_rate=25.0),
    ]

    performance = [
        CorridorPerformanceItem(corridor_name="Outer Ring Road (ORR)", efficiency_score=5.8, total_incidents_24h=8, avg_delay_mins=22, status=CongestionLevel.HEAVY),
        CorridorPerformanceItem(corridor_name="Hebbal Airport Expressway", efficiency_score=4.2, total_incidents_24h=11, avg_delay_mins=34, status=CongestionLevel.SEVERE),
        CorridorPerformanceItem(corridor_name="Hosur Road Highway", efficiency_score=7.6, total_incidents_24h=3, avg_delay_mins=10, status=CongestionLevel.MODERATE),
        CorridorPerformanceItem(corridor_name="Old Airport Road Eco Corridor", efficiency_score=9.1, total_incidents_24h=1, avg_delay_mins=4, status=CongestionLevel.LOW),
    ]

    return AnalyticsOverviewResponse(
        generated_at=datetime.utcnow(),
        total_incidents_today=23,
        active_critical_alerts=2,
        city_efficiency_rating=7.4,
        heatmaps=heatmaps,
        hourly_trends=trends,
        corridor_performance=performance
    )
