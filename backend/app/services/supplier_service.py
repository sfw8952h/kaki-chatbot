from app.services.supabase_client import supabase


def get_supplier_complaints(department: str):
    res = (
        supabase.table("complaints")
        .select("*")
        .eq("assigned_department", department)
        .execute()
    )
    return res.data


def supplier_respond(complaint_id: str, message: str):
    supabase.table("complaint_responses").insert({
        "complaint_id": complaint_id,
        "responded_by": "supplier",
        "response_type": "reply",
        "message": message
    }).execute()

    supabase.table("complaints").update(
        {"status": "in-progress"}
    ).eq("id", complaint_id).execute()

    return {"complaint_id": complaint_id, "status": "in-progress"}


def supplier_escalate(complaint_id: str, reason: str):
    # Confirm complaint exists
    complaint = (
        supabase.table("complaints")
        .select("user_id")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
        .data
    )
    if not complaint:
        return None

    supabase.table("complaints").update(
        {"status": "escalated"}
    ).eq("id", complaint_id).execute()

    queue_res = (
        supabase.table("live_agent_queue")
        .insert({
            "complaint_id": complaint_id,
            "user_id": complaint["user_id"],
            "reason": reason,
            "status": "waiting",
        })
        .execute()
    )

    return {
        "complaint_id": complaint_id,
        "status": "escalated",
        "queue": queue_res.data
    }