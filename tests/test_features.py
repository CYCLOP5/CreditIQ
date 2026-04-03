"""
unit tests feature engineering engine
validates velocity cadence ratio sparsity completeness subvectors
"""

from datetime import datetime, timedelta

import polars as pl
import pytest

from src.features.engine import FeatureEngine
from src.features.schemas import EngineeredFeatureVector


def make_gst_df(gstin: str, n: int, base_ts: datetime) -> pl.DataFrame:
    """
    creates synthetic gst invoice dataframe n records
    """
    timestamps = [base_ts + timedelta(days=i) for i in range(n)]
    return pl.DataFrame(
        {
            "gstin": [gstin] * n,
            "invoice_id": [f"INV{i}" for i in range(n)],
            "timestamp": timestamps,
            "taxable_value": [10000.0] * n,
            "gst_amount": [1800.0] * n,
            "buyer_gstin": ["27BUYER0000B1Z5"] * n,
            "filing_status": ["ontime"] * n,
            "filing_delay_days": [0] * n,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))


def make_upi_df(
    gstin: str, n_inbound: int, n_outbound: int, base_ts: datetime
) -> pl.DataFrame:
    """
    creates synthetic upi transaction dataframe
    """
    rows_gstin: list[str] = []
    rows_vpa: list[str] = []
    rows_ts: list[datetime] = []
    rows_amount: list[float] = []
    rows_direction: list[str] = []
    rows_counterparty: list[str] = []
    rows_txn_type: list[str] = []
    rows_status: list[str] = []

    for i in range(n_inbound):
        rows_gstin.append(gstin)
        rows_vpa.append(f"{gstin}@upi")
        rows_ts.append(base_ts + timedelta(hours=i))
        rows_amount.append(5000.0)
        rows_direction.append("inbound")
        rows_counterparty.append(f"customer{i}@upi")
        rows_txn_type.append("p2m")
        rows_status.append("success")

    for i in range(n_outbound):
        rows_gstin.append(gstin)
        rows_vpa.append(f"{gstin}@upi")
        rows_ts.append(base_ts + timedelta(hours=n_inbound + i))
        rows_amount.append(5000.0)
        rows_direction.append("outbound")
        rows_counterparty.append(f"vendor{i}@upi")
        rows_txn_type.append("p2p")
        rows_status.append("success")

    return pl.DataFrame(
        {
            "gstin": rows_gstin,
            "vpa": rows_vpa,
            "timestamp": rows_ts,
            "amount": rows_amount,
            "direction": rows_direction,
            "counterparty_vpa": rows_counterparty,
            "txn_type": rows_txn_type,
            "status": rows_status,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))


def make_ewb_df(gstin: str, n: int, base_ts: datetime) -> pl.DataFrame:
    """
    creates synthetic eway bill dataframe
    """
    doc_date_str = (base_ts - timedelta(days=1)).strftime("%d/%m/%Y")
    timestamps = [base_ts + timedelta(days=i) for i in range(n)]
    return pl.DataFrame(
        {
            "gstin": [gstin] * n,
            "eway_id": [f"EWB{i:010d}" for i in range(n)],
            "timestamp": timestamps,
            "from_gstin": [gstin] * n,
            "to_gstin": ["27BUYER0000B1Z5"] * n,
            "from_state_code": [29] * n,
            "to_state_code": [27] * n,
            "actual_from_state_code": [29] * n,
            "actual_to_state_code": [27] * n,
            "supply_type": ["O"] * n,
            "sub_supply_type": [1] * n,
            "doc_type": ["INV"] * n,
            "doc_no": [f"D{i}" for i in range(n)],
            "doc_date": [doc_date_str] * n,
            "trans_mode": [1] * n,
            "trans_distance": [200] * n,
            "vehicle_type": ["R"] * n,
            "total_value": [50000.0] * n,
            "cgst_value": [0.0] * n,
            "sgst_value": [0.0] * n,
            "igst_value": [9000.0] * n,
            "cess_value": [0.0] * n,
            "tot_inv_value": [50000.0] * n,
            "main_hsn_code": ["72050000"] * n,
            "item_hsn_code": ["72050000"] * n,
            "quantity": [100.0] * n,
            "qty_unit": ["KGS"] * n,
            "taxable_amount": [50000.0] * n,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))


def test_feature_engine_returns_vector_for_known_gstin() -> None:
    """
    engine produces feature vector gstin over 3 months data
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2023, 10, 1)
    gst_df = make_gst_df(gstin, 100, base_ts)
    upi_df = make_upi_df(gstin, 30, 10, base_ts)
    ewb_df = make_ewb_df(gstin, 20, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert isinstance(result, EngineeredFeatureVector)
    assert result.gstin == gstin
    assert result.upi_30d_inbound_count > 0
    assert result.gst_30d_value > 0
    assert result.data_completeness_score == 1.0
    assert result.data_maturity_flag == 1.0


def test_feature_engine_empty_data_returns_zeros() -> None:
    """
    engine returns safe zero vector dataframes empty
    """
    gstin = "27TEST0000T1Z5"

    empty_gst = pl.DataFrame(
        {
            "gstin": pl.Series([], dtype=pl.Utf8),
            "invoice_id": pl.Series([], dtype=pl.Utf8),
            "timestamp": pl.Series([], dtype=pl.Datetime("us")),
            "taxable_value": pl.Series([], dtype=pl.Float64),
            "gst_amount": pl.Series([], dtype=pl.Float64),
            "buyer_gstin": pl.Series([], dtype=pl.Utf8),
            "filing_status": pl.Series([], dtype=pl.Utf8),
            "filing_delay_days": pl.Series([], dtype=pl.Int64),
        }
    )

    empty_upi = pl.DataFrame(
        {
            "gstin": pl.Series([], dtype=pl.Utf8),
            "vpa": pl.Series([], dtype=pl.Utf8),
            "timestamp": pl.Series([], dtype=pl.Datetime("us")),
            "amount": pl.Series([], dtype=pl.Float64),
            "direction": pl.Series([], dtype=pl.Utf8),
            "counterparty_vpa": pl.Series([], dtype=pl.Utf8),
            "txn_type": pl.Series([], dtype=pl.Utf8),
            "status": pl.Series([], dtype=pl.Utf8),
        }
    )

    empty_ewb = pl.DataFrame(
        {
            "gstin": pl.Series([], dtype=pl.Utf8),
            "eway_id": pl.Series([], dtype=pl.Utf8),
            "timestamp": pl.Series([], dtype=pl.Datetime("us")),
            "from_gstin": pl.Series([], dtype=pl.Utf8),
            "to_gstin": pl.Series([], dtype=pl.Utf8),
            "from_state_code": pl.Series([], dtype=pl.Int64),
            "to_state_code": pl.Series([], dtype=pl.Int64),
            "actual_from_state_code": pl.Series([], dtype=pl.Int64),
            "actual_to_state_code": pl.Series([], dtype=pl.Int64),
            "supply_type": pl.Series([], dtype=pl.Utf8),
            "sub_supply_type": pl.Series([], dtype=pl.Int64),
            "doc_type": pl.Series([], dtype=pl.Utf8),
            "doc_no": pl.Series([], dtype=pl.Utf8),
            "doc_date": pl.Series([], dtype=pl.Utf8),
            "trans_mode": pl.Series([], dtype=pl.Int64),
            "trans_distance": pl.Series([], dtype=pl.Int64),
            "vehicle_type": pl.Series([], dtype=pl.Utf8),
            "total_value": pl.Series([], dtype=pl.Float64),
            "cgst_value": pl.Series([], dtype=pl.Float64),
            "sgst_value": pl.Series([], dtype=pl.Float64),
            "igst_value": pl.Series([], dtype=pl.Float64),
            "cess_value": pl.Series([], dtype=pl.Float64),
            "tot_inv_value": pl.Series([], dtype=pl.Float64),
            "main_hsn_code": pl.Series([], dtype=pl.Utf8),
            "item_hsn_code": pl.Series([], dtype=pl.Utf8),
            "quantity": pl.Series([], dtype=pl.Float64),
            "qty_unit": pl.Series([], dtype=pl.Utf8),
            "taxable_amount": pl.Series([], dtype=pl.Float64),
        }
    )

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_empty")
    result = engine.compute_features(gstin, empty_gst, empty_upi, empty_ewb)

    assert result.gst_30d_value == 0.0
    assert result.upi_30d_inbound_count == 0.0
    assert result.fraud_ring_flag == False
    assert result.data_completeness_score == 0.0


def test_upi_hhi_high_concentration() -> None:
    """
    hhi high inbound transactions counterparty
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 1)
    n = 20

    upi_df = pl.DataFrame(
        {
            "gstin": [gstin] * n,
            "vpa": [f"{gstin}@upi"] * n,
            "timestamp": [base_ts + timedelta(hours=i) for i in range(n)],
            "amount": [5000.0] * n,
            "direction": ["inbound"] * n,
            "counterparty_vpa": ["singlevendor@upi"] * n,
            "txn_type": ["p2m"] * n,
            "status": ["success"] * n,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    gst_df = make_gst_df(gstin, 10, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_hhi_high")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.upi_hhi_30d >= 0.9


def test_upi_hhi_low_concentration() -> None:
    """
    hhi low inbound transactions 20 different counterparties
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 1)

    upi_df = make_upi_df(gstin, 20, 0, base_ts)
    gst_df = make_gst_df(gstin, 10, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_hhi_low")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.upi_hhi_30d < 0.2


def test_filing_compliance_rate_all_ontime() -> None:
    """
    compliance rate equals 10 filings ontime
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 1)
    gst_df = make_gst_df(gstin, 20, base_ts)
    upi_df = make_upi_df(gstin, 10, 5, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_compliance_ontime")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.filing_compliance_rate == 1.0


def test_filing_compliance_rate_all_late() -> None:
    """
    compliance rate low filings delayed
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 1)
    n = 20

    gst_df = pl.DataFrame(
        {
            "gstin": [gstin] * n,
            "invoice_id": [f"INV{i}" for i in range(n)],
            "timestamp": [base_ts + timedelta(days=i) for i in range(n)],
            "taxable_value": [10000.0] * n,
            "gst_amount": [1800.0] * n,
            "buyer_gstin": ["27BUYER0000B1Z5"] * n,
            "filing_status": ["delayed"] * n,
            "filing_delay_days": [5] * n,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    upi_df = make_upi_df(gstin, 10, 5, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_compliance_late")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.filing_compliance_rate == 0.0


def test_upi_outbound_failure_rate() -> None:
    """
    failure rate computed outbound failed transactions
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 1)
    n_success = 5
    n_failed = 5

    success_rows = pl.DataFrame(
        {
            "gstin": [gstin] * n_success,
            "vpa": [f"{gstin}@upi"] * n_success,
            "timestamp": [base_ts + timedelta(hours=i) for i in range(n_success)],
            "amount": [5000.0] * n_success,
            "direction": ["outbound"] * n_success,
            "counterparty_vpa": [f"vendor{i}@upi" for i in range(n_success)],
            "txn_type": ["p2p"] * n_success,
            "status": ["success"] * n_success,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    failed_rows = pl.DataFrame(
        {
            "gstin": [gstin] * n_failed,
            "vpa": [f"{gstin}@upi"] * n_failed,
            "timestamp": [
                base_ts + timedelta(hours=n_success + i) for i in range(n_failed)
            ],
            "amount": [5000.0] * n_failed,
            "direction": ["outbound"] * n_failed,
            "counterparty_vpa": [f"vendor{n_success + i}@upi" for i in range(n_failed)],
            "txn_type": ["p2p"] * n_failed,
            "status": ["failed_funds"] * n_failed,
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    upi_df = pl.concat([success_rows, failed_rows])
    gst_df = make_gst_df(gstin, 10, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_failure_rate")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.upi_outbound_failure_rate == pytest.approx(0.5, abs=0.01)


def test_data_maturity_flag_below_threshold() -> None:
    """
    maturity flag zero 3 months history
    """
    gstin = "27TEST0000T1Z5"
    base_ts = datetime(2024, 1, 15)
    gst_df = make_gst_df(gstin, 40, base_ts)
    upi_df = make_upi_df(gstin, 10, 5, base_ts)
    ewb_df = make_ewb_df(gstin, 5, base_ts)

    engine = FeatureEngine(cache_dir="/tmp/test_feature_cache_maturity_low")
    result = engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    assert result.data_maturity_flag == 0.0
