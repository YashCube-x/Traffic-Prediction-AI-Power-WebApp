#!/usr/bin/env python3
"""
TrafficVision AI - Bengaluru Mobility AI Model Trainer.

Trains a real scikit-learn Gradient Boosted Decision Tree regressor on the
simulated Bengaluru corridor dataset and saves it for the FastAPI inference
endpoint (backend/app/api/prediction.py) to load and query per request.
"""
import csv
import json
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT_DIR)
from ml_common import FEATURE_NAMES, build_feature_row, CORRIDORS_BY_ID  # noqa: E402

CSV_PATH = os.path.join(ROOT_DIR, "bengaluru_traffic_data.csv")
MODEL_OUTPUT = os.path.join(ROOT_DIR, "bengaluru_traffic_model.json")
MODEL_WEIGHTS_PATH = os.path.join(ROOT_DIR, "backend", "app", "ml", "bengaluru_gbdt_model.joblib")

DEFAULT_VEHICLE_COUNT = 250.0


def load_dataset():
    if not os.path.exists(CSV_PATH):
        import generate_bengaluru_dataset
        generate_bengaluru_dataset.generate_bengaluru_dataset()

    X, y, corridor_names, hours = [], [], [], []
    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            hour = float(row["hour"])
            day = float(row["day_of_week"])
            vehicles = float(row["vehicle_count"])
            hist_speed = float(row["historical_avg_speed_kmh"])
            is_tech = float(row["is_tech_corridor"])
            rain = float(row["rain_factor"])
            target = float(row["target_speed_kmh"])

            X.append(build_feature_row(hour, day, vehicles, hist_speed, is_tech, rain))
            y.append(target)
            corridor_names.append(row["corridor"])
            hours.append(int(hour))

    return np.array(X), np.array(y), corridor_names, hours


def build_hourly_vehicle_profile(corridor_names, hours, vehicle_counts):
    """Average observed vehicle_count per (corridor, hour) in the training
    data. The live inference endpoint uses this - not a hardcoded curve - to
    estimate a realistic vehicle_count input for hours without a live sensor
    reading."""
    sums, counts = {}, {}
    for corridor_name, hour, vehicles in zip(corridor_names, hours, vehicle_counts):
        key = (corridor_name, hour)
        sums[key] = sums.get(key, 0.0) + vehicles
        counts[key] = counts.get(key, 0) + 1

    profile = {}
    for corridor_id, meta in CORRIDORS_BY_ID.items():
        corridor_name = meta["corridor"]
        hourly = []
        for h in range(24):
            key = (corridor_name, h)
            if key in counts:
                hourly.append(round(sums[key] / counts[key], 1))
            else:
                hourly.append(DEFAULT_VEHICLE_COUNT)
        profile[corridor_id] = hourly
    return profile


def train_bengaluru_model():
    print(f"Loading Bengaluru mobility dataset from '{CSV_PATH}'...")
    X, y, corridor_names, hours = load_dataset()
    vehicle_counts = X[:, FEATURE_NAMES.index("vehicle_count")]

    print(f"Loaded {len(X)} records with {len(FEATURE_NAMES)} engineered features: {FEATURE_NAMES}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    print("Training GradientBoostingRegressor (scikit-learn GBDT, 400 estimators)...")
    model = GradientBoostingRegressor(
        n_estimators=400,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds) ** 0.5
    r2 = r2_score(y_test, preds)

    print("\nBengaluru AI Model Performance Metrics (held-out 20% test split):")
    print(f"  MAE  : {mae:.2f} km/h")
    print(f"  RMSE : {rmse:.2f} km/h")
    print(f"  R^2  : {r2 * 100:.2f}%")

    os.makedirs(os.path.dirname(MODEL_WEIGHTS_PATH), exist_ok=True)
    joblib.dump(model, MODEL_WEIGHTS_PATH)
    print(f"Trained model saved to '{MODEL_WEIGHTS_PATH}'")

    hourly_vehicle_profile = build_hourly_vehicle_profile(corridor_names, hours, vehicle_counts)

    feature_importances = {
        name: round(float(imp), 4)
        for name, imp in sorted(
            zip(FEATURE_NAMES, model.feature_importances_), key=lambda kv: -kv[1]
        )
    }

    model_metadata = {
        "model_name": "TrafficVision AI - Bengaluru Urban Mobility Forecaster",
        "model_type": "GradientBoostingRegressor (scikit-learn)",
        "target_city": "Bengaluru",
        "dataset_file": "bengaluru_traffic_data.csv",
        "dataset_note": "Simulated corridor telemetry (see generate_bengaluru_dataset.py), not live sensor data.",
        "total_records": len(X),
        "test_split_size": len(X_test),
        "mae_kmh": round(mae, 2),
        "rmse_kmh": round(rmse, 2),
        "accuracy_r2": f"{r2 * 100:.2f}%",
        "feature_names": FEATURE_NAMES,
        "feature_importances": feature_importances,
        "hourly_vehicle_profile": hourly_vehicle_profile,
        "key_bengaluru_corridors": [c["corridor"] for c in CORRIDORS_BY_ID.values()],
    }

    with open(MODEL_OUTPUT, "w") as f:
        json.dump(model_metadata, f, indent=2)

    print(f"Model metadata saved to '{MODEL_OUTPUT}'")


if __name__ == "__main__":
    train_bengaluru_model()
