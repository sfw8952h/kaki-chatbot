from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])


class Credentials(BaseModel):
    email: str
    password: str


@router.post("/signup", summary="Create new user")
def signup(creds: Credentials):
    try:
        res = supabase.auth.sign_up({
            "email": creds.email,
            "password": creds.password
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Signup failed")

    if not res.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    return {"id": res.user.id, "email": res.user.email}


@router.post("/login", summary="Login user")
def login(creds: Credentials):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": creds.email,
            "password": creds.password
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not res.session or not res.user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user": {"id": res.user.id, "email": res.user.email},
    }


@router.post("/logout", summary="Logout user")
def logout():
    try:
        supabase.auth.sign_out()
    except Exception:
        pass
    return {"message": "Logged out"}