from fastapi import APIRouter
from pydantic import BaseModel
from app.services.store_service import get_store_hours, get_delivery_windows
from app.services.supplier_service import (
    get_supplier_complaints,
    supplier_respond,
    supplier_escalate
)

router = APIRouter(prefix="/supplier", tags=["supplier"])


class SupplierResponse(BaseModel):
    message: str


class EscalationBody(BaseModel):
    reason: str


@router.get("/complaints/{department}", summary="List complaints by department")
def supplier_list(department: str):
    data = get_supplier_complaints(department)
    return {"status": "success", "data": data}


@router.post("/complaints/{complaint_id}/respond", summary="Respond to a complaint")
def respond(complaint_id: str, body: SupplierResponse):
    data = supplier_respond(complaint_id, body.message)
    return {"status": "success", "data": data}


@router.post("/complaints/{complaint_id}/escalate", summary="Escalate complaint to agent")
def escalate(complaint_id: str, body: EscalationBody):
    data = supplier_escalate(complaint_id, body.reason)
    return {"status": "success", "data": data}


@router.get("/store/{store_id}/details", summary="Get store hours + delivery windows")
def supplier_store_details(store_id: str):
    hours = get_store_hours(store_id)
    windows = get_delivery_windows(store_id)
    return {
        "status": "success",
        "store_id": store_id,
        "hours": hours,
        "delivery_windows": windows
    }