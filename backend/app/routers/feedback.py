from fastapi import APIRouter
from pydantic import BaseModel
from ..services.feedback_service import submit_feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    user_id: str | None = None
    category: str
    message: str


@router.post("/", summary="Submit feedback")
def create_feedback(payload: FeedbackRequest):
    result = submit_feedback(
        user_id=payload.user_id,
        category=payload.category,
        message=payload.message
    )
    return {"status": "success", "data": result}