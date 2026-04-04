from fastapi import APIRouter, Depends, HTTPException
import polars as pl
import glob
import os
from pathlib import Path
from src.api.auth import require_role

router_explorer = APIRouter(tags=["explorer"])

REPO_ROOT = Path(__file__).parent.parent.parent.absolute()
RAW_DATA_DIR = REPO_ROOT / "data" / "raw"

@router_explorer.get("/explorer/gstins")
async def get_all_gstins(user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin", "msme"]))):
    """Return all GSTIN profiles."""
    profiles_path = RAW_DATA_DIR / "msme_profiles.parquet"
    if not profiles_path.exists():
        return []
    
    profiles = pl.read_parquet(profiles_path)
    return profiles.select([
        "gstin", "business_name", "profile_type", "state_code", "business_age_months"
    ]).to_dicts()


@router_explorer.get("/explorer/{gstin}/details")
async def get_gstin_details(gstin: str, user: dict = Depends(require_role(["credit_analyst", "risk_manager", "admin", "msme"]))):
    """Return detailed timeline and transaction summaries for a GSTIN."""
    profiles_path = RAW_DATA_DIR / "msme_profiles.parquet"
    if not profiles_path.exists():
        raise HTTPException(status_code=404, detail="Data not generated yet")

    profiles = pl.read_parquet(profiles_path)
    user_profile = profiles.filter(pl.col("gstin") == gstin)
    if user_profile.height == 0:
        raise HTTPException(status_code=404, detail="GSTIN not found")
        
    info = user_profile.row(0, named=True)
    
    # Safely scan chunks
    upi_paths = glob.glob(str(RAW_DATA_DIR / "upi_transactions_chunk_*.parquet"))
    ewb_paths = glob.glob(str(RAW_DATA_DIR / "eway_bills_chunk_*.parquet"))
    
    recent_upi = []
    upi_timeline = []
    
    if upi_paths:
        upi_lf = pl.scan_parquet(upi_paths).filter(pl.col("gstin") == gstin)
        
        # Timeline grouping by day
        timeline_df = upi_lf.with_columns(
            pl.col("timestamp").str.to_datetime().dt.date().alias("date")
        ).group_by("date").agg([
            pl.col("amount").sum().alias("daily_volume"),
            pl.col("amount").count().alias("daily_count")
        ]).sort("date").collect()
        
        # Convert date to string for JSON
        upi_timeline = [
            {
                "date": str(row["date"]),
                "daily_volume": float(row["daily_volume"]),
                "daily_count": int(row["daily_count"]),
            }
            for row in timeline_df.iter_rows(named=True)
        ]
        
        recent_upi = upi_lf.sort("timestamp", descending=True).limit(50).collect().to_dicts()
        # Convert complex objects to primitives
        for r in recent_upi:
            r["timestamp"] = str(r["timestamp"])
            
    recent_ewb = []
    ewb_timeline = []
    
    if ewb_paths:
        ewb_lf = pl.scan_parquet(ewb_paths).filter(pl.col("gstin") == gstin)
        
        # Timeline grouping by day
        timeline_df = ewb_lf.with_columns(
            pl.col("timestamp").str.to_datetime().dt.date().alias("date")
        ).group_by("date").agg([
            pl.col("totalValue").sum().alias("daily_ewb_volume"),
            pl.col("totalValue").count().alias("daily_ewb_count")
        ]).sort("date").collect()
        
        ewb_timeline = [
            {
                "date": str(row["date"]),
                "daily_ewb_volume": float(row["daily_ewb_volume"]),
                "daily_ewb_count": int(row["daily_ewb_count"]),
            }
            for row in timeline_df.iter_rows(named=True)
        ]
        
        recent_ewb = ewb_lf.sort("timestamp", descending=True).limit(50).collect().to_dicts()
        for r in recent_ewb:
            r["timestamp"] = str(r["timestamp"])

    return {
        "info": info,
        "upi_timeline": upi_timeline,
        "ewb_timeline": ewb_timeline,
        "recent_upi": recent_upi,
        "recent_ewb": recent_ewb
    }
