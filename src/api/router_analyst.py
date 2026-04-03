from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from src.api.mock_db import db
from src.api.auth import get_current_user, require_role
from datetime import datetime, timezone

router_analyst = APIRouter(tags=["analyst"])

class ResolveDispute(BaseModel):
    unflag: bool
    resolution_note: str

@router_analyst.get("/score-history")
async def get_score_history(gstin: str, user: dict = Depends(require_role(["credit_analyst", "admin"]))):
    return [
        {"task_id": "mock_task_1", "credit_score": 720, "risk_band": "low", "score_freshness": "historical", "key_features": {"filing_compliance_rate": 0.95}},
        {"task_id": "mock_task_2", "credit_score": 750, "risk_band": "very_low", "score_freshness": "current", "key_features": {"filing_compliance_rate": 1.0}}
    ]

@router_analyst.put("/disputes/{did}/assign")
async def assign_dispute(did: str, user: dict = Depends(require_role(["credit_analyst"]))):
    disp = db.get("disputes", "id", did)
    if not disp: raise HTTPException(status_code=404)
    db.update("disputes", "id", did, {
        "status": "under_review",
        "analyst_id": user["id"],
        "analyst_name": user["name"]
    })
    return {"status": "under_review"}

@router_analyst.put("/disputes/{did}/resolve")
async def resolve_dispute(did: str, req: ResolveDispute, user: dict = Depends(require_role(["credit_analyst"]))):
    disp = db.get("disputes", "id", did)
    if not disp: raise HTTPException(status_code=404)
    db.update("disputes", "id", did, {
        "status": "resolved",
        "resolution_note": req.resolution_note,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "resolved", "unflagged": req.unflag}

@router_analyst.get("/transactions/{gstin}/graph")
async def get_gstin_graph(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    return {
        "nodes": [{"id": gstin, "flagged": False}, {"id": "target_gstin", "flagged": True}],
        "edges": [{"source": gstin, "target": "target_gstin", "tx_count": 5, "total_amount": 10000}]
    }

@router_analyst.get("/transactions/graph")
async def get_global_graph(flagged_only: bool = False, confidence_min: float = 0.0, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return {
        "nodes": [{"id": "bad_actor", "flagged": True}],
        "edges": []
    }

@router_analyst.get("/fraud-alerts")
async def get_fraud_alerts(user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return [
        {"gstin": "19SOCLJ4532D2Z3", "fraud_details": {"cycle_members": ["A", "B", "C"], "confidence": 0.95}, "flagged_at": "2026-02-01T00:00:00", "dispute_count": 1}
    ]

@router_analyst.get("/fraud-alerts/{gstin}")
async def get_fraud_alert(gstin: str, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return {"gstin": gstin, "fraud_details": {"cycle_members": ["A", "B", "C"], "confidence": 0.95}, "flagged_at": "2026-02-01T00:00:00", "dispute_count": 1}

@router_analyst.get("/analytics/cohort-median")
async def get_cohort_median(msme_category: str, user: dict = Depends(require_role(["credit_analyst", "admin"]))):
    return {
        "filing_compliance_rate": 0.88,
        "upi_30d_inbound_count": 45,
        "fraud_confidence": 0.01
    }

@router_analyst.get("/risk-thresholds")
async def get_risk_thresholds(user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return db.data["risk_thresholds"]

@router_analyst.put("/risk-thresholds")
async def update_risk_thresholds(req: dict, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    db.data["risk_thresholds"] = req
    db.save()
    return req
