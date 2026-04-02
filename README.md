# 🎓 Gyan IntentAWS — Multilingual Voice-Driven Visual AI Tutor

A Python-based system that takes voice/text input in English, Hindi, or Hinglish, generates a **Manim animation video** with voice narration to explain concepts visually.

## 🎥 How It Works

```
Voice/Text Input → Language Detection → Claude LLM → Manim Video → Polly Narration → Final MP4
```

| Step | Tool | What it does |
|------|------|-------------|
| 1 | AWS Transcribe | Converts voice to text |
| 2 | Comprehend + Heuristic | Detects language (en/hi/hinglish) |
| 3 | AWS Bedrock (Claude) | Generates explanation + Manim code |
| 4 | Manim | Renders animation video |
| 5 | AWS Polly | Converts explanation to speech |
| 6 | FFmpeg | Merges video + audio |

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.9+
- [Manim Community](https://docs.manim.community/en/stable/installation.html)
- [FFmpeg](https://ffmpeg.org/download.html) (must be in PATH)
- AWS account with access to: Transcribe, Comprehend, Bedrock (Claude), Polly, S3

### 2. Install

```bash
pip install -r requirements.txt
```

### 3. Configure

Copy `.env.example` to `.env` and fill in your AWS credentials:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 4. Run

```bash
# Text input:
python pipeline.py --text "Explain recursion with a simple example"

# Hinglish:
python pipeline.py --text "Bhai mujhe sorting samjha do"

# Voice input:
python pipeline.py --audio recording.wav

# Interactive mode:
python pipeline.py
```

### 5. Output

The final video is saved to `output/final_output.mp4`

## 📁 Project Structure

```
Gyan_IntentAWS/
├── config.py              # Settings, AWS config, voice mappings
├── speech_to_text.py      # AWS Transcribe (voice → text)
├── detect_language.py     # Comprehend + Hinglish heuristic
├── generate_manim_code.py # AWS Bedrock Claude (LLM → Manim code)
├── run_manim.py           # Render Manim animation
├── text_to_speech.py      # AWS Polly (text → speech)
├── merge_with_ffmpeg.py   # FFmpeg merger (video + audio)
├── pipeline.py            # Main orchestrator
├── requirements.txt
├── .env.example
└── output/                # Generated files
    ├── manim/             # Manim scripts and videos
    ├── audio/             # Polly narration audio
    └── final_output.mp4   # Final merged video
```

## 🧪 Test Individual Modules

```bash
python detect_language.py       # Test language detection
python generate_manim_code.py   # Test LLM code generation
python run_manim.py             # Test Manim rendering
python text_to_speech.py        # Test Polly TTS
python merge_with_ffmpeg.py     # Check FFmpeg availability
```

## 🌍 Supported Languages

| Language | Input Example | Detection |
|----------|--------------|-----------|
| English | "Explain binary search" | AWS Comprehend |
| Hindi | "रिकर्शन क्या है?" | Devanagari script detection |
| Hinglish | "Bhai sorting samjha do" | Keyword heuristic |
