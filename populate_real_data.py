#!/usr/bin/env python3
"""
TrafficVision AI - Indian City Real Data Ingestor
Reads Indian metro traffic dataset CSVs and populates the Neon PostgreSQL database.
"""
import csv
import json
import urllib.request
import urllib.parse
import os
import time

API_URL = "http://localhost:2001/api/v1/traffic/telemetry"
CSV_PATH = "indian_city_traffic_data.csv"

def populate_database():
    if not os.path.exists(CSV_PATH):
        print(f"⚠️ {CSV_PATH} not found. Running dataset generator...")
        import train_traffic_model
        train_traffic_model.generate_indian_city_dataset()

    print(f"📥 Ingesting Indian Metro Traffic Dataset from '{CSV_PATH}'...")
    count = 0

    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            corridor = row.get("corridor", "M.G. Road Corridor")
            zone = row.get("zone", "ZONE_CENTRAL")
            city = row.get("city", "Bengaluru")
            sensor_id = f"SN-{zone}-{idx % 20 + 1:02d}"
            
            speed = float(row.get("target_speed_kmh", 20.0))
            vehicles = int(float(row.get("vehicle_count", 180)))

            if speed < 12.0:
                level = "SEVERE"
            elif speed < 22.0:
                level = "HEAVY"
            elif speed < 32.0:
                level = "MODERATE"
            else:
                level = "LOW"

            payload = {
                "sensor_id": sensor_id,
                "road_name": f"{corridor} ({city})",
                "zone_id": zone,
                "vehicle_count": vehicles,
                "avg_speed_kmh": round(speed, 1),
                "congestion_level": level
            }

            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                API_URL,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )

            try:
                with urllib.request.urlopen(req) as res:
                    if res.status == 201:
                        count += 1
                        if count % 100 == 0:
                            print(f"  🇮🇳 Ingested {count} Indian city sensor records into database...")
            except Exception as e:
                print(f"❌ Ingestion error at row {idx}: {e}")
                time.sleep(0.5)

    print(f"\n✨ Indian City Database Ingestion Complete!")
    print(f"📊 Successfully populated {count} real Indian metro corridor records into TrafficVision AI.")

if __name__ == "__main__":
    populate_database()
