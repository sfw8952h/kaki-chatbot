from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from app.services.admin_store_service import (
    create_store,
    request_store_update,
    approve_store_update,
    add_special_hours,
    create_delivery_window,
)

router = APIRouter(
    prefix="/admin/stores",
    tags=["admin-stores"]
)

# ============================================================
# Pydantic Models (Strong typing + optional fields)
# ============================================================

class StoreCreate(BaseModel):
    """Payload used when admin creates a new store."""
    name: str = Field(..., description="Store name")
    address: str = Field(..., description="Store address")
    phone: str = Field(..., description="Store phone number")
    opening_time: str = Field(..., description="Store opening time, e.g., '08:00 AM'")
    closing_time: str = Field(..., description="Store closing time, e.g., '10:00 PM'")
    map_url: Optional[str] = Field(None, description="Google Maps link")
    services: Optional[List[str]] = Field(
        None, description="List of services available at this store"
    )


class StoreUpdate(BaseModel):
    """Payload used when admin requests to update store details.
       All fields are optional; only provided fields will be updated."""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    map_url: Optional[str] = None
    services: Optional[List[str]] = None


class SpecialHoursCreate(BaseModel):
    """Special operating hours (e.g., Holiday hours) added by admin."""
    date: str = Field(..., description="YYYY-MM-DD")
    opening_time: str = Field(..., description="Special day opening time")
    closing_time: str = Field(..., description="Special day closing time")
    reason: Optional[str] = Field(None, description="Reason for special hours")


class DeliveryWindowCreate(BaseModel):
    """Delivery time windows used by suppliers."""
    opening_time: str = Field(..., description="Delivery start time")
    closing_time: str = Field(..., description="Delivery end time")
    note: Optional[str] = None


# ============================================================
# Admin Store Management Endpoints
# ============================================================

@router.post("/", summary="Admin: Create Store")
def admin_create_store(payload: StoreCreate):
    """
    Create a new store.  
    This immediately appears on the website (no approval needed).
    """
    result = create_store(payload)
    return {"status": "success", "data": result}


@router.put("/{store_id}", summary="Admin: Request Store Update")
def admin_request_store_update(store_id: str, payload: StoreUpdate):
    """
    Request a store update.  
    This does NOT immediately update the store.  
    Instead, it creates a pending record in `store_updates` for supervisor verification.
    """
    result = request_store_update(store_id, payload)
    return {"status": "success", "pending_update": result}


@router.post("/{store_id}/approve/{update_id}", summary="Admin: Approve Store Update")
def admin_approve_update(store_id: str, update_id: str):
    """
    Apply the pending update from the `store_updates` table.
    If the update doesn't exist, return a 404.
    """
    applied = approve_store_update(store_id, update_id)

    if applied is None:
        raise HTTPException(status_code=404, detail="Update request not found")

    return {"status": "success", "applied_changes": applied}


@router.post("/{store_id}/special-hours", summary="Admin: Add Special Operating Hours")
def admin_add_special_hours_route(store_id: str, payload: SpecialHoursCreate):
    """
    Add a new holiday / maintenance day special hour entry.
    This creates a record in `special_hours` table.
    """
    result = add_special_hours(store_id, payload)
    return {"status": "success", "data": result}


@router.post("/{store_id}/delivery-windows", summary="Admin: Add Delivery Window")
def admin_add_delivery_window(store_id: str, payload: DeliveryWindowCreate):
    """
    Add a delivery time window for suppliers (store_id → delivery_windows table).
    """
    result = create_delivery_window(store_id, payload)
    return {"status": "success", "data": result}