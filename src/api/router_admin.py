import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.api.mock_db import db
from src.api.auth import get_current_user, require_role

router_admin = APIRouter(tags=["admin"])

class CreateBank(BaseModel):
    name: str
    registration_number: str

class UpdateBank(BaseModel):
    status: str

class CreateApiKey(BaseModel):
    bank_id: str
    quota_per_day: int

class CreateUser(BaseModel):
    name: str
    email: str
    role: str
    bank_id: Optional[str] = None
    gstin: Optional[str] = None

class UpdateUser(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

@router_admin.get("/banks")
async def get_banks(user: dict = Depends(require_role(["msme", "admin"]))):
    return db.query("banks")

@router_admin.post("/banks")
async def create_bank(req: CreateBank, user: dict = Depends(require_role(["admin"]))):
    b = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "registration_number": req.registration_number,
        "status": "active",
        "officer_count": 0,
        "api_key_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    return db.write("banks", b)

@router_admin.put("/banks/{bid}")
async def update_bank(bid: str, req: UpdateBank, user: dict = Depends(require_role(["admin"]))):
    b = db.update("banks", "id", bid, {"status": req.status})
    if not b: raise HTTPException(status_code=404)
    return b

@router_admin.get("/api-keys")
async def get_api_keys(user: dict = Depends(require_role(["admin"]))):
    return db.query("api_keys")

@router_admin.post("/api-keys")
async def create_api_key(req: CreateApiKey, user: dict = Depends(require_role(["admin"]))):
    bank = db.get("banks", "id", req.bank_id)
    if not bank: raise HTTPException(status_code=404)
    
    k = {
        "id": str(uuid.uuid4()),
        "bank_id": req.bank_id,
        "bank_name": bank["name"],
        "key_prefix": "key_****" + str(uuid.uuid4())[:4],
        "status": "active",
        "quota_per_day": req.quota_per_day,
        "usage_today": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None
    }
    db.write("api_keys", k)
    return {"id": k["id"], "key": str(uuid.uuid4()) + str(uuid.uuid4())}

@router_admin.put("/api-keys/{kid}/revoke")
async def revoke_api_key(kid: str, user: dict = Depends(require_role(["admin"]))):
    k = db.update("api_keys", "id", kid, {"status": "revoked", "revoked_at": datetime.now(timezone.utc).isoformat()})
    if not k: raise HTTPException(status_code=404)
    return {"status": "revoked"}

@router_admin.put("/api-keys/{kid}/rotate")
async def rotate_api_key(kid: str, user: dict = Depends(require_role(["admin"]))):
    k = db.get("api_keys", "id", kid)
    if not k: raise HTTPException(status_code=404)
    return {"new_key": str(uuid.uuid4()) + str(uuid.uuid4())}

@router_admin.get("/api-keys/{kid}/usage")
async def usage_api_key(kid: str, user: dict = Depends(require_role(["admin"]))):
    return [{"date": "today", "request_count": 0}]

@router_admin.get("/users")
async def get_users(user: dict = Depends(require_role(["admin"]))):
    return db.query("users")

@router_admin.post("/users")
async def create_user(req: CreateUser, user: dict = Depends(require_role(["admin"]))):
    u = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "email": req.email,
        "role": req.role,
        "bank_id": req.bank_id,
        "gstin": req.gstin,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    return db.write("users", u)

@router_admin.put("/users/{uid}")
async def update_user(uid: str, req: UpdateUser, user: dict = Depends(require_role(["admin"]))):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    u = db.update("users", "id", uid, updates)
    if not u: raise HTTPException(status_code=404)
    return u

@router_admin.post("/users/{uid}/reset-password")
async def reset_password(uid: str, user: dict = Depends(require_role(["admin"]))):
    return {"status": "ok"}

@router_admin.get("/audit-log")
async def get_audit_log(user_id: Optional[str] = None, action: Optional[str] = None, user: dict = Depends(require_role(["admin"]))):
    def df(x):
        if user_id and x.get("user_id") != user_id: return False
        if action and x.get("action") != action: return False
        return True
    return db.query("audit_log", df)
