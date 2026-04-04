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
    import hashlib, random as _rnd
    seed = int(hashlib.md5(gstin.encode()).hexdigest()[:8], 16)
    _rnd.seed(seed)
    base_score = _rnd.randint(560, 820)
    history = []
    for i in range(6):
        delta = _rnd.randint(-30, 30)
        score = max(300, min(900, base_score + delta * (i + 1) // 3))
        if score >= 800: band = "very_low"
        elif score >= 700: band = "low"
        elif score >= 550: band = "medium"
        else: band = "high"
        month = (i * 2 + 1)
        year = 2025 if month <= 12 else 2026
        month = month if month <= 12 else month - 12
        history.append({
            "task_id": f"hist_{gstin[:6]}_{i}",
            "credit_score": score,
            "risk_band": band,
            "score_freshness": f"{year}-{month:02d}-15T00:00:00",
            "key_features": {
                "filing_compliance_rate": round(min(1.0, 0.6 + _rnd.random() * 0.4), 2),
                "gst_revenue_cv_90d": round(_rnd.uniform(0.05, 0.45), 2),
                "upi_30d_inbound_count": _rnd.randint(10, 120),
                "eway_bill_mom_growth": round(_rnd.uniform(-0.2, 0.4), 2),
                "longest_gap_days": _rnd.randint(0, 45),
                "ewb_smurfing_index": round(_rnd.uniform(0.0, 0.6), 2),
            }
        })
    return history

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
    nodes = [
    # GSTINs match mock_db.py seeded users
    nodes = [
        {"id": "19DUTDZ1506O6Z3", "label": "Textile Zone (Imran)", "flagged": True,  "pagerank_score": 0.24},
        {"id": "SHELL_HUB_01",    "label": "Shell Hub Mumbai",      "flagged": True,  "pagerank_score": 0.31},
        {"id": "MULE_A_01",       "label": "Mule Entity A",         "flagged": True,  "pagerank_score": 0.18},
        {"id": "MULE_B_02",       "label": "Mule Entity B",         "flagged": True,  "pagerank_score": 0.15},
        {"id": "29MUSKV7503C9Z0", "label": "BakeryCraft (Priya)",   "flagged": False, "pagerank_score": 0.04},
        {"id": "36CWGXT1223V5Z8", "label": "Bolt Automotive (Rahul)","flagged": False,"pagerank_score": 0.06},
        {"id": "LEGIT_C_03",      "label": "Legit Supplier C",      "flagged": False, "pagerank_score": 0.03},
        {"id": "LEGIT_D_04",      "label": "Legit Retailer D",      "flagged": False, "pagerank_score": 0.02},
        {"id": "LEGIT_E_05",      "label": "Legit Distributor E",   "flagged": False, "pagerank_score": 0.01},
    ]
    edges = [
        {"source": "19DUTDZ1506O6Z3", "target": "SHELL_HUB_01",    "weight": 8, "amount": 4500000},
        {"source": "SHELL_HUB_01",    "target": "MULE_A_01",        "weight": 6, "amount": 3200000},
        {"source": "MULE_A_01",       "target": "MULE_B_02",        "weight": 5, "amount": 2800000},
        {"source": "MULE_B_02",       "target": "19DUTDZ1506O6Z3",  "weight": 7, "amount": 4100000},
        {"source": "SHELL_HUB_01",    "target": "MULE_B_02",        "weight": 3, "amount": 1500000},
        {"source": "29MUSKV7503C9Z0", "target": "LEGIT_C_03",       "weight": 2, "amount": 850000},
        {"source": "36CWGXT1223V5Z8", "target": "LEGIT_D_04",       "weight": 4, "amount": 1200000},
        {"source": "LEGIT_C_03",      "target": "LEGIT_E_05",       "weight": 1, "amount": 400000},
    ]
    if flagged_only:
        flagged_ids = {n["id"] for n in nodes if n["flagged"]}
        nodes = [n for n in nodes if n["flagged"]]
        edges = [e for e in edges if e["source"] in flagged_ids and e["target"] in flagged_ids]
    return {"nodes": nodes, "edges": edges}

@router_analyst.get("/fraud-alerts")
async def get_fraud_alerts(user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return [
        {
            "gstin": "19DUTDZ1506O6Z3",
            "fraud_details": {
                "cycle_members": ["19DUTDZ1506O6Z3", "SHELL_HUB_01", "MULE_A_01", "MULE_B_02"],
                "confidence": 0.91
            },
            "flagged_at": "2026-03-15T00:00:00",
            "dispute_count": 0
        }
    ]

@router_analyst.get("/fraud-alerts/{gstin}")
async def get_fraud_alert(gstin: str, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return {
        "gstin": gstin,
        "fraud_details": {
            "cycle_members": ["19DUTDZ1506O6Z3", "SHELL_HUB_01", "MULE_A_01", "MULE_B_02"],
            "confidence": 0.91
        },
        "flagged_at": "2026-03-15T00:00:00",
        "dispute_count": 0
    }

@router_analyst.get("/transactions/{gstin}/ewb-distribution")
async def get_ewb_distribution(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    """Returns bucketed e-way bill value distribution for smurfing detection.
    The ₹45K–₹49,999 band is the structuring window below the ₹50K mandatory threshold."""
    import hashlib, random as _rnd
    seed = int(hashlib.md5(gstin.encode()).hexdigest()[:8], 16)
    _rnd.seed(seed)
    is_fraudulent = gstin == "19DUTDZ1506O6Z3"
    buckets = [
        {"range": "< ₹10K",          "min": 0,     "max": 10000,  "count": _rnd.randint(5, 20)},
        {"range": "₹10K – ₹25K",     "min": 10000, "max": 25000,  "count": _rnd.randint(8, 30)},
        {"range": "₹25K – ₹44,999",  "min": 25000, "max": 44999,  "count": _rnd.randint(10, 35)},
        {"range": "₹45K – ₹49,999",  "min": 45000, "max": 49999,  "count": (120 if is_fraudulent else _rnd.randint(2, 8)), "smurf_band": True},
        {"range": "₹50K – ₹1L",      "min": 50000, "max": 100000, "count": _rnd.randint(15, 50)},
        {"range": "₹1L – ₹5L",       "min": 100000,"max": 500000, "count": _rnd.randint(5, 25)},
        {"range": "> ₹5L",           "min": 500000,"max": None,   "count": _rnd.randint(1, 10)},
    ]
    smurfing_index = round(buckets[3]["count"] / max(1, sum(b["count"] for b in buckets)), 3)
    return {"gstin": gstin, "buckets": buckets, "smurfing_index": smurfing_index}

@router_analyst.get("/transactions/{gstin}/receivables-gap")
async def get_receivables_gap(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    """GST declared revenue vs UPI inbound actuals — exposes cash/accrual reconciliation gap."""
    import hashlib, random as _rnd
    seed = int(hashlib.md5(gstin.encode()).hexdigest()[:8], 16)
    _rnd.seed(seed)
    is_fraudulent = gstin == "19DUTDZ1506O6Z3"
    months = []
    for i in range(6):
        month_num = (i * 2 + 1)
        year = 2025 if month_num <= 12 else 2026
        m = month_num if month_num <= 12 else month_num - 12
        gst_val = _rnd.randint(800000, 5000000)
        if is_fraudulent:
            upi_val = int(gst_val * _rnd.uniform(0.05, 0.15))
        else:
            upi_val = int(gst_val * _rnd.uniform(0.6, 1.05))
        months.append({
            "period": f"{year}-{m:02d}",
            "gst_invoiced": gst_val,
            "upi_inbound": upi_val,
            "gap": gst_val - upi_val,
        })
    return {"gstin": gstin, "monthly": months}

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
