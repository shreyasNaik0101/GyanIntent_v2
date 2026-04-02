"""Service for fetching YouTube video transcripts."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi


_VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")


@dataclass(slots=True)
class TranscriptResult:
    """Normalized transcript payload."""

    video_id: str
    language: str
    transcript: str
    segments: list[dict[str, Any]]


class TranscriptServiceError(Exception):
    """Expected errors from transcript fetching operations."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class YouTubeTranscriptService:
    """Fetch transcripts using youtube-transcript-api."""

    def __init__(self) -> None:
        self._api = YouTubeTranscriptApi()

    def fetch_transcript(
        self,
        video_url_or_id: str,
        languages: list[str] | None = None,
        preserve_formatting: bool = False,
    ) -> TranscriptResult:
        """Fetch and normalize transcript for a YouTube video."""
        video_id = self._extract_video_id(video_url_or_id)
        preferred_languages = languages or ["en"]

        try:
            fetched_transcript = self._api.fetch(
                video_id,
                languages=preferred_languages,
                preserve_formatting=preserve_formatting,
            )
            segments = [
                {
                    "text": segment.text,
                    "start": segment.start,
                    "duration": segment.duration,
                }
                for segment in fetched_transcript
            ]
        except Exception as exc:  # pragma: no cover - mapped to API-level errors
            self._raise_mapped_error(exc)

        transcript_text = " ".join(
            segment["text"].strip()
            for segment in segments
            if isinstance(segment.get("text"), str) and segment["text"].strip()
        )

        language_code = getattr(fetched_transcript, "language_code", preferred_languages[0])
        return TranscriptResult(
            video_id=video_id,
            language=language_code,
            transcript=transcript_text,
            segments=segments,
        )

    def _extract_video_id(self, video_url_or_id: str) -> str:
        """Extract a valid YouTube video ID from URL or raw ID."""
        candidate = video_url_or_id.strip()
        if not candidate:
            raise TranscriptServiceError("video_url_or_id cannot be empty", status_code=422)

        if _VIDEO_ID_PATTERN.fullmatch(candidate):
            return candidate

        parsed = urlparse(candidate)
        hostname = (parsed.hostname or "").lower()

        if hostname in {"youtu.be", "www.youtu.be"}:
            path_segments = [segment for segment in parsed.path.split("/") if segment]
            if path_segments and _VIDEO_ID_PATTERN.fullmatch(path_segments[0]):
                return path_segments[0]

        if hostname in {
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "music.youtube.com",
        }:
            query_video = parse_qs(parsed.query).get("v", [None])[0]
            if query_video and _VIDEO_ID_PATTERN.fullmatch(query_video):
                return query_video

            path_segments = [segment for segment in parsed.path.split("/") if segment]
            if len(path_segments) >= 2 and path_segments[0] in {"embed", "shorts", "live"}:
                if _VIDEO_ID_PATTERN.fullmatch(path_segments[1]):
                    return path_segments[1]

        raise TranscriptServiceError(
            "Invalid YouTube URL or video ID. Provide a valid YouTube link or 11-character video ID.",
            status_code=422,
        )

    def _raise_mapped_error(self, exc: Exception) -> None:
        """Map library exceptions to API-safe errors."""
        error_name = type(exc).__name__

        if error_name == "NoTranscriptFound":
            raise TranscriptServiceError(
                "No transcript found for this video in the requested languages.",
                status_code=404,
            ) from exc

        if error_name in {"TranscriptsDisabled", "VideoUnavailable"}:
            raise TranscriptServiceError(str(exc), status_code=404) from exc

        if error_name == "TooManyRequests":
            raise TranscriptServiceError(
                "YouTube rate limit reached. Please try again later.",
                status_code=429,
            ) from exc

        raise TranscriptServiceError(
            "Failed to fetch transcript from YouTube.",
            status_code=502,
        ) from exc


youtube_transcript_service = YouTubeTranscriptService()
