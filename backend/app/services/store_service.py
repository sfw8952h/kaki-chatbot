from app.services.supabase_client import supabase
from math import radians, sin, cos, sqrt, atan2


def get_all_stores():
    res = supabase.table("stores").select("*").execute()
    return res.data


def get_store_by_id(store_id: str):
    res = (
        supabase.table("stores")
        .select("*")
        .eq("id", store_id)
        .single()
        .execute()
    )
    return res.data


def get_store_hours(store_id: str):
    res = (
        supabase.table("stores")
        .select("id, name, opening_time, closing_time")
        .eq("id", store_id)
        .single()
        .execute()
    )
    return res.data


def get_special_hours(store_id: str):
    res = (
        supabase.table("special_hours")
        .select("*")
        .eq("store_id", store_id)
        .order("date", desc=False)
        .execute()
    )
    return res.data


def get_delivery_windows(store_id: str):
    res = (
        supabase.table("delivery_windows")
        .select("*")
        .eq("store_id", store_id)
        .execute()
    )
    return res.data


def filter_stores_by_service(service_name: str):
    res = (
        supabase.table("stores")
        .select("*")
        .contains("services", [service_name])
        .eq("is_verified", True)
        .execute()
    )
    return res.data


def get_nearby_stores(lat, lng, radius_km):
    stores = supabase.table("stores").select("*").execute().data or []

    def dist_km(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        return 2 * R * atan2(sqrt(a), sqrt(1 - a))

    result = []
    for s in stores:
        if s.get("latitude") and s.get("longitude"):
            if dist_km(lat, lng, s["latitude"], s["longitude"]) <= radius_km:
                result.append(s)

    return result