# 🎓 Gyan Intent — From Gesture to Genius

> **An AI-Powered Educational Platform that Transforms Learning with Personalized, Interactive, and Multilingual Experiences**

---

## 📌 The Problem Gyan Intent Solves

### Challenges Facing Students & Educators Today

Even in urban India — coaching hubs, engineering colleges, and competitive-exam ecosystems — critical gaps remain:

| Challenge | Impact |
|-----------|--------|
| **One-Size-Fits-All Coaching** | A single lecture for 200+ students in a JEE/NEET batch cannot adapt to individual pace or learning style |
| **No On-Demand Visualization** | Physics, chemistry, and math concepts need animated, step-by-step visual explanations — textbooks and text-based AI (ChatGPT) fall short |
| **Doubt Resolution Bottleneck** | Students wait hours (or days) for a mentor to address doubts; coaching centres can't scale 1-on-1 help |
| **Passive Video Consumption** | Pre-recorded lectures are long, non-interactive, and don't check understanding in real time |
| **No Personalized Practice Loop** | Students study the same material regardless of their weak areas — there's no adaptive feedback cycle |
| **Fragmented Workflows** | Assignments on Google Classroom, notes on YouTube, quizzes on a third app — context-switching kills productivity |

### What Makes Gyan Intent Different from ChatGPT / Gemini?

ChatGPT **describes** concepts in text. Gyan Intent **creates** animated Manim videos + multilingual TTS, generates practice quizzes from your actual Classroom assignments, and delivers everything inside a single dashboard — or right inside WhatsApp.

---

## 💡 What Gyan Intent Does

Gyan Intent is an AI-powered educational platform that transforms learning with personalized, interactive, and multilingual experiences. It adapts to each student's learning style and simplifies complex topics — whether you're grinding for JEE Advanced, revising NEET biology, or running a coaching centre.

### How Gyan Intent Makes Learning Better

**For Students:**
- **Personalized Learning** — Content adapts to your unique learning style and pace.
- **Visual Learning** — Complex ideas simplified through AI-generated videos and mind maps.
- **Language Flexibility** — Study in your preferred language with real-time translations.
- **Active Engagement** — Interactive quizzes and assessments to keep you motivated.
- **Time Efficiency** — AI quickly finds relevant study materials, saving you time.

**For Educators:**
- **Automated Content Creation** — Easily generate educational videos and materials.
- **Progress Tracking** — Monitor student engagement and understanding.
- **Multilingual Teaching** — Teach students in their native languages.
- **Efficient Resource Management** — Organize and distribute learning materials effortlessly.

**For Organizations:**
- **Scalable Training** — Deliver consistent training across multiple languages.
- **Cost-Effective** — Automate content creation and translation to reduce costs.
- **Accessibility** — Ensure learning is available to diverse populations.
- **Quality Assurance** — Maintain high standards for educational content.
- **Comprehensive Analytics** — Track outcomes and engagement metrics for continuous improvement.

---

## 🧠 What is Gyan Intent?

Gyan Intent is a **multimodal AI education platform** that accepts input via:

- ✏️ **Text** — Type your doubt
- 🎤 **Voice** — Speak in Hindi/Hinglish
- 🖐️ **Gestures** — Draw in air using hand tracking, answer quizzes with thumbs up/down
- 📷 **Visual** — Upload a photo of a problem, diagram, or equation
- 💬 **WhatsApp** — Send a message to the bot from any phone

...and generates **custom educational content** including animated concept videos, step-by-step solutions, quizzes, and more.

---

## 🏗️ Architecture Overview

```
User (Web / WhatsApp / Gesture)
        │
        ▼
┌─────────────────────────────────┐
│   Frontend (Next.js 15 + React) │  ← Dashboard, Draw-in-Air, Gesture Quiz
│   + MediaPipe Hand Tracking     │  ← 21-point hand landmark detection
│   + Three.js (3D visuals)       │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   Backend (FastAPI + LangGraph) │  ← Multi-agent AI orchestration
│   ┌─────────────────────┐      │
│   │ Supervisor Agent     │      │  ← Routes queries to correct team
│   │   ├─ Visual Team     │      │  ← Image/drawing analysis
│   │   ├─ Math Team       │      │  ← Step-by-step math solutions
│   │   ├─ Coding Team     │      │  ← Code debugging & explanations
│   │   └─ Video Team      │      │  ← Manim animation generation
│   └─────────────────────┘      │
│   + Manim CE + FFmpeg + LaTeX   │  ← Video rendering pipeline
│   + GPT-4o-mini / Gemini       │  ← LLM reasoning
│   + Sarvam AI                   │  ← Hinglish TTS & Indic LLM
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   WhatsApp Bot (Node.js)        │  ← Instant delivery channel
│   + whatsapp-web.js             │  ← No app download needed
│   + Language selection flow     │  ← English / Hinglish / Hindi / Kannada
│   + Video delivery (<64 MB)     │  ← Auto-compressed for WhatsApp
└─────────────────────────────────┘
```

---

## ✨ Features & What They Do

### 1. 🎬 AI Video Generator

**What**: Type any concept → Get a 40-70 second animated educational video with mathematical visualizations.

**How it helps**: Replaces expensive video tutors. Any student can type "explain photosynthesis" and get a beautifully animated Manim video — for free.

**13 built-in concept templates**:

| # | Topic | Duration |
|---|-------|:--------:|
| 1 | Projectile Motion | ~31s |
| 2 | Newton's Laws of Motion | ~50s |
| 3 | Pythagorean Theorem | ~44s |
| 4 | Photosynthesis | ~70s |
| 5 | DNA Structure | ~30s |
| 6 | Calculus (Derivatives & Integrals) | ~38s |
| 7 | Chemical Bonding (Ionic & Covalent) | ~35s |
| 8 | Gravity & Gravitation | ~33s |
| 9 | Fractions | ~34s |
| 10 | Atomic Structure | ~29s |
| 11 | Ecosystems & Food Chains | ~37s |
| 12 | Mitosis (Cell Division) | ~27s |
| 13 | Generic (any concept) | ~35s |

**Tech**: Manim CE → 720p 30fps rendering → FFmpeg compression → Served via FastAPI

---

### 2. 🖐️ Draw in Air (Gesture Drawing)

**What**: Students draw diagrams, equations, or shapes **in the air** using their hand — tracked by the webcam via MediaPipe.

**How it helps**:
- **Motor-impaired students** (cerebral palsy, hand injuries) who can't hold a pen or tap a screen can still draw and solve problems
- Students without a stylus or touchscreen can still interact with visual learning
- The drawing is sent to AI for analysis and solution generation

**Gesture modes**:
| Gesture | Action |
|---------|--------|
| ☝️ Index finger extended | Drawing mode |
| ✌️ Index + middle finger | Move cursor (no drawing) |
| 🤏 Thumb + index pinch | Zoom / control |
| ✋ Open palm | Pause |
| ✊ Fist or thumb + ring finger | Erase |

**Tech**: MediaPipe Hands (21 landmarks at 24 FPS) → Canvas rendering → Gemini/LLaVA image analysis

---

### 3. 👍 Gesture Quiz

**What**: A quiz system where students answer **True/False** using hand gestures — thumbs up for True, thumbs down for False.

**How it helps**:
- **Hands-free assessment** — students with limited hand mobility can still take quizzes
- Gamified learning experience
- Built-in subjects: Programming, Mathematics, Biology, Physics
- AI can generate new questions for any subject

**Detection mechanics**:
- 400ms hold time to confirm gesture (prevents accidental triggers)
- 1200ms cooldown between answers
- Real-time 21-point hand skeleton overlay for visual feedback

---

### 4. 💬 WhatsApp Bot

**What**: A full AI tutor accessible via WhatsApp — no app download, no laptop needed.

**How it helps**:
- Students already use WhatsApp daily — zero friction to access AI tutoring
- Parents can monitor their child's learning right in the family chat
- No special device needed — works on any smartphone
- Supports **4 languages**: English, Hinglish, Hindi, Kannada

**Capabilities**:
| Command / Message | What happens |
|-------------------|-------------|
| Any text question | AI explains the concept in your chosen language |
| Math problem | Step-by-step solution with formatting |
| "video photosynthesis" | Generates Manim animation video → sends as MP4 |
| `!language` | Change language preference |
| `!help` | Show available commands |
| Image of a problem | AI analyzes and solves it |

**Limits**: Videos auto-compressed to fit WhatsApp's 64 MB file limit

---

### 5. 📷 Visual / Image Analysis

**What**: Upload a photo of a handwritten equation, a diagram, a textbook page — AI analyzes and solves it.

**How it helps**:
- Student can snap a photo of their homework and get instant help
- Recognizes shapes (triangles, circles, rectangles) and provides formulas
- Works through WhatsApp too (send photo → get solution)

**Tech**: HuggingFace LLaVA 1.5 7B (free), fallback to Google Gemini 1.5 Flash

---

### 6. 📚 Google Classroom Integration

**What**: Connect your Google Classroom account to sync courses, assignments, and deadlines directly into Gyan Intent.

**How it helps**:
- Single source of truth for courses — synced Classroom data powers quizzes and study workflows
- Teachers can assign and track quizzes directly
- Students get a unified view of their academic workload

---

### 7. 🎥 YouTube Transcript Summarizer

**What**: Paste a YouTube video URL → Get a transcript + AI-generated summary → Export as PDF.

**How it helps**:
- Students can get notes from any educational YouTube video
- Supports Hindi and English transcripts
- Segment-based with timestamps for easy navigation

---

### 8. 📊 Progress Tracking & Gamification

**What**: Dashboard with stats — videos generated, quizzes completed, day streaks, total points.

**How it helps**:
- Keeps students motivated with streak tracking
- Visual progress across all subjects
- Gamified learning experience

---

## ♿ How Gyan Intent Helps People with Disabilities

| Disability | Feature | How It Helps |
|-----------|---------|-------------|
| **Cerebral Palsy** | Draw in Air (Gesture Mode) | No need to hold a pen or tap a screen — draw using hand movements tracked by webcam |
| **Hand/Arm Injuries** | Gesture Quiz (Thumbs Up/Down) | Answer quizzes with simple thumb gestures instead of clicking buttons |
| **Muscular Dystrophy** | Air Canvas with adjustable thresholds | Lenient gesture detection (only 2/4 fingers need to curl) accommodates limited hand mobility |
| **Fine Motor Impairment** | WhatsApp Bot (Voice/Text) | Use voice-to-text on WhatsApp to ask questions — no precision input needed |
| **Visual Processing Disorders** | Animated Videos (Manim) | Step-by-step visual animations are easier to follow than static text |
| **Dyslexia** | Multilingual Support | Content in Hindi/Hinglish reduces reading difficulty for students who think in vernacular languages |
| **Low Vision** | High-contrast Manim animations | Bold colors, large text, clear mathematical notation in videos |
| **Limited Device Access** | WhatsApp Delivery | Works on any smartphone with WhatsApp — no laptop or special app needed |

### Key Accessibility Design Decisions:
- **400ms hold time** for gesture quizzes prevents accidental triggers — critical for students with tremors
- **1200ms cooldown** between answers gives motor-impaired students time to reset their hand position
- **3-frame smoothing** in gesture detection filters out involuntary hand movements
- **Multiple input modalities** — if one modality doesn't work, another will (text, voice, gesture, visual)

---

## 🌍 Who Can This Help?

### JEE / NEET / Board Exam Students
- Need quick, visual concept clarity on demand — not another 2-hour lecture
- Want AI-generated practice from their own Classroom assignments
- Benefit from bite-sized 40–70 second animated videos they can rewatch before exams

### Coaching Centres & Education Institutes
- Offer AI-powered doubt resolution at scale — 24/7, without hiring more mentors
- Auto-generate animated concept videos for any topic in the syllabus
- Use Google Classroom integration to push quizzes and track student progress in one place

### College Students & Self-Learners
- Summarize any YouTube lecture into timestamped notes + PDF in seconds
- Snap a photo of a problem (homework, textbook) and get an instant step-by-step solution
- Draw equations in the air or on screen — AI analyzes and solves them

### Teachers & Professors
- Generate Manim-quality animated explanations on the fly — no video-editing skills needed
- Assign gesture-based quizzes via Google Classroom; track progress from the dashboard
- WhatsApp bot acts as a 24/7 teaching assistant students can message anytime

### Students with Disabilities
- Motor-impaired students interact through gesture input instead of touch
- Multiple input modalities (voice, gesture, image, text) ensure no student is excluded
- Accessible design with hold-time thresholds, cooldowns, and high-contrast animations

### Parents
- Monitor their child's learning progress via the dashboard or WhatsApp updates
- No special app download needed — WhatsApp-based tutoring works on any smartphone

---

## 🔧 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Framer Motion, Three.js, MediaPipe Hands |
| **Backend** | FastAPI, LangGraph, LangChain, Uvicorn, PostgreSQL, Redis, Celery |
| **AI Models** | OpenAI GPT-4o-mini, Sarvam AI (Hinglish TTS), Google Gemini, HuggingFace LLaVA |
| **Video** | Manim CE (mathematical animations), FFmpeg, LaTeX |
| **Messaging** | whatsapp-web.js (WhatsApp Bot) |
| **Infra** | Docker, Railway (backend), Vercel (frontend) |

---

## 🚀 How to Run

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- -H 127.0.0.1 -p 3000
```

### WhatsApp Bot
```bash
cd whatsapp-bot
npm install && npm run build
HEALTH_CHECK_PORT=3003 node dist/index.js
# Scan the QR code from WhatsApp to connect
```

---

## 📝 Environment Variables

```
# Backend (.env)
OPENAI_API_KEY=your-key
GEMINI_API_KEY=your-key
SARVAM_API_KEY=your-key

# WhatsApp Bot (.env)
BACKEND_URL=http://localhost:8000
HEALTH_CHECK_PORT=3003
```

---

## 👥 Team

**Gyan Intent** — Built for students, educators, and coaching centres who believe learning should be visual, personal, and instant.

*"From Gesture to Genius"* 🇮🇳
