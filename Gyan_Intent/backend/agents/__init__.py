"""LangGraph agents package."""

from agents.state import AgentState

__all__ = ["agent_graph", "process_intent", "AgentState"]


def __getattr__(name: str):
	"""Lazy-load heavy graph objects to avoid circular imports."""
	if name in {"agent_graph", "process_intent"}:
		from agents.graph import agent_graph, process_intent

		return {
			"agent_graph": agent_graph,
			"process_intent": process_intent,
		}[name]
	raise AttributeError(f"module 'agents' has no attribute {name!r}")
