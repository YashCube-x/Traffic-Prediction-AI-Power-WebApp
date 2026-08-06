from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.models import user
from app.api import health, auth, traffic, prediction, route_opt, alerts, analytics

# Auto-create tables in Neon DB on startup
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Neon PostgreSQL database tables verified/created successfully.")
except Exception as e:
    print(f"⚠️ Warning: Could not create tables on startup: {e}")

app = FastAPI(
    title="TrafficVision AI - Core API",
    description="AI-powered Smart Traffic Prediction & Congestion Management Backend API",
    version="1.0.0",
)

# Configure CORS for Frontend React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(traffic.router, prefix="/api/v1")
app.include_router(prediction.router, prefix="/api/v1")
app.include_router(route_opt.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")





@app.get("/")
def root():
    return {
        "message": "Welcome to TrafficVision AI API Gateway",
        "documentation": "/docs",
        "health_check": "/api/v1/health"
    }
