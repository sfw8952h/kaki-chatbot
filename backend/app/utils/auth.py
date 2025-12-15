from jose import jwt
from fastapi import HTTPException, Header
from ..config import SUPABASE_JWT_SECRET


def verify_jwt(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid token format")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(401, "Invalid token")
