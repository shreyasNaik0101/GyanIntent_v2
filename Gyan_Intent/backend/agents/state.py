"""Shared state types for LangGraph agents."""

from typing import Annotated, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """Shared state across all agents."""
    
    # Messages for conversation history
    messages: Annotated[List[BaseMessage], operator.add]
    
    # Input data
    query: str
    image_data: Optional[str]  # Base64 encoded
    gesture_data: Optional[dict]
    language: str
    
    # Routing
    next: str
    route_reasoning: str
    priority: str
    estimated_time: int
    
    # Team outputs
    explanation: str
    visual_analysis: Optional[dict]
    solution_steps: Optional[List[str]]
    code_analysis: Optional[dict]
    
    # Video generation
    script: Optional[dict]
    manim_code: Optional[str]
    video_url: Optional[str]
    subtitles_url: Optional[str]
    duration: Optional[float]
    
    # Error handling
    error_count: int
    last_error: Optional[str]


class RouteDecision(TypedDict):
    """Supervisor routing decision."""
    team: str
    reasoning: str
    priority: str
    estimated_time: int


class ScriptSegment(TypedDict):
    """Video script segment."""
    timestamp: float
    duration: float
    text: str
    visual_cue: str
    animation_type: str


class VideoScript(TypedDict):
    """Complete video script."""
    title: str
    segments: List[ScriptSegment]
    total_duration: float
