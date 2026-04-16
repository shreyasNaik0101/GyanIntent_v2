# GyanIntent: Multilingual Visual AI Tutor 🎓✨

**GyanIntent** is a state-of-the-art AI tutoring engine that transforms real-time speech or text into dynamic, visual physics, math, and programming explanations on-the-fly. Designed for high-impact STEM education, it bridges the gap between abstract theory and visual intuition using the power of Generative AI and mathematical animations.

---

## 📺 Project Demo & Showcases
- **Core Workflow Demo**: [Watch on ScreenRec](https://screenrec.com/share/EOuhMJ4aXq)
- **Deep-Dive Presentation**: [Watch on Tella.tv #1](https://www.tella.tv/video/shreyass-video-44gc)
- **Feature Showcase**: [Watch on Tella.tv #2](https://www.tella.tv/video/vid_cmo1wd6pl02iv04l2f80f6bct/view)

---

## 🚀 Key Features

### 🌍 Truly Multilingual
*   **Native Support**: High-accuracy results for **English**, **Hindi**, **Marathi**, **Telugu**, and **Kannada**.
*   **Hybrid Intelligence**: Seamlessly handles "Hinglish," "Kanglish," and other mixed-language inputs.
*   **Intelligent Identification**: Automatically detects the spoken language and responds in the same language.

### 🎥 Visual-First Explanations
*   **Manim Engine**: Leverages the power of the *Mathematical Animation Engine* for professional-grade visuals.
*   **Robust Rendering**: Specialized stability fixes ensure flawless geometry and regional font support (Nirmala UI/Arial).
*   **Visual Logic**: Optimized LLM prompting to prioritize geometric shapes and motion over text-heavy slides.

### 🎙️ Hybrid Audio Pipeline
*   **Studio Quality**: Uses **Deepgram Aura** (v6.1+) for exceptionally fast and clear English narration.
*   **Regional Accuracy**: **AWS Polly (Neural)** powered voices for Indian languages.
*   **Universal Fallback**: Integrated **gTTS** (Google Text-to-Speech) for native regional support and failovers.
*   **Sub-Second Feedback**: Optimized WebSocket streaming ensures low-latency response times.

---

## 🏗️ Technical Architecture

- **LLM Core**: AWS Bedrock (**Claude 3.5 Sonnet**) for technical reasoning and Manim code generation.
- **Visuals**: Python-based **Manim Shell**.
- **STT (Speech-to-Text)**: 
  - **Deepgram SDK v6.1**: Real-time streaming for English/Universal.
  - **Amazon Transcribe**: Specialized live path for regional Indian languages.
- **TTS (Text-to-Speech)**: Hybrid **Deepgram Aura**, **AWS Polly**, and **gTTS**.
- **Orchestration**: Serialized logic pipeline implemented in Python with `asyncio`.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
*   Python 3.11+
*   FFmpeg (required for video/audio merging)
*   Manim (and its dependencies like Cairo, Pango, and TeX)

### 2. Install Dependencies
```bash
pip install -r requirements.txt
pip install deepgram-sdk==6.1.1 websockets==12.0 amazon-transcribe
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

The system will:
1.  **Listen**: Capture your speech in real-time.
2.  **Think**: Use Claude 3.5 to generate the mathematical concept and animation code.
3.  **Animate**: Render a dynamic Manim video.
4.  **Narrate**: Synthesize text-to-speech in the detected language.
5.  **Present**: Merge and play the final visual explanation!

---

## 🛡️ Security & Privacy
This repository has been sanitized to redact all hardcoded secrets. Always use environment variables for API keys in production.

---

## 🤝 Contributing
Contributions to improve visual complexity, add more regional languages, or optimize rendering times are welcome! 

**Made with ❤️ for STEM Education.**
