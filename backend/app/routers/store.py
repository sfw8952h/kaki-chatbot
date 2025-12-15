from fastapi import APIRouter, HTTPException, Query
from app.services.store_service import (
    get_all_stores,
    get_store_by_id,
    get_store_hours,
    get_special_hours,
    get_delivery_windows,
    filter_stores_by_service,
    get_nearby_stores
)

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/", summary="List all verified stores")
def list_stores():
    data = get_all_stores()
    return {"status": "success", "data": data}


@router.get("/{store_id}", summary="Get store details")
def get_store(store_id: str):
    data = get_store_by_id(store_id)
    if not data:
        raise HTTPException(404, "Store not found")
    return {"status": "success", "data": data}


@router.get("/{store_id}/hours", summary="Get store operating hours")
def get_store_opening_hours(store_id: str):
    data = get_store_hours(store_id)
    if not data:
        raise HTTPException(404, "Store not found")
    return {"status": "success", "data": data}


@router.get("/{store_id}/special-hours", summary="Get store special hours")
def get_store_special_hours(store_id: str):
    data = get_special_hours(store_id)
    return {"status": "success", "data": data or []}


@router.get("/{store_id}/delivery-windows", summary="Get supplier delivery windows")
def supplier_delivery_windows(store_id: str):
    data = get_delivery_windows(store_id)
    return {"status": "success", "store_id": store_id, "delivery_windows": data or []}


@router.get("/filter", summary="Filter stores by service")
def filter_stores(service: str = Query(...)):
    data = filter_stores_by_service(service)
    return {"status": "success", "data": data}


@router.get("/nearby", summary="Find nearby stores")
def nearby_stores(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(5)
):
    data = get_nearby_stores(latitude, longitude, radius_km)
    return {"status": "success", "data": data}