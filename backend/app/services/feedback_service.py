from .supabase_client import supabase


def submit_feedback(user_id: str, category: str, message: str):
    data = {
        "user_id": user_id,
        "category": category,
        "message": message
    }

    res = supabase.table("feedback").insert(data).execute()
    return res.data