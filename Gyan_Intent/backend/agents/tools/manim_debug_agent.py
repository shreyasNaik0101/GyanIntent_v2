"""Specialized agent for generating, validating, and repairing Manim code."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import List

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import settings


def _text_content(content) -> str:
    """Normalise LLM .content which may be a str or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(block.get("text", "") if isinstance(block, dict) else str(block) for block in content)
    return str(content)


logger = logging.getLogger(__name__)


GENERATION_SYSTEM_PROMPT = """You are a specialist Manim CE engineer focused on reliable educational scene generation.

Your output must optimize for correctness first, visual quality second.

Hard rules:
1. Generate valid Manim Community Edition code only.
2. The scene class MUST be named exactly: EducationalScene.
3. Use `class EducationalScene(Scene):` unless 3D is explicitly required.
4. Include `from manim import *` at the top.
5. Never reference external files or assets.
6. Never use SVGMobject or ImageMobject.
7. Never set `config.pixel_height` or `config.pixel_width`.
8. Use only built-in primitives such as Text, Tex, MathTex, Circle, Square, Rectangle, Dot, Line, Arrow, Axes, NumberPlane, Graph, VGroup.
9. Keep the scene simple and fast to render at low quality.
10. Keep waits short. Prefer many short animations over long idle waits.
11. For Graph objects, use integer vertices and valid edge tuples.
12. Do not use helper methods that may not exist on Manim mobjects, such as `to_edge_buffer`.
13. When animating `graph.edges[...]`, only access edges exactly as they were defined in the original `edges=[...]` list.
14. Prefer shapes, arrows, graphs, highlights, motion, and transformations over paragraphs of on-screen text.
15. Keep on-screen text sparse: short labels only, except for essential formulas.
16. Avoid summary slides, bullet lists, and large text walls.
17. Return Python code only.
"""


HEALING_SYSTEM_PROMPT = """You are a Manim CE debugging agent.

Your task is to repair broken Manim code so it executes successfully.

Hard rules:
1. Keep the scene class name exactly `EducationalScene`.
2. Do not use external assets, SVGs, images, or file references.
3. Remove unsupported APIs and replace them with built-in Manim primitives.
4. Prefer simpler animations if a fix is ambiguous.
5. Keep the repaired scene short and render-friendly.
6. If a Graph edge lookup fails, rewrite the traversal using edge tuples that exist in `edges=[...]` exactly as declared.
6. Return Python code only.
"""


class ManimDebugAgent:
    """LLM-backed agent for Manim code generation, validation, and repair."""

    BANNED_TOKENS = (
        "SVGMobject",
        "ImageMobject",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        "config.pixel_height",
        "config.pixel_width",
        "to_edge_buffer",
    )

    def __init__(self) -> None:
        self.code_llm = self._build_model()

    def _build_model(self) -> ChatOpenAI:
        """Build the model used for Manim generation and repair."""
        if settings.OPENROUTER_API_KEY:
            logger.info(
                "Using OpenRouter model for Manim debug agent: %s",
                settings.MANIM_DEBUG_MODEL,
            )
            return ChatOpenAI(
                model=settings.MANIM_DEBUG_MODEL,
                api_key=settings.OPENROUTER_API_KEY,
                base_url=settings.OPENROUTER_BASE_URL,
                temperature=0.1,
            )

        logger.info(
            "Using OpenAI fallback model for Manim debug agent: %s",
            settings.MANIM_FALLBACK_MODEL,
        )
        return ChatOpenAI(
            model=settings.MANIM_FALLBACK_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.1,
        )

    async def generate_code(
        self,
        *,
        title: str,
        duration: float,
        scene_description: str,
        visual_style: str,
    ) -> str:
        """Generate initial Manim code with strict constraints."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", GENERATION_SYSTEM_PROMPT),
                (
                    "human",
                    """
Create a single runnable Manim CE scene.

Title: {title}
Requested Duration: {duration}s
Visual Style: {visual_style}

Timeline:
{scene_description}

CRITICAL Requirements:
- The animation MUST visually represent the SPECIFIC topic in the title.
- For each timeline entry, create Manim objects that MATCH the visual_cue description.
- Use topic-specific diagrams: trees for data structures, arrows for processes, formulas for math, etc.
- Include the title text at the start. Keep all later on-screen text minimal.
- Use self.wait(1) between sections to pace the animation.
- Total animation should be roughly {duration} seconds (use waits to fill time).
- Use built-in shapes and Text only. No external files.
- Favor deterministic layouts and simple motion.
- Prefer visual storytelling over text explanation.
- Avoid full-screen text summaries or bullet-point slides.
- Use labels only when they directly help the figure being animated.
""",
                ),
            ]
        )
        chain = prompt | self.code_llm
        result = await chain.ainvoke(
            {
                "title": title,
                "duration": duration,
                "visual_style": visual_style,
                "scene_description": scene_description,
            }
        )
        return self.prepare_code(self._strip_code_fence(_text_content(result.content)))

    async def heal_code(self, *, code: str, error: str, attempt: int, max_retries: int) -> str:
        """Repair Manim code after validation or runtime failure."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", HEALING_SYSTEM_PROMPT),
                (
                    "human",
                    """
Repair this Manim CE code.

Attempt: {attempt}/{max_retries}

Runtime or validation error:
{error}

Original code:
```python
{code}
```
""",
                ),
            ]
        )
        chain = prompt | self.code_llm
        result = await chain.ainvoke(
            {
                "attempt": attempt,
                "max_retries": max_retries,
                "error": error[-4000:],
                "code": code,
            }
        )
        return self.prepare_code(self._strip_code_fence(_text_content(result.content)))

    def prepare_code(self, code: str) -> str:
        """Normalize model output into a stricter Manim CE form."""
        normalized = code.replace("\r\n", "\n").strip()
        if not normalized.startswith("from manim import *"):
            normalized = f"from manim import *\n\n{normalized}"

        normalized = re.sub(r"^\s*config\.pixel_height\s*=.*$", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"^\s*config\.pixel_width\s*=.*$", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(
            r"class\s+\w+\s*\(\s*(Scene|ThreeDScene|MovingCameraScene)\s*\)\s*:",
            "class EducationalScene(Scene):",
            normalized,
            count=1,
        )
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        return normalized.strip() + "\n"

    def validate_code(self, code: str) -> List[str]:
        """Run lightweight static checks before invoking Manim."""
        issues: List[str] = []
        for token in self.BANNED_TOKENS:
            if token in code:
                issues.append(f"Contains banned token: {token}")

        if "class EducationalScene(Scene):" not in code:
            issues.append("Scene class must be EducationalScene(Scene)")

        if "from manim import *" not in code:
            issues.append("Missing `from manim import *` import")

        graph_with_strings = re.search(
            r"Graph\s*\([^\)]*vertices\s*=\s*\[[^\]]*[\"'][^\]]*\]",
            code,
            flags=re.DOTALL,
        )
        if graph_with_strings:
            issues.append("Graph vertices should use integers, not string labels")

        return issues

    def extract_scene_class(self, code: str) -> str:
        """Extract the Manim scene class name from code."""
        match = re.search(
            r"class\s+(\w+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\)",
            code,
        )
        return match.group(1) if match else "EducationalScene"

    def write_debug_artifact(self, directory: Path, name: str, content: str) -> None:
        """Persist debug artifacts for local inspection."""
        directory.mkdir(parents=True, exist_ok=True)
        (directory / name).write_text(content)

    def _strip_code_fence(self, text: str) -> str:
        """Remove markdown code fences from model output."""
        cleaned = text.strip()
        if "```python" in cleaned:
            return cleaned.split("```python", 1)[1].split("```", 1)[0].strip()
        if "```" in cleaned:
            return cleaned.split("```", 1)[1].split("```", 1)[0].strip()
        return cleaned
