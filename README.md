# Gyan-IntentAWS: Multilingual Visual AI Tutor 🎓✨

**Gyan-IntentAWS** is a state-of-the-art AI tutoring engine that transforms real-time speech or text into dynamic, visual physics, math, and programming explanations on-the-fly. Designed for high-impact STEM education, it bridges the gap between abstract theory and visual intuition using the power of Generative AI and mathematical animations.

---

## 🚀 Key Features

### 🌍 Truly Multilingual
*   **Native Support**: High-accuracy results for **English**, **Hindi**, **Marathi**, **Telugu**, and **Kannada**.
*   **Hybrid Intelligence**: Seamlessly handles "Hinglish," "Kanglish," and other mixed-language inputs.
*   **Intelligent ID**: Automatically detects the spoken language and responds in the same language.

### 🎥 Visual-First Explanations
*   **Manim Engine**: Leverages the power of the *Mathematical Animation Engine* for professional-grade visuals.
*   **Robust Rendering**: Specialized stability fixes ensure flawless geometry and regional font support (Nirmala UI/Arial).
*   **Visual Logic**: Optimized LLM prompting to prioritize geometric shapes and motion over text-heavy slides.

### 🎙️ Hybrid Audio Pipeline
*   **Studio Quality**: Uses **Deepgram Aura** for exceptionally fast and clear English narration.
*   **Regional Accuracy**: **AWS Polly (Neural)** powered voices for Indian languages.
*   **Universal Fallback**: Integrated **gTTS** (Google Text-to-Speech) for native Kannada support and account/region failovers.
*   **Seamless Start**: Implements a 500ms SSML silence buffer to prevent audio clipping on start.

---

## 🏗️ Technical Architecture

*   **LLM Core**: AWS Bedrock (**Claude 3.5 Sonnet**) for technical reasoning and Manim code generation.
*   **Visuals**: Python-based **Manim** engine.
*   **STT (Speech-to-Text)**: **Amazon Transcribe Streaming** for real-time, low-latency live transcription.
*   **TTS (Text-to-Speech)**: Hybrid **Deepgram**, **AWS Polly**, and **gTTS** setup.
*   **Orchestration**: Serialized logic pipeline for rock-solid reliability in hackathon environments.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
*   Python 3.11+
*   FFmpeg (required for video/audio merging)
*   Manim (and its dependencies like Cairo, Pango, and TeX)

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your credentials:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
DEEPGRAM_API_KEY=your_deepgram_key
```

---

## 🖱️ Usage

To start the interactive AI tutor via your microphone:

```bash
python pipeline.py --mic
```

The system will record your speech, detect the language, generate the visual explanation, and play the final video with synced multilingual narration!

---

## 🛡️ Security & Privacy
This repository has been sanitized to redact all hardcoded secrets. Always use environment variables for API keys in production.

---

## 🤝 Contributing
Contributions to improve visual complexity, add more regional languages, or optimize rendering times are welcome! 

**Made with ❤️ for STEM Education.**