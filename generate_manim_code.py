import os
import json
import boto3
from config import GENERATED_CODE_DIR

SYSTEM_PROMPT = """
You are an expert AI Physics Tutor specializing in visualizing concepts using Manim.
Generate Manim code that satisfies the user's request.
Rules:
1. Output ONLY a valid JSON object with two keys: "explanation" and "code". Do not wrap the JSON in markdown blocks like ```json ... ```, just output the raw JSON.
2. "explanation" should be a clear text summary suitable for speech narration.
3. "code" should be the complete Python code for a Manim scene.
4. IMPORTANT: Use font="Nirmala UI" for all Text() objects to support regional Indian languages.
5. Ensure the scene class is named 'TutorScene'.
6. Use ONLY standard Manim colors like WHITE, BLACK, RED, GREEN, BLUE, YELLOW, ORANGE, PURPLE. Do not use 'BROWN'.
7. NEVER create zero-length Arrows (e.g., Arrow(LEFT, LEFT)).
Rule 8: CRITICAL: DO NOT use `MathTex` or `Tex`. Use ONLY `Text(..., font="Nirmala UI")`.
9. CRITICAL: DO NOT use `VGroup(*self.mobjects)` for clearing. Use `FadeOut(*self.mobjects)`.
10. VISUALS FIRST: Prioritize geometric shapes (Circle, Square, Arrow, Line, Dot, NumberLine, Axes) over text.
11. TEXT LIMIT: Text objects should ONLY be for short labels or titles (max 5 words). NEVER show long paragraphs or bullet points as text on screen. 
12. ANIMATION: Use `Create`, `Transform`, `MoveTo`, `Rotate`, and `FadeIn` to show concepts in motion. The video should be a dynamic visualization, not a slide deck.
13. GEOMETRY FIX: When using `Sector`, use `radius=` instead of `outer_radius=`.
14. PACING: Ensure the "explanation" is detailed and at least 3-4 sentences long.
15. ZERO-SIZE PROTECTION: NEVER call `.set_length()` or `.scale()` on zero-length objects.
16. LaTeX PREVENTION: The system has NO LaTeX. NEVER use `MathTex`. For `NumberLine` or `Axes`, you MUST pass `label_constructor=Text` to avoid TeX errors.
17. STAR GEOMETRY: When using `Star(n=4, ...)`, you MUST explicitly set `inner_radius` and `outer_radius` and avoid high `density` values to prevent `ValueError`.
"""

def generate_manim_code(prompt, input_language='en', target_language='en'):
    """
    Generates explanation and Manim code using AWS Bedrock and Claude.
    """
    print(f"  Generating visualized explanation for: {prompt[:50]}...")
    
    bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-east-1'))
    model_id = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
    
    # Format the prompt for Claude
    prompt_text = f"Language: {target_language}. Request: {prompt}"
    
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "temperature": 0.2,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt_text
                    }
                ]
            }
        ]
    }
    
    try:
        response = bedrock.invoke_model(
            body=json.dumps(body),
            modelId=model_id,
            accept='application/json',
            contentType='application/json'
        )
        
        response_body = json.loads(response.get('body').read())
        content_text = response_body.get('content', [])[0].get('text', '')
        
        # Clean the output in case Claude adds markdown blocks
        if content_text.startswith("```json"):
            content_text = content_text.split("```json")[1]
        if content_text.endswith("```"):
            content_text = content_text.rsplit("```", 1)[0]
            
        result = json.loads(content_text.strip())
        
        os.makedirs(GENERATED_CODE_DIR, exist_ok=True)
        code_file = os.path.join(GENERATED_CODE_DIR, "generated_scene.py")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(result.get("code", ""))
            
        print(f"  Received response ({len(result.get('code', ''))} chars)")
        return result
        
    except Exception as e:
        print(f"  Bedrock Generation failed: {e}")
        return None
