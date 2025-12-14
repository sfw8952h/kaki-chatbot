from fastapi import APIRouter, HTTPException
from app.services.agent_service import list_queue, take_ticket, close_ticket

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/queue", summary="View agent queue")
def get_queue():
    data = list_queue()
    return {"status": "success", "data": data}


@router.post("/queue/{ticket_id}/take", summary="Take a ticket")
def take(ticket_id: str):
    result = take_ticket(ticket_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Ticket not found or already taken")
    return {"status": "success", "data": result}


@router.post("/queue/{ticket_id}/close", summary="Close a ticket")
def close(ticket_id: str):
    result = close_ticket(ticket_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "success", "data": result}