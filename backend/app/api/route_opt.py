from fastapi import APIRouter
from app.models.schemas import (
    RouteOptimizeRequest,
    RouteOptimizationResponse,
    RouteOption,
    RouteSegment,
    CongestionLevel
)

router = APIRouter(prefix="/routes", tags=["Route Optimization"])


@router.post("/optimize", response_model=RouteOptimizationResponse)
def optimize_route(req: RouteOptimizeRequest):
    """
    Calculate primary and alternate optimized routes with travel time estimates and delay metrics.
    """
    origin_name = req.origin if req.origin else "Central Silk Board"
    dest_name = req.destination if req.destination else "Manyata Tech Park"

    primary_route = RouteOption(
        route_id="ROUTE_PRI_01",
        title="Primary Direct (Outer Ring Road)",
        distance_km=21.4,
        est_travel_time_mins=48,
        delay_time_mins=16,
        congestion_level=CongestionLevel.HEAVY,
        fuel_efficiency_score=6.8,
        co2_saved_kg=0.0,
        segments=[
            RouteSegment(segment_name="Silk Board Flyover", distance_km=3.2, avg_speed_kmh=12.0, congestion_level=CongestionLevel.SEVERE),
            RouteSegment(segment_name="Marathahalli Expressway", distance_km=10.5, avg_speed_kmh=32.0, congestion_level=CongestionLevel.MODERATE),
            RouteSegment(segment_name="Nagavara Junction", distance_km=7.7, avg_speed_kmh=18.5, congestion_level=CongestionLevel.HEAVY),
        ],
        is_recommended=False
    )

    alt_route_1 = RouteOption(
        route_id="ROUTE_ALT_01",
        title="AI Recommended (Eco-Bypass via Old Airport Rd)",
        distance_km=23.1,
        est_travel_time_mins=34,
        delay_time_mins=3,
        congestion_level=CongestionLevel.LOW,
        fuel_efficiency_score=9.2,
        co2_saved_kg=1.8,
        segments=[
            RouteSegment(segment_name="Old Airport Road", distance_km=8.1, avg_speed_kmh=45.0, congestion_level=CongestionLevel.LOW),
            RouteSegment(segment_name="Suranjan Das Road", distance_km=6.0, avg_speed_kmh=42.0, congestion_level=CongestionLevel.LOW),
            RouteSegment(segment_name="Hennur Main Road Link", distance_km=9.0, avg_speed_kmh=38.0, congestion_level=CongestionLevel.MODERATE),
        ],
        is_recommended=True
    )

    alt_route_2 = RouteOption(
        route_id="ROUTE_ALT_02",
        title="Secondary Alternate (CBD Inner Ring)",
        distance_km=19.8,
        est_travel_time_mins=41,
        delay_time_mins=9,
        congestion_level=CongestionLevel.MODERATE,
        fuel_efficiency_score=8.0,
        co2_saved_kg=0.9,
        segments=[
            RouteSegment(segment_name="Hosur Road", distance_km=5.0, avg_speed_kmh=25.0, congestion_level=CongestionLevel.MODERATE),
            RouteSegment(segment_name="MG Road Underpass", distance_km=6.8, avg_speed_kmh=30.0, congestion_level=CongestionLevel.MODERATE),
            RouteSegment(segment_name="Bellary Road Corridor", distance_km=8.0, avg_speed_kmh=28.0, congestion_level=CongestionLevel.MODERATE),
        ],
        is_recommended=False
    )

    return RouteOptimizationResponse(
        origin=origin_name,
        destination=dest_name,
        routes=[alt_route_1, primary_route, alt_route_2]
    )
