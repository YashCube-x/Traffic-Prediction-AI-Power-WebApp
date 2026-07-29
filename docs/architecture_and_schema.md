# TrafficVision AI - System Architecture & Database Schema Specification

## 1. Microservices Architecture Overview

TrafficVision AI is built on a microservices-oriented architecture to handle high-frequency traffic sensor streams, real-time telemetry processing, and AI model predictions.

```
                  +-----------------------------------+
                  |   React.js Frontend Dashboard     |
                  |  (Together AI Design Language)    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |         API Gateway               |
                  |  (Auth Verification & Routing)    |
                  +-----------------+-----------------+
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
        v                           v                           v
+---------------+           +---------------+           +---------------+
| Auth Service  |           | Traffic       |           | Route & AI    |
| (JWT / RBAC)  |           | Monitoring    |           | Prediction    |
+-------+-------+           +-------+-------+           +-------+-------+
        |                           |                           |
        v                           v                           v
+---------------+           +---------------+           +---------------+
| PostgreSQL    |           | MongoDB &     |           | ML Inference  |
| (Users & Roles|           | Redis Cache   |           | Engine        |
+---------------+           +---------------+           +---------------+
```

---

## 2. Database Schemas

### A. PostgreSQL Schema (Relational Data: Users & Auth)

#### Table: `users`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User login email |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `role` | VARCHAR(20) | NOT NULL | `ADMIN`, `OPERATOR`, or `COMMUTER` |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |

#### Table: `roles_permissions`
| Field | Type | Description |
| :--- | :--- | :--- |
| `role` | VARCHAR(20) | Role identifier |
| `permission` | VARCHAR(50) | Permission string (e.g. `traffic:read`, `alerts:trigger`, `admin:write`) |

---

### B. MongoDB Schema (Document Data: Real-Time Traffic & Sensor Telemetry)

#### Collection: `sensor_telemetry`
```json
{
  "_id": "ObjectId",
  "sensor_id": "SENSOR_MG_ROAD_01",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "road_name": "M.G. Road",
    "zone_id": "ZONE_CENTRAL"
  },
  "metrics": {
    "vehicle_count": 142,
    "avg_speed_kmh": 18.5,
    "occupancy_rate": 0.82,
    "congestion_level": "HEAVY"
  },
  "timestamp": "2026-07-24T14:30:00Z"
}
```

#### Collection: `congestion_events`
```json
{
  "_id": "ObjectId",
  "event_id": "EVT_20260724_001",
  "road_id": "ROAD_OUTER_RING_04",
  "severity": "CRITICAL",
  "description": "Heavy congestion detected near Flyover Junction",
  "estimated_delay_minutes": 25,
  "status": "ACTIVE",
  "created_at": "2026-07-24T14:15:00Z"
}
```

---

### C. Redis Caching Strategy

| Key Pattern | Data Structure | TTL | Description |
| :--- | :--- | :--- | :--- |
| `traffic:live:zone:{zone_id}` | JSON String | 30s | Cached real-time traffic status per zone |
| `user:session:{token_id}` | Hash | 24h | Active user session state & JWT invalidation blacklist |
| `prediction:latest:{road_id}` | JSON String | 5m | Short-term AI prediction cache |

---

## 3. Initial API Contracts (Phase 1)

### Auth Endpoints
* `POST /api/v1/auth/login` -> Returns JWT Token & User Profile
* `POST /api/v1/auth/register` -> User registration
* `GET /api/v1/auth/me` -> Current authenticated user info

### Traffic Monitoring Endpoints
* `GET /api/v1/health` -> System health & service readiness
* `GET /api/v1/traffic/status` -> Live vehicle density & road congestion overview
* `POST /api/v1/traffic/telemetry` -> Ingest sensor data stream
