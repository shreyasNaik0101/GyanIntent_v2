"""Celery tasks for video generation."""

from workers.celery_app import celery_app
from video_factory.pipeline import SelfHealingVideoPipeline


@celery_app.task(bind=True, max_retries=3)
def generate_video_task(
    self,
    concept: str,
    explanation: str,
    language: str = "hinglish",
    visual_style: str = "educational"
):
    """
    Generate educational video asynchronously.
    
    Args:
        concept: The concept to explain
        explanation: Structured explanation
        language: Target language
        visual_style: Animation style
        
    Returns:
        Video generation result
    """
    pipeline = SelfHealingVideoPipeline()
    
    try:
        import asyncio
        result = asyncio.run(pipeline.generate(
            concept=concept,
            explanation=explanation,
            language=language,
            visual_style=visual_style
        ))
        
        return {
            "success": result.success,
            "video_path": str(result.video_path) if result.video_path else None,
            "subtitles_path": str(result.subtitles_path) if result.subtitles_path else None,
            "duration": result.duration,
            "retry_count": result.retry_count,
        }
        
    except Exception as exc:
        # Retry with exponential backoff
        retry_count = self.request.retries
        if retry_count < 3:
            raise self.retry(exc=exc, countdown=60 * (2 ** retry_count))
        
        return {
            "success": False,
            "error": str(exc),
            "retry_count": retry_count,
        }
