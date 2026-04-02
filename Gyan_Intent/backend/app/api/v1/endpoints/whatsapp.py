"""WhatsApp Bot endpoints (Rural OS) — powered by whatsapp-web.js."""

import os
from typing import Optional

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import httpx

from app.config import settings

router = APIRouter()

# WhatsApp Bot service URL (Node.js wwebjs bot)
WHATSAPP_BOT_URL = getattr(settings, 'WHATSAPP_BOT_URL', 'http://localhost:3003')


class WhatsAppMessage(BaseModel):
    """WhatsApp incoming message."""
    from_number: str
    body: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class WhatsAppResponse(BaseModel):
    """WhatsApp response."""
    to: str
    message: str
    media_url: Optional[str] = None


class DirectMessageRequest(BaseModel):
    """Direct message request for sending via the wwebjs bot."""
    to: str  # Phone number in format: 91XXXXXXXXXX
    message: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None


async def send_whatsapp_message(to: str, message: str, media_url: Optional[str] = None, media_type: Optional[str] = None):
    """Send WhatsApp message via the wwebjs bot service."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "to": to,
                "message": message,
            }
            if media_url:
                payload["media_url"] = media_url
            if media_type:
                payload["media_type"] = media_type

            headers = {}
            api_key = getattr(settings, 'INTERNAL_API_KEY', None)
            if api_key:
                headers["x-api-key"] = api_key

            response = await client.post(
                f"{WHATSAPP_BOT_URL}/send",
                json=payload,
                headers=headers,
            )
            return response.json()
    except httpx.ConnectError:
        print(f"[WhatsApp] Bot service not reachable at {WHATSAPP_BOT_URL}. Message to {to}: {message}")
        return {"status": "bot_offline", "to": to, "message": message}
    except Exception as e:
        print(f"[WhatsApp] Error sending message: {e}")
        return {"status": "error", "error": str(e)}


@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    """
    Webhook handler for messages from the wwebjs bot.

    The bot sends processed messages here for async handling
    (e.g., video generation that takes longer).
    """
    data = await request.json()

    phone = data.get("from", "").replace("@c.us", "").replace("@g.us", "")
    body = data.get("body", "")

    if not phone or not body:
        return {"status": "ignored", "reason": "empty message"}

    user_lower = body.lower()

    # Handle video generation requests forwarded from the bot
    if user_lower.startswith("video") or user_lower.startswith("generate"):
        topic = body[5:].strip() if user_lower.startswith("video") else body[8:].strip()
        if not topic:
            return {"status": "ignored", "reason": "no topic"}

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "http://localhost:8000/api/v1/video/generate",
                    json={"concept": topic, "language": "english"},
                    timeout=10.0,
                )
                data = resp.json()
                job_id = data.get("job_id", "unknown")
                return {
                    "status": "processing",
                    "job_id": job_id,
                    "topic": topic,
                }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    return {"status": "received", "from": phone}


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = "",
    hub_verify_token: str = "",
    hub_challenge: str = "",
):
    """Verify webhook (kept for compatibility)."""
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=hub_challenge)


@router.post("/send")
async def send_message(request: DirectMessageRequest):
    """Send WhatsApp message via the wwebjs bot."""
    to = request.to.replace("+", "").replace(" ", "")
    if not to.startswith("91"):
        to = "91" + to

    result = await send_whatsapp_message(
        to, request.message, request.media_url, request.media_type
    )
    return result


@router.post("/send-video")
async def send_video(to: str, video_url: str, caption: str):
    """Send generated video to user via WhatsApp."""
    result = await send_whatsapp_message(to, caption, video_url, "video")
    return result


@router.get("/bot-status")
async def get_bot_status():
    """Get WhatsApp bot connection status from the wwebjs service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_BOT_URL}/health")
            return response.json()
    except httpx.ConnectError:
        return {
            "status": "offline",
            "whatsapp_connection": "disconnected",
            "message": "WhatsApp bot service is not running. Start it with: cd whatsapp-bot && npm run dev",
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/qr")
async def get_qr_code():
    """Get QR code for WhatsApp authentication from the wwebjs bot."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_BOT_URL}/qr-json")
            return response.json()
    except httpx.ConnectError:
        return {
            "available": False,
            "qr": None,
            "message": "WhatsApp bot service is not running. Start it with: cd whatsapp-bot && npm run dev",
        }
    except Exception as e:
        return {"available": False, "qr": None, "error": str(e)}


@router.get("/status")
async def get_status():
    """Get WhatsApp bot status."""
    # Get live status from the wwebjs bot
    bot_status = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_BOT_URL}/status")
            bot_status = response.json()
    except Exception:
        bot_status = {"connection": "offline"}

    return {
        "status": "active",
        "bot": bot_status,
        "features": [
            "Video generation",
            "Math problem solving",
            "Concept explanation",
            "Hinglish support",
        ],
        "setup_instructions": {
            "step_1": "cd whatsapp-bot && npm install",
            "step_2": "npm run dev",
            "step_3": "Scan QR code with WhatsApp",
            "step_4": "Send 'hi' to test",
        },
    }


@router.post("/test")
async def test_whatsapp(message: str = "Hello from Gyan_Intent!"):
    """Test WhatsApp integration."""
    result = await send_whatsapp_message("917366868724", message)
    return {
        "status": "sent",
        "message": message,
        "result": result,
        "note": "Check your WhatsApp for the message!",
    }
