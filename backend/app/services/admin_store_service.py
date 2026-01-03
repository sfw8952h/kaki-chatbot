from app.services.supabase_client import supabase


# -------------------------------------------------
# Create Store
# -------------------------------------------------
def create_store(payload):
    data = payload.dict()
    data.setdefault("is_verified", True)
    res = supabase.table("stores").insert(data).execute()
    return res.data


# -------------------------------------------------
# Request Store Update (stored as pending)
# -------------------------------------------------
def request_store_update(store_id: str, payload):
    proposed = {k: v for k, v in payload.dict().items() if v is not None}

    data = {
        "store_id": store_id,
        "proposed_data": proposed,
    }

    res = supabase.table("store_updates").insert(data).execute()
    return res.data


# -------------------------------------------------
# Approve Store Update
# -------------------------------------------------
def approve_store_update(store_id: str, update_id: str):
    res = (
        supabase.table("store_updates")
        .select("id, proposed_data")
        .eq("id", update_id)
        .single()
        .execute()
    )
    row = res.data
    if not row:
        return None

    proposed = row["proposed_data"]

    supabase.table("stores").update(proposed).eq("id", store_id).execute()
    supabase.table("stores").update({"is_verified": True}).eq("id", store_id).execute()
    supabase.table("store_updates").update({"approved": True}).eq("id", update_id).execute()

    return proposed


# -------------------------------------------------
# Internal: Generic notification helper
# -------------------------------------------------
def notify_hours_change(store_id: str, message: str):
    supabase.table("notifications").insert({
        "store_id": store_id,
        "type": "hours_update",
        "message": message
    }).execute()


# -------------------------------------------------
# Add Special Hours
# -------------------------------------------------
def add_special_hours(store_id: str, payload):
    data = payload.dict()
    data["store_id"] = store_id

    res = supabase.table("special_hours").insert(data).execute()
    notify_hours_change(
        store_id,
        f"Special hours added for {data['date']}: {data['opening_time']} – {data['closing_time']}"
    )

    return res.data


# -------------------------------------------------
# Update Regular Store Hours
# -------------------------------------------------
def update_store_hours(store_id: str, payload: dict):
    res = supabase.table("stores").update(payload).eq("id", store_id).execute()
    notify_hours_change(store_id, "Store operating hours updated.")
    return res.data


# -------------------------------------------------
# Create Delivery Window
# -------------------------------------------------
def create_delivery_window(store_id: str, payload):
    data = payload.dict()
    data["store_id"] = store_id

    res = supabase.table("delivery_windows").insert(data).execute()
    return res.data