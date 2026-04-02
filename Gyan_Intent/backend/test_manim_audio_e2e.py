import asyncio
import json
import subprocess

from video_factory.pipeline import SelfHealingVideoPipeline


MANIM_CODE = '''from manim import *

class Scene(Scene):
    def construct(self):
        title = Text("Gyan Intent TTS Test", font_size=48)
        self.play(Write(title), run_time=2)
        circle = Circle(color=BLUE)
        self.play(Create(circle), run_time=2)
        self.wait(1)
'''


async def main():
    pipeline = SelfHealingVideoPipeline()

    script = {
        "title": "TTS test",
        "segments": [
            {"timestamp": 0.0, "duration": 2.0, "text": "Hello from Gyan Intent."},
            {"timestamp": 2.0, "duration": 2.0, "text": "This Manim video now includes Sarvam audio."},
        ],
        "total_duration": 5.0,
    }

    video_path = await pipeline._run_manim(MANIM_CODE)
    audio_path = await pipeline._generate_tts(script=script, language="english")
    final_path = await pipeline._sync_audio_video(video_path=video_path, audio_path=audio_path, script=script)

    probe = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_streams",
            "-of", "json",
            str(final_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    data = json.loads(probe.stdout)
    stream_types = [s.get("codec_type") for s in data.get("streams", [])]
    has_audio = "audio" in stream_types
    has_video = "video" in stream_types

    print(f"Final video: {final_path}")
    print(f"Streams: {stream_types}")
    print(f"HAS_VIDEO={has_video} HAS_AUDIO={has_audio}")

    if not (has_video and has_audio):
        raise RuntimeError("Final MP4 missing audio or video stream")


if __name__ == "__main__":
    asyncio.run(main())
