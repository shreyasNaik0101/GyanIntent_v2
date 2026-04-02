"""
Gyan_Intent Backend - FastAPI Application
Intent-Aware Learning Engine API
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config import settings
from app.core.logging import setup_logging

# Setup structured logging
logger = setup_logging()

# Ensure media directory exists
MEDIA_DIR = Path(__file__).parent.parent / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "videos").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Gyan_Intent Backend", version=settings.APP_VERSION)
    
    # Startup: Initialize connections
    # TODO: Initialize database, Redis, etc.
    
    yield
    
    # Shutdown: Cleanup
    logger.info("Shutting down Gyan_Intent Backend")


app = FastAPI(
    title="Gyan_Intent API",
    description="Intent-Aware Learning Engine - Generative EdTech Platform",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Middleware — allow Vercel preview URLs + configured origins
def _cors_origins() -> list[str]:
    origins = list(settings.CORS_ORIGINS)
    extra = [
        "https://dollaransh17s-projects.vercel.app",
    ]
    for e in extra:
        if e not in origins:
            origins.append(e)
    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Range", "Accept-Ranges"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Serve static files for generated videos
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# API Routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Gyan_Intent API",
        "tagline": "From Gesture to Genius",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else None,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
