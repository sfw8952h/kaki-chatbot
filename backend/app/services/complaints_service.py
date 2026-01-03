from app.services.supabase_client import supabase


def create_complaint(payload):
    # Fetch SLA rule for automatic routing
    sla_res = (
        supabase.table("sla_rules")
        .select("*")
        .eq("issue_type", payload.issue_type)
        .maybe_single()
        .execute()
    )

    sla = sla_res.data or {}
    department = sla.get("department", "general_support")
    sla_hours = sla.get("sla_hours", 24)

    data = {
        "user_id": payload.user_id,
        "store_id": payload.store_id,
        "issue_type": payload.issue_type,
        "priority": payload.priority,
        "description": payload.description,
        "status": "pending",
        "assigned_department": department,
        "sla_hours": sla_hours,
    }

    res = supabase.table("complaints").insert(data).execute()
    return res.data


def list_complaints():
    res = supabase.table("complaints").select("*").execute()
    return res.data


def get_complaint(complaint_id: str):
    res = (
        supabase.table("complaints")
        .select("*")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    return res.data


def escalate_complaint(complaint_id: str):
    # Confirm complaint exists
    complaint = get_complaint(complaint_id)
    if not complaint:
        return None

    # Update complaint status
    supabase.table("complaints") \
        .update({"status": "escalated"}) \
        .eq("id", complaint_id) \
        .execute()

    # Insert into live agent queue
    queue_res = (
        supabase.table("live_agent_queue")
        .insert({
            "complaint_id": complaint_id,
            "user_id": complaint["user_id"],
            "reason": "Customer escalation request",
            "status": "waiting",
        })
        .execute()
    )

    return queue_res.data