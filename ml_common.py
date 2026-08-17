#!/usr/bin/env python3
"""
TrafficVision AI - Shared ML feature engineering & corridor metadata.

Single source of truth for the feature vector used by both the training
pipeline (train_bengaluru_model.py) and the live FastAPI inference endpoint
(backend/app/api/prediction.py), so training and serving can never drift
apart.
"""

FEATURE_NAMES = [
    "hour",
    "day_of_week",
    "vehicle_count",
    "historical_avg_speed_kmh",
    "is_tech_corridor",
    "rain_factor",
    "is_tech_peak",
    "density_ratio",
    "is_weekend",
]

ROAD_CAPACITY = 850.0

BENGALURU_CORRIDORS = [
    {"corridor_id": "CORRIDOR_SILK_BOARD", "corridor": "Central Silk Board Junction", "zone": "BLR_SOUTH", "normal_speed": 18.0, "is_tech_corridor": 1},
    {"corridor_id": "CORRIDOR_HEBBAL_FLYOVER", "corridor": "Hebbal Flyover to Airport Expressway", "zone": "BLR_NORTH", "normal_speed": 35.0, "is_tech_corridor": 0},
    {"corridor_id": "CORRIDOR_ORR_BELLANDUR", "corridor": "Outer Ring Road (Marathahalli - Bellandur)", "zone": "BLR_EAST", "normal_speed": 20.0, "is_tech_corridor": 1},
    {"corridor_id": "CORRIDOR_TIN_FACTORY", "corridor": "Tin Factory & K.R. Puram Junction", "zone": "BLR_EAST", "normal_speed": 12.0, "is_tech_corridor": 1},
    {"corridor_id": "CORRIDOR_MG_ROAD", "corridor": "M.G. Road & Trinity Circle Corridor", "zone": "BLR_CENTRAL", "normal_speed": 22.0, "is_tech_corridor": 0},
    {"corridor_id": "CORRIDOR_WHITEFIELD", "corridor": "Whitefield ITPB Main Road", "zone": "BLR_EAST", "normal_speed": 16.0, "is_tech_corridor": 1},
    {"corridor_id": "CORRIDOR_GORAGUNTEPALYA", "corridor": "Goraguntepalya Tumkur Road Junction", "zone": "BLR_WEST", "normal_speed": 24.0, "is_tech_corridor": 0},
    {"corridor_id": "CORRIDOR_ELECTRONIC_CITY", "corridor": "Electronic City Elevated Expressway", "zone": "BLR_SOUTH", "normal_speed": 48.0, "is_tech_corridor": 1},
]

CORRIDORS_BY_ID = {c["corridor_id"]: c for c in BENGALURU_CORRIDORS}


def is_tech_peak_hour(hour):
    return 1.0 if ((8 <= hour <= 11) or (17 <= hour <= 21)) else 0.0


def build_feature_row(hour, day_of_week, vehicle_count, historical_avg_speed_kmh, is_tech_corridor, rain_factor):
    """Builds the 9-feature vector, in FEATURE_NAMES order, for one (corridor, hour) sample.

    Tree-based models (GBDT) learn feature interactions natively, so unlike a
    linear model this does NOT need hand-built interaction terms (e.g.
    hour * is_tech_corridor) - the trees discover those splits on their own.
    """
    is_tech_peak = is_tech_peak_hour(hour)
    density_ratio = vehicle_count / ROAD_CAPACITY
    is_weekend = 1.0 if day_of_week >= 5 else 0.0
    return [
        hour,
        day_of_week,
        vehicle_count,
        historical_avg_speed_kmh,
        is_tech_corridor,
        rain_factor,
        is_tech_peak,
        density_ratio,
        is_weekend,
    ]


def congestion_level_from_speed(speed_kmh):
    if speed_kmh < 10.0:
        return "SEVERE"
    if speed_kmh < 20.0:
        return "HEAVY"
    if speed_kmh < 30.0:
        return "MODERATE"
    return "LOW"
