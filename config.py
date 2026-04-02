import os
from dotenv import load_dotenv

load_dotenv()

# AWS Credentials
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Deepgram Config
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_STT_MODEL = "nova-3"
DEEPGRAM_TTS_EN_VOICE = "aura-asteria-en"

# OpenAI/LLM Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Paths
AUDIO_OUTPUT_DIR = "temp_audio"
VIDEO_OUTPUT_DIR = "temp_video"
GENERATED_CODE_DIR = "generated_code"

# AWS S3 Bucket (for Transcribe)
S3_BUCKET = "gyan-tutor-audio-shrey"

# Manim Settings
DEFAULT_FONT = "Nirmala UI"
