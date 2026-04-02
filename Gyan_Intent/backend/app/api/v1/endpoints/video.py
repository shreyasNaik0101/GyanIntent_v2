"""Video Factory endpoints."""

import asyncio
import math
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Literal, Optional

import chromadb
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_core.messages import HumanMessage
from video_factory.pipeline import SelfHealingVideoPipeline

from app.config import settings


def _text_content(content) -> str:
    """Normalise LLM .content which may be a str or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(block.get("text", "") if isinstance(block, dict) else str(block) for block in content)
    return str(content)


# Set up LaTeX PATH for Manim
os.environ["PATH"] = "/Library/TeX/texbin:" + os.environ.get("PATH", "")

def _resolve_manim_bin() -> str:
    """Prefer repository venv manim to avoid interpreter mismatches."""
    candidates = [
        BACKEND_ROOT / ".venv" / "bin" / "manim",
        Path(sys.executable).resolve().parent / "manim",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return "manim"

router = APIRouter()

REPO_ROOT = Path(__file__).resolve().parents[5]
BACKEND_ROOT = REPO_ROOT / "backend"
FRONTEND_ROOT = REPO_ROOT / "frontend"
MEDIA_ROOT = BACKEND_ROOT / "media"
VIDEO_LIBRARY_DIR = MEDIA_ROOT / "videos"
SUBTITLE_LIBRARY_DIR = MEDIA_ROOT / "subtitles"
CACHE_INDEX_PATH = VIDEO_LIBRARY_DIR / "_cache_index.json"
PAPER_CACHE_PATH = VIDEO_LIBRARY_DIR / "_paper_cache.json"
REACTIONS_PATH = VIDEO_LIBRARY_DIR / "_feed_reactions.json"
CHROMA_DB_DIR = MEDIA_ROOT / "chroma"
FRONTEND_PUBLIC_VIDEOS_DIR = FRONTEND_ROOT / "public" / "videos"
MEDIA_BASE_URL = "http://localhost:8000/media"
PDF_TOPIC_GENERATION_BATCH_SIZE = 2
MANIM_BIN = _resolve_manim_bin()

BUILTIN_FEED_VIDEOS: list[dict[str, Any]] = [
    {
        "slug": "pythagorean",
        "title": "Pythagorean Theorem",
        "filename": "pythagorean.mp4",
        "subject": "Mathematics",
        "language": "english",
        "duration_seconds": 41,
        "description": "A short visual proof and intuition for the Pythagorean theorem.",
    },
    {
        "slug": "photosynthesis",
        "title": "Photosynthesis",
        "filename": "photosynthesis.mp4",
        "subject": "Biology",
        "language": "english",
        "duration_seconds": 35,
        "description": "How plants convert sunlight, water, and carbon dioxide into food.",
    },
    {
        "slug": "newton",
        "title": "Newton's Laws",
        "filename": "newton.mp4",
        "subject": "Physics",
        "language": "english",
        "duration_seconds": 32,
        "description": "A quick animated explanation of Newton's laws of motion.",
    },
    {
        "slug": "dna",
        "title": "DNA Replication",
        "filename": "dna.mp4",
        "subject": "Biology",
        "language": "english",
        "duration_seconds": 37,
        "description": "A short walkthrough of how DNA copies itself inside the cell.",
    },
    {
        "slug": "bonding",
        "title": "Chemical Bonding",
        "filename": "bonding.mp4",
        "subject": "Chemistry",
        "language": "english",
        "duration_seconds": 39,
        "description": "An overview of how atoms bond to form molecules and compounds.",
    },
    {
        "slug": "calculus",
        "title": "Calculus Basics",
        "filename": "calculus.mp4",
        "subject": "Mathematics",
        "language": "english",
        "duration_seconds": 38,
        "description": "A fast introduction to core calculus ideas and intuition.",
    },
    {
        "slug": "dijkstra",
        "title": "Dijkstra's Shortest Path",
        "filename": "dijkstra.mp4",
        "subject": "Computer Science",
        "language": "english",
        "duration_seconds": 64,
        "description": "Shortest-path intuition and algorithm flow using Dijkstra's method.",
    },
]

EXCLUDED_FEED_IDS = {
    "generated-827dab42-fe4e-4267-b22a-4bf97d8aac2f",
    "generated-2b375a80-4166-4702-a4c8-e6bab9d0b7a0",
    "generated-dd9612dc-8677-4ee1-9772-e9d6af395427",
    "generated-22b40be0-fb58-45ac-ad58-776765ce90a0",
}

# WhatsApp file size limit (64MB), compress if over 50MB
WHATSAPP_MAX_SIZE = 64 * 1024 * 1024
COMPRESS_THRESHOLD = 50 * 1024 * 1024
VIDEO_RENDER_TIMEOUT_SECONDS = int(os.getenv("VIDEO_RENDER_TIMEOUT_SECONDS", "420"))

# Storage for video jobs (in production, use Redis)
video_jobs = {}
video_tasks: dict[str, asyncio.Task] = {}

# Pre-built Manim videos — served immediately for matching concepts
_BUILTIN_BASE = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media")
BUILT_IN_VIDEOS: list[tuple[list[str], Path, str]] = [
    (
        ["newton", "law of motion", "laws of motion"],
        _BUILTIN_BASE / "output/videos/newton_laws/480p15/NewtonLawsScene.mp4",
        "http://localhost:8000/media/output/videos/newton_laws/480p15/NewtonLawsScene.mp4",
    ),
]


async def compress_video_for_whatsapp(video_path: Path) -> Path:
    """Compress video with ffmpeg if it exceeds WhatsApp's size limit."""
    file_size = video_path.stat().st_size
    if file_size <= COMPRESS_THRESHOLD:
        return video_path

    compressed_path = video_path.with_suffix(".compressed.mp4")
    # Target ~45MB with two-pass or CRF approach
    target_bitrate = int((COMPRESS_THRESHOLD * 8) / 60)  # rough bitrate for 60s
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-c:v", "libx264", "-crf", "28",
        "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(compressed_path)
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    await process.communicate()

    if process.returncode == 0 and compressed_path.exists():
        compressed_path.rename(video_path)
    return video_path

# Initialize LLM for script generation
llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)

embedding_llm = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=settings.OPENAI_API_KEY,
)


class VideoGenerationRequest(BaseModel):
    """Video generation request."""
    concept: str = Field(..., description="The concept to explain")
    explanation: str = Field(default="", description="Additional context")
    language: str = Field(default="english", description="Target language")
    visual_style: str = Field(default="diagram-heavy", description="Animation style")
    duration: int = Field(default=90, description="Target duration in seconds")


class DrawingAnalysisRequest(BaseModel):
    """Drawing analysis request."""
    image_data: str = Field(..., description="Base64 encoded image")
    question: str = Field(default="", description="Optional question about the drawing")


class DrawingAnalysisResponse(BaseModel):
    """Drawing analysis response."""
    analysis: str
    solution: Optional[str] = None
    steps: Optional[list] = None
    video_job_id: Optional[str] = None


class VideoGenerationResponse(BaseModel):
    """Video generation response."""
    job_id: str
    status: str
    video_url: Optional[str] = None
    subtitles_url: Optional[str] = None
    duration: Optional[float] = None
    estimated_time: int = 60


class VideoStatusResponse(BaseModel):
    """Video generation status."""
    job_id: str
    status: str
    progress: float = Field(0.0, ge=0.0, le=100.0)
    video_url: Optional[str] = None
    error_message: Optional[str] = None


class VideoFeedItem(BaseModel):
    """Normalized feed item for the insta pipeline."""

    id: str
    source: Literal["builtin", "cache-index", "generated"]
    title: str
    description: str
    subject: str
    language: str
    duration_seconds: Optional[int] = None
    video_url: str
    subtitles_url: Optional[str] = None
    likes: int = 0
    dislikes: int = 0
    views: int = 0
    score: float = 0.0
    viewer_reaction: Optional[Literal["like", "dislike"]] = None


class FeedReactionRequest(BaseModel):
    """Reaction request for a feed item."""

    viewer_id: str = Field(..., min_length=1, max_length=128)
    reaction: Literal["like", "dislike", "clear"]


class FeedViewRequest(BaseModel):
    """View tracking request for a feed item."""

    viewer_id: str = Field(..., min_length=1, max_length=128)
    watch_time_ms: int = Field(0, ge=0)


class FeedReactionSummary(BaseModel):
    """Aggregated reaction state for a feed item."""

    video_id: str
    likes: int
    dislikes: int
    views: int
    score: float
    viewer_reaction: Optional[Literal["like", "dislike"]] = None


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "video"


def _infer_subject(text: str) -> str:
    lowered = text.lower()
    subject_keywords = {
        "Computer Science": ["bfs", "dfs", "dijkstra", "graph", "stack", "heap", "algorithm", "transformer", "attention", "rnn"],
        "Biology": ["photosynthesis", "dna", "cell", "membrane", "mitochondria"],
        "Physics": ["newton", "motion", "nuclear", "fission", "fusion", "force"],
        "Chemistry": ["bond", "atom", "molecule", "chemical"],
        "Mathematics": ["pythagorean", "calculus", "theorem", "equation"],
    }
    for subject, keywords in subject_keywords.items():
        if any(keyword in lowered for keyword in keywords):
            return subject
    return "General"


def _infer_language(text: str) -> str:
    if re.search(r"[\u0C80-\u0CFF]", text):
        return "kannada"
    if re.search(r"[\u0900-\u097F]", text):
        return "hindi"
    return "english"


def _seconds_from_srt_timestamp(value: str) -> int:
    hours, minutes, seconds = value.split(":")
    secs, _millis = seconds.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(secs)


def _extract_srt_metadata(subtitle_path: Path) -> tuple[str, str, str, Optional[int]]:
    content = subtitle_path.read_text(encoding="utf-8", errors="ignore")
    lines = [line.strip() for line in content.splitlines()]
    text_lines = [
        line
        for line in lines
        if line and not line.isdigit() and "-->" not in line
    ]
    title = text_lines[0] if text_lines else subtitle_path.stem.replace("-", " ").title()
    description = next((line for line in text_lines[1:] if len(line) > 20), title)
    language = _infer_language(" ".join(text_lines[:4]))
    timestamp_lines = [line for line in lines if "-->" in line]
    duration_seconds: Optional[int] = None
    if timestamp_lines:
        try:
            duration_seconds = _seconds_from_srt_timestamp(timestamp_lines[-1].split("-->", maxsplit=1)[1].strip())
        except (IndexError, ValueError):
            duration_seconds = None
    return title, description, language, duration_seconds


def _parse_cache_preview(preview: str, job_id: str) -> tuple[str, str, str]:
    series_match = re.search(r"\[Paper:\s*(.*?)\]", preview)
    topic_match = re.search(r"Topic\s+\d+/\d+:\s*(.*?)(?:\n|$)", preview)
    title = topic_match.group(1).strip() if topic_match else f"Cached Video {job_id[:8]}"
    cleaned_preview = preview.replace("\n", " ").strip()
    description = cleaned_preview
    if title in description:
        description = description.split(title, maxsplit=1)[-1].strip(" :.-")
    if series_match:
        description = f"{series_match.group(1).strip()} - {description}".strip(" -")
    subject = _infer_subject(f"{title} {description}")
    return title, description or title, subject


def _load_reactions() -> dict[str, Any]:
    if not REACTIONS_PATH.exists():
        return {"videos": {}}
    try:
        data = json.loads(REACTIONS_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("videos", {}), dict):
            return data
    except json.JSONDecodeError:
        pass
    return {"videos": {}}


def _save_reactions(data: dict[str, Any]) -> None:
    REACTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = REACTIONS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    tmp_path.replace(REACTIONS_PATH)


def _reaction_summary(data: dict[str, Any], video_id: str, viewer_id: Optional[str] = None) -> dict[str, Any]:
    viewers = data.get("videos", {}).get(video_id, {}).get("viewers", {})
    likes = sum(1 for item in viewers.values() if item.get("reaction") == "like")
    dislikes = sum(1 for item in viewers.values() if item.get("reaction") == "dislike")
    views = sum(1 for item in viewers.values() if item.get("viewed"))
    score = round((likes * 3) - (dislikes * 2) + (views * 0.15), 3)
    viewer_reaction = None
    if viewer_id:
        viewer_reaction = viewers.get(viewer_id, {}).get("reaction")
    return {
        "video_id": video_id,
        "likes": likes,
        "dislikes": dislikes,
        "views": views,
        "score": score,
        "viewer_reaction": viewer_reaction,
    }


def _build_feed_items(viewer_id: Optional[str] = None) -> list[dict[str, Any]]:
    reaction_store = _load_reactions()
    items_by_url: dict[str, dict[str, Any]] = {}

    if CACHE_INDEX_PATH.exists():
        try:
            cache_entries = json.loads(CACHE_INDEX_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            cache_entries = {}
        for entry in cache_entries.values():
            job_id = entry.get("job_id")
            if not job_id:
                continue
            video_path = VIDEO_LIBRARY_DIR / f"{job_id}.mp4"
            if not video_path.exists():
                continue
            preview = entry.get("concept_preview", "")
            title, description, subject = _parse_cache_preview(preview, job_id)
            subtitles_path = SUBTITLE_LIBRARY_DIR / f"{job_id}.srt"
            video_url = f"{MEDIA_BASE_URL}/videos/{video_path.name}"
            items_by_url[video_url] = {
                "id": f"cache-{job_id}",
                "source": "cache-index",
                "title": title,
                "description": description,
                "subject": subject,
                "language": "english",
                "duration_seconds": None,
                "video_url": video_url,
                "subtitles_url": f"{MEDIA_BASE_URL}/subtitles/{subtitles_path.name}" if subtitles_path.exists() else None,
            }

    for builtin in BUILTIN_FEED_VIDEOS:
        video_path = FRONTEND_PUBLIC_VIDEOS_DIR / builtin["filename"]
        if not video_path.exists():
            continue
        video_url = f"/videos/{builtin['filename']}"
        items_by_url.setdefault(
            video_url,
            {
                "id": f"builtin-{builtin['slug']}",
                "source": "builtin",
                "title": builtin["title"],
                "description": builtin["description"],
                "subject": builtin["subject"],
                "language": builtin["language"],
                "duration_seconds": builtin["duration_seconds"],
                "video_url": video_url,
                "subtitles_url": None,
            },
        )

    for subtitle_path in SUBTITLE_LIBRARY_DIR.glob("*.srt"):
        video_path = VIDEO_LIBRARY_DIR / f"{subtitle_path.stem}.mp4"
        if not video_path.exists():
            continue
        video_url = f"{MEDIA_BASE_URL}/videos/{video_path.name}"
        if video_url in items_by_url:
            continue
        title, description, language, duration_seconds = _extract_srt_metadata(subtitle_path)
        items_by_url[video_url] = {
            "id": f"generated-{subtitle_path.stem}",
            "source": "generated",
            "title": title,
            "description": description,
            "subject": _infer_subject(f"{title} {description}"),
            "language": language,
            "duration_seconds": duration_seconds,
            "video_url": video_url,
            "subtitles_url": f"{MEDIA_BASE_URL}/subtitles/{subtitle_path.name}",
        }

    feed_items: list[dict[str, Any]] = []
    for item in items_by_url.values():
        if item["id"] in EXCLUDED_FEED_IDS:
            continue
        summary = _reaction_summary(reaction_store, item["id"], viewer_id)
        feed_items.append({**item, **{key: value for key, value in summary.items() if key != "video_id"}})

    feed_items.sort(key=lambda item: (item["score"], item["views"], item["title"]), reverse=True)
    return feed_items


def generate_manim_code(concept: str) -> str:
    """Generate Manim code for a concept using templates - 75-90 second videos."""
    
    # Template-based generation for common physics/math concepts
    # NOTE: More specific checks must come before general ones (e.g. "newton" before "motion")
    concept_lower = concept.lower()
    
    if "projectile" in concept_lower or ("motion" in concept_lower and "newton" not in concept_lower and "force" not in concept_lower and "law" not in concept_lower):
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title animation (0-5 seconds)
        title = Text("Projectile Motion", font_size=52)
        title.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Physics of Flying Objects", font_size=28)
        subtitle.next_to(title, DOWN)
        subtitle.set_color(WHITE)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 1: Setup - Ground and axes (5-12 seconds)
        self.play(FadeOut(subtitle))
        
        ground = Line(LEFT*7, RIGHT*7, color=GREEN, stroke_width=4)
        ground.shift(DOWN*2.5)
        ground_label = Text("Ground", font_size=20, color=GREEN).next_to(ground, DOWN)
        self.play(Create(ground), Write(ground_label), run_time=2)
        
        # Launch point
        launch_point = Dot(LEFT*5 + DOWN*2.5, color=YELLOW, radius=0.1)
        self.play(FadeIn(launch_point))
        
        # SECTION 2: Initial velocity vector (12-20 seconds)
        angle = 45 * DEGREES
        velocity = Arrow(
            launch_point.get_center(),
            launch_point.get_center() + 2*RIGHT + 2*UP,
            color=RED,
            buff=0,
            stroke_width=4
        )
        v_label = MathTex("v_0", font_size=32).next_to(velocity.get_end(), UP+RIGHT)
        self.play(Create(velocity), Write(v_label), run_time=2)
        
        # Angle arc
        angle_arc = Arc(radius=0.8, start_angle=0, angle=angle, color=YELLOW)
        angle_arc.move_arc_center_to(launch_point.get_center())
        angle_text = MathTex(r"45^\\circ", font_size=24).next_to(angle_arc, RIGHT)
        self.play(Create(angle_arc), Write(angle_text), run_time=1.5)
        
        # SECTION 3: Trajectory path (20-30 seconds)
        trajectory = ParametricFunction(
            lambda t: np.array([t, -0.08*t*t + 1.6*t + 0, 0]),
            t_range=[0, 8],
            color=YELLOW,
            stroke_width=3
        )
        trajectory.shift(LEFT*5 + DOWN*2.5)
        
        # Dashed trajectory preview
        trajectory.set_stroke(opacity=0.3)
        self.play(Create(trajectory), run_time=2)
        trajectory.set_stroke(opacity=1)
        
        # Ball following path
        ball = Dot(color=RED, radius=0.15)
        ball.move_to(launch_point.get_center())
        self.play(FadeIn(ball), run_time=0.5)
        self.play(MoveAlongPath(ball, trajectory), run_time=3, rate_func=linear)
        
        # SECTION 4: Velocity components (30-40 seconds)
        self.play(ball.animate.move_to(trajectory.point_from_proportion(0.3)), run_time=1)
        
        # Vx component
        vx = Arrow(
            ball.get_center(),
            ball.get_center() + 1.5*RIGHT,
            color=BLUE,
            buff=0
        )
        vx_label = MathTex(r"v_x = v_0\\cos\\theta", font_size=24).next_to(vx, DOWN)
        self.play(Create(vx), Write(vx_label), run_time=2)
        
        # Vy component
        vy = Arrow(
            ball.get_center(),
            ball.get_center() + 1*UP,
            color=GREEN,
            buff=0
        )
        vy_label = MathTex(r"v_y = v_0\\sin\\theta - gt", font_size=24).next_to(vy, LEFT)
        self.play(Create(vy), Write(vy_label), run_time=2)
        
        # SECTION 5: Key equations (40-50 seconds)
        self.play(
            FadeOut(vx), FadeOut(vy), FadeOut(vx_label), FadeOut(vy_label),
            FadeOut(velocity), FadeOut(v_label), FadeOut(angle_arc), FadeOut(angle_text)
        )
        
        equations = VGroup(
            MathTex(r"x(t) = v_0 \\cos\\theta \\cdot t"),
            MathTex(r"y(t) = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2"),
            MathTex(r"R = \\frac{v_0^2 \\sin(2\\theta)}{g}")
        )
        equations.arrange(DOWN, buff=0.5)
        equations.to_edge(RIGHT)
        
        for eq in equations:
            self.play(Write(eq), run_time=1.5)
        
        # Range indicator
        range_line = Line(launch_point.get_center(), trajectory.get_end(), color=PURPLE)
        range_label = MathTex("R", font_size=28, color=PURPLE).next_to(range_line, DOWN)
        self.play(Create(range_line), Write(range_label), run_time=1.5)
        
        # SECTION 6: Summary (50-60 seconds)
        summary_box = Rectangle(width=5, height=1.5, color=WHITE)
        summary_box.to_edge(DOWN)
        summary_text = Text("Maximum range at θ = 45°", font_size=28)
        summary_text.move_to(summary_box.get_center())
        self.play(Create(summary_box), Write(summary_text), run_time=2)
        
        self.wait(2)
        
        # Fade out
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        # Final title
        final = Text("Projectile Motion", font_size=64)
        final.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "force" in concept_lower or "newton" in concept_lower or "law of motion" in concept_lower or "laws of motion" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Newton's Laws of Motion", font_size=48)
        title.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Foundation of Classical Mechanics", font_size=26)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 1: Introduction (5-12s)
        self.play(FadeOut(subtitle))
        
        intro_text = Text("Three laws that explain how objects move", font_size=24)
        intro_text.to_edge(LEFT).shift(UP*2)
        self.play(Write(intro_text), run_time=2)
        
        # Law numbers preview
        law_nums = VGroup(
            Text("1st Law: Inertia", font_size=20, color=BLUE),
            Text("2nd Law: F = ma", font_size=20, color=GREEN),
            Text("3rd Law: Action-Reaction", font_size=20, color=RED),
        )
        law_nums.arrange(DOWN, buff=0.3)
        law_nums.to_edge(RIGHT).shift(UP*1)
        self.play(Write(law_nums), run_time=2)
        self.wait(1)
        
        # SECTION 2: First Law - Inertia (12-25s)
        self.play(FadeOut(intro_text), FadeOut(law_nums))
        
        first_law_title = Text("1st Law: Law of Inertia", font_size=32, color=BLUE)
        first_law_title.shift(UP*2.5)
        self.play(Write(first_law_title), run_time=1.5)
        
        first_law_text = Text("An object at rest stays at rest,\\nan object in motion stays in motion", font_size=22)
        first_law_text.next_to(first_law_title, DOWN)
        self.play(Write(first_law_text), run_time=2)
        
        # Ball demonstration
        ground = Line(LEFT*6, RIGHT*6, color=GREEN, stroke_width=3)
        ground.shift(DOWN*1.5)
        self.play(Create(ground), run_time=1)
        
        ball = Circle(radius=0.3, color=RED, fill_opacity=0.9)
        ball.shift(LEFT*4 + DOWN*1.2)
        self.play(FadeIn(ball), run_time=0.5)
        
        # Ball moving (no friction)
        velocity_arrow = Arrow(ball.get_right(), ball.get_right() + RIGHT*1.5, color=YELLOW, buff=0)
        self.play(Create(velocity_arrow), run_time=0.5)
        self.play(
            ball.animate.shift(RIGHT*8),
            velocity_arrow.animate.shift(RIGHT*8),
            run_time=2,
            rate_func=linear
        )
        
        no_friction = Text("No external force = Constant velocity", font_size=18, color=YELLOW)
        no_friction.to_edge(DOWN)
        self.play(Write(no_friction), run_time=1.5)
        self.wait(1)
        
        # SECTION 3: Second Law - F=ma (25-42s)
        self.play(
            FadeOut(ball), FadeOut(velocity_arrow), FadeOut(ground), 
            FadeOut(no_friction), FadeOut(first_law_title), FadeOut(first_law_text)
        )
        
        second_law_title = Text("2nd Law: Force & Acceleration", font_size=32, color=GREEN)
        second_law_title.shift(UP*2.5)
        self.play(Write(second_law_title), run_time=1.5)
        
        # F = ma equation
        equation = MathTex("F", "=", "m", r"\\times", "a")
        equation.scale(1.8)
        equation.next_to(second_law_title, DOWN)
        self.play(Write(equation), run_time=2)
        
        # Box demonstration
        box = Square(side_length=1.2, color=BLUE, fill_opacity=0.7)
        box.shift(LEFT*3 + DOWN*1)
        mass_label = MathTex("m").next_to(box, UP)
        self.play(Create(box), Write(mass_label), run_time=1.5)
        
        # Force arrow
        force = Arrow(box.get_right(), box.get_right() + RIGHT*2, color=RED, buff=0, stroke_width=4)
        force_label = MathTex("F", color=RED, font_size=28).next_to(force, UP)
        self.play(Create(force), Write(force_label), run_time=1)
        
        # Acceleration arrow
        accel = Arrow(box.get_center(), box.get_center() + RIGHT*1, color=YELLOW, buff=0)
        accel.shift(DOWN*0.8)
        accel_label = MathTex("a", color=YELLOW, font_size=28).next_to(accel, DOWN)
        self.play(Create(accel), Write(accel_label), run_time=1)
        
        # Animate push
        self.play(
            box.animate.shift(RIGHT*4),
            force.animate.shift(RIGHT*4),
            force_label.animate.shift(RIGHT*4),
            run_time=2
        )
        
        # Relationship text
        relation = Text("Greater force = Greater acceleration", font_size=18, color=GREEN)
        relation.to_edge(DOWN)
        self.play(Write(relation), run_time=1.5)
        self.wait(1)
        
        # SECTION 4: Third Law - Action-Reaction (42-58s)
        self.play(
            FadeOut(box), FadeOut(force), FadeOut(force_label), 
            FadeOut(accel), FadeOut(accel_label), FadeOut(mass_label),
            FadeOut(second_law_title), FadeOut(equation), FadeOut(relation)
        )
        
        third_law_title = Text("3rd Law: Action-Reaction", font_size=32, color=RED)
        third_law_title.shift(UP*2.5)
        self.play(Write(third_law_title), run_time=1.5)
        
        third_law_text = Text("Every action has an equal and opposite reaction", font_size=22)
        third_law_text.next_to(third_law_title, DOWN)
        self.play(Write(third_law_text), run_time=2)
        
        # Two boxes pushing each other
        box1 = Square(side_length=1, color=BLUE, fill_opacity=0.7)
        box1.shift(LEFT*2 + DOWN*0.5)
        box2 = Square(side_length=1, color=RED, fill_opacity=0.7)
        box2.shift(RIGHT*2 + DOWN*0.5)
        
        # Action arrow
        action = Arrow(box1.get_right(), box2.get_left(), color=BLUE, buff=0, stroke_width=4)
        action_label = Text("Action", font_size=18, color=BLUE).next_to(action, UP)
        
        # Reaction arrow
        reaction = Arrow(box2.get_left(), box1.get_right(), color=RED, buff=0, stroke_width=4)
        reaction.shift(DOWN*0.5)
        reaction_label = Text("Reaction", font_size=18, color=RED).next_to(reaction, DOWN)
        
        self.play(Create(box1), Create(box2), run_time=1)
        self.play(Create(action), Write(action_label), run_time=1)
        self.play(Create(reaction), Write(reaction_label), run_time=1)
        
        # Equal magnitude text
        equal_text = MathTex("|F_1| = |F_2|", font_size=28, color=YELLOW)
        equal_text.to_edge(DOWN)
        self.play(Write(equal_text), run_time=1.5)
        
        # Show both moving apart
        self.play(
            box1.animate.shift(LEFT*1),
            box2.animate.shift(RIGHT*1),
            run_time=1.5
        )
        self.wait(1)
        
        # SECTION 5: Summary (58-70s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Newton's Laws Summary:", font_size=28, color=WHITE),
            Text("1st: Objects resist change in motion", font_size=22, color=BLUE),
            Text("2nd: F = ma (Force causes acceleration)", font_size=22, color=GREEN),
            Text("3rd: Every action has equal reaction", font_size=22, color=RED),
        )
        summary.arrange(DOWN, buff=0.4)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Newton's Laws of Motion", font_size=56)
        final.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "pythagorean" in concept_lower or "pythagoras" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Pythagorean Theorem", font_size=52)
        title.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Foundation of Right Triangles", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: The Triangle (5-15s)
        self.play(FadeOut(subtitle))
        
        # Define triangle vertices (3-4-5 right triangle)
        A = np.array([0, 0, 0])      # Bottom-left (right angle)
        B = np.array([3, 0, 0])      # Bottom-right
        C = np.array([0, 4, 0])      # Top-left
        
        # Triangle centered
        center = (A + B + C) / 3
        A, B, C = A - center + DOWN*0.5, B - center + DOWN*0.5, C - center + DOWN*0.5
        
        # Draw triangle
        triangle = Polygon(A, B, C, color=WHITE, stroke_width=3)
        self.play(Create(triangle), run_time=2)
        
        # Side labels
        a_label = MathTex("a", font_size=28, color=BLUE).next_to((A + B)/2, DOWN, buff=0.2)
        b_label = MathTex("b", font_size=28, color=GREEN).next_to((A + C)/2, LEFT, buff=0.2)
        c_label = MathTex("c", font_size=28, color=RED).next_to((B + C)/2, UP+RIGHT, buff=0.2)
        self.play(Write(a_label), Write(b_label), Write(c_label), run_time=2)
        
        # Right angle indicator
        right_angle = RightAngle(Line(A, B), Line(A, C), length=0.3)
        self.play(Create(right_angle), run_time=1)
        
        # SECTION 3: The Equation (15-25s)
        equation = MathTex("a^2", "+", "b^2", "=", "c^2")
        equation.scale(1.5)
        equation.to_edge(DOWN)
        self.play(Write(equation), run_time=2)
        
        equation[0].set_color(BLUE)
        equation[2].set_color(GREEN)
        equation[4].set_color(RED)
        
        expl = Text("Sum of squares of legs = Square of hypotenuse", font_size=18)
        expl.next_to(equation, UP)
        self.play(Write(expl), run_time=1.5)
        self.wait(1)
        
        # SECTION 4: Visual Proof - Squares ATTACHED to triangle (25-48s)
        self.play(FadeOut(expl), FadeOut(equation), FadeOut(a_label), FadeOut(b_label), FadeOut(c_label), FadeOut(right_angle))
        
        proof_title = Text("Visual Proof", font_size=28, color=YELLOW)
        proof_title.to_edge(LEFT).shift(UP*2.5)
        self.play(Write(proof_title), run_time=1)
        
        # Square on side a (bottom side AB, length 3)
        # Draw below the triangle
        side_a = B - A  # Vector from A to B
        side_a_unit = side_a / np.linalg.norm(side_a)
        square_a_points = [
            A, B,
            B + DOWN*3, A + DOWN*3
        ]
        square_a = Polygon(*square_a_points, color=BLUE, fill_opacity=0.3, stroke_width=2)
        area_a = MathTex("a^2 = 9", font_size=22, color=BLUE).next_to(square_a, DOWN)
        self.play(Create(square_a), Write(area_a), run_time=2)
        
        # Square on side b (left side AC, length 4)
        # Draw to the left of triangle
        square_b_points = [
            A, C,
            C + LEFT*4, A + LEFT*4
        ]
        square_b = Polygon(*square_b_points, color=GREEN, fill_opacity=0.3, stroke_width=2)
        area_b = MathTex("b^2 = 16", font_size=22, color=GREEN).next_to(square_b, LEFT)
        self.play(Create(square_b), Write(area_b), run_time=2)
        
        # Square on side c (hypotenuse BC, length 5)
        # Calculate perpendicular direction
        side_c = C - B
        side_c_unit = side_c / np.linalg.norm(side_c)
        perp_c = np.array([-side_c_unit[1], side_c_unit[0], 0])  # Perpendicular
        square_c_points = [
            B, C,
            C + perp_c*5, B + perp_c*5
        ]
        square_c = Polygon(*square_c_points, color=RED, fill_opacity=0.3, stroke_width=2)
        area_c = MathTex("c^2 = 25", font_size=22, color=RED).next_to(square_c, RIGHT)
        self.play(Create(square_c), Write(area_c), run_time=2)
        
        # Show squares clearly attached
        self.wait(1)
        
        # Highlight each square with its area
        areas_text = VGroup(
            Text("Area of blue square = 9", font_size=20, color=BLUE),
            Text("Area of green square = 16", font_size=20, color=GREEN),
            Text("Area of red square = 25", font_size=20, color=RED),
        )
        areas_text.arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        areas_text.to_edge(RIGHT).shift(UP)
        
        self.play(Write(areas_text), run_time=2)
        self.wait(1)
        
        # SECTION 5: The Math (48-60s)
        self.play(FadeOut(areas_text), FadeOut(proof_title))
        
        calc_box = Rectangle(width=6, height=3, color=WHITE, fill_opacity=0.1)
        calc_box.to_edge(RIGHT)
        
        calc_title = Text("The Math:", font_size=24, color=YELLOW)
        calc_title.next_to(calc_box.get_top(), DOWN, buff=0.2)
        
        calc1 = MathTex("a^2 + b^2 = 9 + 16 = 25", font_size=26)
        calc1.next_to(calc_title, DOWN, buff=0.4)
        
        calc2 = MathTex("c^2 = 5^2 = 25", font_size=26)
        calc2.next_to(calc1, DOWN, buff=0.3)
        
        check = Text("✓ Verified: a² + b² = c²!", font_size=24, color=GREEN)
        check.next_to(calc2, DOWN, buff=0.4)
        
        self.play(Create(calc_box), Write(calc_title), run_time=1)
        self.play(Write(calc1), run_time=1.5)
        self.play(Write(calc2), run_time=1.5)
        self.play(Write(check), run_time=1)
        self.wait(1)
        
        # SECTION 6: Real-world application (60-75s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        app_title = Text("Real-World Application:", font_size=28, color=ORANGE)
        app_title.to_edge(UP)
        self.play(Write(app_title), run_time=1)
        
        # Ladder against wall - FIXED: proper right triangle
        ground_y = DOWN*2
        wall_x = RIGHT*3
        
        # Ground line
        ground = Line(LEFT*5, RIGHT*5, color=GREEN, stroke_width=4)
        ground.shift(ground_y)
        
        # Wall line (starts at ground level)
        wall = Line(ground_y, ground_y + UP*4, color=MAROON_B, stroke_width=4)
        wall.shift(wall_x)
        
        self.play(Create(ground), Create(wall), run_time=1.5)
        
        # Ladder: 5m ladder, 4m up wall, 3m from wall
        # Bottom at (wall_x - 3*RIGHT, ground_y)
        # Top at (wall_x, ground_y + 4*UP)
        ladder_bottom = np.array([3 - 3, -2, 0])  # wall_x - 3 units
        ladder_top = np.array([3, -2 + 4, 0])     # wall_x, ground_y + 4 units
        
        ladder = Line(ladder_bottom, ladder_top, color=YELLOW, stroke_width=6)
        ladder_label = Text("Ladder = 5m", font_size=20, color=YELLOW)
        ladder_label.next_to(ladder.get_center(), LEFT, buff=0.3)
        
        # Distance markers
        dist_line = Line(ladder_bottom, np.array([3, -2, 0]), color=BLUE, stroke_width=2)
        dist_line.shift(DOWN*0.3)
        dist_label = MathTex("a = ?", font_size=22, color=BLUE).next_to(dist_line, DOWN, buff=0.1)
        
        height_line = Line(np.array([3, -2, 0]), ladder_top, color=GREEN, stroke_width=2)
        height_line.shift(RIGHT*0.3)
        height_label = MathTex("b = 4m", font_size=22, color=GREEN).next_to(height_line, RIGHT, buff=0.1)
        
        self.play(Create(ladder), Write(ladder_label), run_time=1.5)
        self.play(Create(dist_line), Write(dist_label), Create(height_line), Write(height_label), run_time=1.5)
        
        # Question and solution
        q = Text("How far from wall?", font_size=22, color=WHITE)
        q.to_edge(LEFT).shift(DOWN*1)
        self.play(Write(q), run_time=1)
        
        solution = VGroup(
            MathTex("c^2 = a^2 + b^2", font_size=24),
            MathTex("25 = a^2 + 16", font_size=24),
            MathTex("a^2 = 9", font_size=24),
            MathTex("a = 3m", font_size=28, color=BLUE),
        )
        solution.arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        solution.next_to(q, DOWN, buff=0.4)
        
        for step in solution:
            self.play(Write(step), run_time=0.8)
        
        # Highlight the answer
        final_ans = MathTex("a = 3m", font_size=36, color=BLUE)
        final_ans.move_to(dist_label.get_center() + UP*0.3)
        self.play(FadeOut(dist_label), Write(final_ans), run_time=1)
        self.wait(1)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Pythagorean Theorem", font_size=56)
        final.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "photosynthesis" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # SECTION 1: Title (0-8s)
        title = Text("Photosynthesis", font_size=56)
        title.set_color_by_gradient(GREEN, YELLOW)
        self.play(Write(title), run_time=3)
        self.play(title.animate.to_edge(UP), run_time=1.5)
        subtitle = Text("How Plants Make Food", font_size=32)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1.5)
        self.wait(2)
        
        # SECTION 2: Introduction text (8-15s)
        intro = Text("The Process That Sustains Life on Earth", font_size=24)
        intro.next_to(subtitle, DOWN)
        self.play(Write(intro), run_time=2)
        self.wait(1)
        self.play(FadeOut(subtitle), FadeOut(intro))
        
        # SECTION 3: Sun and light energy (15-25s)
        sun = Circle(radius=1, color=YELLOW, fill_opacity=0.9)
        sun.shift(UP*2.5 + LEFT*5)
        self.play(Create(sun), run_time=2)
        
        # Sun rays animation with pulsing effect
        rays = VGroup()
        for i in range(16):
            angle = i * PI / 8
            ray = Line(sun.get_center(), sun.get_center() + 1.5 * np.array([np.cos(angle), np.sin(angle), 0]), color=YELLOW, stroke_width=4)
            rays.add(ray)
        self.play(Create(rays), run_time=2)
        self.play(rays.animate.scale(1.2), run_time=1)
        self.play(rays.animate.scale(0.8), run_time=1)
        
        # Light beams to plant
        light_label = Text("Light Energy (Sunlight)", font_size=22, color=YELLOW)
        light_label.next_to(sun, RIGHT)
        self.play(Write(light_label), run_time=2)
        self.wait(1)
        
        # SECTION 4: Plant structure (25-35s)
        ground = Rectangle(width=14, height=0.6, color=MAROON_B, fill_opacity=0.6)
        ground.to_edge(DOWN)
        self.play(Create(ground), run_time=1.5)
        
        # Roots
        roots = VGroup()
        for i in range(5):
            root = Line(DOWN*2.2 + LEFT*0.3 + i*0.15*RIGHT, DOWN*3 + LEFT*0.3 + i*0.15*RIGHT + 0.3*DOWN, color=MAROON_B, stroke_width=3)
            roots.add(root)
        self.play(Create(roots), run_time=1.5)
        
        # Stem
        stem = Rectangle(width=0.35, height=2.8, color=GREEN_D, fill_opacity=0.9)
        stem.shift(DOWN*1.2)
        self.play(Create(stem), run_time=1.5)
        
        # Leaves with animation
        leaf1 = Ellipse(width=2.2, height=1.2, color=GREEN, fill_opacity=0.8)
        leaf1.rotate(PI/5)
        leaf1.shift(UP*0.5 + LEFT*1)
        leaf2 = Ellipse(width=2.2, height=1.2, color=GREEN, fill_opacity=0.8)
        leaf2.rotate(-PI/5)
        leaf2.shift(UP*0.5 + RIGHT*1)
        self.play(Create(leaf1), run_time=1)
        self.play(Create(leaf2), run_time=1)
        
        # Chloroplast label with box
        chloro_label = Text("Chloroplast", font_size=20, color=GREEN)
        chloro_box = SurroundingRectangle(chloro_label, color=GREEN, buff=0.1)
        chloro_label.shift(UP*0.5)
        chloro_box.shift(UP*0.5)
        self.play(Write(chloro_label), Create(chloro_box), run_time=2)
        self.wait(1)
        
        # SECTION 5: Inputs - CO2 and H2O (35-45s)
        co2_molecules = VGroup()
        for i, pos in enumerate([LEFT*4 + UP*1.5, LEFT*5 + UP*0.8, LEFT*4.5 + UP*2]):
            co2 = MathTex("CO_2", font_size=26, color=BLUE)
            co2.move_to(pos)
            co2_molecules.add(co2)
        self.play(Write(co2_molecules), run_time=2.5)
        
        co2_label = Text("Carbon Dioxide from Air", font_size=18, color=BLUE)
        co2_label.next_to(co2_molecules, DOWN)
        self.play(Write(co2_label), run_time=1.5)
        
        arrow_co2 = Arrow(LEFT*3.5 + UP*0.8, leaf1.get_left(), color=BLUE, stroke_width=3)
        self.play(Create(arrow_co2), run_time=1.5)
        
        # Water from roots with animation
        water_drops = VGroup()
        for i in range(3):
            drop = Dot(point=DOWN*2.5 + RIGHT*(1.5 + i*0.5), color=TEAL, radius=0.1)
            water_drops.add(drop)
        self.play(Create(water_drops), run_time=1.5)
        
        h2o = MathTex("H_2O", font_size=26, color=TEAL)
        h2o.shift(DOWN*2 + RIGHT*2.5)
        self.play(Write(h2o), run_time=1.5)
        
        water_label = Text("Water from Roots", font_size=18, color=TEAL)
        water_label.next_to(h2o, DOWN)
        self.play(Write(water_label), run_time=1.5)
        
        arrow_h2o = Arrow(h2o.get_top() + UP*0.3, stem.get_bottom() + RIGHT*0.3, color=TEAL, stroke_width=3)
        self.play(Create(arrow_h2o), run_time=1.5)
        self.wait(1)
        
        # SECTION 6: Outputs - Glucose and O2 (45-55s)
        transform_arrow = Arrow(leaf2.get_right(), RIGHT*3.5, color=WHITE, stroke_width=3)
        self.play(Create(transform_arrow), run_time=1.5)
        
        glucose = MathTex("C_6H_{12}O_6", font_size=28, color=YELLOW)
        glucose.shift(RIGHT*4.5)
        glucose_label = Text("Glucose (Food)", font_size=20, color=YELLOW)
        glucose_label.next_to(glucose, DOWN)
        self.play(Write(glucose), run_time=2)
        self.play(Write(glucose_label), run_time=1.5)
        
        o2 = MathTex("O_2", font_size=28, color=BLUE)
        o2.shift(RIGHT*4.5 + UP*1.8)
        o2_label = Text("Oxygen (Released)", font_size=20, color=BLUE)
        o2_label.next_to(o2, RIGHT)
        self.play(Write(o2), run_time=1.5)
        self.play(Write(o2_label), run_time=1.5)
        self.wait(1)
        
        # SECTION 7: Chemical Equation (55-70s)
        self.play(
            FadeOut(co2_molecules), FadeOut(arrow_co2), FadeOut(co2_label),
            FadeOut(h2o), FadeOut(arrow_h2o), FadeOut(water_label),
            FadeOut(transform_arrow), FadeOut(water_drops), FadeOut(chloro_box)
        )
        
        equation_title = Text("The Chemical Equation", font_size=28, color=WHITE)
        equation_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(equation_title), run_time=1.5)
        
        equation = MathTex("6CO_2", "+", "6H_2O", r"\\xrightarrow{light}", "C_6H_{12}O_6", "+", "6O_2")
        equation.scale(0.9)
        equation.to_edge(DOWN)
        equation.shift(UP*0.8)
        box = SurroundingRectangle(equation, color=WHITE, buff=0.25)
        self.play(Write(equation), Create(box), run_time=3)
        self.wait(2)
        
        # SECTION 8: Summary (70-80s)
        self.play(FadeOut(equation_title))
        summary_box = Rectangle(width=10, height=2, color=GREEN, fill_opacity=0.2)
        summary_box.to_edge(DOWN)
        summary = Text("Plants convert light energy into chemical energy!", font_size=26)
        summary.move_to(summary_box.get_center())
        self.play(Create(summary_box), run_time=1.5)
        self.play(Write(summary), run_time=2)
        self.wait(2)
        
        # Final fade and title
        self.play(*[FadeOut(mob) for mob in self.mobjects], run_time=1.5)
        final = Text("Photosynthesis", font_size=72)
        final.set_color_by_gradient(GREEN, YELLOW)
        self.play(Write(final), run_time=3)
        self.wait(2)
'''
    elif "dna" in concept_lower or "replication" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("DNA Structure", font_size=52)
        title.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Blueprint of Life", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Double Helix Structure (5-20s)
        self.play(FadeOut(subtitle))
        
        # Double helix strands
        helix1 = ParametricFunction(
            lambda t: np.array([np.sin(t)*0.6, t*0.25, 0]),
            t_range=[-5, 5],
            color=BLUE,
            stroke_width=4
        )
        helix2 = ParametricFunction(
            lambda t: np.array([np.sin(t+PI)*0.6, t*0.25, 0]),
            t_range=[-5, 5],
            color=RED,
            stroke_width=4
        )
        self.play(Create(helix1), Create(helix2), run_time=3)
        
        # Base pairs connecting strands
        base_pairs = VGroup()
        for i in range(-4, 5):
            line = Line(
                np.array([np.sin(i)*0.6, i*0.25, 0]),
                np.array([np.sin(i+PI)*0.6, i*0.25, 0]),
                color=GREEN,
                stroke_width=2
            )
            base_pairs.add(line)
        self.play(Create(base_pairs), run_time=2)
        
        # SECTION 3: Nucleotide Bases (20-38s)
        self.play(
            helix1.animate.scale(0.6).shift(LEFT*3),
            helix2.animate.scale(0.6).shift(LEFT*3),
            base_pairs.animate.scale(0.6).shift(LEFT*3)
        )
        
        # Base pair labels
        bases_title = Text("Base Pairs:", font_size=24, color=WHITE)
        bases_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(bases_title), run_time=1)
        
        # A-T pair
        at_box = Rectangle(width=3, height=1.2, color=BLUE, fill_opacity=0.2)
        at_box.shift(RIGHT*2 + UP*1)
        at_label = MathTex("A", "=", "T", font_size=32)
        at_label[0].set_color(BLUE)
        at_label[2].set_color(RED)
        at_label.move_to(at_box)
        self.play(Create(at_box), Write(at_label), run_time=2)
        
        at_name = Text("Adenine - Thymine", font_size=16).next_to(at_box, DOWN)
        self.play(Write(at_name), run_time=1)
        
        # G-C pair
        gc_box = Rectangle(width=3, height=1.2, color=GREEN, fill_opacity=0.2)
        gc_box.shift(RIGHT*2 + DOWN*1)
        gc_label = MathTex("G", "=", "C", font_size=32)
        gc_label[0].set_color(GREEN)
        gc_label[2].set_color(YELLOW)
        gc_label.move_to(gc_box)
        self.play(Create(gc_box), Write(gc_label), run_time=2)
        
        gc_name = Text("Guanine - Cytosine", font_size=16).next_to(gc_box, DOWN)
        self.play(Write(gc_name), run_time=1)
        
        # SECTION 4: Backbone (38-50s)
        self.play(FadeOut(at_box), FadeOut(at_label), FadeOut(at_name),
                  FadeOut(gc_box), FadeOut(gc_label), FadeOut(gc_name),
                  FadeOut(bases_title))
        
        backbone_title = Text("Sugar-Phosphate Backbone", font_size=24)
        backbone_title.to_edge(UP)
        self.play(Write(backbone_title), run_time=1.5)
        
        # Show backbone structure
        backbone1 = VGroup()
        backbone2 = VGroup()
        for i in range(-3, 4):
            sugar = Circle(radius=0.15, color=YELLOW, fill_opacity=0.8)
            sugar.move_to(np.array([np.sin(i)*0.6, i*0.25, 0]) + LEFT*3)
            phosphate = Circle(radius=0.1, color=ORANGE, fill_opacity=0.8)
            phosphate.move_to(np.array([np.sin(i)*0.6 + 0.2, i*0.25 + 0.1, 0]) + LEFT*3)
            backbone1.add(sugar, phosphate)
            
            sugar2 = Circle(radius=0.15, color=YELLOW, fill_opacity=0.8)
            sugar2.move_to(np.array([np.sin(i+PI)*0.6, i*0.25, 0]) + LEFT*3)
            phosphate2 = Circle(radius=0.1, color=ORANGE, fill_opacity=0.8)
            phosphate2.move_to(np.array([np.sin(i+PI)*0.6 - 0.2, i*0.25 + 0.1, 0]) + LEFT*3)
            backbone2.add(sugar2, phosphate2)
        
        self.play(Create(backbone1), Create(backbone2), run_time=2)
        
        legend = VGroup(
            Circle(radius=0.1, color=YELLOW, fill_opacity=0.8), Text("Sugar", font_size=14),
            Circle(radius=0.1, color=ORANGE, fill_opacity=0.8), Text("Phosphate", font_size=14),
        )
        legend.arrange(RIGHT, buff=0.3)
        legend.to_edge(DOWN)
        self.play(Write(legend), run_time=1.5)
        
        # SECTION 5: Summary (50-65s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("DNA Summary:", font_size=32, color=WHITE),
            Text("• Double helix structure", font_size=24),
            Text("• A pairs with T (2 hydrogen bonds)", font_size=24),
            Text("• G pairs with C (3 hydrogen bonds)", font_size=24),
            Text("• Sugar-phosphate backbone", font_size=24),
            Text("• Stores genetic information", font_size=24),
        )
        summary.arrange(DOWN, buff=0.3)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("DNA Structure", font_size=64)
        final.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "calculus" in concept_lower or "derivative" in concept_lower or "integral" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Calculus Basics", font_size=52)
        title.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Mathematics of Change", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Derivatives (5-25s)
        self.play(FadeOut(subtitle))
        
        deriv_title = Text("Derivatives - Rate of Change", font_size=28, color=PURPLE)
        deriv_title.shift(UP*2.5)
        self.play(Write(deriv_title), run_time=1.5)
        
        # Axes
        axes = Axes(x_range=[-1, 4], y_range=[-1, 5], x_length=6, y_length=4)
        axes.shift(DOWN*0.5)
        labels = axes.get_axis_labels(x_label="x", y_label="y")
        self.play(Create(axes), Create(labels), run_time=1.5)
        
        # Curve y = x^2
        curve = axes.plot(lambda x: x**2, color=BLUE, x_range=[0, 2.2])
        curve_label = MathTex("y = x^2", font_size=24).next_to(curve, RIGHT)
        self.play(Create(curve), Write(curve_label), run_time=1.5)
        
        # Point on curve
        point = Dot(axes.c2p(1.5, 2.25), color=RED, radius=0.08)
        self.play(FadeIn(point), run_time=0.5)
        
        # Tangent line
        tangent = axes.plot(lambda x: 3*x - 2.25, color=YELLOW, x_range=[0.5, 2.5])
        self.play(Create(tangent), run_time=1)
        
        # Slope explanation
        slope = MathTex(r"\\text{Slope} = \\frac{dy}{dx} = 2x", font_size=24)
        slope.to_edge(RIGHT).shift(UP)
        self.play(Write(slope), run_time=1.5)
        
        at_point = MathTex(r"\\text{At } x=1.5: \\frac{dy}{dx} = 3", font_size=22)
        at_point.next_to(slope, DOWN)
        self.play(Write(at_point), run_time=1.5)
        self.wait(1)
        
        # SECTION 3: Integrals (25-50s)
        self.play(*[FadeOut(mob) for mob in self.mobjects if mob != title])
        
        integ_title = Text("Integrals - Area Under Curve", font_size=28, color=GREEN)
        integ_title.shift(UP*2.5)
        self.play(Write(integ_title), run_time=1.5)
        
        # New axes
        axes2 = Axes(x_range=[0, 4], y_range=[0, 3], x_length=6, y_length=3)
        axes2.shift(DOWN*0.5)
        labels2 = axes2.get_axis_labels(x_label="x", y_label="y")
        self.play(Create(axes2), Create(labels2), run_time=1.5)
        
        # Curve y = x
        line_curve = axes2.plot(lambda x: x, color=BLUE, x_range=[0, 2.5])
        self.play(Create(line_curve), run_time=1)
        
        # Area under curve
        area = axes2.get_area(line_curve, x_range=[0, 2], color=GREEN, opacity=0.4)
        self.play(FadeIn(area), run_time=1.5)
        
        # Integral notation
        integral = MathTex(r"\\int_0^2 x \\, dx = \\left[\\frac{x^2}{2}\\right]_0^2 = 2", font_size=28)
        integral.to_edge(DOWN)
        self.play(Write(integral), run_time=2)
        
        area_label = Text("Area = 2 square units", font_size=20, color=GREEN)
        area_label.to_edge(RIGHT).shift(UP)
        self.play(Write(area_label), run_time=1.5)
        self.wait(1)
        
        # SECTION 4: Fundamental Theorem (50-65s)
        self.play(*[FadeOut(mob) for mob in self.mobjects if mob != title])
        
        ft_title = Text("Fundamental Theorem of Calculus", font_size=28, color=YELLOW)
        ft_title.shift(UP*2)
        self.play(Write(ft_title), run_time=1.5)
        
        ft_eq = MathTex(r"\\frac{d}{dx}\\int_a^x f(t)\,dt = f(x)")
        ft_eq.scale(1.5)
        self.play(Write(ft_eq), run_time=2)
        
        ft_explain = Text("Derivatives and Integrals are inverse operations!", font_size=22)
        ft_explain.next_to(ft_eq, DOWN)
        self.play(Write(ft_explain), run_time=2)
        
        # Summary
        summary = VGroup(
            Text("Key Concepts:", font_size=24, color=WHITE),
            Text("• Derivative = Instant rate of change", font_size=20),
            Text("• Integral = Area under curve", font_size=20),
            Text("• They are inverses of each other", font_size=20),
        )
        summary.arrange(DOWN, buff=0.3)
        summary.to_edge(DOWN)
        self.play(Write(summary), run_time=2)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Calculus Basics", font_size=64)
        final.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "bond" in concept_lower or "chemical" in concept_lower or "ionic" in concept_lower or "covalent" in concept_lower:
        return '''
from manim import *

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Chemical Bonding", font_size=52)
        title.set_color_by_gradient(ORANGE, RED)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("How Atoms Connect", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Why bonds form (5-15s)
        self.play(FadeOut(subtitle))
        
        why_title = Text("Why do atoms bond?", font_size=28, color=YELLOW)
        why_title.shift(UP*2)
        self.play(Write(why_title), run_time=1.5)
        
        reason = Text("To achieve stable electron configuration (8 valence electrons)", font_size=20)
        reason.next_to(why_title, DOWN)
        self.play(Write(reason), run_time=2)
        
        octet = MathTex(r"\\rightarrow \\text{Octet Rule}", font_size=24, color=GREEN)
        octet.next_to(reason, DOWN)
        self.play(Write(octet), run_time=1)
        self.wait(1)
        
        # SECTION 3: Ionic Bonds (15-35s)
        self.play(FadeOut(why_title), FadeOut(reason), FadeOut(octet))
        
        ionic_title = Text("Ionic Bonds", font_size=32, color=PURPLE)
        ionic_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(ionic_title), run_time=1)
        
        ionic_explain = Text("Electron transfer between metal and non-metal", font_size=18)
        ionic_explain.next_to(ionic_title, DOWN)
        self.play(Write(ionic_explain), run_time=1.5)
        
        # Na atom
        na = Circle(radius=0.6, color=PURPLE, fill_opacity=0.3)
        na.shift(LEFT*3 + DOWN*0.5)
        na_label = Text("Na", font_size=28).move_to(na)
        na_electrons = VGroup(*[Dot(color=YELLOW, radius=0.06) for _ in range(1)])
        na_electrons[0].move_to(na.get_right() + RIGHT*0.1)
        self.play(Create(na), Write(na_label), Create(na_electrons), run_time=1.5)
        
        # Cl atom
        cl = Circle(radius=0.8, color=GREEN, fill_opacity=0.3)
        cl.shift(RIGHT*2 + DOWN*0.5)
        cl_label = Text("Cl", font_size=28).move_to(cl)
        cl_electrons = VGroup(*[Dot(color=YELLOW, radius=0.06) for _ in range(7)])
        for i, e in enumerate(cl_electrons):
            angle = i * 2 * PI / 7
            e.move_to(cl.get_center() + 0.6 * np.array([np.cos(angle), np.sin(angle), 0]))
        self.play(Create(cl), Write(cl_label), Create(cl_electrons), run_time=1.5)
        
        # Electron transfer animation
        electron = na_electrons[0]
        self.play(electron.animate.move_to(cl.get_center()), run_time=1.5)
        
        # Result: Na+ and Cl-
        na_plus = Text("Na⁺", font_size=24, color=PURPLE).next_to(na, DOWN)
        cl_minus = Text("Cl⁻", font_size=24, color=GREEN).next_to(cl, DOWN)
        self.play(Write(na_plus), Write(cl_minus), run_time=1)
        
        # Bond formation
        bond_arrow = Arrow(na.get_right(), cl.get_left(), color=YELLOW, stroke_width=2)
        self.play(Create(bond_arrow), run_time=1)
        
        # SECTION 4: Covalent Bonds (35-55s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        cov_title = Text("Covalent Bonds", font_size=32, color=BLUE)
        cov_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(cov_title), run_time=1)
        
        cov_explain = Text("Electron sharing between non-metals", font_size=18)
        cov_explain.next_to(cov_title, DOWN)
        self.play(Write(cov_explain), run_time=1.5)
        
        # H2O molecule
        h1 = Circle(radius=0.35, color=WHITE, fill_opacity=0.5)
        h1.shift(LEFT*1.5 + DOWN*0.5)
        h1_label = Text("H", font_size=20).move_to(h1)
        
        h2 = Circle(radius=0.35, color=WHITE, fill_opacity=0.5)
        h2.shift(RIGHT*1.5 + DOWN*0.5)
        h2_label = Text("H", font_size=20).move_to(h2)
        
        o = Circle(radius=0.5, color=RED, fill_opacity=0.5)
        o.shift(DOWN*0.5)
        o_label = Text("O", font_size=24).move_to(o)
        
        self.play(Create(h1), Write(h1_label), Create(h2), Write(h2_label), Create(o), Write(o_label), run_time=2)
        
        # Shared electrons
        shared1 = Dot(color=YELLOW, radius=0.08).shift(LEFT*0.5 + DOWN*0.3)
        shared2 = Dot(color=YELLOW, radius=0.08).shift(RIGHT*0.5 + DOWN*0.3)
        self.play(FadeIn(shared1), FadeIn(shared2), run_time=1)
        
        # Bonds
        bond1 = Line(h1.get_right(), o.get_left(), color=BLUE, stroke_width=3)
        bond2 = Line(h2.get_left(), o.get_right(), color=BLUE, stroke_width=3)
        self.play(Create(bond1), Create(bond2), run_time=1)
        
        h2o_label = MathTex("H_2O", font_size=36).to_edge(DOWN)
        self.play(Write(h2o_label), run_time=1)
        
        # SECTION 5: Comparison (55-68s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        comparison = VGroup(
            Text("Bond Types Comparison:", font_size=28, color=WHITE),
            VGroup(
                Text("Ionic:", font_size=22, color=PURPLE),
                Text("  • Electron transfer", font_size=18),
                Text("  • Metal + Non-metal", font_size=18),
                Text("  • Example: NaCl", font_size=18),
            ),
            VGroup(
                Text("Covalent:", font_size=22, color=BLUE),
                Text("  • Electron sharing", font_size=18),
                Text("  • Non-metal + Non-metal", font_size=18),
                Text("  • Example: H₂O", font_size=18),
            ),
        )
        comparison.arrange(DOWN, buff=0.4)
        self.play(Write(comparison), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Chemical Bonding", font_size=64)
        final.set_color_by_gradient(ORANGE, RED)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "gravity" in concept_lower or "gravitation" in concept_lower or "free fall" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Gravity", font_size=56)
        title.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("The Force That Shapes Our Universe", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Newton's insight (5-15s)
        self.play(FadeOut(subtitle))
        
        # Apple falling
        apple = Circle(radius=0.2, color=RED, fill_opacity=0.9)
        apple.shift(UP*3)
        apple_label = Text("🍎", font_size=32).move_to(apple.get_center())
        
        ground = Rectangle(width=10, height=0.5, color=GREEN, fill_opacity=0.5)
        ground.to_edge(DOWN)
        self.play(Create(ground), run_time=1)
        
        self.play(FadeIn(apple), FadeIn(apple_label))
        
        # Fall animation with acceleration
        fall_path = Line(apple.get_center(), DOWN*2.8, color=WHITE)
        self.play(MoveAlongPath(apple, fall_path), run_time=1.5, rate_func=lambda t: t*t)
        self.play(MoveAlongPath(apple_label, fall_path), run_time=0.01)
        
        # SECTION 3: Force equation (15-30s)
        self.play(FadeOut(apple), FadeOut(apple_label))
        
        # Earth and object
        earth = Circle(radius=1.5, color=BLUE, fill_opacity=0.8)
        earth.shift(DOWN*1)
        earth_label = Text("Earth", font_size=24).next_to(earth, DOWN)
        self.play(Create(earth), Write(earth_label), run_time=2)
        
        object_dot = Dot(UP*2, color=YELLOW, radius=0.15)
        mass_label = MathTex("m", font_size=28).next_to(object_dot, RIGHT)
        self.play(FadeIn(object_dot), Write(mass_label), run_time=1)
        
        # Force arrows
        force_arrow = Arrow(object_dot.get_center(), object_dot.get_center() + DOWN*1.5, color=RED, buff=0)
        force_label = MathTex("F_g", color=RED, font_size=28).next_to(force_arrow, RIGHT)
        self.play(Create(force_arrow), Write(force_label), run_time=2)
        
        # SECTION 4: Newton's Law of Gravitation (30-45s)
        self.play(FadeOut(force_arrow), FadeOut(force_label))
        
        equation_title = Text("Newton's Law of Universal Gravitation", font_size=24)
        equation_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(equation_title), run_time=1.5)
        
        equation = MathTex(r"F = G \\frac{m_1 m_2}{r^2}")
        equation.scale(1.2)
        equation.to_edge(RIGHT)
        self.play(Write(equation), run_time=2)
        
        # Animate masses
        m1_label = MathTex("m_1").next_to(object_dot, UP)
        m2_label = MathTex("m_2").next_to(earth, RIGHT)
        r_label = MathTex("r", color=YELLOW).next_to(Line(object_dot.get_center(), earth.get_top()), RIGHT)
        self.play(Write(m1_label), Write(m2_label), run_time=1.5)
        
        # Distance line
        dist_line = DashedLine(object_dot.get_center(), earth.get_top(), color=YELLOW)
        self.play(Create(dist_line), Write(r_label), run_time=1.5)
        
        # SECTION 5: Acceleration (45-55s)
        self.play(
            FadeOut(equation_title), FadeOut(m1_label), FadeOut(m2_label),
            FadeOut(dist_line), FadeOut(r_label)
        )
        
        g_equation = MathTex(r"g = \\frac{GM}{R^2} \\approx 9.8 \\text{ m/s}^2")
        g_equation.scale(1.2)
        g_equation.shift(UP*1.5)
        self.play(Write(g_equation), run_time=2)
        
        g_label = Text("Acceleration due to gravity", font_size=22, color=WHITE)
        g_label.next_to(g_equation, DOWN)
        self.play(Write(g_label), run_time=1.5)
        
        # SECTION 6: Free fall demonstration (55-65s)
        self.play(FadeOut(g_equation), FadeOut(g_label))
        
        # Timeline
        timeline = Line(LEFT*5, RIGHT*5, color=WHITE)
        timeline.shift(DOWN*2)
        self.play(Create(timeline), run_time=1)
        
        # Time markers
        for i, t in enumerate(["0s", "1s", "2s", "3s"]):
            marker = Text(t, font_size=18)
            marker.shift(DOWN*2 + LEFT*5 + RIGHT*(i*3.33))
            self.play(Write(marker), run_time=0.3)
        
        # Falling objects at different times
        positions = [UP*2, UP*1.5, UP*0.5, DOWN*1.5]
        ball = Dot(color=RED, radius=0.2)
        
        for i, pos in enumerate(positions):
            if i == 0:
                ball.move_to(pos)
                self.play(FadeIn(ball), run_time=0.5)
            else:
                self.play(ball.animate.move_to(pos), run_time=0.7)
        
        # SECTION 7: Summary (65-75s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Key Points:", font_size=32, color=WHITE),
            Text("• Gravity pulls objects toward Earth", font_size=24),
            Text("• All objects fall at same rate (ignoring air)", font_size=24),
            Text("• g ≈ 9.8 m/s² on Earth", font_size=24),
        )
        summary.arrange(DOWN, buff=0.3)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final title
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Gravity", font_size=72)
        final.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "fraction" in concept_lower or "fractions" in concept_lower:
        return '''
from manim import *

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Fractions", font_size=56)
        title.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("Parts of a Whole", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Visual representation (5-18s)
        self.play(FadeOut(subtitle))
        
        # Pizza circle
        pizza = Circle(radius=1.5, color=YELLOW, fill_opacity=0.8)
        pizza.shift(LEFT*3)
        self.play(Create(pizza), run_time=2)
        
        # Cut into 4 pieces
        cut1 = Line(pizza.get_center() + UP*1.5, pizza.get_center() + DOWN*1.5, color=WHITE)
        cut2 = Line(pizza.get_center() + LEFT*1.5, pizza.get_center() + RIGHT*1.5, color=WHITE)
        self.play(Create(cut1), Create(cut2), run_time=1)
        
        # Highlight 1 piece
        slice1 = Sector(outer_radius=1.5, angle=PI/2, color=RED, fill_opacity=0.8)
        slice1.move_to(pizza.get_center())
        self.play(FadeIn(slice1), run_time=1)
        
        # Fraction label
        frac1 = MathTex(r"\\frac{1}{4}", font_size=48)
        frac1.next_to(pizza, DOWN)
        self.play(Write(frac1), run_time=1.5)
        
        # SECTION 3: Numerator and Denominator (18-30s)
        self.play(FadeOut(pizza), FadeOut(slice1), FadeOut(cut1), FadeOut(cut2))
        
        # Large fraction
        big_frac = MathTex(r"\\frac{1}{4}", font_size=96)
        self.play(Write(big_frac), run_time=2)
        
        # Labels
        num_label = Text("Numerator", font_size=24, color=GREEN)
        num_label.next_to(big_frac[0][0], UP)
        num_arrow = Arrow(num_label.get_bottom(), big_frac[0][0].get_top(), color=GREEN)
        
        den_label = Text("Denominator", font_size=24, color=BLUE)
        den_label.next_to(big_frac[0][2], DOWN)
        den_arrow = Arrow(den_label.get_top(), big_frac[0][2].get_bottom(), color=BLUE)
        
        self.play(Write(num_label), Create(num_arrow), run_time=1.5)
        self.play(Write(den_label), Create(den_arrow), run_time=1.5)
        
        # SECTION 4: Equivalent fractions (30-45s)
        self.play(FadeOut(big_frac), FadeOut(num_label), FadeOut(den_label), 
                  FadeOut(num_arrow), FadeOut(den_arrow))
        
        eq_title = Text("Equivalent Fractions", font_size=32)
        eq_title.to_edge(UP)
        self.play(Write(eq_title), run_time=1)
        
        # Show 1/2 = 2/4 = 4/8
        fractions = VGroup(
            MathTex(r"\\frac{1}{2}"),
            MathTex("="),
            MathTex(r"\\frac{2}{4}"),
            MathTex("="),
            MathTex(r"\\frac{4}{8}")
        )
        fractions.scale(1.5)
        fractions.arrange(RIGHT, buff=0.5)
        fractions.shift(UP*0.5)
        
        for frac in fractions:
            self.play(Write(frac), run_time=0.8)
        
        # Visual bars
        bar1 = Rectangle(width=4, height=0.5, color=BLUE, fill_opacity=0.8)
        bar1.shift(DOWN*1.5 + LEFT*4)
        bar1_half = Rectangle(width=2, height=0.5, color=RED, fill_opacity=0.8)
        bar1_half.align_to(bar1, LEFT)
        bar1_half.shift(DOWN*1.5 + LEFT*4)
        self.play(Create(bar1), Create(bar1_half), run_time=1.5)
        
        bar2 = Rectangle(width=4, height=0.5, color=BLUE, fill_opacity=0.8)
        bar2.shift(DOWN*2.5 + LEFT*4)
        bar2_quarters = VGroup(*[Rectangle(width=1, height=0.5, color=RED, fill_opacity=0.8) for _ in range(2)])
        for i, q in enumerate(bar2_quarters):
            q.align_to(bar2, LEFT)
            q.shift(DOWN*2.5 + LEFT*4 + RIGHT*i)
        self.play(Create(bar2), Create(bar2_quarters), run_time=1.5)
        
        # SECTION 5: Adding fractions (45-60s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        add_title = Text("Adding Fractions", font_size=32)
        add_title.to_edge(UP)
        self.play(Write(add_title), run_time=1)
        
        # Same denominator
        same = MathTex(r"\\frac{1}{4} + \\frac{2}{4} = \\frac{3}{4}")
        same.scale(1.3)
        same.shift(UP*1)
        same_label = Text("Same denominator: just add numerators", font_size=20, color=GREEN)
        same_label.next_to(same, DOWN)
        self.play(Write(same), Write(same_label), run_time=2)
        
        # Different denominators
        diff = MathTex(r"\\frac{1}{2} + \\frac{1}{3} = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}")
        diff.scale(1.1)
        diff.shift(DOWN*1.5)
        diff_label = Text("Different denominators: find common denominator first", font_size=20, color=ORANGE)
        diff_label.next_to(diff, DOWN)
        self.play(Write(diff), Write(diff_label), run_time=2.5)
        
        # SECTION 6: Summary (60-70s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Remember:", font_size=32, color=WHITE),
            Text("• Numerator = parts we have", font_size=24),
            Text("• Denominator = total parts", font_size=24),
            Text("• Same denominators = add directly", font_size=24),
            Text("• Different denominators = find LCD first", font_size=24),
        )
        summary.arrange(DOWN, buff=0.3)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Fractions", font_size=72)
        final.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "atom" in concept_lower or "atomic" in concept_lower or "electron" in concept_lower:
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Atomic Structure", font_size=52)
        title.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("Building Blocks of Matter", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Nucleus (5-20s)
        self.play(FadeOut(subtitle))
        
        # Protons and neutrons
        nucleus_group = VGroup()
        
        # Protons (red)
        proton1 = Circle(radius=0.25, color=RED, fill_opacity=0.9)
        proton2 = Circle(radius=0.25, color=RED, fill_opacity=0.9)
        proton1.shift(LEFT*0.15 + UP*0.1)
        proton2.shift(RIGHT*0.15 + DOWN*0.1)
        
        # Neutrons (blue)
        neutron1 = Circle(radius=0.25, color=BLUE, fill_opacity=0.9)
        neutron2 = Circle(radius=0.25, color=BLUE, fill_opacity=0.9)
        neutron1.shift(RIGHT*0.15 + UP*0.1)
        neutron2.shift(LEFT*0.15 + DOWN*0.1)
        
        nucleus_group.add(proton1, proton2, neutron1, neutron2)
        nucleus_label = Text("Nucleus", font_size=24).next_to(nucleus_group, DOWN)
        
        self.play(Create(nucleus_group), Write(nucleus_label), run_time=2)
        
        # Proton/Neutron labels
        p_label = Text("p⁺ (proton)", font_size=18, color=RED).shift(LEFT*4 + UP*2)
        n_label = Text("n (neutron)", font_size=18, color=BLUE).shift(LEFT*4 + UP*1)
        self.play(Write(p_label), Write(n_label), run_time=1.5)
        
        # SECTION 3: Electron shells (20-35s)
        # First shell
        shell1 = Circle(radius=1.2, color=WHITE, stroke_width=2)
        self.play(Create(shell1), run_time=1)
        
        # Electrons on first shell
        e1 = Dot(UP*1.2, color=YELLOW, radius=0.1)
        e2 = Dot(DOWN*1.2, color=YELLOW, radius=0.1)
        electron_label = Text("e⁻ (electron)", font_size=18, color=YELLOW).shift(RIGHT*4 + UP*2)
        self.play(FadeIn(e1), FadeIn(e2), Write(electron_label), run_time=1.5)
        
        # Second shell
        shell2 = Circle(radius=2, color=WHITE, stroke_width=2)
        self.play(Create(shell2), run_time=1)
        
        # Electrons on second shell (8 max, showing 6)
        electrons2 = VGroup()
        for i in range(6):
            angle = i * PI / 3
            e = Dot(np.array([2*np.cos(angle), 2*np.sin(angle), 0]), color=YELLOW, radius=0.1)
            electrons2.add(e)
        self.play(FadeIn(electrons2), run_time=1.5)
        
        # SECTION 4: Bohr model explanation (35-50s)
        shell_labels = VGroup(
            Text("K shell (2 e⁻)", font_size=18).next_to(shell1, RIGHT),
            Text("L shell (8 e⁻ max)", font_size=18).next_to(shell2, RIGHT)
        )
        shell_labels[0].shift(UP*0.5)
        shell_labels[1].shift(DOWN*0.5)
        self.play(Write(shell_labels), run_time=2)
        
        # Electron configuration
        config = MathTex(r"1s^2 \; 2s^2 \; 2p^4")
        config.to_edge(RIGHT).shift(UP*2)
        config_label = Text("Electron Configuration", font_size=18).next_to(config, UP)
        self.play(Write(config), Write(config_label), run_time=2)
        
        # SECTION 5: Charges (50-60s)
        self.play(
            FadeOut(shell_labels), FadeOut(config), FadeOut(config_label)
        )
        
        charge_title = Text("Particle Charges", font_size=28)
        charge_title.shift(UP*2 + LEFT*4)
        self.play(Write(charge_title), run_time=1)
        
        charges = VGroup(
            MathTex("p^+: +1", color=RED, font_size=28),
            MathTex("n: 0", color=BLUE, font_size=28),
            MathTex("e^-: -1", color=YELLOW, font_size=28)
        )
        charges.arrange(DOWN, buff=0.4)
        charges.next_to(charge_title, DOWN, buff=0.5)
        
        for charge in charges:
            self.play(Write(charge), run_time=0.8)
        
        # Neutral atom equation
        neutral = MathTex(r"\\text{Neutral atom: } \\#p^+ = \\#e^-")
        neutral.to_edge(DOWN)
        self.play(Write(neutral), run_time=1.5)
        
        # SECTION 6: Summary (60-70s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Atomic Structure:", font_size=32, color=WHITE),
            Text("• Nucleus = protons + neutrons", font_size=24),
            Text("• Electrons orbit in shells", font_size=24),
            Text("• Protons determine element", font_size=24),
            Text("• Electrons determine chemistry", font_size=24),
        )
        summary.arrange(DOWN, buff=0.3)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Atomic Structure", font_size=64)
        final.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "ecosystem" in concept_lower or "food chain" in concept_lower or "food web" in concept_lower:
        return '''
from manim import *

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Ecosystems", font_size=56)
        title.set_color_by_gradient(GREEN, TEAL)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("Nature's Web of Life", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Producers (5-18s)
        self.play(FadeOut(subtitle))
        
        # Sun
        sun = Circle(radius=0.8, color=YELLOW, fill_opacity=0.9)
        sun.shift(UP*2.5 + LEFT*5)
        sun_rays = VGroup(*[Line(sun.get_center(), sun.get_center() + 0.8*RIGHT + i*0.2*UP, color=YELLOW) for i in range(-2, 3)])
        self.play(Create(sun), Create(sun_rays), run_time=2)
        
        # Plants
        plant = VGroup()
        stem = Rectangle(width=0.2, height=1, color=GREEN_D, fill_opacity=0.8)
        leaf = Ellipse(width=1, height=0.5, color=GREEN, fill_opacity=0.8)
        leaf.shift(UP*0.3)
        plant.add(stem, leaf)
        plant.shift(LEFT*2 + DOWN*0.5)
        
        producer_label = Text("Producer", font_size=20, color=GREEN).next_to(plant, DOWN)
        self.play(Create(plant), Write(producer_label), run_time=2)
        
        # Arrow from sun to plant
        sun_arrow = Arrow(sun.get_right(), plant.get_left() + UP*0.5, color=YELLOW)
        energy_text = Text("Energy", font_size=16, color=YELLOW).next_to(sun_arrow, UP)
        self.play(Create(sun_arrow), Write(energy_text), run_time=1.5)
        
        # Photosynthesis equation
        photo_eq = MathTex(r"CO_2 + H_2O + light \\rightarrow glucose + O_2")
        photo_eq.scale(0.7)
        photo_eq.to_edge(LEFT).shift(DOWN*2)
        self.play(Write(photo_eq), run_time=1.5)
        
        # SECTION 3: Consumers (18-35s)
        # Primary consumer (herbivore)
        consumer1 = Text("🐰", font_size=48)
        consumer1.shift(RIGHT*1 + DOWN*0.5)
        c1_label = Text("Primary Consumer", font_size=16, color=ORANGE).next_to(consumer1, DOWN)
        
        arrow1 = Arrow(plant.get_right(), consumer1.get_left(), color=GREEN)
        self.play(Create(arrow1), FadeIn(consumer1), Write(c1_label), run_time=2)
        
        # Secondary consumer
        consumer2 = Text("🦊", font_size=48)
        consumer2.shift(RIGHT*3.5 + UP*0.5)
        c2_label = Text("Secondary Consumer", font_size=16, color=RED).next_to(consumer2, DOWN)
        
        arrow2 = Arrow(consumer1.get_right() + UP*0.3, consumer2.get_left(), color=ORANGE)
        self.play(Create(arrow2), FadeIn(consumer2), Write(c2_label), run_time=2)
        
        # Tertiary consumer
        consumer3 = Text("🦁", font_size=48)
        consumer3.shift(RIGHT*5.5 + UP*1.5)
        c3_label = Text("Tertiary Consumer", font_size=16, color=PURPLE).next_to(consumer3, DOWN)
        
        arrow3 = Arrow(consumer2.get_top(), consumer3.get_bottom(), color=RED)
        self.play(Create(arrow3), FadeIn(consumer3), Write(c3_label), run_time=2)
        
        # SECTION 4: Decomposers (35-50s)
        decomposer = Text("🍄", font_size=40)
        decomposer.shift(DOWN*2 + RIGHT*1)
        d_label = Text("Decomposer", font_size=16, color=MAROON_B).next_to(decomposer, RIGHT)
        self.play(FadeIn(decomposer), Write(d_label), run_time=1.5)
        
        # Decomposition arrows
        dec_arrows = VGroup(
            Arrow(consumer1.get_bottom(), decomposer.get_left(), color=MAROON_B),
            Arrow(consumer2.get_bottom(), decomposer.get_left() + UP*0.3, color=MAROON_B),
            Arrow(plant.get_bottom(), decomposer.get_left() + DOWN*0.3, color=MAROON_B)
        )
        self.play(Create(dec_arrows), run_time=1.5)
        
        # Nutrient cycle
        nutrient_arrow = CurvedArrow(decomposer.get_right(), plant.get_bottom() + RIGHT*0.5, color=MAROON_B)
        nutrient_label = Text("Nutrients", font_size=14, color=MAROON_B).next_to(nutrient_arrow, RIGHT)
        self.play(Create(nutrient_arrow), Write(nutrient_label), run_time=1.5)
        
        # SECTION 5: Energy pyramid (50-62s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        pyramid_title = Text("Energy Pyramid", font_size=28)
        pyramid_title.to_edge(UP)
        self.play(Write(pyramid_title), run_time=1)
        
        # Pyramid levels
        levels = VGroup(
            Polygon(LEFT*2, RIGHT*2, RIGHT*1 + UP*0.8, LEFT*1 + UP*0.8, color=RED, fill_opacity=0.8),
            Polygon(LEFT*1 + UP*0.8, RIGHT*1 + UP*0.8, RIGHT*0.5 + UP*1.6, LEFT*0.5 + UP*1.6, color=ORANGE, fill_opacity=0.8),
            Polygon(LEFT*0.5 + UP*1.6, RIGHT*0.5 + UP*1.6, UP*2.4, color=YELLOW, fill_opacity=0.8),
        )
        levels.shift(DOWN*0.5)
        
        level_labels = VGroup(
            Text("Producers (most energy)", font_size=14).next_to(levels[0], DOWN),
            Text("Primary Consumers", font_size=14).next_to(levels[1], RIGHT),
            Text("Top Consumers (least energy)", font_size=14).next_to(levels[2], UP),
        )
        
        self.play(Create(levels), run_time=2)
        self.play(Write(level_labels), run_time=1.5)
        
        # Energy loss note
        loss_text = Text("Only ~10% energy transfers to next level!", font_size=20, color=RED)
        loss_text.to_edge(DOWN)
        self.play(Write(loss_text), run_time=1.5)
        
        # SECTION 6: Summary (62-72s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Ecosystem Components:", font_size=32, color=WHITE),
            Text("• Producers: Make their own food", font_size=24),
            Text("• Consumers: Eat other organisms", font_size=24),
            Text("• Decomposers: Break down dead matter", font_size=24),
            Text("• Energy flows: Sun → Producers → Consumers", font_size=24),
        )
        summary.arrange(DOWN, buff=0.3)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Ecosystems", font_size=72)
        final.set_color_by_gradient(GREEN, TEAL)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    elif "mitosis" in concept_lower or "cell division" in concept_lower:
        return '''
from manim import *

class ConceptScene(Scene):
    def construct(self):
        # INTRO: Title (0-5s)
        title = Text("Mitosis", font_size=56)
        title.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(title), run_time=2)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("Cell Division Process", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1)
        
        # SECTION 2: Interphase (5-15s)
        self.play(FadeOut(subtitle))
        
        stages_title = Text("Stages of Mitosis", font_size=24).to_edge(LEFT).shift(UP*2)
        self.play(Write(stages_title), run_time=1)
        
        # Interphase cell
        cell1 = Circle(radius=1, color=WHITE, stroke_width=3)
        cell1.shift(LEFT*4)
        
        # Chromatin (loose DNA)
        chromatin = VGroup(*[Dot(color=BLUE, radius=0.08) for _ in range(8)])
        for i, c in enumerate(chromatin):
            angle = i * PI / 4
            c.move_to(cell1.get_center() + 0.3 * np.array([np.cos(angle), np.sin(angle), 0]))
        
        inter_label = Text("Interphase", font_size=18, color=GREEN).next_to(cell1, DOWN)
        self.play(Create(cell1), FadeIn(chromatin), Write(inter_label), run_time=2)
        
        # SECTION 3: Prophase (15-25s)
        cell2 = Circle(radius=1, color=WHITE, stroke_width=3)
        cell2.shift(LEFT*1.5)
        
        # Condensed chromosomes
        chromosomes2 = VGroup()
        for i in range(4):
            chrom = Line(UP*0.3, DOWN*0.3, color=BLUE, stroke_width=6)
            chrom.rotate(i * PI/4)
            chrom.move_to(cell2.get_center() + 0.2 * np.array([np.cos(i*PI/2), np.sin(i*PI/2), 0]))
            chromosomes2.add(chrom)
        
        pro_label = Text("Prophase", font_size=18, color=BLUE).next_to(cell2, DOWN)
        self.play(Create(cell2), Create(chromosomes2), Write(pro_label), run_time=2)
        
        # SECTION 4: Metaphase (25-35s)
        cell3 = Circle(radius=1, color=WHITE, stroke_width=3)
        cell3.shift(RIGHT*1)
        
        # Spindle fibers
        spindle = VGroup(
            Line(cell3.get_center() + LEFT*1, cell3.get_center(), color=YELLOW),
            Line(cell3.get_center() + RIGHT*1, cell3.get_center(), color=YELLOW),
        )
        
        # Chromosomes at equator
        chromosomes3 = VGroup(
            Line(UP*0.4, DOWN*0.4, color=BLUE, stroke_width=6).shift(cell3.get_center() + LEFT*0.2),
            Line(UP*0.4, DOWN*0.4, color=BLUE, stroke_width=6).shift(cell3.get_center() + RIGHT*0.2),
        )
        
        meta_label = Text("Metaphase", font_size=18, color=YELLOW).next_to(cell3, DOWN)
        self.play(Create(cell3), Create(spindle), Create(chromosomes3), Write(meta_label), run_time=2)
        
        # SECTION 5: Anaphase (35-45s)
        cell4 = Circle(radius=1, color=WHITE, stroke_width=3)
        cell4.shift(RIGHT*3.5)
        
        # Separated chromosomes
        chrom_separated = VGroup(
            Line(UP*0.3, DOWN*0.3, color=BLUE, stroke_width=5).shift(cell4.get_center() + LEFT*0.5),
            Line(UP*0.3, DOWN*0.3, color=BLUE, stroke_width=5).shift(cell4.get_center() + RIGHT*0.5),
            Line(UP*0.3, DOWN*0.3, color=RED, stroke_width=5).shift(cell4.get_center() + LEFT*0.7),
            Line(UP*0.3, DOWN*0.3, color=RED, stroke_width=5).shift(cell4.get_center() + RIGHT*0.7),
        )
        
        ana_label = Text("Anaphase", font_size=18, color=RED).next_to(cell4, DOWN)
        self.play(Create(cell4), Create(chrom_separated), Write(ana_label), run_time=2)
        
        # SECTION 6: Telophase & Cytokinesis (45-58s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        # Two daughter cells
        daughter1 = Circle(radius=0.8, color=WHITE, stroke_width=3)
        daughter1.shift(LEFT*2)
        daughter2 = Circle(radius=0.8, color=WHITE, stroke_width=3)
        daughter2.shift(RIGHT*2)
        
        # Nuclei reforming
        nucleus1 = Circle(radius=0.3, color=BLUE, fill_opacity=0.3)
        nucleus1.move_to(daughter1.get_center())
        nucleus2 = Circle(radius=0.3, color=BLUE, fill_opacity=0.3)
        nucleus2.move_to(daughter2.get_center())
        
        telo_label = Text("Telophase - Two Daughter Cells", font_size=24, color=GREEN)
        telo_label.to_edge(DOWN)
        
        self.play(Create(daughter1), Create(daughter2), Create(nucleus1), Create(nucleus2), Write(telo_label), run_time=3)
        
        # Division line
        div_line = Line(UP*2, DOWN*2, color=YELLOW, stroke_width=2)
        self.play(Create(div_line), run_time=1)
        self.wait(1)
        
        # SECTION 7: Summary (58-70s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Mitosis Summary:", font_size=32, color=WHITE),
            Text("1. Interphase: DNA replicates", font_size=22),
            Text("2. Prophase: Chromosomes condense", font_size=22),
            Text("3. Metaphase: Chromosomes align", font_size=22),
            Text("4. Anaphase: Sister chromatids separate", font_size=22),
            Text("5. Telophase: Two nuclei form", font_size=22),
        )
        summary.arrange(DOWN, buff=0.25)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("Mitosis", font_size=72)
        final.set_color_by_gradient(PURPLE, PINK)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''
    else:
        # Generic template - comprehensive 1-minute video
        return '''
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        # SECTION 1: Title (0-8s)
        title = Text("{concept}", font_size=52)
        title.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(title), run_time=2.5)
        self.play(title.animate.to_edge(UP), run_time=1)
        subtitle = Text("An Educational Overview", font_size=28)
        subtitle.next_to(title, DOWN)
        self.play(FadeIn(subtitle), run_time=1)
        self.wait(1.5)
        
        # SECTION 2: Key Concepts (8-22s)
        self.play(FadeOut(subtitle))
        
        concepts_title = Text("Key Concepts", font_size=28, color=YELLOW)
        concepts_title.shift(UP*1.5)
        self.play(Write(concepts_title), run_time=1.5)
        
        # Bullet points
        bullets = VGroup(
            Text("• Definition and importance", font_size=22),
            Text("• Core principles", font_size=22),
            Text("• Real-world applications", font_size=22),
            Text("• Key formulas and methods", font_size=22),
        )
        bullets.arrange(DOWN, buff=0.4, aligned_edge=LEFT)
        bullets.next_to(concepts_title, DOWN, buff=0.5)
        
        for bullet in bullets:
            self.play(Write(bullet), run_time=0.8)
        self.wait(1)
        
        # SECTION 3: Visual Diagram (22-38s)
        self.play(FadeOut(concepts_title), FadeOut(bullets))
        
        diagram_title = Text("Visual Representation", font_size=24, color=GREEN)
        diagram_title.to_edge(LEFT).shift(UP*2)
        self.play(Write(diagram_title), run_time=1)
        
        # Central circle
        center = Circle(radius=0.8, color=BLUE, fill_opacity=0.3)
        center.shift(LEFT*2)
        center_label = Text("{concept}", font_size=16).move_to(center)
        self.play(Create(center), Write(center_label), run_time=2)
        
        # Surrounding elements
        elements = VGroup()
        labels = ["Principle 1", "Principle 2", "Principle 3", "Principle 4"]
        colors = [RED, GREEN, YELLOW, PURPLE]
        for i, (label, color) in enumerate(zip(labels, colors)):
            elem = Circle(radius=0.5, color=color, fill_opacity=0.3)
            angle = i * PI / 2
            elem.move_to(center.get_center() + 2.5 * np.array([np.cos(angle), np.sin(angle), 0]))
            elem_label = Text(label, font_size=12).next_to(elem, DOWN, buff=0.1)
            elements.add(elem, elem_label)
            
        self.play(Create(elements), run_time=3)
        
        # Connecting lines
        lines = VGroup()
        for i, elem in enumerate(elements[::2]):
            line = Line(center.get_right() if i < 2 else center.get_left(),
                       elem.get_center(),
                       color=WHITE, stroke_width=1, stroke_opacity=0.5)
            lines.add(line)
        self.play(Create(lines), run_time=2)
        self.wait(1)
        
        # SECTION 4: Formulas (38-50s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        formula_title = Text("Important Relations", font_size=28, color=TEAL)
        formula_title.shift(UP*2)
        self.play(Write(formula_title), run_time=1.5)
        
        # Generic formulas
        formulas = VGroup(
            MathTex("a^2 + b^2 = c^2", font_size=28),
            MathTex("E = mc^2", font_size=28),
            MathTex("F = ma", font_size=28),
        )
        formulas.arrange(DOWN, buff=0.5)
        formulas.next_to(formula_title, DOWN, buff=0.5)
        
        for formula in formulas:
            self.play(Write(formula), run_time=1.2)
        self.wait(1)
        
        # SECTION 5: Applications (50-62s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        apps_title = Text("Real-World Applications", font_size=28, color=ORANGE)
        apps_title.to_edge(UP)
        self.play(Write(apps_title), run_time=1.5)
        
        # Application boxes
        apps = VGroup(
            Rectangle(width=3, height=1, color=BLUE, fill_opacity=0.3),
            Rectangle(width=3, height=1, color=GREEN, fill_opacity=0.3),
            Rectangle(width=3, height=1, color=PURPLE, fill_opacity=0.3),
        )
        apps.arrange(RIGHT, buff=0.5)
        apps.shift(DOWN*0.5)
        
        app_labels = VGroup(
            Text("Science", font_size=18),
            Text("Engineering", font_size=18),
            Text("Technology", font_size=18),
        )
        for i, (rect, label) in enumerate(zip(apps, app_labels)):
            label.move_to(rect)
        
        self.play(Create(apps), Create(app_labels), run_time=2)
        self.wait(1)
        
        # SECTION 6: Summary (62-75s)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        
        summary = VGroup(
            Text("Summary", font_size=32, color=WHITE),
            Text("• Core concepts explained", font_size=22),
            Text("• Visual diagrams provided", font_size=22),
            Text("• Key formulas highlighted", font_size=22),
            Text("• Applications demonstrated", font_size=22),
        )
        summary.arrange(DOWN, buff=0.4)
        self.play(Write(summary), run_time=3)
        
        self.wait(2)
        
        # Final
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        final = Text("{concept}", font_size=64)
        final.set_color_by_gradient(BLUE, PURPLE)
        self.play(Write(final), run_time=2)
        self.wait(1)
'''.format(concept=concept)


async def render_video(
    job_id: str,
    concept: str,
    language: str,
    explanation: str = "",
    visual_style: str = "diagram-heavy",
):
    """Background task to render video with Manim + TTS audio."""
    try:
        video_jobs[job_id]["status"] = "generating_script"
        video_jobs[job_id]["progress"] = 10

        video_jobs[job_id]["status"] = "rendering"
        video_jobs[job_id]["progress"] = 40

        def _run_pipeline_generation():
            # Run the full async pipeline on a dedicated thread event-loop so
            # the main FastAPI loop remains responsive for status polling.
            pipeline = SelfHealingVideoPipeline()
            return asyncio.run(
                pipeline.generate(
                    concept=concept,
                    explanation=explanation or f"Explain {concept} clearly for students.",
                    language=language,
                    visual_style=visual_style,
                )
            )

        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(_run_pipeline_generation),
                timeout=VIDEO_RENDER_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            video_jobs[job_id]["status"] = "failed"
            video_jobs[job_id]["error_message"] = (
                f"Video generation timed out after {VIDEO_RENDER_TIMEOUT_SECONDS} seconds"
            )
            return

        if not result.success or not result.video_path or not result.video_path.exists():
            video_jobs[job_id]["status"] = "failed"
            video_jobs[job_id]["error_message"] = result.error_message or "Video generation failed"
            return

        video_jobs[job_id]["progress"] = 85

        media_dir = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media/videos")
        media_dir.mkdir(parents=True, exist_ok=True)
        final_path = media_dir / f"{job_id}.mp4"
        shutil.copy(result.video_path, final_path)

        await compress_video_for_whatsapp(final_path)

        if result.subtitles_path and result.subtitles_path.exists():
            subtitles_dir = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media/subtitles")
            subtitles_dir.mkdir(parents=True, exist_ok=True)
            subtitles_path = subtitles_dir / f"{job_id}.srt"
            shutil.copy(result.subtitles_path, subtitles_path)
            video_jobs[job_id]["subtitles_url"] = f"http://localhost:8000/media/subtitles/{job_id}.srt"

        video_jobs[job_id]["status"] = "completed"
        video_jobs[job_id]["progress"] = 100
        video_jobs[job_id]["video_url"] = f"http://localhost:8000/media/videos/{job_id}.mp4"
            
    except Exception as e:
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error_message"] = str(e)


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
):
    """Generate educational video from concept."""
    job_id = str(uuid.uuid4())
    
    video_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "concept": request.concept,
        "language": request.language,
    }
    
    # Start rendering as an independent asyncio task so status polling stays responsive.
    task = asyncio.create_task(
        render_video(
            job_id,
            request.concept,
            request.language,
            request.explanation,
            request.visual_style,
        )
    )
    video_tasks[job_id] = task
    task.add_done_callback(lambda _: video_tasks.pop(job_id, None))
    
    return VideoGenerationResponse(
        job_id=job_id,
        status="pending",
        estimated_time=60,
    )


@router.get("/status/{job_id}", response_model=VideoStatusResponse)
async def get_video_status(job_id: str):
    """Get video generation status."""
    if job_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = video_jobs[job_id]
    return VideoStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0),
        video_url=job.get("video_url"),
        error_message=job.get("error_message"),
    )


@router.get("/feed", response_model=list[VideoFeedItem])
async def get_video_feed(viewer_id: Optional[str] = None):
    """Return a normalized feed for the insta pipeline experience."""

    return [VideoFeedItem(**item) for item in _build_feed_items(viewer_id)]


@router.post("/feed/{video_id}/reaction", response_model=FeedReactionSummary)
async def react_to_feed_video(video_id: str, request: FeedReactionRequest):
    """Persist like or dislike state for a feed item."""

    feed_item_ids = {item["id"] for item in _build_feed_items()}
    if video_id not in feed_item_ids:
        raise HTTPException(status_code=404, detail="Feed video not found")

    reactions = _load_reactions()
    video_state = reactions.setdefault("videos", {}).setdefault(video_id, {"viewers": {}})
    viewer_state = video_state.setdefault("viewers", {}).setdefault(request.viewer_id, {})

    if request.reaction == "clear":
        viewer_state.pop("reaction", None)
    else:
        viewer_state["reaction"] = request.reaction

    _save_reactions(reactions)
    summary = _reaction_summary(reactions, video_id, request.viewer_id)
    return FeedReactionSummary(**summary)


@router.post("/feed/{video_id}/view", response_model=FeedReactionSummary)
async def record_feed_video_view(video_id: str, request: FeedViewRequest):
    """Record a feed view for ranking and lightweight analytics."""

    feed_item_ids = {item["id"] for item in _build_feed_items()}
    if video_id not in feed_item_ids:
        raise HTTPException(status_code=404, detail="Feed video not found")

    reactions = _load_reactions()
    video_state = reactions.setdefault("videos", {}).setdefault(video_id, {"viewers": {}})
    viewer_state = video_state.setdefault("viewers", {}).setdefault(request.viewer_id, {})
    viewer_state["viewed"] = True
    viewer_state["watch_time_ms"] = max(int(viewer_state.get("watch_time_ms", 0)), request.watch_time_ms)

    _save_reactions(reactions)
    summary = _reaction_summary(reactions, video_id, request.viewer_id)
    return FeedReactionSummary(**summary)


@router.get("/stream/{job_id}")
async def stream_video(job_id: str):
    """Stream generated video."""
    return {"stream_url": f"http://localhost:8000/media/videos/{job_id}.mp4"}


@router.post("/analyze-drawing", response_model=DrawingAnalysisResponse)
async def analyze_drawing(
    request: DrawingAnalysisRequest,
    background_tasks: BackgroundTasks,
):
    """Analyze a drawing/image using Gemini AI and return AI analysis only."""
    try:
        from app.services.gemini import gemini_service
        
        # Analyze the image
        result = await gemini_service.analyze_image(request.image_data, request.question)
        
        # Check for error in result (support both old "Error:" and new "⚠️" formats)
        analysis = result.get("analysis", "")
        if analysis.startswith("Error:") or analysis.startswith("⚠️") or result.get("problem_type") == "error":
            return DrawingAnalysisResponse(
                analysis=analysis,
                solution=None,
                steps=[],
                video_job_id=None,
            )
        
        # Return analysis only (no video generation)
        return DrawingAnalysisResponse(
            analysis=result.get("analysis", "Analysis complete!"),
            solution=result.get("solution"),
            steps=result.get("steps", []),
            video_job_id=None,
        )
    except Exception as e:
        return DrawingAnalysisResponse(
            analysis=f"⚠️ **Analysis Error**\n\nCould not analyze the drawing: {str(e)}\n\nTry drawing a clearer shape or check your connection.",
            solution=None,
            steps=[],
            video_job_id=None,
        )


async def render_video_from_analysis(job_id: str, analysis: dict):
    """Render video from drawing analysis result."""
    try:
        video_jobs[job_id]["status"] = "generating_code"
        video_jobs[job_id]["progress"] = 10
        
        from app.services.gemini import gemini_service
        
        # Generate Manim code using Gemini
        concept = analysis.get("analysis", "Math Problem")
        steps = analysis.get("steps", [])
        solution = analysis.get("solution", "")
        
        context = f"Steps: {steps}\nSolution: {solution}"
        manim_code = await gemini_service.generate_manim_code(concept, context)
        
        video_jobs[job_id]["status"] = "rendering"
        video_jobs[job_id]["progress"] = 30
        
        # Create temp directory
        job_dir = Path(tempfile.mkdtemp(prefix=f"manim_{job_id}_"))
        scene_file = job_dir / "scene.py"
        scene_file.write_text(manim_code)
        
        # Run manim
        output_dir = job_dir / "output"
        cmd = [
            MANIM_BIN,
            "-qm",
            "--media_dir", str(output_dir),
            str(scene_file),
            "ConceptScene"
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(job_dir)
        )
        
        video_jobs[job_id]["progress"] = 50
        stdout, stderr = await process.communicate()
        
        video_jobs[job_id]["progress"] = 80
        
        # Find generated video
        videos = list(output_dir.rglob("*.mp4"))
        if videos:
            media_dir = Path("/Users/coder.op/Gyan_Ed/Gyan_Intent/backend/media/videos")
            media_dir.mkdir(parents=True, exist_ok=True)
            final_path = media_dir / f"{job_id}.mp4"
            
            import shutil
            shutil.copy(videos[0], final_path)
            
            # Compress if too large for WhatsApp
            await compress_video_for_whatsapp(final_path)
            
            video_jobs[job_id]["status"] = "completed"
            video_jobs[job_id]["progress"] = 100
            video_jobs[job_id]["video_url"] = f"http://localhost:8000/media/videos/{job_id}.mp4"
        else:
            video_jobs[job_id]["status"] = "failed"
            video_jobs[job_id]["error_message"] = "Video generation failed"
            
    except Exception as e:
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error_message"] = str(e)


@router.post("/solve-math")
async def solve_math(problem: str):
    """Solve a math problem using Gemini AI."""
    from app.services.gemini import gemini_service
    
    result = await gemini_service.solve_math_problem(problem)
    return result


# ---------------------------------------------------------------------------
# PDF → Topic Videos (cache-first)
# ---------------------------------------------------------------------------

class PDFVideoRequest(BaseModel):
    """Request to generate topic videos from PDF text."""
    pdf_text: str = Field(..., description="Extracted text content from the PDF")
    language: str = Field(default="english")
    num_topics: int = Field(default=7, ge=1, le=15)
    user_id: str = Field(default="")


class PDFTopicsResponse(BaseModel):
    """Response with extracted topics and their job IDs."""
    paper_title: str
    topics: list[dict]
    all_cached: bool = False


def _load_paper_cache() -> dict:
    if PAPER_CACHE_PATH.exists():
        try:
            return json.loads(PAPER_CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def _save_paper_cache(data: dict) -> None:
    PAPER_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = PAPER_CACHE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    tmp.replace(PAPER_CACHE_PATH)


def _chunk_pdf_text(text: str, chunk_size: int = 1800, overlap: int = 250) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    paragraphs = [segment.strip() for segment in re.split(r"\n\s*\n", text) if segment.strip()]
    if not paragraphs:
        paragraphs = [cleaned]

    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        paragraph = re.sub(r"\s+", " ", paragraph).strip()
        if not paragraph:
            continue

        if len(paragraph) > chunk_size:
            start = 0
            step = max(chunk_size - overlap, 1)
            while start < len(paragraph):
                piece = paragraph[start : start + chunk_size]
                if piece:
                    chunks.append(piece)
                start += step
            current = ""
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunks.append(current)
        current = paragraph

    if current:
        chunks.append(current)

    return chunks


def _get_pdf_collection(pdf_hash: str):
    CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DB_DIR))
    collection_name = f"pdf-{pdf_hash}"[:63]
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"paper_hash": pdf_hash, "kind": "pdf_chunks"},
    )


def _ensure_pdf_indexed(pdf_hash: str, paper_title: str, pdf_text: str) -> list[str]:
    chunks = _chunk_pdf_text(pdf_text)
    if not chunks:
        return []

    collection = _get_pdf_collection(pdf_hash)
    if collection.count() > 0:
        return chunks

    ids = [f"{pdf_hash}-{idx}" for idx in range(len(chunks))]
    metadatas = [
        {
            "paper_hash": pdf_hash,
            "paper_title": paper_title,
            "chunk_index": idx,
            "chunk_total": len(chunks),
        }
        for idx in range(len(chunks))
    ]
    embeddings = embedding_llm.embed_documents(chunks)
    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=metadatas,
        embeddings=embeddings,
    )
    return chunks


def _query_pdf_chunks(pdf_hash: str, query: str, limit: int = 4) -> list[str]:
    collection = _get_pdf_collection(pdf_hash)
    if collection.count() == 0:
        return []

    query_embedding = embedding_llm.embed_query(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(limit, collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    documents = results.get("documents") or [[]]
    return [doc.strip() for doc in documents[0] if doc and doc.strip()]


def _build_topic_context(pdf_hash: str, paper_title: str, topic: dict[str, Any]) -> str:
    query = "\n".join(
        part
        for part in [
            paper_title,
            str(topic.get("title", "")),
            str(topic.get("description", "")),
        ]
        if part
    )
    matches = _query_pdf_chunks(pdf_hash, query=query, limit=4)
    if not matches:
        return ""

    numbered = [f"Chunk {idx + 1}: {text}" for idx, text in enumerate(matches)]
    return "\n\n".join(numbered)


@router.post("/generate-from-pdf", response_model=PDFTopicsResponse)
async def generate_from_pdf(
    request: PDFVideoRequest,
    background_tasks: BackgroundTasks,
):
    """Extract topics from PDF text, serve cached videos or generate new ones."""

    # Hash the PDF text for paper-level cache lookup
    pdf_hash = hashlib.sha256(request.pdf_text.encode()).hexdigest()[:32]

    paper_cache = _load_paper_cache()

    # ---- FULL CACHE HIT: zero API calls ----
    # 1) Exact hash match
    matched_entry = paper_cache.get(pdf_hash)

    # 2) Fallback: title-in-text match (catches seeded papers like Attention)
    if not matched_entry:
        pdf_text_lower = request.pdf_text.lower()[:5000]
        for _key, entry in paper_cache.items():
            title = entry.get("paper_title", "")
            # Check if the paper title (or key words) appear in the PDF text
            if title and title.lower() in pdf_text_lower:
                matched_entry = entry
                # Save under the real hash so next time it's an exact match
                paper_cache[pdf_hash] = entry
                _save_paper_cache(paper_cache)
                break

    if matched_entry:
        all_exist = all(
            (VIDEO_LIBRARY_DIR / f"{t['job_id']}.mp4").exists()
            for t in matched_entry["topics"]
        )
        if all_exist:
            for t in matched_entry["topics"]:
                video_jobs[t["job_id"]] = {
                    "status": "completed",
                    "progress": 100.0,
                    "video_url": t["video_url"],
                }
            return PDFTopicsResponse(
                paper_title=matched_entry["paper_title"],
                topics=matched_entry["topics"],
                all_cached=True,
            )

    # ---- CACHE MISS: identify the paper, chunk it into Chroma, then retrieve chunks per topic ----
    title_prompt = (
        "You are given the start of an academic paper. "
        "Return JSON only with the paper title.\n\n"
        'Format: {"paper_title": "..."}\n\n'
        f"Document excerpt:\n{request.pdf_text[:4000]}"
    )
    title_result = await llm.ainvoke([HumanMessage(content=title_prompt)])
    title_raw = _text_content(title_result.content).strip()
    if title_raw.startswith("```"):
        title_raw = title_raw.split("\n", 1)[-1].rsplit("```", 1)[0]
    title_payload = json.loads(title_raw.strip())
    paper_title = str(title_payload.get("paper_title") or "Untitled Paper").strip()

    chunks = _ensure_pdf_indexed(pdf_hash, paper_title, request.pdf_text)
    extraction_corpus = "\n\n".join(chunks[: min(len(chunks), 8)])
    if len(extraction_corpus) > 14000:
        extraction_corpus = extraction_corpus[:14000]

    extraction_prompt = (
        f"You are given chunked text from an academic paper titled '{paper_title}'.\n"
        f"Extract exactly {request.num_topics} key topics that would each make a good 75-90 second educational video.\n"
        "Choose topics that together cover the paper progressively from fundamentals to architecture, mechanisms, and outcomes.\n\n"
        "Return JSON only:\n"
        '{\n  "paper_title": "...",\n  "topics": [\n    {"index": 1, "title": "...", "description": "2-3 sentence description"}\n  ]\n}\n\n'
        f"Chunked paper excerpt:\n{extraction_corpus}"
    )
    result = await llm.ainvoke([HumanMessage(content=extraction_prompt)])
    raw = _text_content(result.content).strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
    parsed = json.loads(raw.strip())
    paper_title = parsed.get("paper_title", paper_title)
    topics = parsed["topics"]

    # Load per-topic cache to check individual hits
    topic_cache = {}
    if CACHE_INDEX_PATH.exists():
        try:
            topic_cache = json.loads(CACHE_INDEX_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            topic_cache = {}

    generation_queue: list[dict[str, str]] = []

    for topic in topics:
        retrieved_context = _build_topic_context(pdf_hash, paper_title, topic)
        concept_preview = (
            f"[Paper: {paper_title}]\n\n"
            f"Topic {topic['index']}/{len(topics)}: {topic['title']}\n\n"
            f"{topic['description']}"
        )
        if retrieved_context:
            concept_preview = f"{concept_preview}\n\nRetrieved PDF Chunks:\n{retrieved_context}"
        cache_key = hashlib.md5(concept_preview.encode()).hexdigest()[:16]

        # Check per-topic cache
        cached_entry = topic_cache.get(cache_key)
        if cached_entry:
            jid = cached_entry["job_id"]
            if (VIDEO_LIBRARY_DIR / f"{jid}.mp4").exists():
                topic["job_id"] = jid
                topic["status"] = "completed"
                topic["video_url"] = f"{MEDIA_BASE_URL}/videos/{jid}.mp4"
                video_jobs[jid] = {
                    "status": "completed",
                    "progress": 100.0,
                    "video_url": topic["video_url"],
                }
                continue

        # Cache miss — generate in background
        jid = str(uuid.uuid4())
        topic["job_id"] = jid
        topic["status"] = "processing"
        topic["video_url"] = ""
        video_jobs[jid] = {"status": "processing", "progress": 0.0}
        generation_queue.append(
            {
                "job_id": jid,
                "concept": f"{topic['title']} - {topic['description']}",
                "concept_preview": concept_preview,
                "language": request.language,
            }
        )

    if generation_queue:
        background_tasks.add_task(
            _generate_topic_videos_with_limit,
            generation_queue,
            PDF_TOPIC_GENERATION_BATCH_SIZE,
        )

    # Save paper-level cache for future zero-API-call hits
    paper_cache[pdf_hash] = {
        "paper_title": paper_title,
        "pdf_hash": pdf_hash,
        "topics": [
            {
                "index": t["index"],
                "title": t["title"],
                "description": t.get("description", ""),
                "job_id": t["job_id"],
                "video_url": t.get("video_url") or f"{MEDIA_BASE_URL}/videos/{t['job_id']}.mp4",
            }
            for t in topics
        ],
    }
    _save_paper_cache(paper_cache)

    all_cached = all(t.get("status") == "completed" for t in topics)
    return PDFTopicsResponse(
        paper_title=paper_title,
        topics=topics,
        all_cached=all_cached,
    )


async def _generate_and_cache_topic_video(
    job_id: str, concept: str, concept_preview: str, language: str
) -> None:
    """Generate a single topic video and add it to the cache index."""
    try:
        pipeline = SelfHealingVideoPipeline()
        result = await pipeline.generate(
            concept=concept,
            explanation=concept_preview,
            language=language,
        )
        if result.success and result.video_path:
            dest = VIDEO_LIBRARY_DIR / f"{job_id}.mp4"
            shutil.copy2(result.video_path, dest)
            if result.subtitles_path:
                shutil.copy2(
                    result.subtitles_path,
                    SUBTITLE_LIBRARY_DIR / f"{job_id}.srt",
                )

            # Update per-topic cache
            cache_key = hashlib.md5(concept_preview.encode()).hexdigest()[:16]
            topic_cache = {}
            if CACHE_INDEX_PATH.exists():
                try:
                    topic_cache = json.loads(CACHE_INDEX_PATH.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    pass
            topic_cache[cache_key] = {
                "job_id": job_id,
                "concept_preview": concept_preview,
            }
            CACHE_INDEX_PATH.write_text(json.dumps(topic_cache, indent=2), encoding="utf-8")

            video_jobs[job_id] = {
                "status": "completed",
                "progress": 100.0,
                "video_url": f"{MEDIA_BASE_URL}/videos/{dest.name}",
            }
        else:
            video_jobs[job_id] = {
                "status": "failed",
                "error_message": result.error_message or "Generation failed",
            }
    except Exception as e:
        video_jobs[job_id] = {"status": "failed", "error_message": str(e)}


async def _generate_topic_videos_with_limit(
    generation_queue: list[dict[str, str]],
    batch_size: int = PDF_TOPIC_GENERATION_BATCH_SIZE,
) -> None:
    """Generate topic videos with bounded concurrency for faster PDF processing."""
    semaphore = asyncio.Semaphore(max(1, batch_size))

    async def _run_job(job: dict[str, str]) -> None:
        async with semaphore:
            await _generate_and_cache_topic_video(
                job_id=job["job_id"],
                concept=job["concept"],
                concept_preview=job["concept_preview"],
                language=job["language"],
            )

    await asyncio.gather(*(_run_job(job) for job in generation_queue), return_exceptions=True)
