"""Video generation team."""

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.state import AgentState
from video_factory.pipeline import SelfHealingVideoPipeline


VIDEO_PROMPT = """You are a video content planner. Create a plan for an educational video.

Given an explanation, determine if video generation is appropriate.

Output format:
{
    "should_generate_video": true|false,
    "concept": "Main concept to visualize",
    "reasoning": "Why video would help"
}
"""


def create_video_team_node(llm: ChatOpenAI):
    """Create video team processing node."""
    
    pipeline = SelfHealingVideoPipeline()
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", VIDEO_PROMPT),
        ("human", "Should we generate a video for: {explanation}")
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def video_node(state: AgentState) -> AgentState:
        """Generate educational video."""
        # Check if we should generate video
        decision = await chain.ainvoke({"explanation": state["explanation"]})
        
        import json
        plan = json.loads(decision.content)
        
        if not plan.get("should_generate_video", True):
            return {
                **state,
                "next": "__end__",
            }
        
        # Generate video
        result = await pipeline.generate(
            concept=plan["concept"],
            explanation=state["explanation"],
            language=state["language"],
        )
        
        if result.success:
            return {
                **state,
                "video_url": result.video_url,
                "subtitles_url": result.subtitles_path,
                "duration": result.duration,
                "next": "__end__",
            }
        else:
            return {
                **state,
                "last_error": result.error_message,
                "error_count": state.get("error_count", 0) + 1,
                "next": "__end__",
            }
    
    return video_node
