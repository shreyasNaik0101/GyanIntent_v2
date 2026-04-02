"""Math problem-solving team."""

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.state import AgentState


MATH_PROMPT = """You are a math expert educator. Solve the given problem step by step.

Instructions:
1. Parse the mathematical problem carefully
2. Show all steps clearly
3. Explain the reasoning behind each step
4. Provide the final answer
5. Format mathematical expressions using LaTeX

Output format:
{
    "solution": "Complete solution with LaTeX formatting",
    "steps": ["Step 1", "Step 2", ...],
    "explanation": "Conceptual explanation for a student"
}
"""


def create_math_team_node(llm: ChatOpenAI):
    """Create math team processing node."""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", MATH_PROMPT),
        ("human", "Solve this math problem: {query}")
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def math_node(state: AgentState) -> AgentState:
        """Process mathematical problem."""
        result = await chain.ainvoke({"query": state["query"]})
        
        import json
        output = json.loads(result.content)
        
        return {
            **state,
            "explanation": output["explanation"],
            "solution_steps": output["steps"],
        }
    
    return math_node
