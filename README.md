# TrafficVision AI: Smart Traffic Prediction & Congestion Management System

![TrafficVision AI Architecture](docs/architecture_and_schema.md)

**TrafficVision AI** is an advanced AI-powered urban traffic monitoring, congestion prediction, and route optimization platform. Designed for smart city traffic departments, transportation authorities, and urban mobility managers, it ingests high-frequency IoT sensor telemetry to forecast traffic bottlenecks, estimate trip delays, and recommend eco-friendly alternate routes.

---

## 📅 Week-Wise Milestone Roadmap

The project is structured into **8 Weeks (4 Milestones)** as outlined below:

### 🟢 Milestone 1: Week 1 & 2 — Project Initialization, System Architecture & Core Setup
- **Objectives & Architecture**: Defined system boundaries, microservices topology, and database schemas (PostgreSQL for users/roles, MongoDB for sensor telemetry, Redis for real-time cache).
- **Landing Page & Authentication**: Implemented enterprise `LandingPage` with role-based authentication (`POST /api/v1/auth/login`), registration (`POST /api/v1/auth/register`), and 1-click Quick Demo logins for `ADMIN`, `OPERATOR`, and `COMMUTER`.
- **Role-Based Access Control (RBAC)**: Customized dashboard navigation tab visibility and feature permissions per role.
- **Live Monitoring Dashboard**: Built live vehicle density heatmap viewport, key system metrics bar, and road segment log tables.


### 🟡 Milestone 2: Week 3 & 4 — Traffic Prediction & Route Optimization *(Current Status: Implemented)*
- **Traffic Prediction Module**: Developed time-series AI congestion forecasting model endpoints (`/api/v1/traffic/predictions`) to predict hourly vehicle speeds, vehicle volume, peak-hour bottlenecks, and AI confidence scores.
- **Route Optimization & Travel Estimation**: Implemented smart route calculator endpoints (`/api/v1/routes/optimize`) computing primary vs. alternate eco-bypass routes, travel delay penalties, fuel efficiency scores, and CO2 savings.
- **Interactive UI Components**: Created `AIForecasting` and `RouteOptimizer` React components featuring interactive corridor selectors, timeline bar visualizers, origin-destination route cards, and segment-by-segment road condition breakdowns.

### 🔵 Milestone 3: Week 5 & 6 — Smart Alerts, Analytics & AI Insights *(Current Status: Implemented)*
- **Smart Alert System**: Incident reporting, emergency traffic notifications, accident delay warnings, and automated alert broadcast & resolution workflow (`/api/v1/alerts`).
- **Analytics & Heatmaps**: City-wide congestion heatmap matrix, 24-hour peak vehicle load curves, road performance leaderboard, and PDF/CSV report exports (`/api/v1/analytics/overview`).
- **Interactive UI Components**: Developed `AlertsManager` and `AnalyticsDashboard` React components with severity filtering, incident creation modals, zone density heatmaps, and leaderboard cards.


### 🟣 Milestone 4: Week 7 & 8 — Testing, Dockerization & Cloud Deployment *(Upcoming)*
- **End-to-End Testing**: Unit, integration, and load testing for high-throughput sensor streams.
- **Containerization**: Docker Compose configuration for React Frontend, FastAPI Engine, Express Gateway, PostgreSQL, MongoDB, and Redis.
- **Cloud Deployment**: Deployment scripts and guides for AWS / Azure cloud hosting.

---

## 🏗️ Architecture & Database Specs

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

## 🔌 API Endpoints Summary

| Service | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/v1/health` | Service status and readiness check |
| **Traffic** | `GET` | `/api/v1/traffic/status` | Real-time vehicle density & active sensor overview |
| **Prediction** | `GET` | `/api/v1/traffic/predictions` | Hourly speed predictions, peak warnings & bottleneck risk |
| **Routes** | `POST` | `/api/v1/routes/optimize` | Calculates primary & alternate eco-routes with delay estimates |

---

## 🚀 Quickstart & Setup Guide

### 1. Frontend Setup (React.js)
```bash
cd frontend
npm install
npm run dev
```
The React frontend will start at `http://localhost:5173`.

### 2. Express Gateway Backend (Node.js)
```bash
cd backend
npm install
npm start
```
The Express server will start on port `2001`.

### 3. FastAPI Core AI Backend (Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
FastAPI documentation will be available at `http://localhost:8000/docs`.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Vanilla CSS (Together AI Design Tokens), Lucide Icons
- **Backend Core**: Python 3.11, FastAPI, Pydantic v2, Uvicorn
- **API Gateway**: Node.js, Express.js, CORS
- **Databases**: PostgreSQL (Relational/Auth), MongoDB (Telemetry Documents), Redis (Caching)
- **AI/ML Libraries**: Scikit-Learn, Pandas, NumPy, TensorFlow / PyTorch
