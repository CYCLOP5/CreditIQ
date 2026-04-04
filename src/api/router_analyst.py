from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.api.mock_db import db
from src.api.auth import require_role
from datetime import datetime, timezone
import json
from pathlib import Path

router_analyst = APIRouter(tags=["analyst"])

# ── Demo GSTIN config ─────────────────────────────────────────────────────────
# Written by scripts/inject_real_gstins.py from data/raw/msme_profiles.parquet.
# The API reads this file at request time so a re-run of the inject script
# takes effect without restarting the server.

_DEMO_CFG_PATH = Path("data/demo_gstins.json")

_DEMO_CFG_FALLBACK = {
    "priya":  {"gstin": "", "name": "BakeryCraft", "profile_type": "GENUINE_HEALTHY"},
    "rahul":  {"gstin": "", "name": "Bolt Automotive", "profile_type": "GENUINE_STRUGGLING"},
    "imran":  {
        "gstin": "", "name": "Textile Zone", "profile_type": "SHELL_CIRCULAR",
        "ring_id": "ring_000",
        "ring_members": [],
    },
}

def _cfg() -> dict:
    """Return demo GSTIN config, reading from disk each time so hot-reload works."""
    if _DEMO_CFG_PATH.exists():
        try:
            return json.loads(_DEMO_CFG_PATH.read_text())
        except Exception:
            pass
    return _DEMO_CFG_FALLBACK


def _is_fraud(gstin: str) -> bool:
    cfg = _cfg()
    imran_gstin = cfg["imran"]["gstin"]
    ring_members = {m["gstin"] for m in cfg["imran"].get("ring_members", [])}
    return gstin == imran_gstin or gstin in ring_members


# ── Models ────────────────────────────────────────────────────────────────────

class ResolveDispute(BaseModel):
    unflag: bool
    resolution_note: str


# ── Score history ─────────────────────────────────────────────────────────────

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


# ── Disputes ──────────────────────────────────────────────────────────────────

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


# ── Transaction graphs ────────────────────────────────────────────────────────

@router_analyst.get("/transactions/{gstin}/graph")
async def get_gstin_graph(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    cfg = _cfg()
    imran = cfg["imran"]
    ring = imran.get("ring_members", [])
    flagged = _is_fraud(gstin)
    nodes = [{"id": gstin, "flagged": flagged}]
    edges = []
    if flagged and ring:
        for m in ring:
            if m["gstin"] != gstin:
                nodes.append({"id": m["gstin"], "label": m["name"], "flagged": True})
                edges.append({"source": gstin, "target": m["gstin"], "tx_count": 5, "total_amount": 1800000})
    else:
        nodes.append({"id": "LEGIT_SUPPLIER", "label": "Legit Supplier", "flagged": False})
        edges.append({"source": gstin, "target": "LEGIT_SUPPLIER", "tx_count": 5, "total_amount": 10000})
    return {"nodes": nodes, "edges": edges}


@router_analyst.get("/transactions/graph")
async def get_global_graph(
    flagged_only: bool = False,
    confidence_min: float = 0.0,
    user: dict = Depends(require_role(["risk_manager", "admin"]))
):
    cfg = _cfg()
    imran = cfg["imran"]
    priya = cfg["priya"]
    rahul = cfg["rahul"]

    ring = imran.get("ring_members", [])
    # Assign pagerank scores: hub is highest, rest descend, clean nodes low
    pr_scores = [0.28, 0.22, 0.17, 0.13]

    nodes = []
    # Fraud ring nodes
    for i, m in enumerate(ring):
        is_hub = m["gstin"] == imran["gstin"]
        nodes.append({
            "id": m["gstin"],
            "label": f"{m['name']} {'(Imran)' if is_hub else ''}".strip(),
            "flagged": True,
            "pagerank_score": pr_scores[i] if i < len(pr_scores) else 0.10,
        })

    # Legit nodes
    if priya["gstin"]:
        nodes.append({"id": priya["gstin"], "label": f"BakeryCraft ({priya['name'].split()[0]})", "flagged": False, "pagerank_score": 0.04})
    if rahul["gstin"]:
        nodes.append({"id": rahul["gstin"], "label": f"Bolt Automotive ({rahul['name'].split()[0]})", "flagged": False, "pagerank_score": 0.06})
    nodes += [
        {"id": "LEGIT_C_03", "label": "Legit Supplier C",    "flagged": False, "pagerank_score": 0.03},
        {"id": "LEGIT_D_04", "label": "Legit Retailer D",    "flagged": False, "pagerank_score": 0.02},
        {"id": "LEGIT_E_05", "label": "Legit Distributor E", "flagged": False, "pagerank_score": 0.01},
    ]

    # Build circular fraud edges from actual ring
    edges = []
    if len(ring) >= 2:
        amounts = [4500000, 3200000, 2800000, 4100000]
        for i in range(len(ring)):
            src = ring[i]["gstin"]
            tgt = ring[(i + 1) % len(ring)]["gstin"]
            edges.append({"source": src, "target": tgt, "weight": 6 + (i % 3), "amount": amounts[i % len(amounts)]})
        # Extra cross-edge for hub visibility
        if len(ring) >= 3:
            edges.append({"source": ring[1]["gstin"], "target": ring[3 % len(ring)]["gstin"], "weight": 3, "amount": 1500000})

    # Legit edges
    if priya["gstin"]:
        edges.append({"source": priya["gstin"], "target": "LEGIT_C_03", "weight": 2, "amount": 850000})
    if rahul["gstin"]:
        edges.append({"source": rahul["gstin"], "target": "LEGIT_D_04", "weight": 4, "amount": 1200000})
    edges.append({"source": "LEGIT_C_03", "target": "LEGIT_E_05", "weight": 1, "amount": 400000})

    if flagged_only:
        flagged_ids = {n["id"] for n in nodes if n["flagged"]}
        nodes = [n for n in nodes if n["flagged"]]
        edges = [e for e in edges if e["source"] in flagged_ids and e["target"] in flagged_ids]

    return {"nodes": nodes, "edges": edges}


# ── Fraud alerts ──────────────────────────────────────────────────────────────

@router_analyst.get("/fraud-alerts")
async def get_fraud_alerts(user: dict = Depends(require_role(["risk_manager", "admin"]))):
    cfg = _cfg()
    imran = cfg["imran"]
    ring_gstins = [m["gstin"] for m in imran.get("ring_members", [])]
    return [
        {
            "gstin": imran["gstin"],
            "fraud_details": {
                "cycle_members": ring_gstins,
                "confidence": 0.91
            },
            "flagged_at": "2026-03-15T00:00:00",
            "dispute_count": 0
        }
    ]


@router_analyst.get("/fraud-alerts/{gstin}")
async def get_fraud_alert(gstin: str, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    cfg = _cfg()
    imran = cfg["imran"]
    ring_gstins = [m["gstin"] for m in imran.get("ring_members", [])]
    return {
        "gstin": gstin,
        "fraud_details": {
            "cycle_members": ring_gstins,
            "confidence": 0.91
        },
        "flagged_at": "2026-03-15T00:00:00",
        "dispute_count": 0
    }


# ── EWB smurfing distribution ─────────────────────────────────────────────────

@router_analyst.get("/transactions/{gstin}/ewb-distribution")
async def get_ewb_distribution(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    """Bucketed e-way bill value distribution for smurfing detection.
    ₹45K–₹49,999 is the structuring window below the ₹50K mandatory threshold."""
    import hashlib, random as _rnd
    seed = int(hashlib.md5(gstin.encode()).hexdigest()[:8], 16)
    _rnd.seed(seed)
    is_fraudulent = _is_fraud(gstin)
    buckets = [
        {"range": "< ₹10K",         "min": 0,      "max": 10000,  "count": _rnd.randint(5, 20)},
        {"range": "₹10K – ₹25K",    "min": 10000,  "max": 25000,  "count": _rnd.randint(8, 30)},
        {"range": "₹25K – ₹44,999", "min": 25000,  "max": 44999,  "count": _rnd.randint(10, 35)},
        {"range": "₹45K – ₹49,999", "min": 45000,  "max": 49999,  "count": (120 if is_fraudulent else _rnd.randint(2, 8)), "smurf_band": True},
        {"range": "₹50K – ₹1L",     "min": 50000,  "max": 100000, "count": _rnd.randint(15, 50)},
        {"range": "₹1L – ₹5L",      "min": 100000, "max": 500000, "count": _rnd.randint(5, 25)},
        {"range": "> ₹5L",          "min": 500000, "max": None,   "count": _rnd.randint(1, 10)},
    ]
    smurfing_index = round(buckets[3]["count"] / max(1, sum(b["count"] for b in buckets)), 3)
    return {"gstin": gstin, "buckets": buckets, "smurfing_index": smurfing_index}


# ── GST vs UPI receivables gap ────────────────────────────────────────────────

@router_analyst.get("/transactions/{gstin}/receivables-gap")
async def get_receivables_gap(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin"]))):
    """GST declared revenue vs UPI inbound actuals — exposes cash/accrual reconciliation gap."""
    import hashlib, random as _rnd
    seed = int(hashlib.md5(gstin.encode()).hexdigest()[:8], 16)
    _rnd.seed(seed)
    is_fraudulent = _is_fraud(gstin)
    months = []
    for i in range(6):
        month_num = (i * 2 + 1)
        year = 2025 if month_num <= 12 else 2026
        m = month_num if month_num <= 12 else month_num - 12
        gst_val = _rnd.randint(800000, 5000000)
        upi_val = int(gst_val * _rnd.uniform(0.05, 0.15)) if is_fraudulent else int(gst_val * _rnd.uniform(0.6, 1.05))
        months.append({
            "period": f"{year}-{m:02d}",
            "gst_invoiced": gst_val,
            "upi_inbound": upi_val,
            "gap": gst_val - upi_val,
        })
    return {"gstin": gstin, "monthly": months}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router_analyst.get("/analytics/cohort-median")
async def get_cohort_median(msme_category: str, user: dict = Depends(require_role(["credit_analyst", "admin"]))):
    cfg = _cfg()
    return cfg.get("cohort_medians", {
        "filing_compliance_rate": 0.88,
        "upi_30d_inbound_count": 45,
        "fraud_confidence": 0.01
    })


# ── Risk thresholds ───────────────────────────────────────────────────────────

@router_analyst.get("/risk-thresholds")
async def get_risk_thresholds(user: dict = Depends(require_role(["risk_manager", "admin"]))):
    return db.data["risk_thresholds"]


@router_analyst.put("/risk-thresholds")
async def update_risk_thresholds(req: dict, user: dict = Depends(require_role(["risk_manager", "admin"]))):
    db.data["risk_thresholds"] = req
    db.save()
    return req
