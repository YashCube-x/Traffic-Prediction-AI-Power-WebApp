# 🚦 TrafficVision AI — Namma Bengaluru Urban Mobility System

> **Enterprise AI-Powered Traffic Prediction, Live GIS Route Optimization & Incident Command Platform**

---

## 📌 Executive Summary

**TrafficVision AI** is an enterprise-grade, AI-driven urban traffic prediction and congestion optimization platform designed specifically for **Namma Bengaluru Urban Mobility**. By ingesting high-frequency IoT telemetry and real-time corridor metrics across major Bengaluru choke points (*Silk Board, Hebbal Flyover, Bellandur Outer Ring Road, Whitefield ITPB, M.G. Road, etc.*), TrafficVision AI delivers hyper-accurate travel time estimates, interactive GIS route optimization, and proactive incident command dispatch.

---

## 🏆 Project Milestones Status (Milestones 1-4 Completed)

```
[ MILESTONE 1: ARCHITECTURE & RBAC UI ] ➔ [ MILESTONE 2: BENGALURU AI ENGINE ] ➔ [ MILESTONE 3: SPLIT-SCREEN GIS ROUTER ] ➔ [ MILESTONE 4: INCIDENT COMMAND & ALERTS ]
             🟢 COMPLETED                             🟢 COMPLETED                             🟢 COMPLETED                             🟢 COMPLETED
```

### 🟢 Milestone 1: Platform Topology, Microservices & RBAC UI System
- **Microservices Topology**: Designed a scalable 3-tier architecture (React Vite Frontend + Express API Gateway + Python AI Engine).
- **Role-Based Access Control (RBAC)**:
  - **System Administrator (`admin@trafficvision.ai`)**: Full platform control, model retraining, and node configuration.
  - **Traffic Operator (`operator@trafficvision.ai`)**: Real-time incident command logging, alert broadcasts, and resolution dispatch.
  - **City Commuter (`user@trafficvision.ai`)**: Live GIS route optimization, instant hover ETA, and public emergency warning alerts.
- **Theme Design System**: Flexible Light & Dark mode engine with custom CSS tokens, smooth transitions, and frosted glassmorphism elements.
- **Sticky Fixed Navbar**: Permanently pinned top navigation header (`position: sticky; top: 0; z-index: 1000`) with glassmorphism blur (`backdrop-filter: blur(12px)`).

---

### 🟢 Milestone 2: AI Forecasting Engine & Feature Engineering
- **Bengaluru Mobility Dataset**: 3,500 simulated corridor telemetry records across 8 key Bengaluru choke points (see `generate_bengaluru_dataset.py` — this is a synthetic dataset, not live sensor data; treat accuracy numbers below as a validation of the pipeline, not a real-world benchmark).
- **Algorithm Architecture**: **`GradientBoostingRegressor` (scikit-learn)** — a real Gradient Boosted Decision Tree ensemble (400 estimators, depth 3), trained in [`train_bengaluru_model.py`](train_bengaluru_model.py). Unlike a linear model, GBDTs learn feature interactions (e.g. rain × peak-hour × corridor-type) natively, without hand-built interaction terms.
- **9 Engineered Features** (shared between training and live inference via [`ml_common.py`](ml_common.py)):
  1. `hour` (0-23)
  2. `day_of_week` (0-6)
  3. `vehicle_count`
  4. `historical_avg_speed_kmh`
  5. `is_tech_corridor`
  6. `rain_factor`
  7. `is_tech_peak` (IT Corridor Peak Hours 8-11 AM & 5-9 PM)
  8. `density_ratio` (vehicle count ÷ road capacity)
  9. `is_weekend`
- **Trained Model Performance Metrics** (held-out 20% test split, `random_state=42`):
  - 📈 **MAE**: **0.26 km/h**
  - 📉 **RMSE**: **0.33 km/h**
  - 🎯 **R² Variance Score**: **99.73%**
  - Re-run `python3 train_bengaluru_model.py` any time to regenerate these metrics from scratch.
- **Live Inference**: The FastAPI endpoint (`backend/app/api/prediction.py`) loads the trained model from `backend/app/ml/bengaluru_gbdt_model.joblib` and runs a real `model.predict()` per request — it does not return static/hardcoded data. The Express gateway proxies `/api/v1/traffic/predictions` and `/api/v1/traffic/predict` straight through to it.
- **Model Storage**: Trained model in `backend/app/ml/bengaluru_gbdt_model.joblib`; training metrics & the per-corridor hourly vehicle profile in `bengaluru_traffic_model.json`.

---

### 🟢 Milestone 3: Interactive GIS Route Optimizer & Split-Screen Viewport
- **3D Teardrop GPS Pin Markers**: Custom vector SVG 3D teardrop location pins (*Emerald Green START Pin* & *Crimson Red DESTINATION Pin*) with concentric ground ripple base rings and text badges.
- **Instant Hover Popover Tooltips (`mouseover`)**: Hovering over any route polyline instantly displays a floating popover showing `Distance: 19.7 km`, `ETA: 28 mins`, and Route Title without needing to click.
- **Browser-Style Taskbar Tabs & Split-Screen**: 50% left interactive GIS Leaflet OpenStreetMap viewport and 50% right route details panel featuring browser-style tabs (`[ Route 1 ★ RECOMMENDED ]`, `[ Route 2 ]`).
- **Single-Row Input Search Bar**: `ORIGIN POINT`, `DESTINATION POINT`, and `⚡ OPTIMIZE ROUTE` button aligned on one horizontal row with quick preset pills (`BLR`, `HYD`, `DEL`).

---

### 🟢 Milestone 4: Incident Control Command Center & Live Alerts
- **Operator Incident Command (`AlertsManager.jsx`)**: Real-time traffic incident logging (`+ Log New Traffic Incident`), severity filtering (`CRITICAL`, `HIGH`, `MODERATE`, `INFO`), and resolution status toggling (`✓ Mark Resolved`).
- **Public Emergency Alert Broadcast**: Active incidents generate a prominent red warning banner (`🚨 LIVE CITY TRAFFIC INCIDENT ALERT — +35 MINS DELAY`) at the top of the commuter Route Optimizer view.
- **Dynamic AI Rerouting**: Alerts and route optimization share one in-memory store (`backend/src/store/alertsStore.js`). When an operator logs an incident, `POST /api/v1/routes/optimize` matches it against the route's road names, adds the alert's real delay penalty, escalates that route's congestion level, and re-picks whichever route now has the lowest ETA — verified live end-to-end (log an incident on a corridor → route recalculates and tags `affected_by_incident`; resolve it → the route returns to baseline).
- **Fixed**: the documented demo `operator@trafficvision.ai` / `admin@trafficvision.ai` accounts could not actually log or resolve incidents — `verifyToken` was doing a Postgres lookup for accounts that only ever exist as JWT claims, never as DB rows, so every protected request 401'd with "User account not found." Demo accounts now authenticate straight from the token payload.
- **Descoped**: "multi-agency signal override" (physically controlling real traffic signal hardware) isn't achievable from a software-only student project and has been dropped rather than left as an unfulfillable claim.

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |    React.js Frontend Portal (Vite)   |
                                  |   (Glassmorphic & Sticky Top Navbar)  |
                                  +-------------------+-------------------+
                                                      |
                                              (HTTP / REST API)
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |       Express API Gateway            |
                                  |     (Port 2001 - Routing & Auth)      |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
       +-----------------------------------+                     +-----------------------------------+
       |     FastAPI / Python ML Engine    |    loads joblib     |  bengaluru_gbdt_model.joblib      |
       |  (Port 8000 - live model.predict) | <------------------ |  (scikit-learn GBDT, 400 trees)   |
       +-----------------------------------+                     +-----------------------------------+
```

---

## 🔌 API Endpoints Reference

| Category | Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/v1/health` | Public | System health check and online status |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | User authentication & JWT token issuance |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Fetch current user session & role |
| **Routes** | `POST` | `/api/v1/routes/optimize` | All Roles | Calculate AI optimal GIS route & travel time |
| **Prediction** | `GET` | `/api/v1/traffic/predictions` | All Roles | Live GBDT-model rolling 5-hour forecast for all corridors |
| **Prediction** | `POST` | `/api/v1/traffic/predict` | All Roles | On-demand GBDT-model prediction for a given corridor/hour/day |
| **Alerts** | `GET` | `/api/v1/alerts` | All Roles | Fetch live active city traffic incidents |
| **Alerts** | `POST` | `/api/v1/alerts` | Operator / Admin | Log new emergency traffic incident |
| **Alerts** | `PATCH` | `/api/v1/alerts/:id/resolve` | Operator / Admin | Mark traffic incident as resolved |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Leaflet GIS, Lucide React Icons, Custom Vanilla CSS (Design Tokens, Glassmorphism, Tailwind utilities)
- **Backend API**: Node.js, Express.js, CORS, Middleware JWT Auth
- **AI & ML Pipeline**: Python, scikit-learn (`GradientBoostingRegressor`), NumPy, joblib
- **Testing & Verification**: Playwright Automated UI Testing

---

## 🚀 Quickstart & Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.10 or higher

### 2. Unified One-Command Launch (Recommended)
From the root project directory:
```bash
python3 start.py
```
> Starts both Express API Gateway (Port 2001) and Vite React Frontend (Port 2000).

### 3. Manual Step-by-Step Launch

**Frontend (React Vite)**:
```bash
cd frontend
npm install
npm run dev
```
> Accessible at: `http://localhost:2000`

**Backend API Gateway (Express)**:
```bash
cd backend
npm install
npm start
```
> Accessible at: `http://localhost:2001`

**Python AI Engine (FastAPI)** — required for real (non-fallback) predictions:
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # or venv/Scripts/activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> Accessible at: `http://localhost:8000/docs`. The Express gateway proxies `/api/v1/traffic/predictions` and `/api/v1/traffic/predict` to this service — if it isn't running, those endpoints return `503` and the frontend falls back to static demo data.

**Train/Retrain the AI Model**:
```bash
python3 generate_bengaluru_dataset.py   # regenerate the simulated dataset
python3 train_bengaluru_model.py        # trains a real scikit-learn GBDT and saves it to backend/app/ml/
```

---

## 📁 Repository Structure

```
Traffic_Prediction/
├── bengaluru_traffic_data.csv        # 3,500 simulated Bengaluru telemetry records
├── bengaluru_traffic_model.json       # Training metrics, feature importances & hourly vehicle profile
├── ml_common.py                       # Shared feature engineering & corridor metadata (training + inference)
├── generate_bengaluru_dataset.py      # Telemetry dataset generator
├── train_bengaluru_model.py           # Trains the scikit-learn GBDT model
├── start.py                            # Unified application launcher
├── backend/
│   ├── app/
│   │   ├── ml/                         # bengaluru_gbdt_model.joblib (trained model, loaded at inference)
│   │   └── api/prediction.py           # Live model.predict() endpoint (GET /predictions, POST /predict)
│   ├── src/
│   │   ├── routes/                     # Express API routers (alerts, auth, prediction, routes)
│   │   └── index.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/                 # RouteOptimizer, AlertsManager, LandingPage, LoginPage
│   │   ├── styles/                     # theme.css design system
│   │   ├── App.jsx                     # Dashboard RBAC router & navigation
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 📋 Deliverable Verification Checklist

- [x] **Milestone 1**: System Architecture, Microservices Topology & Glassmorphic RBAC UI (100% Completed)
- [x] **Milestone 2**: 9-Feature scikit-learn GBDT Model Trained & Live-Served (MAE 0.26 km/h, $R^2$ 99.73% on held-out test split) (100% Completed)
- [x] **Milestone 3**: Interactive Leaflet GIS Map with 3D GPS Pins, Hover Tooltips & Browser Tabs (100% Completed)
- [x] **Milestone 4**: Incident Control Command Center with Live Incident Logging, User Warning Banner & Alert-Aware AI Rerouting (100% Completed)
