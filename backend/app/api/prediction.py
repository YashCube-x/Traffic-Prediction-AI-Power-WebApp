import json
import os
import sys
from datetime import datetime
from typing import List, Optional

import joblib
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.models.schemas import (
    TrafficPredictionResponse,
    HourlyForecastPoint,
    CongestionLevel,
)

# ml_common.py lives at the repo root and is shared with train_bengaluru_model.py
# so training and serving can never use mismatched feature engineering.
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from ml_common import BENGALURU_CORRIDORS, CORRIDORS_BY_ID, build_feature_row, congestion_level_from_speed  # noqa: E402

router = APIRouter(prefix="/traffic", tags=["AI Prediction & Forecasting"])

MODEL_PATH = os.path.join(ROOT_DIR, "backend", "app", "ml", "bengaluru_gbdt_model.joblib")
METADATA_PATH = os.path.join(ROOT_DIR, "bengaluru_traffic_model.json")

_model = None
_metadata = None

RECOMMENDATION_TEMPLATES = {
    ("SEVERE", 1): [
        "Reroute non-essential commercial traffic away from this tech corridor immediately.",
        "Extend green signal timing at the nearest junction to clear the queue backlog.",
    ],
    ("SEVERE", 0): [
        "Deploy traffic marshals to manually regulate the junction until flow recovers.",
        "Broadcast an alternate-route advisory to commuters approaching this corridor.",
    ],
    ("HEAVY", 1): [
        "Activate the eco-bypass service lane for shuttle and cab traffic.",
        "Recommend a 10-15 minute departure delay to avoid the approaching peak.",
    ],
    ("HEAVY", 0): [
        "Monitor for escalation; pre-position a traffic marshal at the main junction.",
    ],
    ("MODERATE", 1): [
        "No intervention required yet; continue monitoring corridor vehicle density.",
    ],
    ("MODERATE", 0): [
        "Traffic flowing within normal bounds for this hour.",
    ],
    ("LOW", 1): [
        "Corridor is clear; no action needed.",
    ],
    ("LOW", 0): [
        "Corridor is clear; no action needed.",
    ],
}


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(
                status_code=503,
                detail="Trained model not found. Run `python3 train_bengaluru_model.py` from the repo root first.",
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def get_metadata():
    global _metadata
    if _metadata is None and os.path.exists(METADATA_PATH):
        with open(METADATA_PATH) as f:
            _metadata = json.load(f)
    return _metadata or {}


def _confidence_score():
    mae = get_metadata().get("mae_kmh", 5.0)
    return round(max(0.5, min(0.99, 1 - mae / 25.0)), 2)


def _recommendations_for(congestion_risk, is_tech_corridor):
    return RECOMMENDATION_TEMPLATES.get(
        (congestion_risk, is_tech_corridor), ["Continue monitoring corridor telemetry."]
    )


def _estimate_vehicle_count(corridor_id, hour):
    profile = get_metadata().get("hourly_vehicle_profile", {}).get(corridor_id)
    if profile and 0 <= hour < len(profile):
        return profile[hour]
    return 250.0


def _predict_speed(corridor, hour, day_of_week, vehicle_count, rain_factor):
    features = build_feature_row(
        hour=hour,
        day_of_week=day_of_week,
        vehicle_count=vehicle_count,
        historical_avg_speed_kmh=corridor["normal_speed"],
        is_tech_corridor=corridor["is_tech_corridor"],
        rain_factor=rain_factor,
    )
    predicted_speed = float(get_model().predict([features])[0])
    return max(2.0, predicted_speed)


def _forecast_point(corridor, hour, day_of_week, rain_factor):
    vehicle_count = _estimate_vehicle_count(corridor["corridor_id"], hour)
    predicted_speed = _predict_speed(corridor, hour, day_of_week, vehicle_count, rain_factor)
    congestion_risk = congestion_level_from_speed(predicted_speed)
    bottleneck_probability = round(
        max(0.0, min(1.0, (corridor["normal_speed"] - predicted_speed) / corridor["normal_speed"])), 2
    )
    return HourlyForecastPoint(
        time_label=datetime.strptime(f"{hour:02d}", "%H").strftime("%I:%M %p"),
        predicted_speed_kmh=round(predicted_speed, 1),
        predicted_vehicle_count=int(vehicle_count),
        congestion_risk=congestion_risk,
        bottleneck_probability=bottleneck_probability,
    )


def _forecast_corridor_response(corridor, anchor_hour, day_of_week, rain_factor):
    timeline = [
        _forecast_point(corridor, (anchor_hour + offset) % 24, day_of_week, rain_factor)
        for offset in range(5)
    ]
    worst_point = min(timeline, key=lambda p: p.predicted_speed_kmh)
    peak_hour_warning = worst_point.congestion_risk in (CongestionLevel.HEAVY, CongestionLevel.SEVERE)

    return TrafficPredictionResponse(
        corridor_id=corridor["corridor_id"],
        corridor_name=corridor["corridor"],
        current_status=timeline[0].congestion_risk,
        peak_hour_warning=peak_hour_warning,
        estimated_peak_start=worst_point.time_label if peak_hour_warning else None,
        ai_confidence_score=_confidence_score(),
        forecast_timeline=timeline,
        recommendations=_recommendations_for(worst_point.congestion_risk, corridor["is_tech_corridor"]),
    )


@router.get("/predictions", response_model=List[TrafficPredictionResponse])
def get_traffic_predictions(rain: bool = Query(False, description="Simulate monsoon rain conditions")):
    """
    Live AI-forecasted traffic predictions for major Bengaluru corridors,
    computed per request from the trained GradientBoostingRegressor model.
    See bengaluru_traffic_model.json (repo root) for training metrics.
    """
    now = datetime.now()
    rain_factor = 0.5 if rain else 1.0
    return [
        _forecast_corridor_response(corridor, now.hour, now.weekday(), rain_factor)
        for corridor in BENGALURU_CORRIDORS
    ]


class PredictionQuery(BaseModel):
    corridor_id: str
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    rain: bool = False


@router.post("/predict", response_model=TrafficPredictionResponse)
def predict_corridor(query: PredictionQuery):
    """
    On-demand single-corridor prediction for an arbitrary hour/day, so the
    model can be queried live instead of only viewing the rolling 5-hour
    forecast anchored to the current server time.
    """
    corridor = CORRIDORS_BY_ID.get(query.corridor_id)
    if corridor is None:
        raise HTTPException(status_code=404, detail=f"Unknown corridor_id '{query.corridor_id}'")

    now = datetime.now()
    hour = query.hour if query.hour is not None else now.hour
    day_of_week = query.day_of_week if query.day_of_week is not None else now.weekday()
    rain_factor = 0.5 if query.rain else 1.0

    return _forecast_corridor_response(corridor, hour, day_of_week, rain_factor)
