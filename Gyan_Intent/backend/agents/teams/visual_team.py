"""Visual analysis team."""

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.state import AgentState


VISUAL_PROMPT = """You are a visual analysis expert. Analyze the provided image/diagram.

Instructions:
1. Identify the type of visual (diagram, chart, equation, code, etc.)
2. Extract key information
3. Explain what the visual represents
4. Provide context and insights

Output format:
{
    "analysis": {
        "type": "diagram|chart|equation|code|other",
        "content": "Description of what's in the image"
    },
    "explanation": "Detailed explanation for a student"
}
"""


def create_visual_team_node(llm: ChatOpenAI):
    """Create visual team processing node."""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", VISUAL_PROMPT),
        ("human", "Analyze this visual content: {query}")
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def visual_node(state: AgentState) -> AgentState:
        """Process visual input."""
        result = await chain.ainvoke({"query": state["query"]})
        
        import json
        output = json.loads(result.content)
        
        return {
            **state,
            "explanation": output["explanation"],
            "visual_analysis": output["analysis"],
        }
    
    return visual_node
