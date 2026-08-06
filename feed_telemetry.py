#!/usr/bin/env python3
import requests
import random
import time

API_URL = "http://localhost:2001/api/v1/traffic/telemetry"

SENSORS = [
    {"sensor_id": "SN-CENTRAL-01", "road_name": "M.G. Road", "zone_id": "ZONE_CENTRAL"},
    {"sensor_id": "SN-NORTH-04", "road_name": "Hebbal Flyover", "zone_id": "ZONE_NORTH"},
    {"sensor_id": "SN-SOUTH-02", "road_name": "Silk Board Junction", "zone_id": "ZONE_SOUTH"},
    {"sensor_id": "SN-EAST-08", "road_name": "Indiranagar 100ft Rd", "zone_id": "ZONE_EAST"},
    {"sensor_id": "SN-WEST-12", "road_name": "Rajajinagar Main Rd", "zone_id": "ZONE_WEST"},
]

CONGESTION_LEVELS = ["LOW", "MODERATE", "HEAVY", "SEVERE"]

print("⚡ Starting IoT Sensor Telemetry Simulator...")
print(f"📡 Sending live feeds to {API_URL}\n")

while True:
    sensor = random.choice(SENSORS)
    speed = round(random.uniform(8.0, 55.0), 1)
    vehicles = random.randint(40, 260)
    
    if speed < 15.0:
        level = "SEVERE"
    elif speed < 25.0:
        level = "HEAVY"
    elif speed < 35.0:
        level = "MODERATE"
    else:
        level = "LOW"

    payload = {
        "sensor_id": sensor["sensor_id"],
        "road_name": sensor["road_name"],
        "zone_id": sensor["zone_id"],
        "vehicle_count": vehicles,
        "avg_speed_kmh": speed,
        "congestion_level": level
    }

    try:
        res = requests.post(API_URL, json=payload)
        if res.status_code == 201:
            print(f"✅ Feed sent: {sensor['sensor_id']} ({sensor['road_name']}) -> {speed} km/h [{level}] ({vehicles} vh)")
        else:
            print(f"⚠️ Error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"❌ Failed to reach server: {e}")

    time.sleep(3)
