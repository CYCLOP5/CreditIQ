import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.api.mock_db import db
from src.api.auth import get_current_user, require_role

router_msme = APIRouter(tags=["msme"])

class LoanRequestCreate(BaseModel):
    gstin: str
    bank_id: str
    loan_type: str
    amount_requested: float
    purpose: str

class PermissionAction(BaseModel):
    action: str # "approve" | "deny"

class DisputeCreate(BaseModel):
    gstin: str
    description: str

class ChatReq(BaseModel):
    message: str
    language: str
    conversation_history: list = []

@router_msme.get("/loan-requests")
async def get_loan_requests(gstin: Optional[str] = None, bank_id: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(require_role(["msme", "loan_officer", "admin"]))):
    if user["role"] == "msme" and gstin != user["gstin"]:
        raise HTTPException(status_code=403, detail="can only view own gstin")
    
    def df(x):
        if gstin and x.get("gstin") != gstin: return False
        if bank_id and x.get("bank_id") != bank_id: return False
        if status and x.get("status") != status: return False
        if user["role"] == "msme" and x.get("gstin") != user["gstin"]: return False
        if user["role"] == "loan_officer" and x.get("bank_id") != user["bank_id"]: return False
        return True
    
    return db.query("loan_requests", df)

@router_msme.post("/loan-requests")
async def create_loan_request(req: LoanRequestCreate, user: dict = Depends(require_role(["msme"]))):
    if req.gstin != user["gstin"]:
        raise HTTPException(status_code=403)
    bank = db.get("banks", "id", req.bank_id)
    if not bank: raise HTTPException(status_code=404, detail="bank not found")
    
    new_req = {
        "id": str(uuid.uuid4()),
        "gstin": req.gstin,
        "bank_id": req.bank_id,
        "bank_name": bank["name"],
        "loan_type": req.loan_type,
        "amount_requested": req.amount_requested,
        "purpose": req.purpose,
        "status": "submitted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    db.write("loan_requests", new_req)
    return new_req

@router_msme.get("/permissions")
async def get_permissions(gstin: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(require_role(["msme", "loan_officer", "admin"]))):
    if user["role"] == "msme" and gstin != user["gstin"]:
        raise HTTPException(status_code=403)
    def df(x):
        if gstin and x.get("gstin") != gstin: return False
        if status and x.get("status") != status: return False
        if user["role"] == "msme" and x.get("gstin") != user["gstin"]: return False
        if user["role"] == "loan_officer" and x.get("bank_id") != user["bank_id"]: return False
        return True
    return db.query("permissions", df)

@router_msme.put("/permissions/{pid}")
async def update_permission(pid: str, req: PermissionAction, user: dict = Depends(require_role(["msme"]))):
    perm = db.get("permissions", "id", pid)
    if not perm or perm["gstin"] != user["gstin"]:
        raise HTTPException(status_code=404)
    stat = "granted" if req.action == "approve" else "denied"
    db.update("permissions", "id", pid, {"status": stat})
    if stat == "granted":
        db.update("loan_requests", "id", perm["loan_request_id"], {"status": "bank_reviewing"})
    return {"status": stat}

@router_msme.get("/disputes")
async def get_disputes(gstin: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(require_role(["msme", "credit_analyst", "risk_manager", "admin", "loan_officer"]))):
    def df(x):
        if gstin and x.get("gstin") != gstin: return False
        if status and x.get("status") not in status.split(","): return False
        if user["role"] == "msme" and x.get("gstin") != user["gstin"]: return False
        return True
    return db.query("disputes", df)

@router_msme.post("/disputes")
async def create_dispute(req: DisputeCreate, user: dict = Depends(require_role(["msme"]))):
    if req.gstin != user["gstin"]: raise HTTPException(status_code=403)
    rec = {
        "id": str(uuid.uuid4()),
        "gstin": req.gstin,
        "description": req.description,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    return db.write("disputes", rec)

@router_msme.get("/reminders")
async def get_reminders(gstin: Optional[str] = None, user: dict = Depends(require_role(["msme", "admin"]))):
    def df(x):
        if gstin and x.get("gstin") != gstin: return False
        if user["role"] == "msme" and x.get("gstin") != user["gstin"]: return False
        return True
    return db.query("reminders", df)

@router_msme.put("/reminders/{rid}/complete")
async def complete_reminder(rid: str, user: dict = Depends(require_role(["msme"]))):
    rem = db.get("reminders", "id", rid)
    if not rem or rem["gstin"] != user["gstin"]: raise HTTPException(status_code=404)
    db.update("reminders", "id", rid, {"status": "completed"})
    return {"status": "completed"}

@router_msme.get("/notifications")
async def get_notifications(unread: bool = False, user: dict = Depends(get_current_user)):
    def df(x):
        if x.get("user_id") != user["id"]: return False
        if unread and x.get("read") is True: return False
        return True
    return db.query("notifications", df)

@router_msme.put("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    notif = db.get("notifications", "id", nid)
    if not notif or notif["user_id"] != user["id"]: raise HTTPException(status_code=404)
    db.update("notifications", "id", nid, {"read": True})
    return {"status": "ok"}

@router_msme.put("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    for n in db.query("notifications", lambda x: x.get("user_id") == user["id"]):
        db.update("notifications", "id", n["id"], {"read": True})
    return {"status": "ok"}

@router_msme.post("/chat")
async def chat_bot(req: ChatReq, user: dict = Depends(get_current_user)):
    return {"reply": "This is a mock response from the virtual avatar / chatbot."}

@router_msme.get("/guide-topics")
async def guide_topics():
    return [
        {"id": "t1", "title": "Understanding your score", "video_url": "", "thumbnail_url": "", "language": "English"},
        {"id": "t2", "title": "What is CGTMSE?", "video_url": "", "thumbnail_url": "", "language": "English"}
    ]
