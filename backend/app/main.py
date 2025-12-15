from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.store import router as store_router
from app.routers.feedback import router as feedback_router
from app.routers.admin_stores import router as admin_stores_router
from app.routers.notifications import router as notifications_router
from app.routers.complaints import router as complaints_router
from app.routers.supplier import router as supplier_router
from app.routers.sla import router as sla_router
from app.routers.agent import router as agent_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "FastAPI backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Public routes
app.include_router(auth_router, prefix="/auth")
app.include_router(chat_router, prefix="/chat")
app.include_router(store_router)
app.include_router(feedback_router)
app.include_router(notifications_router)

# Admin routes
app.include_router(admin_stores_router)

# Core system features
app.include_router(complaints_router)
app.include_router(supplier_router)
app.include_router(sla_router)
app.include_router(agent_router)
