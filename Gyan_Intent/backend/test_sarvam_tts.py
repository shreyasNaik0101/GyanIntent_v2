"""
Quick test script to verify Sarvam TTS (Bulbul) API is working.

Usage:
    python test_sarvam_tts.py
    
Reads SARVAM_API_KEY from .env file.
"""

import base64
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SARVAM_API_KEY", "")

if not API_KEY or API_KEY == "sk-your-sarvam-key-here":
    print("ERROR: SARVAM_API_KEY is missing or still a placeholder.")
    print("Set a real key in backend/.env:")
    print("  SARVAM_API_KEY=your-real-key-here")
    sys.exit(1)

print(f"Using API key: {API_KEY[:8]}...{API_KEY[-4:]}")

payload = {
    "text": "Hello! Welcome to Gyan Intent. Let me explain photosynthesis in a fun way.",
    "target_language_code": "en-IN",
    "model": "bulbul:v3",
    "speaker": "shubh",
    "pace": 1.0,
    "speech_sample_rate": 24000,
}

print("Calling Sarvam TTS API...")

try:
    resp = httpx.post(
        "https://api.sarvam.ai/text-to-speech",
        json=payload,
        headers={
            "api-subscription-key": API_KEY,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )
    
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"Error response: {resp.text}")
        sys.exit(1)

    data = resp.json()
    request_id = data.get("request_id", "N/A")
    audios = data.get("audios", [])
    
    print(f"Request ID: {request_id}")
    print(f"Audio chunks returned: {len(audios)}")
    
    if audios:
        audio_bytes = base64.b64decode(audios[0])
        out_path = "test_sarvam_output.wav"
        with open(out_path, "wb") as f:
            f.write(audio_bytes)
        print(f"Audio saved to: {out_path} ({len(audio_bytes)} bytes)")
        print("SUCCESS - Sarvam TTS is working!")
    else:
        print("WARNING: No audio returned in response")

except httpx.HTTPStatusError as e:
    print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
