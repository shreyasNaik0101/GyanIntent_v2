import asyncio
from video_factory.pipeline import SelfHealingVideoPipeline


async def main():
    pipeline = SelfHealingVideoPipeline()
    script = {
        "segments": [
            {"text": "Welcome to Gyan Intent."},
            {"text": "This is a quick Sarvam TTS pipeline integration test in English."},
        ],
        "total_duration": 6.0,
    }

    out = await pipeline._generate_tts(script=script, language="english")
    size = out.stat().st_size
    print(f"TTS file: {out}")
    print(f"Size: {size} bytes")
    print("SUCCESS" if size > 1000 else "FAILED")


if __name__ == "__main__":
    asyncio.run(main())
