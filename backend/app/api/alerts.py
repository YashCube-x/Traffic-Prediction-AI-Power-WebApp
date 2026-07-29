from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from app.models.schemas import TrafficAlert, AlertCreate, AlertSeverity, AlertCategory

router = APIRouter(prefix="/alerts", tags=["Smart Alerts & Incident Management"])

# In-memory alerts mock store
MOCK_ALERTS: List[TrafficAlert] = [
    TrafficAlert(
        alert_id="ALT-2026-001",
        title="Multi-Vehicle Collision near Hebbal Junction",
        location="Hebbal Flyover, North Corridor",
        zone_id="ZONE_NORTH",
        severity=AlertSeverity.CRITICAL,
        category=AlertCategory.ACCIDENT,
        description="Collision blocking 2 center lanes. Emergency services dispatched. Expect heavy gridlock.",
        estimated_delay_mins=35,
        is_resolved=False,
        reported_at=datetime.utcnow()
    ),
    TrafficAlert(
        alert_id="ALT-2026-002",
        title="Traffic Signal Controller Failure at Silk Board",
        location="Central Silk Board Junction",
        zone_id="ZONE_SOUTH",
        severity=AlertSeverity.HIGH,
        category=AlertCategory.SIGNAL_FAILURE,
        description="Signal lights operating on yellow flashing. Traffic personnel directing manual flow.",
        estimated_delay_mins=20,
        is_resolved=False,
        reported_at=datetime.utcnow()
    ),
    TrafficAlert(
        alert_id="ALT-2026-003",
        title="Metro Construction Lane Restriction",
        location="Outer Ring Road - Marathahalli",
        zone_id="ZONE_EAST",
        severity=AlertSeverity.MODERATE,
        category=AlertCategory.CONSTRUCTION,
        description="Single lane narrowed for pillar casting work. Moderate slowdown observed.",
        estimated_delay_mins=12,
        is_resolved=False,
        reported_at=datetime.utcnow()
    ),
    TrafficAlert(
        alert_id="ALT-2026-004",
        title="Monsoon Waterlogging Warning",
        location="M.G. Road Underpass",
        zone_id="ZONE_CENTRAL",
        severity=AlertSeverity.INFO,
        category=AlertCategory.WEATHER,
        description="Water accumulation reduced traffic speed to 15 km/h. Pumps deployed.",
        estimated_delay_mins=8,
        is_resolved=True,
        reported_at=datetime.utcnow()
    )
]


@router.get("", response_model=List[TrafficAlert])
def get_all_alerts():
    """
    Get all active and recent traffic alerts.
    """
    return MOCK_ALERTS


@router.post("", response_model=TrafficAlert)
def create_alert(payload: AlertCreate):
    """
    Broadcast a new emergency or traffic incident alert.
    """
    new_id = f"ALT-2026-00{len(MOCK_ALERTS) + 1}"
    alert = TrafficAlert(
        alert_id=new_id,
        title=payload.title,
        location=payload.location,
        zone_id=payload.zone_id,
        severity=payload.severity,
        category=payload.category,
        description=payload.description,
        estimated_delay_mins=payload.estimated_delay_mins,
        is_resolved=False,
        reported_at=datetime.utcnow()
    )
    MOCK_ALERTS.insert(0, alert)
    return alert


@router.patch("/{alert_id}/resolve", response_model=TrafficAlert)
def resolve_alert(alert_id: str):
    """
    Mark an active traffic alert as resolved.
    """
    for alert in MOCK_ALERTS:
        if alert.alert_id == alert_id:
            alert.is_resolved = True
            return alert
    raise HTTPException(status_code=404, detail="Alert ID not found")
