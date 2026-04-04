import re
import os

with open("scripts/inject_real_gstins.py", "r") as f:
    content = f.read()

# Replace pick_gstins
new_pick_gstins = """def pick_gstins(profiles: pl.DataFrame, in_features: set[str]) -> tuple[dict, dict, dict]:
    \"\"\"Return (priya_info, rahul_info, imran_info) dicts specifically matched to the problem statement.\"\"\"

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

    return priya, rahul, imran"""

# Use regex to replace the function definition completely
patched = re.sub(r'def pick_gstins\(profiles: pl\.DataFrame, in_features: set\[str\]\) -> tuple\[dict, dict, dict\]:.*?return priya, rahul, imran', new_pick_gstins, content, flags=re.DOTALL)

with open("scripts/inject_real_gstins.py", "w") as f:
    f.write(patched)
