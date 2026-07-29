from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    COMMUTER = "COMMUTER"


class CongestionLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HEAVY = "HEAVY"
    SEVERE = "SEVERE"


# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole = UserRole.COMMUTER


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# --- Traffic Sensor Telemetry Schemas ---
class Location(BaseModel):
    latitude: float
    longitude: float
    road_name: str
    zone_id: str


class TelemetryMetrics(BaseModel):
    vehicle_count: int = Field(ge=0, description="Total vehicle count in timeframe")
    avg_speed_kmh: float = Field(ge=0.0, description="Average vehicle speed in km/h")
    occupancy_rate: float = Field(ge=0.0, le=1.0, description="Road occupancy ratio")
    congestion_level: CongestionLevel


class SensorTelemetry(BaseModel):
    sensor_id: str
    location: Location
    metrics: TelemetryMetrics
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TrafficStatusSummary(BaseModel):
    total_active_sensors: int
    avg_city_speed_kmh: float
    active_congestion_alerts: int
    system_status: str
    recent_telemetry: List[SensorTelemetry]


# --- Milestone 2: Traffic Prediction & Forecasting Schemas ---
class HourlyForecastPoint(BaseModel):
    time_label: str  # e.g., "08:00 AM", "09:00 AM"
    predicted_speed_kmh: float
    predicted_vehicle_count: int
    congestion_risk: CongestionLevel
    bottleneck_probability: float  # 0.0 to 1.0


class TrafficPredictionResponse(BaseModel):
    corridor_id: str
    corridor_name: str
    current_status: CongestionLevel
    peak_hour_warning: bool
    estimated_peak_start: Optional[str] = None
    ai_confidence_score: float  # e.g. 0.94 (94%)
    forecast_timeline: List[HourlyForecastPoint]
    recommendations: List[str]


# --- Milestone 2: Route Optimization Schemas ---
class RouteOptimizeRequest(BaseModel):
    origin: str
    destination: str
    travel_mode: Optional[str] = "CAR"
    avoid_tolls: Optional[bool] = False


class RouteSegment(BaseModel):
    segment_name: str
    distance_km: float
    avg_speed_kmh: float
    congestion_level: CongestionLevel


class RouteOption(BaseModel):
    route_id: str
    title: str  # e.g., "Primary (Fastest Route)", "Alternate 1 (Eco-Route)"
    distance_km: float
    est_travel_time_mins: int
    delay_time_mins: int
    congestion_level: CongestionLevel
    fuel_efficiency_score: float  # e.g., 8.5/10
    co2_saved_kg: float
    segments: List[RouteSegment]
    is_recommended: bool


class RouteOptimizationResponse(BaseModel):
    origin: str
    destination: str
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    routes: List[RouteOption]


# --- Milestone 3: Smart Alerts Schemas ---
class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    INFO = "INFO"


class AlertCategory(str, Enum):
    ACCIDENT = "ACCIDENT"
    CONGESTION = "CONGESTION"
    CONSTRUCTION = "CONSTRUCTION"
    SIGNAL_FAILURE = "SIGNAL_FAILURE"
    WEATHER = "WEATHER"


class TrafficAlert(BaseModel):
    alert_id: str
    title: str
    location: str
    zone_id: str
    severity: AlertSeverity
    category: AlertCategory
    description: str
    estimated_delay_mins: int
    is_resolved: bool = False
    reported_at: datetime = Field(default_factory=datetime.utcnow)


class AlertCreate(BaseModel):
    title: str
    location: str
    zone_id: str
    severity: AlertSeverity
    category: AlertCategory
    description: str
    estimated_delay_mins: int


# --- Milestone 3: Traffic Analytics & Heatmaps Schemas ---
class ZoneHeatmapMetric(BaseModel):
    zone_id: str
    zone_name: str
    congestion_index: float  # 0 to 100
    avg_speed_kmh: float
    total_vehicles: int
    status: CongestionLevel


class HourlyTrendMetric(BaseModel):
    hour_label: str  # e.g., "06:00", "09:00"
    avg_speed_kmh: float
    vehicle_density: int
    congestion_rate: float


class CorridorPerformanceItem(BaseModel):
    corridor_name: str
    efficiency_score: float  # out of 10
    total_incidents_24h: int
    avg_delay_mins: int
    status: CongestionLevel


class AnalyticsOverviewResponse(BaseModel):
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    total_incidents_today: int
    active_critical_alerts: int
    city_efficiency_rating: float  # e.g. 7.8/10
    heatmaps: List[ZoneHeatmapMetric]
    hourly_trends: List[HourlyTrendMetric]
    corridor_performance: List[CorridorPerformanceItem]


