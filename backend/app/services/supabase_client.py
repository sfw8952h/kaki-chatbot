from supabase import create_client
from ..config import SUPABASE_URL, SUPABASE_ANON_KEY

# Only initialize if credentials are present to avoid runtime errors in local dev
supabase = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def log_message(user_id: str, message: str, response: str):
    if not supabase:
        return

    supabase.table("chat_logs").insert(
        {
            "user_id": user_id,
            "user_message": message,
            "bot_response": response,
        }
    ).execute()
