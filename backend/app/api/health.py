from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def check_health():
    return {
        "status": "healthy",
        "service": "TrafficVision AI Core API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database_connections": {
            "postgresql": "configured",
            "mongodb": "configured",
            "redis": "configured"
        }
    }
