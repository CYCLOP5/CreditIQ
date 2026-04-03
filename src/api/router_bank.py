import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from src.api.mock_db import db
from src.api.auth import get_current_user, require_role

router_bank = APIRouter(tags=["bank"])

class PermissionRequest(BaseModel):
    loan_request_id: str
    bank_id: str

class LoanDecision(BaseModel):
    action: str # "approved" | "denied"
    denial_reason: Optional[str] = None
    amount_offered: Optional[float] = None
    interest_rate_hint: Optional[float] = None

@router_bank.post("/permissions")
async def request_permission(req: PermissionRequest, user: dict = Depends(require_role(["loan_officer"]))):
    if user["bank_id"] != req.bank_id: raise HTTPException(status_code=403)
    loan = db.get("loan_requests", "id", req.loan_request_id)
    if not loan or loan["bank_id"] != req.bank_id:
        raise HTTPException(status_code=404)
        
    perm = {
        "id": str(uuid.uuid4()),
        "loan_request_id": req.loan_request_id,
        "gstin": loan["gstin"],
        "bank_id": req.bank_id,
        "bank_name": loan["bank_name"],
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None
    }
    db.write("permissions", perm)
    db.update("loan_requests", "id", loan["id"], {"status": "data_permission_requested"})
    return perm

@router_bank.get("/loan-requests/{lid}")
async def get_loan_request(lid: str, user: dict = Depends(require_role(["loan_officer", "msme", "admin"]))):
    loan = db.get("loan_requests", "id", lid)
    if not loan: raise HTTPException(status_code=404)
    if user["role"] == "msme" and loan["gstin"] != user["gstin"]: raise HTTPException(status_code=403)
    if user["role"] == "loan_officer" and loan["bank_id"] != user["bank_id"]: raise HTTPException(status_code=403)
    return loan

@router_bank.get("/loan-requests/{lid}/score")
async def get_loan_score(request: Request, lid: str, user: dict = Depends(require_role(["loan_officer", "admin"]))):
    loan = db.get("loan_requests", "id", lid)
    if not loan or loan["bank_id"] != user.get("bank_id", loan["bank_id"]):
        raise HTTPException(status_code=404)
    
    perms = db.query("permissions", lambda x: x["loan_request_id"] == lid and x["status"] == "granted")
    if not perms:
        raise HTTPException(status_code=403, detail="Permission required from MSME owner")
        
    import json
    redis_client = request.app.state.redis
    keys = await redis_client.keys("score:*")
    best_task = None
    for k in keys:
        score_data = await redis_client.hgetall(k)
        if score_data.get("gstin") == loan["gstin"] and score_data.get("status") == "complete":
            best_task = score_data
            break
            
    if best_task:
        from src.api.schemas import ScoreResult
        result = ScoreResult(
            task_id="dynamic",
            gstin=best_task.get("gstin", ""),
            credit_score=int(best_task.get("credit_score", 0)),
            risk_band=best_task.get("risk_band", ""),
            top_reasons=json.loads(best_task.get("top_reasons", "[]")),
            recommended_wc_amount=int(best_task.get("recommended_wc_amount", 0)),
            recommended_term_amount=int(best_task.get("recommended_term_amount", 0)),
            msme_category=best_task.get("msme_category", "micro"),
            cgtmse_eligible=best_task.get("cgtmse_eligible", "false") == "true",
            mudra_eligible=best_task.get("mudra_eligible", "false") == "true",
            fraud_flag=best_task.get("fraud_flag", "false") == "true",
            fraud_details=json.loads(best_task.get("fraud_details", "null")),
            score_freshness=best_task.get("score_freshness", ""),
            data_maturity_months=int(best_task.get("data_maturity_months", 0)),
        ).model_dump()
        return result

    return {
        "status": "not_scored",
        "gstin": loan["gstin"],
        "message": "MSME has not generated a credit score yet"
    }

@router_bank.put("/loan-requests/{lid}/decision")
async def decide_loan(lid: str, req: LoanDecision, user: dict = Depends(require_role(["loan_officer"]))):
    loan = db.get("loan_requests", "id", lid)
    if not loan or loan["bank_id"] != user["bank_id"]:
        raise HTTPException(status_code=404)
        
    db.update("loan_requests", "id", lid, {
        "status": req.action,
        "denial_reason": req.denial_reason,
        "amount_offered": req.amount_offered
    })
    return {"status": req.action}
