# Gyan_Intent — Intent-Aware Learning Engine

> **Tagline**: From Gesture to Genius

Gyan_Intent is a revolutionary EdTech platform that moves beyond "Retrieval-based EdTech" (Netflix for textbooks) to **"Generative EdTech."** We do not search for answers; we manufacture custom, localized, multimedia explanations on-the-fly based on the user's intent (Voice, Gesture, or Text).

# Gyan_

## Core Philosophy

- **Accessibility First**: Hands-free gesture controls for motor-impaired students
- **Vernacular Support**: Hinglish (Hindi + English) voice and text for Tier-3 India
- **Generative AI**: Custom video explanations generated on-demand using Manim
- **Multi-Modal Input**: Accept voice, gestures, images, or text

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Next.js 15    │  │   Three.js /    │  │   MediaPipe     │             │
│  │   React 19      │  │   React Three   │  │   Hands         │             │
│  │   Tailwind 4    │  │   Fiber         │  │   Gesture Ctrl  │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┼────────────────────┼────────────────────┼──────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/v1/intent       → Intent Router (Multimodal)                  │   │
│  │  /api/v1/video        → Video Factory Pipeline                      │   │
│  │  /api/v1/quiz         → Gesture Quiz Handler                        │   │
│  │  /api/v1/whatsapp     → whatsapp-web.js Bot Bridge                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION (LangGraph)                               │
│                                                                              │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│   │  Supervisor  │─────▶│   Visual     │      │    Math      │              │
│   │   Agent      │      │   Team       │      │    Team      │              │
│   └──────┬───────┘      └──────────────┘      └──────────────┘              │
│          │                                                                   │
│          ├─────────────────────┬─────────────────────┐                       │
│          ▼                     ▼                     ▼                       │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │   Coding     │     │   Video      │     │   Sarvam     │                │
│   │   Team       │     │   Factory    │     │   TTS        │                │
│   └──────────────┘     └──────┬───────┘     └──────────────┘                │
│                               │                                              │
│                               ▼                                              │
│                        ┌──────────────┐                                      │
│                        │   Manim +    │                                      │
│                        │   Healer     │                                      │
│                        └──────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Three.js / React Three Fiber** - 3D gesture visualization
- **MediaPipe Hands** - Client-side hand tracking
- **Framer Motion** - Animations

### Backend
- **FastAPI** - Python API framework
- **LangGraph** - Multi-agent orchestration
- **LangChain + OpenAI** - LLM integration
- **Celery + Redis** - Background task queue

### AI/ML
- **OpenAI GPT-4o** - Code generation, reasoning
- **Sarvam AI** - Indic LLM and TTS (Hinglish support)
- **Manim** - Mathematical animation engine
- **MediaPipe** - Hand tracking

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and task queue
- **FFMPEG** - Video processing

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+
- PostgreSQL 16
- Redis 7
- FFmpeg

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload
```

### Celery Worker
```bash
cd backend
celery -A workers.celery_app worker --loglevel=info
```

## Key Features

### 1. Intent Engine (Router)
Accepts multimodal inputs and routes to appropriate agent team:
- **DrawInAir** (MediaPipe): Draw shapes or math problems in the air
- **Voice Command** (Sarvam): Ask questions in Hinglish
- **Visual Snap**: Upload textbook photos

### 2. Generative Video Factory
Self-healing pipeline for video generation:
1. **Script Agent**: Writes colloquial Hinglish script
2. **Code Agent**: Converts script to Manim Python code
3. **Healer Agent**: Auto-fixes errors in Manim code
4. **Sync Engine**: Aligns TTS audio with animation

### 3. Kinetic Blackboard
React component with MediaPipe hand tracking:
- **Air Quizzes**: Thumbs up/down for True/False
- **Video Control**: Open palm to pause, pinch to zoom
- **3D Drawing**: Draw in 3D space with hand gestures

### 4. Rural OS (WhatsApp Bot)
whatsapp-web.js + Celery workflow:
- User sends doubt image on WhatsApp
- Async processing generates video
- Video link sent back with audio explanation

## Environment Variables

Create `.env` in `backend/`:

```env
# App
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/gyanintent
REDIS_URL=redis://localhost:6379/0

# AI APIs
OPENAI_API_KEY=sk-...
SARVAM_API_KEY=sk-...

# Auth
SECRET_KEY=your-secret-key

# WhatsApp Bot (whatsapp-web.js)
WHATSAPP_BOT_URL=http://localhost:3003
```

## API Endpoints

### Intent Engine
- `POST /api/v1/intent/analyze` - Analyze user intent
- `POST /api/v1/intent/analyze-image` - Analyze uploaded image
- `POST /api/v1/intent/route` - Route to appropriate team

### Video Factory
- `POST /api/v1/video/generate` - Generate educational video
- `GET /api/v1/video/status/{job_id}` - Check generation status
- `GET /api/v1/video/stream/{job_id}` - Stream HLS video

### Gesture Quiz
- `GET /api/v1/quiz/questions` - Get quiz questions
- `WS /api/v1/quiz/ws` - WebSocket for real-time gestures

### WhatsApp Bot
- `POST /api/v1/whatsapp/webhook` - whatsapp-web.js webhook bridge

## Hero Flow (30-second Pitch)

> **Rahul**, a Class 10 student in a Tier-3 town, struggles with Newton's Laws. He opens Gyan_Intent on his father's old smartphone.
>
> **"Dekho, jab ball girti hai..."** he says in Hinglish. The Intent Engine understands.
>
> He draws a falling ball in the air using **DrawInAir**. MediaPipe tracks his hand at 30 FPS.
>
> The **Supervisor Agent** routes to the **Math Team**, which explains F=ma.
>
> Rahul says **"Video banao"**. The **Video Factory** generates a 60-second Manim animation with Hinglish voiceover in 90 seconds.
>
> He watches, understands, and gives a **thumbs up** when the quiz asks if he learned.
>
> **From Gesture to Genius.**

## License

MIT License - See LICENSE file

## Team

Built with passion for accessible education.

---

**Gyan_Intent** — Making education limitless and accessible to everyone.
