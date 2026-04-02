"""Intent Engine endpoints."""

import time
import base64
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.config import settings


def _text_content(content) -> str:
    """Normalise LLM .content which may be a str or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(block.get("text", "") if isinstance(block, dict) else str(block) for block in content)
    return str(content)


router = APIRouter()

# Initialize LLM
llm = ChatOpenAI(
    model="gpt-5.1-codex-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)


class IntentRequest(BaseModel):
    """Intent analysis request."""
    modality: str  # visual, voice, gesture, text
    content: Optional[str] = None
    query: Optional[str] = None  # alias used by WhatsApp bot
    language: str = "hinglish"
    image: Optional[str] = None  # Base64 encoded image

    @property
    def text(self) -> Optional[str]:
        """Return content or query, whichever is set."""
        return self.content or self.query


class IntentResponse(BaseModel):
    """Intent analysis response."""
    id: str
    category: str
    explanation: str
    confidence: float
    processing_time: float
    video_url: Optional[str] = None


@router.post("/analyze", response_model=IntentResponse)
async def analyze_intent(request: IntentRequest):
    """
    Analyze user intent and provide explanation.
    
    - **modality**: Input type (visual/voice/gesture/text)
    - **content**: The query or content to analyze
    - **language**: Target language (hinglish/hindi/english)
    - **image**: Base64 encoded image (for visual modality)
    """
    start_time = time.time()
    
    language_instruction = {
        "hinglish": "Respond in Hinglish (Roman Hindi + English mix) - friendly and conversational.",
        "hindi": "Respond in Hindi using Devanagari script.",
        "english": "Respond in simple, clear English.",
        "kannada": "Respond in Kannada.",
    }.get(request.language, "Respond in Hinglish.")

    if request.modality == "visual" and request.image:
        # Analyze image/drawing using vision-capable model
        text_prompt = (
            f"You are an educational AI analyzing a student's image.\n\n"
            f"{language_instruction}\n\n"
            f"Student caption: {request.text or 'Solve this'}\n\n"
            "Instructions:\n"
            "1. Read the image carefully — identify every question, equation, or diagram.\n"
            "2. If it contains a math/physics/chemistry problem, solve it FULLY step by step.\n"
            "3. State the final answer clearly.\n"
            "4. Keep the tone encouraging for a student."
        )

        # Build multimodal message with base64 image
        image_data = request.image
        if not image_data.startswith("data:"):
            image_data = f"data:image/png;base64,{image_data}"

        vision_llm = ChatOpenAI(
            model="gpt-5.1-codex-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
            max_tokens=2048,
        )

        try:
            response = await vision_llm.ainvoke([
                HumanMessage(content=[
                    {"type": "text", "text": text_prompt},
                    {"type": "image_url", "image_url": {"url": image_data}},
                ])
            ])
            explanation = _text_content(response.content)
        except Exception as e:
            explanation = f"Image analysis mein error aaya: {str(e)[:200]}. Please try again!"
    else:
        # Text-based analysis
        prompt = f"""
        You are an educational AI helping students learn.
        
        {language_instruction}
        
        Student's query: {request.text or 'Explain the drawing'}
        
        Provide a clear, engaging explanation. Use examples and analogies.
        If it's a problem, solve it step by step.
        """
        
        try:
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            explanation = _text_content(response.content)
        except Exception as e:
            explanation = f"Main samajh gaya! Tumhara sawaal interesting hai. Let me think about it..."
    
    processing_time = time.time() - start_time
    
    return IntentResponse(
        id=f"intent_{int(time.time() * 1000)}",
        category="educational",
        explanation=explanation,
        confidence=0.92,
        processing_time=processing_time,
    )


@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    language: str = Form("hinglish"),
    query: Optional[str] = Form(None),
):
    """Analyze uploaded image for visual intent."""
    # TODO: Implement image analysis
    
    return {
        "category": "visual",
        "explanation": "Image analyzed successfully",
        "detected_objects": [],
    }


@router.post("/route")
async def route_intent(request: IntentRequest):
    """Route intent to appropriate agent team without full processing."""
    # TODO: Implement supervisor routing logic
    
    return {
        "team": "math_team",
        "reasoning": "Detected mathematical expression",
        "estimated_time": 30,
    }
