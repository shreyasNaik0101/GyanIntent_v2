"""Coding assistance team."""

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.state import AgentState


CODING_PROMPT = """You are a coding expert and educator. Help debug or explain code.

Instructions:
1. Analyze the code for errors or explain its functionality
2. Provide clear explanations
3. Suggest improvements if applicable
4. Include code examples where helpful

Output format:
{
    "analysis": {
        "issues": ["Issue 1", "Issue 2"],
        "suggestions": ["Suggestion 1"]
    },
    "explanation": "Detailed explanation for a student"
}
"""


def create_coding_team_node(llm: ChatOpenAI):
    """Create coding team processing node."""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", CODING_PROMPT),
        ("human", "Help with this code: {query}")
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def coding_node(state: AgentState) -> AgentState:
        """Process coding query."""
        result = await chain.ainvoke({"query": state["query"]})
        
        import json
        output = json.loads(result.content)
        
        return {
            **state,
            "explanation": output["explanation"],
            "code_analysis": output["analysis"],
        }
    
    return coding_node
