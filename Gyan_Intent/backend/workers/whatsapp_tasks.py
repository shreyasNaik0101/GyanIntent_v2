"""Celery tasks for WhatsApp bot."""

from workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=2)
def process_whatsapp_message(
    self,
    from_number: str,
    body: str = None,
    media_url: str = None,
):
    """
    Process incoming WhatsApp message asynchronously.
    
    Args:
        from_number: Sender's phone number
        body: Message text
        media_url: URL to attached media
        
    Returns:
        Processing result
    """
    try:
        # TODO: Implement full processing pipeline
        # 1. Download media if present
        # 2. Analyze with intent engine
        # 3. Generate video if needed
        # 4. Send response
        
        return {
            "success": True,
            "message": "Processing complete",
            "response_sent": True,
        }
        
    except Exception as exc:
        if self.request.retries < 2:
            raise self.retry(exc=exc, countdown=30)
        
        return {
            "success": False,
            "error": str(exc),
        }


@celery_app.task
def send_whatsapp_video(to: str, video_url: str, caption: str):
    """Queue metadata for WhatsApp video delivery via the whatsapp-web.js bot."""
    
    return {
        "success": True,
        "to": to,
        "video_url": video_url,
    }
