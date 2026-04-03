"""
trainer module for xgboost msme credit scoring model
reads synthetic parquet features builds proxy labels trains saves model
"""

import glob
import json
from pathlib import Path

import numpy as np
import polars as pl
import scipy.sparse as sp
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split


FEATURE_COLUMNS: list[str] = [
    "upi_7d_inbound_count",
    "upi_30d_inbound_count",
    "upi_90d_inbound_count",
    "gst_7d_value",
    "gst_30d_value",
    "gst_90d_value",
    "ewb_7d_value",
    "ewb_30d_value",
    "ewb_90d_value",
    "upi_inbound_outbound_ratio_30d",
    "upi_hhi_30d",
    "upi_p2m_ratio_30d",
    "upi_daily_avg_throughput",
    "upi_top3_concentration",
    "upi_outbound_failure_rate",
    "gst_mean_filing_interval_days",
    "gst_std_filing_interval_days",
    "upi_inbound_std_interval_days",
    "ewb_median_interval_days",
    "gst_filing_delay_trend",
    "gst_revenue_cv_90d",
    "ewb_volume_growth_mom",
    "filing_compliance_rate",
    "upi_dormancy_periods",
    "ewb_distance_per_value_ratio",
    "invoice_to_ewb_lag_hours_median",
    "hsn_entropy_90d",
    "hsn_shift_count_90d",
    "cash_buffer_days",
    "statutory_payment_regularity_score",
    "debit_failure_rate_90d",
    "fraud_ring_flag",
    "fraud_confidence",
    "cycle_velocity",
    "cycle_recurrence",
    "counterparty_compliance_avg",
    "counterparty_fraud_exposure",
    "months_active_gst",
    "data_completeness_score",
    "longest_gap_days",
    "data_maturity_flag",
    "gst_30d_unique_buyers",
    "upi_30d_unique_counterparties",
    "gst_upi_receivables_gap",
    "ewb_smurfing_index",
    "pagerank_score",
]

LABEL_ENCODER: dict = {
    "very_low_risk": {
        "min": 750,
        "max": 900,
        "wc_max_lakh": 50,
        "term_max_lakh": 100,
        "tenure_wc_months": 12,
        "tenure_term_months": 84,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "low_risk": {
        "min": 650,
        "max": 749,
        "wc_max_lakh": 25,
        "term_max_lakh": 50,
        "tenure_wc_months": 12,
        "tenure_term_months": 60,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "medium_risk": {
        "min": 550,
        "max": 649,
        "wc_max_lakh": 10,
        "term_max_lakh": 25,
        "tenure_wc_months": 12,
        "tenure_term_months": 36,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "high_risk": {
        "min": 300,
        "max": 549,
        "wc_max_lakh": 5,
        "term_max_lakh": 0,
        "tenure_wc_months": 12,
        "tenure_term_months": 0,
        "cgtmse_eligible": False,
        "collateral_free": False,
        "mudra_eligible": True,
    },
}


def sanitize_feature_name(name: str) -> str:
    """
    strips xgboost-illegal chars from feature name
    replaces angle brackets square brackets with empty string
    """
    for ch in ("<", ">", "[", "]"):
        name = name.replace(ch, "")
    return name


def generate_proxy_labels(df: pl.DataFrame) -> np.ndarray:
    """
    rule based proxy label generation
    0 means low default risk high score 1 means high default risk low score
    noisy labels by design model learns nonlinear boundaries
    missing columns filled zero fraud fields default false
    """
    _required_float = [
        "cash_buffer_days",
        "debit_failure_rate_90d",
        "statutory_payment_regularity_score",
    ]
    _required_int = [
        "fraud_ring_flag",
    ]
    fill_exprs = []
    for c in _required_float:
        if c not in df.columns:
            fill_exprs.append(pl.lit(0.0).alias(c))
    for c in _required_int:
        if c not in df.columns:
            fill_exprs.append(pl.lit(0).alias(c))
    if fill_exprs:
        df = df.with_columns(fill_exprs)

    n = len(df)
    scores = np.full(n, 0.5, dtype=np.float64)

    fraud_flag = df["fraud_ring_flag"].cast(pl.Int32).to_numpy().astype(np.float64)
    filing_rate = df["filing_compliance_rate"].to_numpy().astype(np.float64)
    gst_30d = df["gst_30d_value"].to_numpy().astype(np.float64)
    upi_ratio = df["upi_inbound_outbound_ratio_30d"].to_numpy().astype(np.float64)
    upi_hhi = df["upi_hhi_30d"].to_numpy().astype(np.float64)
    cash_buf = df["cash_buffer_days"].to_numpy().astype(np.float64)
    data_mat = df["data_maturity_flag"].to_numpy().astype(np.float64)
    months_gst = df["months_active_gst"].to_numpy().astype(np.float64)
    debit_fail = df["debit_failure_rate_90d"].to_numpy().astype(np.float64)
    stat_reg = df["statutory_payment_regularity_score"].to_numpy().astype(np.float64)

    fraud_mask = fraud_flag == 1
    scores = np.where(fraud_mask, np.minimum(scores + 0.45, 0.95), scores)

    compliant_mask = (filing_rate > 0.8) & (gst_30d > 0)
    scores = np.where(compliant_mask, scores - 0.15, scores)

    low_compliance_mask = filing_rate < 0.3
    scores = np.where(low_compliance_mask, scores + 0.20, scores)

    good_ratio_mask = upi_ratio > 1.5
    scores = np.where(good_ratio_mask, scores - 0.10, scores)

    high_hhi_mask = upi_hhi > 0.6
    scores = np.where(high_hhi_mask, scores + 0.15, scores)

    good_buffer_mask = cash_buf > 30
    scores = np.where(good_buffer_mask, scores - 0.10, scores)

    low_buffer_mask = (cash_buf < 5) & (cash_buf > 0)
    scores = np.where(low_buffer_mask, scores + 0.15, scores)

    sparse_data_mask = data_mat < 1.0
    scores = np.where(sparse_data_mask, scores + 0.10, scores)

    mature_gst_mask = months_gst > 18
    scores = np.where(mature_gst_mask, scores - 0.08, scores)

    new_gst_mask = months_gst < 3
    scores = np.where(new_gst_mask, scores + 0.12, scores)

    high_debit_fail_mask = debit_fail > 0.2
    scores = np.where(high_debit_fail_mask, scores + 0.12, scores)

    good_stat_mask = stat_reg > 0.7
    scores = np.where(good_stat_mask, scores - 0.08, scores)

    # Extract the new columns (with defaults if missing)
    receivables_gap = df.get_column("gst_upi_receivables_gap").to_numpy() if "gst_upi_receivables_gap" in df.columns else np.zeros(n)
    smurfing = df.get_column("ewb_smurfing_index").to_numpy() if "ewb_smurfing_index" in df.columns else np.zeros(n)
    pagerank = df.get_column("pagerank_score").to_numpy() if "pagerank_score" in df.columns else np.zeros(n)

    # Penalize massive reconciliation gaps (GST claimed is way higher than UPI received)
    high_gap_mask = receivables_gap > 0.6 
    scores = np.where(high_gap_mask, scores + 0.15, scores)

    # Penalize E-Way Bill smurfing (dodging the 50k limit)
    high_smurfing_mask = smurfing > 0.4
    scores = np.where(high_smurfing_mask, scores + 0.20, scores)

    # Penalize high PageRank mule hubs
    high_pr_mask = pagerank > 0.1
    scores = np.where(high_pr_mask, scores + 0.25, scores)

    noise = np.random.normal(0, 0.05, n)
    scores = scores + noise
    scores = np.clip(scores, 0.05, 0.95)

    return scores.astype(np.float32)


def load_feature_parquets(raw_dir: Path) -> pl.DataFrame:
    """
    scan parquet files from data/features dir merge into single frame
    fills nulls zero for numeric columns only avoids type mismatch on strings
    returns empty frame if no partitions found
    """
    pattern = str(raw_dir / "gstin=*" / "features.parquet")
    matched_files = glob.glob(pattern)
    print(f"feature parquets found {len(matched_files)}")
    if not matched_files:
        print("no feature parquets run src.features.engine first")
        return pl.DataFrame()

    df = pl.scan_parquet(pattern).collect()

    fill_exprs = [
        pl.col(c).fill_null(0)
        for c, dtype in zip(df.columns, df.dtypes)
        if dtype in (
            pl.Float32, pl.Float64,
            pl.Int8, pl.Int16, pl.Int32, pl.Int64,
            pl.UInt8, pl.UInt16, pl.UInt32, pl.UInt64,
        )
    ]
    if fill_exprs:
        df = df.with_columns(fill_exprs)

    return df


def build_feature_matrix(df: pl.DataFrame) -> tuple[np.ndarray, list[str]]:
    """
    extract ordered feature matrix from polars frame
    returns dense array and sanitized column list
    """
    existing_cols = set(df.columns)
    missing_cols = [c for c in FEATURE_COLUMNS if c not in existing_cols]
    exprs = []

    if "fraud_ring_flag" in existing_cols:
        col_dtype = df["fraud_ring_flag"].dtype
        if col_dtype == pl.Boolean:
            exprs.append(pl.col("fraud_ring_flag").cast(pl.Int32))

    for mc in missing_cols:
        exprs.append(pl.lit(0.0).alias(mc))

    if exprs:
        df = df.with_columns(exprs)

    all_cols = [c for c in FEATURE_COLUMNS if c in df.columns]

    matrix = df.select(all_cols).to_numpy().astype(np.float32)
    sanitized_cols = [sanitize_feature_name(c) for c in all_cols]
    return matrix, sanitized_cols


def to_sparse_if_needed(
    X: np.ndarray, threshold: float = 0.5
) -> np.ndarray | sp.csr_matrix:
    """
    convert to scipy sparse csr if sparsity exceeds threshold
    sparsity fraction of zero elements
    """
    sparsity = float(np.sum(X == 0)) / float(X.size)
    if sparsity > threshold:
        return sp.csr_matrix(X)
    return X


def train_model(
    X: np.ndarray | sp.csr_matrix,
    y: np.ndarray,
    feature_names: list[str],
    model_dir: Path,
    output_name: str = "xgb_credit",
) -> xgb.XGBClassifier:
    """
    train xgboost hist method binary classifier
    eval on held out 20pct validation set
    persist model and feature column list to data/models
    """
    indices = np.arange(len(y))
    train_idx, val_idx = train_test_split(indices, test_size=0.2, random_state=42)

    X_train = X[train_idx]
    X_val = X[val_idx]
    y_train = y[train_idx]
    y_val = y[val_idx]

    if sp.issparse(X_train):
        X_train_dense = X_train.toarray()
    else:
        X_train_dense = X_train

    X_train_input = to_sparse_if_needed(X_train_dense)

    if sp.issparse(X_val):
        X_val_dense = X_val.toarray()
    else:
        X_val_dense = X_val

    X_val_input = to_sparse_if_needed(X_val_dense)

    model = xgb.XGBClassifier(
        tree_method="hist",
        max_depth=6,
        learning_rate=0.1,
        n_estimators=300,
        eval_metric=["auc", "logloss"],
        early_stopping_rounds=20,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=1.0,
        random_state=42,
    )

    model.fit(
        X_train_input,
        y_train,
        eval_set=[(X_val_input, y_val)],
        verbose=False,
    )

    val_probs = model.predict_proba(X_val_input)[:, 1]
    val_auc = roc_auc_score(y_val, val_probs)
    print(f"validation auc {val_auc:.4f}")

    model_dir.mkdir(parents=True, exist_ok=True)

    model.save_model(str(model_dir / f"{output_name}.ubj"))

    with open(model_dir / "feature_columns.json", "w") as fh:
        json.dump(feature_names, fh)

    with open(model_dir / "label_encoder.json", "w") as fh:
        json.dump(LABEL_ENCODER, fh, indent=2)

    print("model saved")
    return model


def run_training(
    raw_data_dir: str = "data/features",
    model_dir: str = "data/models",
) -> None:
    """
    full training pipeline entry point
    loads parquets builds labels trains saves
    """
    raw_path = Path(raw_data_dir)
    model_path = Path(model_dir)

    print("loading feature parquets")
    df = load_feature_parquets(raw_path)

    if len(df) == 0:
        print("no data found exiting")
        return

    print(f"loaded {len(df)} rows")

    y_continuous = generate_proxy_labels(df)
    y = (y_continuous > 0.5).astype(np.int32)
    print(f"label distribution positive {y.sum()} negative {(y == 0).sum()}")
    X, feature_names = build_feature_matrix(df)

    print(f"feature matrix shape {X.shape}")
    print("training model a full data")
    train_model(X, y, feature_names, model_path, output_name="xgb_credit")

    print("building upi-heavy feature matrix for model b")
    X_upi = X.copy()
    for i, col in enumerate(feature_names):
        if col.startswith("gst_"):
            X_upi[:, i] = 0.0

    print("training model b upi heavy no gst")
    train_model(X_upi, y, feature_names, model_path, output_name="xgb_credit_upi_heavy")

    print("training complete")


if __name__ == "__main__":
    run_training()
