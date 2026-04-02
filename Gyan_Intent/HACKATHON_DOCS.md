# Gyan Intent — Hackathon Documentation

> **Tagline**: From Gesture to Genius — The Intent-Aware Learning Engine

---

## 📌 What is Gyan Intent?

**Gyan Intent** is a **Generative AI-powered EdTech platform** built specifically for schools, colleges, and coaching centers across India. It eliminates the dependency on pre-recorded content libraries by **creating personalized educational content on-demand** — Manim-based video animations, interactive gesture quizzes, doubt solving from drawings, and multi-lingual explanations — all tailored to the student's query, language, and curriculum.

Unlike Byju's, Unacademy, or Khan Academy which are fundamentally **content retrieval** platforms (search and play pre-made videos), Gyan Intent **manufactures content** the moment a student asks a question.

### Target Audience

| Segment | Who | How They Use It |
|---------|-----|-----------------|
| **Schools (Class 6–12)** | Students + Teachers | AI video generation for NCERT topics, gesture-based quizzes, doubt solving |
| **Colleges (UG/PG)** | Students + Professors | Concept videos, YouTube summarizer, AI chat assistant |
| **Coaching Centers (JEE/NEET/UPSC)** | Students + Mentors | On-demand video explanations, AI quiz generation, WhatsApp bot for doubts |

---

## 🎯 Problem Statement

### The Real Classroom Problem

In India's **schools, colleges, and coaching centers**, there is a massive gap between the questions students have and the answers they can access — in the right language, at the right time, in the right format.

#### For Schools (Class 6–12):
- 1 teacher handles **40–60 students** — no time for individual doubt solving
- Concepts like **projectile motion, DNA replication, Pythagorean theorem** require visual explanations, not just text
- Students in Hindi-medium or regional-medium schools struggle with English-only digital content
- Teachers spend **hours creating PPTs/notes** for every new topic

#### For Colleges (UG/PG):
- Professors record long lectures — students **cannot extract key concepts quickly**
- Students paste YouTube lecture links but have no way to get a structured **summary + notes**
- Complex topics in **Data Structures, Calculus, Organic Chemistry** need animated visual walkthroughs
- No tool bridges the gap between "I watched a 2-hour video" and "I understood the concept"

#### For Coaching Centers (JEE/NEET/UPSC):
- Students send doubts on **WhatsApp** but teachers can only respond with text
- No platform allows a student to **sketch a problem, photograph it, and get an AI explanation**
- Creating topic-wise quizzes for 500+ students is time-consuming for mentors
- Students learn in Hinglish — but most AI tools respond only in English

### The Gap in Existing Solutions

| Platform | What They Do | What's Missing |
|----------|-------------|----------------|
| **Byju's / Unacademy** | Pre-recorded video library | Can't answer YOUR specific question. Fixed content, no personalization |
| **Khan Academy** | Free text + pre-made videos | No Hinglish, no custom videos, no WhatsApp integration |
| **ChatGPT / Gemini** | Text answers | No video generation, no gesture interaction, no Indian curriculum mapping |
| **Doubt Solving Apps** | Photo → text answer | No video explanation, no animation, English only |

---

## ✅ Our Solution

**Gyan Intent** is the first **Generative EdTech platform** purpose-built for Indian schools, colleges, and coaching centers. It doesn't search for existing content — it **generates** custom content for every student query.

### Core Capabilities

| Feature | What It Does | Who Benefits |
|---------|-------------|--------------|
| **AI Video Generator** | Type any topic → Get a 30–60s Manim animation with Hinglish voiceover | School/College students, Teachers |
| **Gesture Quiz** | Answer MCQs via thumbs-up/thumbs-down hand gestures using webcam | All students, especially accessibility-focused |
| **Draw & Solve** | Sketch a math/science problem, AI explains step-by-step | School students, Coaching center students |
| **YouTube Summarizer** | Paste any lecture URL → AI summary + PDF download | College students |
| **WhatsApp Bot** | Send a doubt text/image on WhatsApp → Get video explanation back | Coaching center students without laptops |
| **AI Quiz Generator** | AI auto-generates topic-wise MCQs | Teachers creating test papers |

### Real-World Scenario Comparison

**Scenario**: A Class 11 student at a coaching center in Patna asks "What is Biot-Savart Law?"

| Tool | Response |
|------|----------|
| **ChatGPT** | 400 words of English text |
| **Byju's** | Pre-recorded 20-min lecture (fixed, can't be customized) |
| **Gyan Intent** | 45-second Manim animation showing the magnetic field around a wire, with Hinglish voiceover |

**Scenario**: A JEE student sends a photo of an integration problem on WhatsApp at 11 PM

| Tool | Response |
|------|----------|
| **Doubtnut** | Text-based step-by-step solution |
| **Gyan Intent WhatsApp Bot** | Step-by-step AI explanation + YouTube links for further learning |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER ACCESS LAYER                             │
│                                                                       │
│   Browser (Next.js)          WhatsApp Bot         Mobile App         │
│   ┌─────────────┐            ┌──────────┐         ┌──────────┐       │
│   │  Dashboard  │            │ wwebjs   │         │ PWA      │       │
│   │  Quiz       │            │ Node.js  │         │ Browser  │       │
│   │  Draw&Solve │            │ Redis    │         │          │       │
│   │  YT Summary │            └────┬─────┘         └────┬─────┘       │
│   └──────┬──────┘                 │                    │             │
└──────────┼─────────────────────────┼────────────────────┼─────────────┘
           │                         │                    │
           └─────────────────────────┴────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (/api/v1)                        │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ /intent  │  │ /video   │  │ /quiz    │  │/transcript│             │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘             │
│        │             │             │             │                   │
│  ┌─────┴─────────────┴─────────────┴─────────────┴──────────────┐   │
│  │               LANGGRAPH ORCHESTRATION LAYER                    │   │
│  │                                                                │   │
│  │    Supervisor Agent → Routes to specialized teams             │   │
│  │    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │    │  Visual  │ │   Math   │ │  Coding  │ │  Video   │       │   │
│  │    │   Team   │ │   Team   │ │   Team   │ │   Team   │       │   │
│  │    └──────────┘ └──────────┘ └──────────┘ └────┬─────┘       │   │
│  └──────────────────────────────────────────────────┼────────────┘   │
│                                                     │                 │
│  ┌──────────────────────────┐   ┌───────────────────┴──────────────┐ │
│  │    MANIM VIDEO PIPELINE  │   │        SARVAM TTS PIPELINE       │ │
│  │  Script → Manim Code     │   │  Script → Hinglish Audio         │ │
│  │  → Self-healing render   │   │  → FFmpeg sync + mux             │ │
│  │  → FFmpeg encode         │   └──────────────────────────────────┘ │
│  └──────────────────────────┘                                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  SESSION / CACHE LAYER:  Redis (24h TTL, 20-msg context window) │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL AI APIS                              │
│                                                                       │
│   OpenAI GPT-4o    Sarvam AI TTS    Gemini Vision    YouTube API     │
│   (Code gen,       (Hinglish/Hindi  (Drawing/Image   (Transcripts)   │
│    reasoning)       voiceover)       analysis)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
Student: "BFS explain karo, video chahiye"
         │
         ▼
[Intent Engine] — classifies: video_generation, topic=BFS, lang=hinglish
         │
         ▼
[LangGraph Supervisor] — routes to Video Team
         │
         ├──► [Script Generator] — GPT-4o generates Hinglish narration script
         │
         ├──► [Manim Code Generator] — GPT-4o generates BFS animation code
         │         └──► [Self-Healing Loop] — up to 3 auto-fix retries on error
         │
         ├──► [Manim Renderer] — renders MP4 video (25–40 seconds)
         │
         ├──► [Sarvam TTS] — generates Hinglish voiceover audio at matching pace
         │
         └──► [FFmpeg Muxer] — syncs audio + video → final MP4
                   │
                   ▼
         [WhatsApp/Web] ← Student receives video
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | App Router, React Server Components, API routes |
| **React 19** | UI components, hooks |
| **Tailwind CSS** | Responsive design |
| **MediaPipe Hands** | Real-time hand landmark tracking (21 points, 30 FPS) for gesture quiz |
| **jsPDF** | In-browser PDF export for YouTube summaries |
| **Web Speech API** | Voice input for mobile users |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Async Python REST API |
| **LangGraph** | Stateful multi-agent orchestration (Supervisor + 4 teams) |
| **LangChain** | LLM abstraction and prompt chaining |
| **Redis** | Session store for WhatsApp bot (24h TTL, 20-message context window) |

### AI/ML Services
| Service | Model | Why We Chose It |
|---------|-------|-----------------|
| **OpenAI GPT-4o** | `gpt-4o` | Script generation + Manim code generation (most accurate for code) |
| **Sarvam AI TTS** | `bulbul:v1` | Only Indian AI with native Hinglish/Hindi/Kannada TTS — critical for school students |
| **Google Gemini** | `gemini-1.5-flash` | Vision analysis of student drawings and problem photos |
| **HuggingFace** | `llava-1.5-7b` | Free fallback for image analysis |

### Video Generation Pipeline
| Technology | Role |
|------------|------|
| **Manim Community Edition** | Renders mathematical animations (3Blue1Brown style) |
| **FFmpeg** | Audio-video muxing with `atempo` sync and silence padding |
| **LaTeX + MikTeX** | Mathematical formula typesetting inside Manim |

### WhatsApp Bot Stack
| Technology | Role |
|------------|------|
| **whatsapp-web.js** | WhatsApp Web headless client |
| **Puppeteer / Chromium** | Automates browser session for WhatsApp |
| **Node.js + TypeScript** | Bot runtime |
| **Redis** | Conversation history persistence per user |

### Deployment
| Service | Platform |
|---------|----------|
| **Frontend** | Vercel |
| **Backend** | Render / Railway |
| **WhatsApp Bot** | Railway (persistent disk for session) |
| **Redis** | Upstash (free managed Redis) |

---

## ⚙️ Technical Approach

### 1. Intent-Aware Routing (LangGraph Multi-Agent)

Every student query goes through a **Supervisor Agent** that classifies intent before routing:

```python
# Intent classification output example
{
  "intent": "video_generation",
  "topic": "Biot-Savart Law",
  "language": "hinglish",
  "complexity": "intermediate",
  "curriculum": "Class 12 Physics"
}
```

The supervisor routes to one of 4 specialized teams:
- **Visual Team** — image/drawing analysis (Gemini Vision)
- **Math Team** — step-by-step problem solving with LaTeX (GPT-4o)
- **Coding Team** — algorithm/DSA explanations (GPT-4o)
- **Video Team** — Manim animation pipeline (GPT-4o)

### 2. Video Generation Pipeline (Key Innovation)

The core technical challenge was generating **accurate, synchronized** educational videos in under 3 minutes.

**Pipeline:**
```
Topic Input
    │
    ▼
[GPT-4o Script Generator]
    Prompt: "Generate a structured narration script for {topic}
             in {language} suitable for {curriculum_level}.
             Each segment maps to a visual scene."
    │
    ▼
[GPT-4o Manim Code Generator]
    Prompt: "Generate Manim CE Python code for a 25-40s animation
             showing {topic}. Rules: no 3D, use Write/Create/FadeIn,
             include topic-specific visuals (not generic shapes),
             add self.wait() calls for pacing."
    │
    ▼
[Self-Healing Executor]
    - Runs Manim render
    - On error: sends error + code back to GPT-4o for fix
    - Max 3 retries
    │
    ▼
[Duration Measurement] — ffprobe measures exact video length
    │
    ▼
[Sarvam TTS] — generates audio with pace calculated to match video duration
    pace = estimated_speech_duration / video_duration (clamped 0.7x–1.4x)
    │
    ▼
[FFmpeg Muxer]
    - Small mismatch (<15%): atempo filter
    - Audio too short: pad silence
    - Audio too long: trim
    │
    ▼
    Final MP4 (25-40s, audio-video synced)
```

### 3. Gesture Recognition (MediaPipe Integration)

Hand gesture quiz uses **MediaPipe Hands** tracking 21 landmarks at 30 FPS:

```javascript
// Gesture classification logic
const detectGesture = (landmarks) => {
  const thumbTip = landmarks[4];
  const thumbIP  = landmarks[3];
  const indexTip = landmarks[8];

  if (thumbTip.y < thumbIP.y && indexTip.y > landmarks[6].y) {
    return "thumbs_up";   // Correct answer
  }
  if (thumbTip.y > thumbIP.y && indexTip.y > landmarks[6].y) {
    return "thumbs_down"; // Wrong answer
  }
  return null;
};
```

No backend calls for gesture detection — runs **100% in-browser** using WebAssembly.

### 4. WhatsApp Bot Session Management

The bot maintains per-user conversation context using Redis:

```typescript
// Session structure stored in Redis (key: whatsapp:session:{userId})
{
  userId: "919876543210",
  conversationHistory: [...], // last 20 messages (capped)
  currentContext: "BFS",       // current topic
  language: "hinglish",
  lastIntent: "concept_explanation",
  TTL: 86400                   // 24 hours
}
```

This allows the bot to understand context: "iska video banao" refers to the last discussed topic without re-asking.

### 5. YouTube Summarizer

```
YouTube URL → Extract video_id → youtube_transcript_api
           → Chunked transcript → GPT-4o-mini summary
           → Key points + PDF (jsPDF in browser)
```

Works entirely server-side — no YouTube scraping, uses official transcript API.

---

## 🔌 APIs & Integrations

| API | Usage in Gyan Intent |
|-----|----------------------|
| **OpenAI GPT-4o** | Intent classification, Manim code generation, math solving, summarization |
| **Sarvam AI (bulbul:v1)** | Hinglish/Hindi/Kannada TTS for video voiceover |
| **Google Gemini 1.5 Flash** | Vision analysis of student-drawn problems and uploaded photos |
| **HuggingFace (llava-1.5-7b)** | Free fallback for image analysis |
| **YouTube Transcript API** | Fetches timestamped captions for lecture summarization |
| **whatsapp-web.js** | Headless Chromium-based WhatsApp Web client for the bot |
| **Google Classroom API** | Import assignments, course data for quiz generation |

---

## 🔬 Research & Background

### Why Visual Learning Matters

Research in cognitive science consistently shows that **visual learning outperforms text-only learning** for STEM subjects:

- **Dual Coding Theory** (Paivio, 1971): The brain processes verbal and visual information in separate channels — combining both leads to deeper encoding and better retention
- **Multimedia Learning Principle** (Mayer, 2009): Students learn more deeply from words + pictures together than from words alone
- **Cognitive Load Theory** (Sweller, 1988): Animated step-by-step visuals reduce extraneous cognitive load compared to dense text

**Implication for Indian classrooms**: Textbook-heavy instruction increases cognitive load. Video animations reduce it, especially for abstract concepts like integration, magnetism, and DNA replication.

### Why Vernacular Matters in Indian EdTech

- **ASER Report 2023**: 50%+ of Class 8 students in rural India cannot solve basic division problems — attributed partly to instruction-medium mismatch
- **NEP 2020 mandate**: Recommends mother-tongue instruction up to Class 5 and supports multilingual education beyond
- **Hinglish as a natural medium**: 125M+ Indians code-switch between Hindi and English daily — yet virtually no AI educational tool supports Hinglish natively

**Our approach**: Sarvam AI's `bulbul:v1` TTS model produces natural Hinglish/Hindi/Kannada voice — not machine-translated awkward speech. This is critical for classroom comprehension.

### Why Generative > Retrieval for Education

| Metric | Retrieval-Based (Byju's style) | Generative (Gyan Intent) |
|--------|-------------------------------|--------------------------|
| **Content coverage** | Limited to what was pre-recorded | Unlimited — any topic, any query |
| **Personalization** | One-size-fits-all lecture | Tailored to student's exact question |
| **Latency to answer** | Immediate (but may not address the specific doubt) | 2–3 minutes (but directly addresses the doubt) |
| **Curriculum adaptability** | Fixed syllabus | Adapts to any board (CBSE, ICSE, State) |
| **Cost to scale** | High (recording studio per topic) | Near-zero per new topic |

### WhatsApp as the Right Delivery Channel

- **India WhatsApp users**: 500M+ (largest user base globally)
- **Penetration in Tier-2/3 cities**: WhatsApp is the default communication app for coaching center doubt-solving
- **Existing behavior**: Students already send doubt photos to teachers on WhatsApp — we plug into this existing workflow without requiring behavior change

---

## 🌟 Novelty & Innovation

### 1. First Generative Video EdTech for Hinglish

No existing platform generates **custom Manim animations with Hinglish voiceover** for any arbitrary STEM topic. Byju's, Vedantu, and Unacademy all rely on pre-recorded videos. Gyan Intent generates a new video for every query.

### 2. Self-Healing Manim Pipeline

Generating correct Manim code from a text topic is **not a solved problem**. LLMs frequently produce Manim code with runtime errors (deprecated APIs, unsupported methods, incorrect object references). Our **self-healing loop** automatically:
- Catches the Python traceback
- Sends the error + original code back to GPT-4o with a repair prompt
- Retries up to 3 times before falling back

This makes the pipeline production-ready without human supervision.

### 3. Dynamic Audio-Video Synchronization

Most TTS integrations simply concatenate audio to video. We solved the hard problem of **natural-sounding synchronization**:

```
1. Render video first → measure exact duration via ffprobe
2. Estimate natural speech duration at pace=1.0
3. Compute target pace = estimated_speech / video_duration
4. Clamp to 0.7x–1.4x (beyond this sounds unnatural)
5. Generate TTS at computed pace
6. Fine-tune: atempo for <15% mismatch, pad/trim for larger
```

Result: Voiceover feels natural and matches the animation — no awkward silences or rushed speech.

### 4. Browser-Native Gesture Recognition (Zero Backend)

Gesture detection runs **entirely in the browser** via MediaPipe Hands + WebAssembly — no video frames are sent to any server. This means:
- **Zero latency** for gesture response (30 FPS inference)
- **Privacy-safe** — webcam data never leaves the device
- **Works offline** once the page is loaded

### 5. Intent-Aware Multi-Modal Input

The platform accepts intent from multiple input modalities — typed text, drawn sketches, WhatsApp photos — and routes them to the correct AI team:

```
Text query → LangGraph Supervisor → Agent Team
Drawn sketch → Gemini Vision → Math/Science solver
WhatsApp photo → Gemini Vision → Step-by-step explanation
YouTube URL → Transcript API → GPT-4o summarizer
```

No other Indian EdTech platform has a **unified multi-modal intent engine** operating across this many input types.

### 6. WhatsApp Bot with Contextual Memory

The WhatsApp bot maintains **per-student conversation history** in Redis, enabling it to understand follow-up questions:

```
Student: "BFS kya hota hai?"
Bot: [explains BFS]

Student: "iska video banao"          ← ambiguous, but bot resolves "iska" = BFS
Bot: [generates BFS video]

Student: "Hindi mein batao"          ← bot remembers context, switches language
Bot: [explains BFS in Hindi]
```

No commercially available WhatsApp education bot has this level of contextual continuity.

---

## 📊 Impact on Schools, Colleges & Coaching Centers

### For School Teachers (Class 6–12)

| Pain Point | Gyan Intent Solution |
|-----------|---------------------|
| Creating visual aids takes hours | Auto-generate Manim animation in 2 minutes |
| Students don't understand English explanations | Hinglish/Hindi voiceover support |
| Can't give personalized attention to 50 students | AI handles individual doubts via WhatsApp |
| Making quizzes is tedious | AI generates MCQs for any topic instantly |

### For College Students (UG/PG)

| Pain Point | Gyan Intent Solution |
|-----------|---------------------|
| 2-hour professor lecture hard to digest | YouTube Summarizer → 5-min AI summary + PDF |
| Can't find good visual explanation for DSA/Calculus | AI generates custom animation for any concept |
| Doubt at 11 PM — no tutor available | WhatsApp bot answers 24/7 |

### For Coaching Centers (JEE/NEET/UPSC)

| Pain Point | Gyan Intent Solution |
|-----------|---------------------|
| Students send doubts on WhatsApp, teachers overwhelmed | Bot auto-answers and escalates only complex ones |
| Students learn in Hinglish but tools respond in English | Full Hinglish support end-to-end |
| Creating topic-wise revision quizzes is slow | AI quiz generator per topic |
| Students can't afford premium tutoring | Free AI explanations at scale |

---

## 🚀 User Journey — School Use Case

```
Scenario: Aryan, Class 11 (JEE aspirant) at coaching center in Jaipur

10:30 PM — Aryan is stuck on "Biot-Savart Law"

1. Opens WhatsApp, sends: "Biot Savart Law samajh nahi aaya"
2. Bot detects intent: concept_explanation, language: hinglish
3. Bot sends explanation in Hinglish with YouTube links
4. Aryan: "video chahiye"
5. Bot triggers video generation → 45s Manim animation with Hinglish voiceover
6. Aryan opens Gyan Intent dashboard next morning
7. Takes gesture quiz on Magnetism → earns 50 points
8. Downloads YouTube lecture summary PDF for revision

Total time for doubt resolution: ~3 minutes
Available: 24/7, any topic, any language
```

---

## 🚀 How to Run Locally

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20+ | `brew install node` |
| **Python** | 3.11+ | `brew install python@3.11` |
| **Redis** | 7 | `brew install redis` |
| **FFmpeg** | Any | `brew install ffmpeg` |
| **LaTeX (MikTeX/MacTeX)** | Any | `brew install --cask mactex` |

### Quick Start (3 terminals)

**Terminal 1 — Backend:**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Create backend/.env with OPENAI_API_KEY, SARVAM_API_KEY, REDIS_URL
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
# Create frontend/.env.local with NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

**Terminal 3 — WhatsApp Bot:**
```bash
cd whatsapp-bot
npm install && npm run build
# Create whatsapp-bot/.env with BACKEND_URL, REDIS_URL
npm start
# Scan QR code in terminal to connect WhatsApp
```

### Required API Keys

| Key | Where to Get |
|-----|-------------|
| `OPENAI_API_KEY` | platform.openai.com |
| `SARVAM_API_KEY` | sarvam.ai |
| `GEMINI_API_KEY` | aistudio.google.com (free tier) |

---

## 🔮 Future Roadmap

- **Voice Input** — Sarvam Speech-to-Text so students can ask doubts verbally
- **More Languages** — Tamil, Telugu, Marathi
- **School Admin Panel** — Teacher dashboard for tracking class progress
- **Offline Video Cache** — Download and watch generated videos without internet
- **Fine-tuned Models** — Domain-specific models for JEE/NEET curriculum

---

## 👥 Team

**Gyan Intent** — Built for India's 260M students.

Making quality education accessible to every school, college, and coaching center — in the language students think in, on the devices they already use.

---

*Last updated: March 2026*
