from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.complaints_service import (
    create_complaint,
    get_complaint,
    list_complaints,
    escalate_complaint
)

router = APIRouter(prefix="/complaints", tags=["complaints"])


class ComplaintModel(BaseModel):
    user_id: str
    store_id: str
    issue_type: str
    priority: str
    description: str


@router.post("/", summary="Submit a complaint")
def submit_complaint(payload: ComplaintModel):
    result = create_complaint(payload)
    return {"status": "success", "data": result}


@router.get("/", summary="List all complaints")
def list_all_complaints():
    data = list_complaints()
    return {"status": "success", "data": data}


@router.get("/{complaint_id}", summary="Get a single complaint")
def get_single_complaint(complaint_id: str):
    data = get_complaint(complaint_id)
    if not data:
        raise HTTPException(404, "Complaint not found")
    return {"status": "success", "data": data}


@router.post("/{complaint_id}/escalate", summary="Escalate a complaint to live agent")
def escalate(complaint_id: str):
    result = escalate_complaint(complaint_id)
    return {"status": "success", "data": result}