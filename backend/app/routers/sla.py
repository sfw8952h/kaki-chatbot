from fastapi import APIRouter
from pydantic import BaseModel
from app.services.sla_service import create_sla_rule, list_sla_rules

router = APIRouter(prefix="/sla", tags=["sla"])


class SLARule(BaseModel):
    issue_type: str
    department: str
    sla_hours: int


@router.post("/", summary="Create an SLA rule")
def add_rule(payload: SLARule):
    result = create_sla_rule(payload)
    return {"status": "success", "data": result}


@router.get("/", summary="List all SLA rules")
def view_rules():
    result = list_sla_rules()
    return {"status": "success", "data": result}