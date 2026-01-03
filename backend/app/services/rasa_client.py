import httpx
from typing import Any, Dict, Optional

from ..config import RASA_URL


async def send_to_rasa(message: str, sender_id: str, metadata: Optional[Dict[str, Any]] = None):
    async with httpx.AsyncClient() as client:
        payload: Dict[str, Any] = {"sender": sender_id, "message": message}
        if metadata:
            payload["metadata"] = metadata

        res = await client.post(RASA_URL, json=payload)
        res.raise_for_status()
        return res.json()
