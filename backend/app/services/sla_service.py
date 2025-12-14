from app.services.supabase_client import supabase


def create_sla_rule(payload):
    data = {
        "issue_type": payload.issue_type,
        "department": payload.department,
        "sla_hours": payload.sla_hours,
    }
    res = supabase.table("sla_rules").insert(data).execute()
    return res.data


def list_sla_rules():
    res = supabase.table("sla_rules").select("*").execute()
    return res.data