# 🚦 TrafficVision AI — Smart Traffic Prediction & Congestion Management System

> **Milestone 1 (Week 1 & Week 2) Deliverables — System Architecture, Authentication Infrastructure & Live Telemetry Dashboard**

---

## 📌 Executive Summary

**TrafficVision AI** is an enterprise-grade AI-powered urban traffic monitoring and congestion management platform engineered for smart city traffic authorities and urban planners. During **Week 1 & Week 2**, the core foundation of the platform was successfully designed, architected, and built—encompassing a microservices topology, role-based authentication, live IoT telemetry monitoring, and a state-of-the-art dashboard interface.

---

## 🎯 Week 1 & Week 2 Completed Milestones

### 🟢 Week 1: System Architecture, Microservices & Database Schema Design
- **Microservices Topology**: Designed a scalable 3-tier architecture consisting of a React.js (Vite) Frontend, Express API Gateway, and FastAPI Core AI Service.
- **Dual-Database Strategy**:
  - **PostgreSQL**: Relational schema handling User Authentication, Role-Based Access Control (RBAC), and Audit Logs.
  - **MongoDB**: High-throughput document store configured for IoT sensor telemetry and vehicle count time-series data.
  - **Redis Cache**: Sub-millisecond caching layer for real-time sensor readouts.
- **Security & Authorization**: Established JWT token-based authentication standards and password hashing pipeline (`bcrypt` / `Passlib`).

### 🟢 Week 2: Enterprise UI, Role-Based Authentication & Live Monitoring Dashboard
- **Together AI Design Language**: Implemented a modern dark-mode glassmorphic design system using CSS variables, custom typography, smooth micro-animations, and responsive viewports.
- **Role-Based Access Control (RBAC)**:
  - **Admin / Traffic Controller**: Full platform access, sensor configuration, system-wide alerts, and administrative metrics.
  - **Field Operator**: Operational live status monitoring, segment logs, and field incident reporting.
  - **City Commuter**: High-level traffic overview and eco-route viewports.
- **1-Click Quick Demo Login**: Built interactive login modals with direct 1-click preset authentication for testing all three roles (`ADMIN`, `OPERATOR`, `COMMUTER`).
- **Live Traffic Monitoring Dashboard**:
  - Real-time IoT sensor telemetry metrics bar (Active Sensors, Congestion Index, Avg City Speed, Incident Status).
  - Corridor Traffic Density viewport with status indicators (Low, Moderate, Heavy, Severe).
  - Live Road Segment telemetry log table with status filtering.

---

## 🏗️ System Architecture & Data Flow

```
                           +-----------------------------------+
                           |    React.js Frontend Dashboard    |
                           |   (Together AI Design System)     |
                           +-----------------+-----------------+
                                             |
                                     (HTTP / REST / JWT)
                                             |
                                             v
                           +-----------------------------------+
                           |       Express API Gateway         |
                           |    (Port 2001 - Routing & Auth)   |
                           +-----------------+-----------------+
                                             |
                  +--------------------------+--------------------------+
                  |                                                     |
                  v                                                     v
+-----------------------------------+                 +-----------------------------------+
|      FastAPI Backend Engine       |                 |       PostgreSQL / MongoDB        |
|    (Port 8000 - Telemetry & Auth) |                 |     (User RBAC & Telemetry DB)    |
+-----------------------------------+                 +-----------------------------------+
```

---

## 🔌 Milestone 1 Implemented API Endpoints

| Category | Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/v1/health` | Public | System status and service health check |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | User login & JWT token issuance |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | New user registration |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Fetch authenticated user profile & role |
| **Traffic** | `GET` | `/api/v1/traffic/status` | All Roles | Real-time vehicle density & active sensor telemetry |

---

## 🛠️ Technology Stack (Week 1 & 2)

- **Frontend**: React 18, Vite, Custom Vanilla CSS (Design Tokens, Glassmorphism), Lucide React Icons
- **API Gateway**: Node.js, Express.js, CORS, Middleware Auth
- **Core Backend**: Python 3.11, FastAPI, Pydantic v2, Uvicorn
- **Databases & Cache**: PostgreSQL (Relational/Auth), MongoDB (Telemetry Logs), Redis
- **Dev Tooling**: Python `pytest`, ESLint, Git

---

## 🚀 Quickstart & Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.11 or higher

### 2. Frontend Launch (React.js)
```bash
cd frontend
npm install
npm run dev
```
> The dashboard will be accessible at: `http://localhost:5173`

### 3. Backend API Gateway Launch (Node.js)
```bash
cd backend
npm install
npm start
```
> Express Gateway running at: `http://localhost:2001`

### 4. FastAPI Backend Engine Launch (Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
> Interactive Swagger API Documentation: `http://localhost:8000/docs`

---

## 📁 Repository Structure (Milestone 1)

```
Traffic_Prediction/
├── backend/
│   ├── app/
│   │   ├── api/          # REST Endpoint Routers (Auth, Health, Telemetry)
│   │   ├── core/         # Security, JWT & Hashing Utilities
│   │   ├── db/           # Database Connection Adapters
│   │   ├── models/       # Pydantic Schemas & Data Transfer Objects
│   │   └── main.py       # FastAPI Application Entrypoint
│   ├── src/              # Express API Gateway Services
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # LandingPage, Auth Modals, Live Monitoring Dashboard
│   │   ├── styles/       # Design System CSS (theme.css)
│   │   ├── App.jsx       # Main App Component & RBAC Router
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 📋 Deliverable Verification Checklist (Week 1 & 2)

- [x] Project Repository & Microservices Structure Initialized
- [x] Database Schemas & Microservice Topology Designed
- [x] JWT Authentication & Role-Based Access Control (RBAC) Implemented
- [x] Glassmorphic Enterprise Landing Page & Quick-Demo Logins Built
- [x] Real-time Traffic Telemetry & Corridor Density Dashboard Developed
- [x] API Health & Telemetry Endpoints Operational
