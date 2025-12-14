from app.services.supabase_client import supabase


def list_queue():
    res = (
        supabase.table("live_agent_queue")
        .select("*, complaints (*)")
        .eq("status", "waiting")
        .execute()
    )
    return res.data


def take_ticket(ticket_id: str):
    # Make sure the ticket exists and is still waiting
    existing = (
        supabase.table("live_agent_queue")
        .select("id, status")
        .eq("id", ticket_id)
        .maybe_single()
        .execute()
        .data
    )

    if not existing or existing.get("status") != "waiting":
        return None

    supabase.table("live_agent_queue") \
        .update({"status": "connected"}) \
        .eq("id", ticket_id) \
        .execute()

    return {"ticket_id": ticket_id, "status": "connected"}


def close_ticket(ticket_id: str):
    existing = (
        supabase.table("live_agent_queue")
        .select("id")
        .eq("id", ticket_id)
        .maybe_single()
        .execute()
        .data
    )

    if not existing:
        return None

    supabase.table("live_agent_queue") \
        .update({"status": "closed"}) \
        .eq("id", ticket_id) \
        .execute()

    return {"ticket_id": ticket_id, "status": "closed"}