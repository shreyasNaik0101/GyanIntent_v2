"""
Generative Video Factory with Self-Healing Manim Code.

Pipeline: Script → Manim Code → (Heal if error) → Sync Audio → Output
"""

import asyncio
import base64
import json
import logging
import math
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)

FALLBACK_MIN_DURATION = 55.0
FALLBACK_TARGET_DURATION = 60.0


def _text_content(content) -> str:
    """Normalise LLM .content which may be a str or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(block.get("text", "") if isinstance(block, dict) else str(block) for block in content)
    return str(content)


def _strip_markdown_fences(text: str) -> str:
    """Strip optional markdown code fences from model output."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return cleaned


def _parse_json_loose(text: str) -> Dict:
    """Parse JSON robustly from model output, including extra leading/trailing text."""
    cleaned = _strip_markdown_fences(text)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for i, ch in enumerate(cleaned):
        if ch not in "[{":
            continue
        try:
            value, _ = decoder.raw_decode(cleaned[i:])
            if isinstance(value, dict):
                return value
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError("Unable to parse JSON payload", cleaned, 0)

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.tools.manim_debug_agent import ManimDebugAgent
from app.config import settings


def _resolve_manim_bin() -> str:
    """Prefer repository venv manim to avoid interpreter mismatches."""
    backend_root = Path(__file__).resolve().parents[1]
    candidates = [
        backend_root / ".venv" / "bin" / "manim",
        Path(sys.executable).resolve().parent / "manim",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return "manim"


MANIM_BIN = _resolve_manim_bin()


@dataclass
class VideoResult:
    """Result of video generation pipeline."""
    success: bool
    video_path: Optional[Path] = None
    subtitles_path: Optional[Path] = None
    duration: float = 0.0
    error_message: Optional[str] = None
    retry_count: int = 0


class ManimExecutionError(Exception):
    """Custom exception for Manim execution failures."""
    
    def __init__(self, message: str, stderr: str = ""):
        super().__init__(message)
        self.stderr = stderr


class SelfHealingVideoPipeline:
    """
    Self-healing pipeline for educational video generation.
    
    Uses Manim for mathematical animations with automatic error correction.
    """
    
    MAX_RETRIES = settings.MANIM_MAX_RETRIES
    MANIM_TIMEOUT = settings.MANIM_TIMEOUT_SECONDS
    
    def __init__(self):
        self.sarvam_client = httpx.AsyncClient(
            base_url="https://api.sarvam.ai",
            headers={"API-Subscription-Key": settings.SARVAM_API_KEY}
        )
        self.openai_client = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2
        )
        self.manim_debug_agent = ManimDebugAgent()
        self.temp_dir = Path(tempfile.mkdtemp(prefix="manim_"))
        self.debug_dir = self.temp_dir / "debug"
        
    async def generate(
        self,
        concept: str,
        explanation: str,
        language: str = "hinglish",
        visual_style: str = "educational"
    ) -> VideoResult:
        """
        Generate educational video from concept explanation.
        
        Args:
            concept: The concept to explain
            explanation: Structured explanation from agent team
            language: Target language (hinglish/hindi/english)
            visual_style: Animation style preference
            
        Returns:
            VideoResult with paths to generated assets
        """
        try:
            # Step 1: Generate script with Sarvam-M
            script = await self._generate_script(
                concept=concept,
                explanation=explanation,
                language=language
            )
            
            # Step 2: Generate Manim code
            manim_code = await self._generate_manim_code(
                script=script,
                visual_style=visual_style
            )
            
            # Step 3: Render Manim video first (need duration for TTS pacing)
            video_path, retry_count = await self._execute_with_healing(manim_code)
            
            # Step 4: Get actual video duration, generate TTS with matching pace
            video_dur = await self._get_media_duration(video_path)
            logger.info("Rendered video duration: %.1fs", video_dur)
            
            audio_path = await self._generate_tts(
                script=script,
                language=language,
                target_duration=video_dur
            )
            
            # Step 5: Sync audio with video (mild atempo fine-tuning)
            final_video = await self._sync_audio_video(
                video_path=video_path,
                audio_path=audio_path,
                script=script
            )
            
            # Step 6: Generate subtitles
            subtitles_path = await self._generate_subtitles(script)
            
            return VideoResult(
                success=True,
                video_path=final_video,
                subtitles_path=subtitles_path,
                duration=script["total_duration"],
                retry_count=retry_count
            )
            
        except Exception as e:
            return VideoResult(
                success=False,
                error_message=str(e),
                retry_count=self.MAX_RETRIES
            )
    
    async def _generate_script(
        self,
        concept: str,
        explanation: str,
        language: str
    ) -> Dict:
        """Generate colloquial script using Sarvam-M."""
        
        language_instruction = {
            "hinglish": "Write in Hinglish (Roman Hindi + English mix) like a friendly Indian tutor.",
            "hindi": "Write in pure Hindi using Devanagari script.",
            "english": "Write in simple, conversational English.",
            "kannada": "Write in simple, conversational Kannada using Kannada script."
        }.get(language, "hinglish")
        
        prompt = f"""
        You are an engaging educator. Explain the concept below clearly and visually.
        
        Concept: {concept}
        Explanation: {explanation}
        
        {language_instruction}
        
        CRITICAL RULES:
        1. The "visual_cue" MUST describe EXACTLY what Manim shapes/text to show for THIS specific concept.
           BAD: "Show a diagram" 
           GOOD: "Show a tree with nodes A->B->C, highlight DFS traversal path in yellow"
        2. Each visual_cue must reference the ACTUAL topic content (formulas, diagrams, steps).
        3. On-screen text labels must be in {language}. Math formulas stay in standard notation.
          4. Create exactly 8 segments, each 8-11 seconds. Total 75-90 seconds.
        5. The spoken text and visual_cue must describe the SAME thing for that segment.
          6. Prefer diagrams, arrows, graphs, number lines, nodes, tables, and transformations over text blocks.
          7. Use at most one short on-screen label per segment unless a formula is essential.
          8. Avoid bullet lists, paragraph text, summary cards, or full-screen text slides.
          9. At least 70% of the screen time should be animated figures rather than written text.
        
        Output JSON format:
        {{
            "title": "Video title about {concept} in {language}",
            "segments": [
                {{
                    "timestamp": 0.0,
                    "duration": 10.0,
                    "text": "Spoken explanation of this part in {language}...",
                    "visual_cue": "SPECIFIC Manim description: what shapes, text, arrows to draw for {concept}",
                    "animation_type": "create|transform|move|write|fade"
                }}
            ],
            "total_duration": 60.0
        }}
        """
        
        # Use OpenAI as fallback if Sarvam is not available
        response = await self.openai_client.ainvoke([
            {"role": "system", "content": "You are a scriptwriter for educational videos."},
            {"role": "user", "content": prompt}
        ])

        content = _text_content(response.content)
        try:
            return self._normalize_script_timing(_parse_json_loose(content))
        except json.JSONDecodeError:
            # Retry once by asking the model to return strict JSON only.
            repair_prompt = (
                "Convert the following output into valid JSON only. "
                "Do not add commentary or markdown fences. Preserve fields and values as much as possible.\n\n"
                f"Output to fix:\n{content[:12000]}"
            )
            repaired = await self.openai_client.ainvoke([
                {"role": "system", "content": "You repair malformed JSON."},
                {"role": "user", "content": repair_prompt},
            ])
            repaired_content = _text_content(repaired.content)
            return self._normalize_script_timing(_parse_json_loose(repaired_content))

    def _normalize_script_timing(self, script: Dict) -> Dict:
        """Rescale fallback scripts so short outputs still land in the intended duration range."""

        segments = script.get("segments")
        if not isinstance(segments, list) or not segments:
            return script

        cleaned_segments = []
        running_timestamp = 0.0
        for segment in segments:
            if not isinstance(segment, dict):
                continue
            duration = segment.get("duration", 0.0)
            try:
                duration_value = float(duration)
            except (TypeError, ValueError):
                duration_value = 0.0
            cleaned = dict(segment)
            cleaned["duration"] = max(duration_value, 1.0)
            cleaned["timestamp"] = running_timestamp
            running_timestamp += cleaned["duration"]
            cleaned_segments.append(cleaned)

        if not cleaned_segments:
            return script

        total_duration = script.get("total_duration", running_timestamp)
        try:
            total_duration_value = float(total_duration)
        except (TypeError, ValueError):
            total_duration_value = running_timestamp

        effective_duration = max(total_duration_value, running_timestamp)
        if effective_duration >= FALLBACK_MIN_DURATION:
            script["segments"] = cleaned_segments
            script["total_duration"] = effective_duration
            return script

        scale = FALLBACK_TARGET_DURATION / max(effective_duration, 1.0)
        scaled_segments = []
        running_timestamp = 0.0
        remaining_segments = len(cleaned_segments)

        for index, segment in enumerate(cleaned_segments):
            scaled = dict(segment)
            scaled_duration = round(segment["duration"] * scale, 2)

            if index == len(cleaned_segments) - 1:
                scaled_duration = round(FALLBACK_TARGET_DURATION - running_timestamp, 2)

            min_segment_duration = max(6.0, math.floor(FALLBACK_TARGET_DURATION / max(remaining_segments, 1)) - 1)
            scaled_duration = max(float(min_segment_duration), scaled_duration)
            scaled["timestamp"] = round(running_timestamp, 2)
            scaled["duration"] = scaled_duration
            running_timestamp += scaled_duration
            remaining_segments -= 1
            scaled_segments.append(scaled)

        drift = round(FALLBACK_TARGET_DURATION - running_timestamp, 2)
        if scaled_segments and abs(drift) >= 0.01:
            scaled_segments[-1]["duration"] = round(max(1.0, scaled_segments[-1]["duration"] + drift), 2)
            running_timestamp = round(sum(float(segment["duration"]) for segment in scaled_segments), 2)

        script["segments"] = scaled_segments
        script["total_duration"] = running_timestamp
        return script
    
    async def _generate_manim_code(
        self,
        script: Dict,
        visual_style: str
    ) -> str:
        """Generate Manim Python code from script."""
        
        scene_description = "\n".join([
            f"At {seg['timestamp']}s: {seg['visual_cue']}"
            for seg in script["segments"]
        ])
        
        return await self.manim_debug_agent.generate_code(
            title=script["title"],
            duration=script["total_duration"],
            scene_description=scene_description,
            visual_style=visual_style,
        )
    
    async def _execute_with_healing(
        self,
        manim_code: str
    ) -> tuple[Path, int]:
        """Execute Manim code with self-healing retry loop."""
        current_code = self.manim_debug_agent.prepare_code(manim_code)
        
        for attempt in range(self.MAX_RETRIES):
            self.manim_debug_agent.write_debug_artifact(
                self.debug_dir,
                f"attempt_{attempt + 1}.py",
                current_code,
            )

            validation_issues = self.manim_debug_agent.validate_code(current_code)
            if validation_issues:
                logger.warning(
                    "Static validation failed before Manim attempt %s: %s",
                    attempt + 1,
                    validation_issues,
                )
                if attempt == self.MAX_RETRIES - 1:
                    raise ManimExecutionError(
                        "Static validation failed",
                        "\n".join(validation_issues),
                    )

                current_code = await self._heal_manim_code(
                    code=current_code,
                    error="\n".join(validation_issues),
                    attempt=attempt + 1,
                )
                continue

            try:
                video_path = await self._run_manim(current_code)
                return video_path, attempt
                
            except ManimExecutionError as e:
                if attempt == self.MAX_RETRIES - 1:
                    raise
                    
                # Heal the code
                current_code = await self._heal_manim_code(
                    code=current_code,
                    error=e.stderr,
                    attempt=attempt + 1
                )
        
        raise RuntimeError("Max retries exceeded")
    
    async def _run_manim(self, code: str) -> Path:
        """Execute Manim and return path to generated video."""
        
        scene_file = self.temp_dir / "scene.py"
        scene_file.write_text(code)
        
        scene_class = self.manim_debug_agent.extract_scene_class(code)
        logger.info("Running Manim with scene class: %s via %s", scene_class, MANIM_BIN)
        
        cmd = [
            MANIM_BIN,
            "-ql",
            "--fps", "10",
            "--media_dir", str(self.temp_dir / "media"),
            str(scene_file),
            scene_class
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.temp_dir)
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.MANIM_TIMEOUT
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise ManimExecutionError("Manim execution timed out", "")
        
        if process.returncode != 0:
            stderr_text = stderr.decode()
            self.manim_debug_agent.write_debug_artifact(
                self.debug_dir,
                "last_stderr.txt",
                stderr_text,
            )
            logger.error("Manim execution failed. stderr:\n%s", stderr_text[-2000:])
            raise ManimExecutionError(
                f"Manim execution failed: {stderr_text[-500:]}",
                stderr_text
            )
        
        logger.info("Manim stdout tail:\n%s", stdout.decode()[-1000:])

        videos = [
            path for path in Path(self.temp_dir).rglob("*.mp4")
            if "partial_movie_files" not in path.parts
        ]
        if not videos:
            raise ManimExecutionError("No video file generated", stderr.decode())
            
        return max(videos, key=lambda path: path.stat().st_mtime)
    
    async def _heal_manim_code(
        self,
        code: str,
        error: str,
        attempt: int
    ) -> str:
        """Use LLM to fix Manim code errors."""
        fixed_code = await self.manim_debug_agent.heal_code(
            code=code,
            error=error,
            attempt=attempt,
            max_retries=self.MAX_RETRIES,
        )
        self.manim_debug_agent.write_debug_artifact(
            self.debug_dir,
            f"healed_attempt_{attempt}.py",
            fixed_code,
        )
        return fixed_code
    
    async def _generate_tts(
        self,
        script: Dict,
        language: str,
        target_duration: float = 0.0
    ) -> Path:
        """Generate TTS audio using Sarvam Bulbul v3, paced to match target_duration."""
        
        full_text = " ".join([seg["text"] for seg in script["segments"]])
        
        # Map pipeline language to Sarvam BCP-47 codes
        lang_map = {
            "english": "en-IN",
            "hindi": "hi-IN",
            "hinglish": "en-IN",  # Bulbul handles code-mixed text natively
            "kannada": "kn-IN",
        }
        target_lang = lang_map.get(language, "en-IN")
        
        # Estimate speech duration at pace=1.0 (~12 chars/sec for Indian languages)
        estimated_audio_dur = len(full_text) / 12.0
        
        # Calculate pace to match video duration
        pace = 1.0
        if target_duration > 0 and estimated_audio_dur > 0:
            pace = estimated_audio_dur / target_duration
            # Clamp pace to natural-sounding range (0.7x slow to 1.4x fast)
            pace = max(0.7, min(pace, 1.4))
        
        logger.info(
            "TTS: text=%d chars, est_dur=%.1fs, target=%.1fs, pace=%.2f",
            len(full_text), estimated_audio_dur, target_duration, pace
        )
        
        audio_path = self.temp_dir / "audio.wav"
        
        # Try Sarvam TTS, fall back to silent audio on failure
        if settings.SARVAM_API_KEY and settings.SARVAM_API_KEY != "sk-your-sarvam-key-here":
            try:
                audio_path = await self._call_sarvam_tts(
                    full_text, target_lang, audio_path, pace=pace
                )
                logger.info("Sarvam TTS audio generated: %s", audio_path)
                return audio_path
            except Exception as e:
                logger.warning("Sarvam TTS failed, falling back to silent audio: %s", e)
        
        # Fallback: silent audio matching video duration
        fallback_dur = target_duration if target_duration > 0 else script["total_duration"]
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", "anullsrc=r=24000:cl=mono",
            "-t", str(fallback_dur),
            "-acodec", "pcm_s16le",
            str(audio_path)
        ]
        process = await asyncio.create_subprocess_exec(*cmd)
        await process.communicate()
        
        return audio_path
    
    async def _call_sarvam_tts(
        self,
        text: str,
        target_language_code: str,
        output_path: Path,
        pace: float = 1.0
    ) -> Path:
        """Call Sarvam TTS API. Handles chunking for texts > 2500 chars."""
        
        MAX_CHARS = 2500  # bulbul:v3 limit
        
        # Split text into chunks at sentence boundaries if too long
        chunks = []
        if len(text) <= MAX_CHARS:
            chunks = [text]
        else:
            sentences = text.replace(". ", ".|").split("|")
            current = ""
            for sentence in sentences:
                if len(current) + len(sentence) > MAX_CHARS:
                    if current:
                        chunks.append(current.strip())
                    current = sentence
                else:
                    current += sentence
            if current.strip():
                chunks.append(current.strip())
        
        logger.info("Sarvam TTS: %d chunks, pace=%.2f", len(chunks), pace)
        
        # Generate audio for each chunk
        all_audio_bytes = b""
        for i, chunk in enumerate(chunks):
            payload = {
                "text": chunk,
                "target_language_code": target_language_code,
                "model": "bulbul:v3",
                "speaker": "shubh",
                "pace": pace,
                "speech_sample_rate": 24000,
            }
            
            resp = await self.sarvam_client.post(
                "/text-to-speech",
                json=payload,
                timeout=60.0
            )
            resp.raise_for_status()
            
            data = resp.json()
            audio_b64 = data["audios"][0]
            audio_bytes = base64.b64decode(audio_b64)
            
            if i == 0:
                # First chunk: keep WAV header + data
                all_audio_bytes = audio_bytes
            else:
                # Subsequent chunks: skip the 44-byte WAV header, append raw PCM
                all_audio_bytes += audio_bytes[44:]
        
        output_path.write_bytes(all_audio_bytes)
        return output_path
    
    async def _get_media_duration(self, path: Path) -> float:
        """Get duration of a media file using ffprobe."""
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path)
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        try:
            return float(stdout.decode().strip())
        except ValueError:
            return 0.0

    async def _sync_audio_video(
        self,
        video_path: Path,
        audio_path: Path,
        script: Dict
    ) -> Path:
        """Sync audio with video — mild atempo to match durations exactly."""
        
        output_path = self.temp_dir / "final.mp4"
        
        video_dur = await self._get_media_duration(video_path)
        audio_dur = await self._get_media_duration(audio_path)
        
        logger.info("Sync: video=%.1fs, audio=%.1fs", video_dur, audio_dur)
        
        if video_dur <= 0 or audio_dur <= 0:
            # Fallback: just mux as-is
            cmd = [
                "ffmpeg", "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
                "-c:v", "copy", "-c:a", "aac",
                "-shortest",
                str(output_path)
            ]
        else:
            ratio = audio_dur / video_dur
            if 0.85 <= ratio <= 1.15:
                # Small mismatch: mild atempo sounds natural
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-i", str(audio_path),
                    "-c:v", "copy",
                    "-filter:a", f"atempo={ratio:.4f}",
                    "-c:a", "aac",
                    "-shortest",
                    str(output_path)
                ]
            elif audio_dur < video_dur:
                # Audio too short: pad silence at end
                pad_duration = video_dur - audio_dur
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-i", str(audio_path),
                    "-c:v", "copy",
                    "-filter:a", f"apad=pad_dur={pad_duration:.2f}",
                    "-c:a", "aac",
                    "-shortest",
                    str(output_path)
                ]
            else:
                # Audio too long: trim to video length
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-i", str(audio_path),
                    "-c:v", "copy", "-c:a", "aac",
                    "-shortest",
                    str(output_path)
                ]
        
        logger.info("FFmpeg sync cmd: %s", " ".join(cmd))
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
        except asyncio.TimeoutError:
            process.kill()
            raise RuntimeError("FFmpeg mux timed out after 120 s")
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg mux failed: {stderr.decode()[-500:]}")
        
        return output_path
    
    async def _generate_subtitles(
        self,
        script: Dict
    ) -> Path:
        """Generate SRT subtitle file."""
        
        srt_path = self.temp_dir / "subtitles.srt"
        srt_content = []
        
        for i, seg in enumerate(script["segments"], 1):
            start = self._seconds_to_srt_time(seg["timestamp"])
            end = self._seconds_to_srt_time(
                seg["timestamp"] + seg["duration"]
            )
            
            srt_content.append(f"{i}")
            srt_content.append(f"{start} --> {end}")
            srt_content.append(seg["text"])
            srt_content.append("")
        
        srt_path.write_text("\n".join(srt_content))
        return srt_path
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
