"""Supervisor agent for intent routing."""

import json
from typing import Literal

from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from agents.state import AgentState


SUPERVISOR_PROMPT = """You are the Supervisor Agent for Gyan_Intent, an AI-powered educational platform.

Your job is to route user intents to the appropriate specialized team.

Available Teams:
1. visual_team: For image analysis, diagram interpretation, OCR tasks
2. math_team: For mathematical problems, equations, calculations
3. coding_team: For code debugging, algorithm explanations, programming help
4. video_team: For generating educational videos from explanations

Intent Classification Rules:
- If input contains an image/diagram → visual_team
- If input is a math problem (equations, numbers, geometry) → math_team
- If input contains code or programming concepts → coding_team
- If user explicitly requests a video → video_team
- If previous team produced an explanation and user wants video → video_team

Input Analysis:
- modality: How the user provided input (text/voice/image/gesture)
- content: The actual content to process
- context: Previous conversation history

Respond with a JSON object:
{
    "team": "visual_team|math_team|coding_team|video_team|__end__",
    "reasoning": "Brief explanation of why this team was selected",
    "priority": "high|normal|low",
    "estimated_time": 30
}
"""

TeamType = Literal["visual_team", "math_team", "coding_team", "video_team", "__end__"]


def create_supervisor_node(llm: ChatOpenAI):
    """Create the supervisor routing node."""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SUPERVISOR_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
        (
            "human",
            "Given the conversation above, analyze the latest intent and route to the appropriate team."
        )
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def supervisor(state: AgentState) -> AgentState:
        """Route to appropriate team based on intent."""
        result = await chain.ainvoke({"messages": state["messages"]})
        
        decision = json.loads(result.content)
        
        return {
            **state,
            "next": decision["team"],
            "route_reasoning": decision["reasoning"],
            "priority": decision["priority"],
            "estimated_time": decision["estimated_time"]
        }
    
    return supervisor
