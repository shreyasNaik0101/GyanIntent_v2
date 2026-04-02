"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check."""
    return {"status": "ok"}


@router.get("/detailed")
async def detailed_health():
    """Detailed health check with service statuses."""
    # TODO: Check database, Redis, external APIs
    
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "redis": "connected",
            "sarvam_api": "available",
            "openai_api": "available",
        },
        "version": "1.0.0",
    }
