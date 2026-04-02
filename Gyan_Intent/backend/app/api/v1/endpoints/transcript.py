"""YouTube transcript endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.youtube_transcript import (
    TranscriptServiceError,
    youtube_transcript_service,
)

router = APIRouter()


class TranscriptRequest(BaseModel):
    """Request payload for transcript retrieval."""

    video_url_or_id: str = Field(..., description="YouTube URL or 11-character video ID")
    languages: Optional[list[str]] = Field(
        default=None,
        description="Preferred language codes in fallback order, e.g. ['en', 'hi']",
    )
    preserve_formatting: bool = Field(
        default=False,
        description="Preserve HTML formatting tags in transcript text if available",
    )


class TranscriptResponse(BaseModel):
    """Normalized transcript response."""

    video_id: str
    language: str
    transcript: str
    segments: list[dict[str, float | str]]


@router.post("", response_model=TranscriptResponse)
async def get_youtube_transcript(request: TranscriptRequest):
    """Fetch transcript for a YouTube video."""
    try:
        result = youtube_transcript_service.fetch_transcript(
            video_url_or_id=request.video_url_or_id,
            languages=request.languages,
            preserve_formatting=request.preserve_formatting,
        )
    except TranscriptServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return TranscriptResponse(
        video_id=result.video_id,
        language=result.language,
        transcript=result.transcript,
        segments=result.segments,
    )
