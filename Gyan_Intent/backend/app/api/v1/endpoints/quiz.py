"""Gesture Quiz endpoints with topics and classroom support."""

from typing import List, Optional
from datetime import datetime
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import json
import httpx

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ===== MODELS =====

class QuizQuestion(BaseModel):
    """Quiz question."""
    id: str
    question: str
    options: List[str]
    correct_answer: int
    hint: str
    topic: str
    difficulty: str = "medium"


class QuizResponse(BaseModel):
    """Quiz response."""
    question_id: str
    gesture_answer: str  # thumbs_up, thumbs_down
    confidence: float


class QuizResult(BaseModel):
    """Quiz result."""
    total_questions: int
    correct_answers: int
    score: float
    time_taken: float
    topic: str


class ClassroomQuiz(BaseModel):
    """Assigned quiz for classroom."""
    id: str
    topic: str
    question_count: int
    due_date: str
    completed: int
    total: int


class GenerateQuizRequest(BaseModel):
    """Request to generate quiz for a subject."""
    subject: str
    count: int = 5


class GeneratedQuestion(BaseModel):
    """Generated quiz question."""
    id: str
    question: str
    options: List[str]
    correct_answer: int
    hint: str


class GenerateQuizResponse(BaseModel):
    """Response with generated questions."""
    questions: List[GeneratedQuestion]
    subject: str


class Classroom(BaseModel):
    """Classroom model."""
    id: str
    name: str
    teacher: str
    students: int
    assigned_quizzes: List[ClassroomQuiz] = []


class AssignQuizRequest(BaseModel):
    """Request to assign quiz to classroom."""
    classroom_id: str
    topic: str
    question_count: int
    due_date: str


# ===== QUESTION DATABASE =====

QUESTIONS_DB = {
    "programming": [
        {
            "id": "p1",
            "question": "Is Python a compiled language?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "hint": "Python is an interpreted language!",
            "topic": "programming",
            "difficulty": "easy"
        },
        {
            "id": "p2",
            "question": "Does JavaScript support multiple inheritance?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "hint": "JavaScript uses prototypal inheritance.",
            "topic": "programming",
            "difficulty": "medium"
        },
        {
            "id": "p3",
            "question": "Is 'let' in JavaScript block-scoped?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "'let' declarations are block-scoped.",
            "topic": "programming",
            "difficulty": "easy"
        },
        {
            "id": "p4",
            "question": "Is React a programming language?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "hint": "React is a JavaScript library.",
            "topic": "programming",
            "difficulty": "easy"
        },
        {
            "id": "p5",
            "question": "Can a function in Python return multiple values?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "Python functions can return tuples.",
            "topic": "programming",
            "difficulty": "medium"
        },
    ],
    "mathematics": [
        {
            "id": "m1",
            "question": "Is the derivative of x² equal to 2x?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "Using power rule: d/dx(x²) = 2x",
            "topic": "mathematics",
            "difficulty": "easy"
        },
        {
            "id": "m2",
            "question": "Is π (pi) a rational number?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "hint": "π is an irrational number.",
            "topic": "mathematics",
            "difficulty": "easy"
        },
        {
            "id": "m3",
            "question": "Is the integral of sin(x) equal to -cos(x)?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "∫sin(x)dx = -cos(x) + C",
            "topic": "mathematics",
            "difficulty": "medium"
        },
        {
            "id": "m4",
            "question": "Is e^iπ + 1 = 0 (Euler's identity)?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "This is Euler's identity.",
            "topic": "mathematics",
            "difficulty": "hard"
        },
        {
            "id": "m5",
            "question": "Is 0! (zero factorial) equal to 1?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "By convention, 0! = 1.",
            "topic": "mathematics",
            "difficulty": "medium"
        },
    ],
    "science": [
        {
            "id": "s1",
            "question": "Is water made of two hydrogen atoms and one oxygen atom?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "H₂O = 2 Hydrogen + 1 Oxygen",
            "topic": "science",
            "difficulty": "easy"
        },
        {
            "id": "s2",
            "question": "Does light travel faster than sound?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "Light: ~300,000 km/s, Sound: ~343 m/s",
            "topic": "science",
            "difficulty": "easy"
        },
        {
            "id": "s3",
            "question": "Is DNA double-stranded?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "DNA has a double helix structure.",
            "topic": "science",
            "difficulty": "easy"
        },
        {
            "id": "s4",
            "question": "Is the Earth approximately 4.5 billion years old?",
            "options": ["True", "False"],
            "correct_answer": 0,
            "hint": "Earth is about 4.54 billion years old.",
            "topic": "science",
            "difficulty": "medium"
        },
        {
            "id": "s5",
            "question": "Do electrons carry a positive charge?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "hint": "Electrons carry negative charge.",
            "topic": "science",
            "difficulty": "easy"
        },
    ],
}

# In-memory classroom storage
CLASSROOMS_DB = {
    "1": Classroom(
        id="1",
        name="Class 10-A",
        teacher="Dr. Sharma",
        students=35,
        assigned_quizzes=[
            ClassroomQuiz(id="q1", topic="programming", question_count=5, due_date="2026-02-20", completed=28, total=35),
            ClassroomQuiz(id="q2", topic="mathematics", question_count=10, due_date="2026-02-22", completed=15, total=35),
        ]
    ),
    "2": Classroom(
        id="2",
        name="Class 12-B",
        teacher="Prof. Kumar",
        students=42,
        assigned_quizzes=[
            ClassroomQuiz(id="q3", topic="science", question_count=8, due_date="2026-02-21", completed=30, total=42),
        ]
    ),
}


# ===== ENDPOINTS =====

@router.post("/generate", response_model=GenerateQuizResponse)
async def generate_quiz(request: GenerateQuizRequest):
    """Generate quiz questions for a subject using Gemini AI."""
    subject_lower = request.subject.lower()
    count = min(request.count, 15)  # cap at 15

    # Try known local banks first for speed
    local_bank = None
    if any(k in subject_lower for k in ("program", "code", "python", "javascript")):
        local_bank = QUESTIONS_DB.get("programming")
    elif any(k in subject_lower for k in ("math", "calculus", "algebra", "geometry")):
        local_bank = QUESTIONS_DB.get("mathematics")
    elif any(k in subject_lower for k in ("science", "physics", "chemistry", "biology")):
        local_bank = QUESTIONS_DB.get("science")

    if local_bank and len(local_bank) >= count:
        import random
        picked = random.sample(local_bank, min(count, len(local_bank)))
        return GenerateQuizResponse(
            questions=[GeneratedQuestion(
                id=q["id"], question=q["question"], options=q["options"],
                correct_answer=q["correct_answer"], hint=q["hint"]
            ) for q in picked],
            subject=request.subject,
        )

    # Dynamic generation via LLM
    prompt = f"""Generate exactly {count} True/False quiz questions about "{request.subject}" for college students.
Return ONLY a JSON array (no markdown, no code fences) where each element has:
- "question": a clear True/False statement
- "correct_answer": 0 if the statement is True, 1 if False
- "hint": a short explanation (1 sentence)

Example format:
[{{"question":"The Earth orbits the Sun.","correct_answer":0,"hint":"Earth revolves around the Sun in an elliptical orbit."}}]
"""

    raw_text = None

    # Try OpenRouter first (higher quota)
    if settings.OPENROUTER_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "google/gemini-2.0-flash-001",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"OpenRouter quiz generation failed: {e}")

    # Fallback to direct Gemini API
    if raw_text is None and settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning(f"Gemini quiz generation failed: {e}")

    if raw_text is None:
        raise HTTPException(status_code=503, detail="All LLM providers failed or unavailable")

    try:
        # Strip possible markdown code fences
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        items = json.loads(cleaned)
        questions = []
        for i, item in enumerate(items[:count]):
            questions.append(GeneratedQuestion(
                id=f"ai_{subject_lower[:8]}_{i+1}",
                question=item["question"],
                options=["True", "False"],
                correct_answer=int(item.get("correct_answer", 0)),
                hint=item.get("hint", f"Review {request.subject} concepts."),
            ))

        return GenerateQuizResponse(questions=questions, subject=request.subject)

    except Exception as e:
        logger.error(f"Quiz generation parse failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.get("/topics")
async def get_topics():
    """Get available quiz topics."""
    return {
        "topics": [
            {
                "id": "programming",
                "name": "Programming",
                "question_count": len(QUESTIONS_DB["programming"]),
                "color": "from-purple-500 to-pink-500"
            },
            {
                "id": "mathematics",
                "name": "Higher Mathematics",
                "question_count": len(QUESTIONS_DB["mathematics"]),
                "color": "from-cyan-500 to-blue-500"
            },
            {
                "id": "science",
                "name": "Science",
                "question_count": len(QUESTIONS_DB["science"]),
                "color": "from-green-500 to-emerald-500"
            },
        ]
    }


@router.get("/questions", response_model=List[QuizQuestion])
async def get_questions(topic: str = "programming", count: int = 5, difficulty: Optional[str] = None):
    """Get quiz questions for a topic."""
    if topic not in QUESTIONS_DB:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    questions = QUESTIONS_DB[topic]
    
    # Filter by difficulty if specified
    if difficulty:
        questions = [q for q in questions if q["difficulty"] == difficulty]
    
    # Return requested count
    return [QuizQuestion(**q) for q in questions[:count]]


@router.websocket("/ws")
async def quiz_websocket(websocket: WebSocket):
    """WebSocket for real-time gesture quiz."""
    await websocket.accept()
    
    try:
        while True:
            # Receive gesture data from client
            data = await websocket.receive_json()
            
            gesture = data.get("gesture")  # thumbs_up, thumbs_down
            question_id = data.get("question_id")
            confidence = data.get("confidence", 0.8)
            
            # Map gesture to answer
            answer = 0 if gesture == "thumbs_up" else 1  # 0=True, 1=False
            
            # Find the question and check answer
            correct = False
            hint = ""
            for topic_questions in QUESTIONS_DB.values():
                for q in topic_questions:
                    if q["id"] == question_id:
                        correct = (answer == q["correct_answer"])
                        hint = q["hint"]
                        break
            
            await websocket.send_json({
                "question_id": question_id,
                "gesture": gesture,
                "answer": answer,
                "correct": correct,
                "hint": hint if not correct else None,
                "confidence": confidence,
            })
            
    except WebSocketDisconnect:
        print("Client disconnected")


@router.post("/submit", response_model=QuizResult)
async def submit_quiz(responses: List[QuizResponse], topic: str = "general"):
    """Submit quiz answers and get results."""
    correct_count = 0
    
    for response in responses:
        # Find question
        answer = 0 if response.gesture_answer == "thumbs_up" else 1
        for topic_questions in QUESTIONS_DB.values():
            for q in topic_questions:
                if q["id"] == response.question_id:
                    if answer == q["correct_answer"]:
                        correct_count += 1
                    break
    
    score = (correct_count / len(responses)) * 100 if responses else 0
    
    return QuizResult(
        total_questions=len(responses),
        correct_answers=correct_count,
        score=score,
        time_taken=0.0,
        topic=topic,
    )


# ===== CLASSROOM ENDPOINTS =====

@router.get("/classrooms", response_model=List[Classroom])
async def get_classrooms():
    """Get all classrooms."""
    return list(CLASSROOMS_DB.values())


@router.get("/classrooms/{classroom_id}", response_model=Classroom)
async def get_classroom(classroom_id: str):
    """Get a specific classroom."""
    if classroom_id not in CLASSROOMS_DB:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return CLASSROOMS_DB[classroom_id]


@router.post("/classrooms/{classroom_id}/assign")
async def assign_quiz_to_classroom(classroom_id: str, request: AssignQuizRequest):
    """Assign a quiz to a classroom."""
    if classroom_id not in CLASSROOMS_DB:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if request.topic not in QUESTIONS_DB:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    classroom = CLASSROOMS_DB[classroom_id]
    
    new_quiz = ClassroomQuiz(
        id=f"q{len(classroom.assigned_quizzes) + 1}",
        topic=request.topic,
        question_count=request.question_count,
        due_date=request.due_date,
        completed=0,
        total=classroom.students,
    )
    
    classroom.assigned_quizzes.append(new_quiz)
    
    return {"message": "Quiz assigned successfully", "quiz": new_quiz}


@router.post("/classrooms/create")
async def create_classroom(name: str, teacher: str, students: int = 0):
    """Create a new classroom."""
    import uuid
    classroom_id = str(uuid.uuid4())[:8]
    
    new_classroom = Classroom(
        id=classroom_id,
        name=name,
        teacher=teacher,
        students=students,
        assigned_quizzes=[],
    )
    
    CLASSROOMS_DB[classroom_id] = new_classroom
    
    return {"message": "Classroom created", "classroom": new_classroom}
    
    score = (correct_count / len(responses)) * 100 if responses else 0
    
    return QuizResult(
        total_questions=len(responses),
        correct_answers=correct_count,
        score=score,
        time_taken=0.0,
        topic=topic,
    )


# ===== CLASSROOM ENDPOINTS =====

@router.get("/classrooms", response_model=List[Classroom])
async def get_classrooms():
    """Get all classrooms."""
    return list(CLASSROOMS_DB.values())


@router.get("/classrooms/{classroom_id}", response_model=Classroom)
async def get_classroom(classroom_id: str):
    """Get a specific classroom."""
    if classroom_id not in CLASSROOMS_DB:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return CLASSROOMS_DB[classroom_id]


@router.post("/classrooms/{classroom_id}/assign")
async def assign_quiz_to_classroom(classroom_id: str, request: AssignQuizRequest):
    """Assign a quiz to a classroom."""
    if classroom_id not in CLASSROOMS_DB:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if request.topic not in QUESTIONS_DB:
        raise HTTPException(status_code=404, detail="Topic not found")
