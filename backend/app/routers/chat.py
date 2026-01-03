from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..services.rasa_client import send_to_rasa
from ..services.supabase_client import log_message
from ..utils.auth import verify_jwt

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = None
    sender_id: Optional[str] = None


@router.post("/chat", summary="Send message to chatbot")
async def chat(payload: ChatRequest, Authorization: Optional[str] = Header(None)):
    user_id = payload.sender_id or "anonymous"

    if Authorization:
        try:
            user = verify_jwt(Authorization)
            user_id = user["sub"]
        except HTTPException as exc:
            # If auth is provided but invalid, propagate error
            raise exc

    metadata = {"language": payload.language} if payload.language else None

    try:
        rasa_response = await send_to_rasa(payload.message, user_id, metadata=metadata)
    except Exception as exc:  # pragma: no cover - network boundary
        raise HTTPException(status_code=502, detail="Failed to reach Rasa") from exc

    bot_text = ""
    if isinstance(rasa_response, list) and rasa_response:
        first = rasa_response[0] or {}
        bot_text = first.get("text", "") or ""

    log_message(user_id, payload.message, bot_text)

    return {"status": "success", "reply": bot_text}
