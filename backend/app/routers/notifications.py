from fastapi import APIRouter, Query
from app.services.notification_service import list_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", summary="List recent notifications")
def get_notifications(limit: int = Query(50, ge=1, le=200)):
    data = list_notifications(limit)
    return {"status": "success", "data": data}