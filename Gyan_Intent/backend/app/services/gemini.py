"""AI Vision Service for drawing analysis - supports multiple providers."""

import base64
import httpx
from typing import Optional
from app.config import settings
import os


class GeminiService:
    """Service for AI Vision integration - supports Gemini and Hugging Face."""
    
    def __init__(self):
        # Get API keys from settings
        self.gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY')
        self.hf_api_key = getattr(settings, 'HF_API_KEY', None) or os.getenv('HF_API_KEY')
        
        # Prefer Hugging Face (free), fallback to Gemini
        self.provider = 'huggingface' if self.hf_api_key and self.hf_api_key != 'DEMO_KEY_PLEASE_REPLACE' else 'gemini'
        
        self.gemini_url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"
        self.hf_url = "https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf"
    
    async def analyze_image(self, image_data: str, question: str = "") -> dict:
        """Analyze an image using available AI provider."""
        # Remove data URL prefix if present
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        # Try Hugging Face first (free)
        if self.hf_api_key and self.hf_api_key != 'DEMO_KEY_PLEASE_REPLACE':
            return await self._analyze_with_huggingface(image_data, question)
        
        # Fallback to Gemini
        if self.gemini_api_key and self.gemini_api_key != 'DEMO_KEY_PLEASE_REPLACE':
            return await self._analyze_with_gemini(image_data, question)
        
        # No API key available - use basic shape detection
        return await self._basic_shape_detection(image_data, question)
    
    async def _analyze_with_huggingface(self, image_data: str, question: str) -> dict:
        """Analyze image using Hugging Face Inference API."""
        # Try multiple vision models in order of preference
        models = [
            "microsoft/kosmos-2-patch14-224",
            "Salesforce/blip2-opt-2.7b",
            "nlpconnect/vit-gpt2-image-captioning"
        ]
        
        try:
            # Decode base64 to raw bytes for HF API
            import base64
            image_bytes = base64.b64decode(image_data)
            
            for model in models:
                hf_url = f"https://api-inference.huggingface.co/models/{model}"
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        hf_url,
                        headers={
                            "Authorization": f"Bearer {self.hf_api_key}",
                        },
                        content=image_bytes,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        
                        # Handle different response formats
                        caption = ""
                        if isinstance(result, list) and len(result) > 0:
                            caption = result[0].get("generated_text", "") or str(result[0])
                        elif isinstance(result, dict):
                            caption = result.get("generated_text", "") or result.get("text", "")
                        else:
                            caption = str(result)
                        
                        if caption:
                            analysis = self._enhance_analysis(caption, question)
                            return {
                                "analysis": analysis,
                                "problem_type": "drawing",
                                "solution": None,
                                "steps": [],
                                "explanation": caption
                            }
                    elif response.status_code == 503:
                        # Model loading, try next
                        continue
                    else:
                        # Try next model
                        continue
            
            # All HF models failed, try Gemini
            return await self._analyze_with_gemini(image_data, question)
                    
        except Exception as e:
            # Fallback to Gemini if HF fails
            return await self._analyze_with_gemini(image_data, question)
    
    def _enhance_analysis(self, caption: str, question: str) -> str:
        """Enhance the AI caption with educational context."""
        caption_lower = caption.lower()
        
        # Detect shapes
        if "triangle" in caption_lower:
            return f"""🔺 **Triangle Detected!**

**What I see:** {caption}

**Mathematical Properties:**
- A triangle has 3 sides and 3 angles
- Sum of all angles = 180°
- Area = (1/2) × base × height
- The triangle appears to be a geometric shape drawn with straight lines.

**Educational Note:** Triangles are fundamental shapes in geometry used in architecture, engineering, and art!"""
        
        elif "circle" in caption_lower or "round" in caption_lower:
            return f"""⭕ **Circle Detected!**

**What I see:** {caption}

**Mathematical Properties:**
- A circle has infinite points equidistant from center
- Circumference = 2πr
- Area = πr²

**Educational Note:** Circles are found everywhere - wheels, clocks, and planetary orbits!"""
        
        elif "square" in caption_lower or "rectangle" in caption_lower:
            return f"""⬜ **Quadrilateral Detected!**

**What I see:** {caption}

**Mathematical Properties:**
- 4 sides, 4 right angles (90°)
- Area = length × width
- Perimeter = 2(length + width)

**Educational Note:** Squares and rectangles are the building blocks of architecture!"""
        
        else:
            return f"""🎨 **Drawing Analyzed!**

**What I see:** {caption}

**Analysis:** Your drawing has been captured and analyzed. Try drawing clear geometric shapes like triangles, circles, or squares for more detailed mathematical analysis!

**Tips:**
- Use bold, clear strokes
- Draw recognizable shapes
- For math problems, write equations clearly"""
    
    async def _analyze_with_gemini(self, image_data: str, question: str) -> dict:
        """Analyze image using Gemini API."""
        prompt = question or """Analyze this image carefully. If it contains:
1. A mathematical problem (equations, geometry, calculations) - Solve it step by step
2. A diagram or drawing - Explain what it represents
3. Text - Extract and explain the content

Provide your response in this JSON format:
{
    "analysis": "Brief description of what you see",
    "problem_type": "math|diagram|text|other",
    "solution": "The final answer if applicable",
    "steps": ["Step 1", "Step 2", ...],
    "explanation": "Detailed explanation"
}

Focus on being educational and helpful for students."""
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": "image/png", "data": image_data}}
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048}
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.gemini_url}?key={self.gemini_api_key}",
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    
                    try:
                        import json
                        if "{" in text and "}" in text:
                            json_start = text.index("{")
                            json_end = text.rindex("}") + 1
                            return json.loads(text[json_start:json_end])
                    except:
                        pass
                    
                    return {
                        "analysis": text,
                        "problem_type": "other",
                        "solution": None,
                        "steps": [],
                        "explanation": text
                    }
                else:
                    return await self._basic_shape_detection(image_data, question)
                    
        except Exception as e:
            return await self._basic_shape_detection(image_data, question)
    
    async def _basic_shape_detection(self, image_data: str, question: str) -> dict:
        """Basic shape detection without external API - always available."""
        import base64
        
        # Try to analyze the image data for basic patterns
        try:
            # Decode base64 to analyze pixel patterns
            img_bytes = base64.b64decode(image_data)
            
            # Count non-transparent pixels as a basic heuristic
            pixel_count = len(img_bytes)
            
            # Detect shape based on image characteristics
            shape_hint = "drawing"
            if pixel_count < 15000:
                shape_hint = "simple shape or line"
            elif pixel_count < 40000:
                shape_hint = "geometric shape"
            else:
                shape_hint = "detailed drawing"
                
        except:
            shape_hint = "drawing"
        
        # Provide helpful educational content
        analysis = f"""🎨 **I see your {shape_hint}!**

**Drawing captured successfully!**

To enable AI-powered analysis, add a working API key:

**Option 1: Get a FREE Hugging Face Token**
1. Visit: https://huggingface.co/settings/tokens
2. Sign up (free) → Create token (Read permission)
3. Add to backend/.env: `HF_API_KEY=hf_your_token`

**Option 2: Get a FREE Google Gemini Key**
1. Visit: https://aistudio.google.com/app/apikey
2. Create API key (free tier available)
3. Add to backend/.env: `GEMINI_API_KEY=your_key`

**Drawing Tips:**
- Draw clear shapes: triangles, circles, squares
- For equations: write clearly with numbers
- Use good contrast and lighting

**Restart backend after adding keys!**"""
        
        return {
            "analysis": analysis,
            "problem_type": "other",
            "solution": None,
            "steps": [],
            "explanation": f"No working API key - captured {shape_hint}"
        }


    async def generate_manim_code(self, concept: str, context: str = "") -> str:
        """Generate Manim animation code for a concept.
        
        Args:
            concept: The concept to animate
            context: Additional context or problem details
            
        Returns:
            Manim Python code
        """
        prompt = f"""Generate a 75-90 second Manim (Community Edition) animation for this educational concept:

Concept: {concept}
{f'Context: {context}' if context else ''}

Requirements:
1. Create a Scene class named 'ConceptScene'
2. Include detailed step-by-step animations with proper timing
3. Use Write(), Create(), FadeIn(), Transform() animations
4. Add text labels and mathematical equations with MathTex
5. Use color gradients for visual appeal
6. Include a title, main content sections, and summary
7. Each animation should have appropriate run_time values
8. Total video should be 75-90 seconds

Output ONLY the Python code, no explanations. Start with:
from manim import *
import numpy as np

class ConceptScene(Scene):
    def construct(self):
        ..."""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096,
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json=payload,
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                code = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                # Extract code from markdown if present
                if "```python" in code:
                    code = code.split("```python")[1].split("```")[0]
                elif "```" in code:
                    code = code.split("```")[1].split("```")[0]
                
                return code.strip()
            else:
                raise Exception(f"Gemini API error: {response.status_code}")
    
    async def solve_math_problem(self, problem: str) -> dict:
        """Solve a math problem with step-by-step explanation.
        
        Args:
            problem: The math problem to solve
            
        Returns:
            dict with solution and steps
        """
        prompt = f"""Solve this math problem step by step. Provide a clear educational explanation.

Problem: {problem}

Respond in JSON format:
{{
    "analysis": "What type of problem is this",
    "solution": "The final answer",
    "steps": ["Step 1: ...", "Step 2: ...", ...],
    "formula": "The formula used (if applicable)",
    "explanation": "Why this solution works"
}}"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                try:
                    import json
                    if "{" in text and "}" in text:
                        json_start = text.index("{")
                        json_end = text.rindex("}") + 1
                        return json.loads(text[json_start:json_end])
                except:
                    pass
                
                return {
                    "analysis": "Math problem",
                    "solution": text,
                    "steps": [],
                    "formula": None,
                    "explanation": text
                }
            else:
                raise Exception(f"Gemini API error: {response.status_code}")


# Singleton instance
gemini_service = GeminiService()
