"""
inject_real_gstins.py
─────────────────────
Selects three real demo GSTINs from data/raw/msme_profiles.parquet based on
their ground-truth profile_type, writes data/demo_gstins.json (which the API
reads at request time), then replaces the GSTINs in every backend and frontend
file so the UI shows real, consistent identities everywhere.

Selection strategy
──────────────────
  • Priya  (low risk / GOOD)   — profile_type = GENUINE_HEALTHY, oldest first
  • Rahul  (medium risk)       — profile_type = GENUINE_STRUGGLING, oldest first
  • Imran  (fraud / high risk) — profile_type = SHELL_CIRCULAR, pick the ring
                                  whose primary node is oldest; must have all 4
                                  members in data/features/

Run:  python scripts/inject_real_gstins.py
"""

import os, re, glob, json
import polars as pl

REPO_ROOT    = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROFILES_PATH = os.path.join(REPO_ROOT, "data", "raw", "msme_profiles.parquet")
FEATURES_DIR  = os.path.join(REPO_ROOT, "data", "features")
MOCK_DB_PATH  = os.path.join(REPO_ROOT, "src", "api", "mock_db.py")
FRONTEND_DIR  = os.path.join(REPO_ROOT, "frontend")
DB_JSON_PATH  = os.path.join(REPO_ROOT, "data", "frontend_db.json")
DEMO_CFG_PATH = os.path.join(REPO_ROOT, "data", "demo_gstins.json")


def features_gstins() -> set[str]:
    return {
        p.split("gstin=")[1].split(os.sep)[0]
        for p in glob.glob(os.path.join(FEATURES_DIR, "gstin=*", "features.parquet"))
    }


def masked(gstin: str) -> str:
    return gstin[:2] + "****" + gstin[-6:]


def pick_gstins(profiles: pl.DataFrame, in_features: set[str]) -> tuple[dict, dict, dict]:
    """Return (priya_info, rahul_info, imran_info) dicts specifically matched to the problem statement."""

    # Load all features to find activity levels
    import glob
    feature_files = glob.glob("data/features/gstin=*/features.parquet")
    all_features = pl.concat([pl.read_parquet(f) for f in feature_files]).to_dicts()
    activity_map = {row["gstin"]: row for row in all_features if row["gstin"] in in_features}
    
    # Add metrics to profiles dataframe
    def get_metric(gstin, key, default):
        return activity_map.get(gstin, {}).get(key, default)
        
    profiles = profiles.with_columns([
        pl.col("gstin").map_elements(lambda g: get_metric(g, "upi_90d_inbound_count", 0.0), return_dtype=pl.Float64).alias("upi_count"),
        pl.col("gstin").map_elements(lambda g: get_metric(g, "gst_90d_value", 0.0), return_dtype=pl.Float64).alias("gst_value"),
        pl.col("gstin").map_elements(lambda g: get_metric(g, "fraud_ring_flag", False), return_dtype=pl.Boolean).alias("is_fraud"),
    ])

    # ── Priya — 6-month-old manufacturer with ₹40 lakh live ─────────────────
    # Looking for a young company (age <= 6) with high GST values
    young_healthy = (
        profiles.filter(
            (pl.col("profile_type").is_in(["NEW_TO_CREDIT", "GENUINE_HEALTHY"])) &
            (pl.col("business_age_months") <= 6) &
            (pl.col("gstin").is_in(list(in_features))) &
            (~pl.col("is_fraud"))
        )
        .sort("gst_value", descending=True)
    )
    if young_healthy.is_empty():
        # Fallback if no 6 month old exists
        young_healthy = profiles.filter(~pl.col("is_fraud")).sort(["business_age_months", "gst_value"], descending=[False, True])
        
    priya_row = young_healthy.row(0, named=True)
    priya = {
        "gstin": priya_row["gstin"], 
        "name": "Priya Manufacturing Co.", 
        "profile_type": priya_row["profile_type"]
    }

    # ── Rahul — Inactive shell company ───────────────────────────────────────
    # Older company (> 12 months) with ZERO or very low transaction volume
    inactive_shell = (
        profiles.filter(
            (pl.col("profile_type").is_in(["PAPER_TRADER", "SHELL_INACTIVE", "GENUINE_STRUGGLING"])) &
            (pl.col("business_age_months") > 12) &
            (pl.col("gstin").is_in(list(in_features))) &
            (pl.col("gstin") != priya["gstin"]) &
            (~pl.col("is_fraud"))
        )
        .sort("upi_count", descending=False)  # Least active first
    )
    if inactive_shell.is_empty():
        inactive_shell = profiles.filter(pl.col("gstin") != priya["gstin"]).sort("upi_count", descending=False)
        
    rahul_row = inactive_shell.row(0, named=True)
    rahul = {
        "gstin": rahul_row["gstin"], 
        "name": "Rahul Inactive Traders", 
        "profile_type": rahul_row["profile_type"]
    }

    # ── Imran — Circular-trading shell company ────────────────────────────────
    # Must be part of a fraud ring
    circular = (
        profiles.filter(
            (pl.col("is_fraud")) &
            (pl.col("gstin").is_in(list(in_features))) &
            (pl.col("gstin") != priya["gstin"]) &
            (pl.col("gstin") != rahul["gstin"])
        )
        .sort("business_age_months", descending=True)
    )
    
    if circular.is_empty():
        # Fallback to any SHELL_CIRCULAR
        circular = profiles.filter(pl.col("profile_type") == "SHELL_CIRCULAR").sort("business_age_months", descending=True)

    imran_row = circular.row(0, named=True)
    ring_id = imran_row["ring_id"] if "ring_id" in imran_row and imran_row["ring_id"] is not None else "ring_unknown"
    
    imran = {
        "gstin": imran_row["gstin"],
        "name": "Imran Circular Enterprises",
        "profile_type": imran_row["profile_type"],
        "ring_id": ring_id,
        "ring_members": []
    }
    
    # Find up to 3 more nodes from the exact same ring ID strictly from those in data/features
    if ring_id != "ring_unknown":
        ring_members_df = (
            profiles.filter(
                (pl.col("ring_id") == ring_id) &
                (pl.col("gstin").is_in(list(in_features))) &
                (pl.col("gstin") != imran["gstin"])
            )
            .sort("business_age_months", descending=True)
        )
        for _, row in enumerate(ring_members_df.iter_rows(named=True)):
            if len(imran["ring_members"]) < 3:
                imran["ring_members"].append({"gstin": row["gstin"], "name": row["business_name"]})

    print(f"Priya => {priya['gstin']} (Young Manufacturer, Age {priya_row['business_age_months']})")
    print(f"Rahul => {rahul['gstin']} (Inactive Shell, Age {rahul_row['business_age_months']}, UPIs {rahul_row['upi_count']})")
    print(f"Imran => {imran['gstin']} (Circular Shell)")

    return priya, rahul, imran


def read_current_gstins() -> tuple[str, str, str]:
    """Read current Priya/Rahul/Imran GSTINs from mock_db.py source."""
    with open(MOCK_DB_PATH, "r") as f:
        src = f.read()
    users = re.findall(r'"id":\s*"(usr_00[123])"[^}]*?"gstin":\s*"([A-Z0-9]{15})"', src, re.DOTALL)
    mapping = {uid: g for uid, g in users}
    return mapping.get("usr_001", ""), mapping.get("usr_002", ""), mapping.get("usr_003", "")


def replace_in_file(path: str, subs: list[tuple[str, str]]) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, OSError):
        return False
    modified = False
    for old, new in subs:
        if old and old in content:
            content = content.replace(old, new)
            modified = True
    if modified:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    return modified


def main():
    # ── 1. Load profiles ──────────────────────────────────────────────────────
    if not os.path.exists(PROFILES_PATH):
        print(f"ERROR: {PROFILES_PATH} not found")
        return
    profiles = pl.read_parquet(PROFILES_PATH)
    in_features = features_gstins()
    print(f"Loaded {len(profiles)} profiles, {len(in_features)} GSTINs with features")

    # ── 2. Pick GSTINs ────────────────────────────────────────────────────────
    priya, rahul, imran = pick_gstins(profiles, in_features)

    print(f"\nSelected GSTINs:")
    print(f"  Priya  (GOOD)   → {priya['gstin']}  \"{priya['name']}\"  [{priya['profile_type']}]")
    print(f"  Rahul  (MEDIUM) → {rahul['gstin']}  \"{rahul['name']}\"  [{rahul['profile_type']}]")
    print(f"  Imran  (FRAUD)  → {imran['gstin']}  \"{imran['name']}\"  [{imran['ring_id']}]")
    print(f"    Ring members: {[m['gstin'] for m in imran['ring_members']]}")

    # ── 3. Write demo_gstins.json ─────────────────────────────────────────────
    cfg = {"priya": priya, "rahul": rahul, "imran": imran}
    
    # Calculate actual cohort medians from features data
    try:
        paths = glob.glob(os.path.join(FEATURES_DIR, "gstin=*", "features.parquet"))
        if paths:
            features = pl.concat([pl.read_parquet(p) for p in paths])
            cfg["cohort_medians"] = {
                "filing_compliance_rate": float(features["filing_compliance_rate"].median() or 0.88),
                "upi_30d_inbound_count": int(features["upi_30d_inbound_count"].median() or 45),
                "fraud_confidence": float(features["fraud_confidence"].quantile(0.95) or 0.01)  # 95th percentile instead of median
            }
        else:
            raise FileNotFoundError("No feature parquets found")
    except Exception as e:
        print(f"Warning: Failed to compute medians ({e}), using fallbacks.")
        cfg["cohort_medians"] = {
            "filing_compliance_rate": 0.88,
            "upi_30d_inbound_count": 45,
            "fraud_confidence": 0.01
        }
        
    with open(DEMO_CFG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)
    print(f"\nWrote {os.path.relpath(DEMO_CFG_PATH, REPO_ROOT)}")

    # ── 4. Build substitution list ────────────────────────────────────────────
    old_priya, old_rahul, old_imran = read_current_gstins()
    print(f"\nCurrent GSTINs in mock_db.py:")
    print(f"  usr_001 (Priya): {old_priya}")
    print(f"  usr_002 (Rahul): {old_rahul}")
    print(f"  usr_003 (Imran): {old_imran}")

    subs = [
        (old_priya,          priya["gstin"]),
        (old_rahul,          rahul["gstin"]),
        (old_imran,          imran["gstin"]),
        (masked(old_priya),  masked(priya["gstin"])),
        (masked(old_rahul),  masked(rahul["gstin"])),
        (masked(old_imran),  masked(imran["gstin"])),
    ]
    subs = [(o, n) for o, n in subs if o and o != n]

    if not subs:
        print("\nAll GSTINs already up to date — nothing to replace in source files.")
        return

    # ── 5. Replace in backend ─────────────────────────────────────────────────
    modified = []
    for path in [MOCK_DB_PATH, os.path.join(REPO_ROOT, "src", "api", "router_analyst.py")]:
        if replace_in_file(path, subs):
            modified.append(path)
            print(f"  [backend]  Updated {os.path.relpath(path, REPO_ROOT)}")

    # ── 6. Replace in frontend ────────────────────────────────────────────────
    for root, dirs, files in os.walk(FRONTEND_DIR):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", ".git")]
        for file in files:
            if not file.endswith((".ts", ".tsx")):
                continue
            path = os.path.join(root, file)
            if replace_in_file(path, subs):
                modified.append(path)
                print(f"  [frontend] Updated {os.path.relpath(path, REPO_ROOT)}")

    # ── 7. Nuke stale persisted DB ────────────────────────────────────────────
    if os.path.exists(DB_JSON_PATH):
        os.remove(DB_JSON_PATH)
        print(f"  [backend]  Deleted data/frontend_db.json (stale GSTINs cleared)")

    print(f"\nDone. {len(modified)} source file(s) updated.")
    print(f"  {old_priya or '(none)'} → {priya['gstin']}  (Priya, GOOD)")
    print(f"  {old_rahul or '(none)'} → {rahul['gstin']}  (Rahul, MEDIUM)")
    print(f"  {old_imran or '(none)'} → {imran['gstin']}  (Imran, FRAUD)")


if __name__ == "__main__":
    main()
