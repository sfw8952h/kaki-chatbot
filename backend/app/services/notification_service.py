from app.services.supabase_client import supabase


def list_notifications(limit: int = 50):
    res = (
        supabase.table("notifications")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data