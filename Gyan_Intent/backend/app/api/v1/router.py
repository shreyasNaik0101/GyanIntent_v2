"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, classroom, health, intent, quiz, transcript, video, whatsapp

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(intent.router, prefix="/intent", tags=["Intent Engine"])
api_router.include_router(video.router, prefix="/video", tags=["Video Factory"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["Gesture Quiz"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp Bot"])
# api_router.include_router(telegram.router, prefix="/telegram", tags=["Telegram Bot"])  # disabled — not in use
api_router.include_router(classroom.router, prefix="/classroom", tags=["Google Classroom"])
api_router.include_router(transcript.router, prefix="/transcript", tags=["YouTube Transcript"])
