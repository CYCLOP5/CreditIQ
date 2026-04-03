"""
pydantic v2 schema definitions for raw signal inputs and engineered feature vectors
used by the msme credit scoring feature engine
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class GSTInvoiceRecord(BaseModel):
    """
    raw gst invoice record ingested from gstn portal
    filing_status captures compliance state for delay scoring
    """

    gstin: str
    invoice_id: str
    timestamp: datetime
    taxable_value: float
    gst_amount: float
    buyer_gstin: str
    filing_status: Literal["ontime", "delayed", "missing"]
    filing_delay_days: int


class UPITransactionRecord(BaseModel):
    """
    raw upi transaction record from npci stream
    direction and status critical for cashflow and failure rate features
    """

    gstin: str
    vpa: str
    timestamp: datetime
    amount: float
    direction: Literal["inbound", "outbound"]
    counterparty_vpa: str
    txn_type: Literal["p2p", "p2m"]
    status: Literal["success", "failed_technical", "failed_funds"]


class EWayBillRecord(BaseModel):
    """
    raw e-way bill record sourced from nic eway portal
    captures interstate movement metadata for logistics feature computation
    """

    gstin: str
    eway_id: str
    timestamp: datetime
    from_gstin: str
    to_gstin: str
    from_state_code: int
    to_state_code: int
    actual_from_state_code: int
    actual_to_state_code: int
    supply_type: str
    sub_supply_type: int
    doc_type: str
    doc_no: str
    doc_date: str
    trans_mode: int
    trans_distance: int
    vehicle_type: str
    total_value: float
    cgst_value: float
    sgst_value: float
    igst_value: float
    cess_value: float
    tot_inv_value: float
    main_hsn_code: str
    item_hsn_code: str
    quantity: float
    qty_unit: str
    taxable_amount: float


class EngineeredFeatureVector(BaseModel):
    """
    fully engineered feature vector output from feature engine
    groups velocity cadence ratio sparsity and fraud sub-vectors
    fraud fields default zero and are populated by downstream fraud module
    """

    gstin: str
    computed_at: datetime

    gst_7d_value: float
    gst_30d_value: float
    gst_90d_value: float
    upi_7d_inbound_count: float
    upi_30d_inbound_count: float
    upi_90d_inbound_count: float
    ewb_7d_value: float
    ewb_30d_value: float
    ewb_90d_value: float
    gst_30d_unique_buyers: float
    upi_30d_unique_counterparties: float

    gst_mean_filing_interval_days: float
    gst_std_filing_interval_days: float
    upi_inbound_std_interval_days: float
    ewb_median_interval_days: float
    gst_filing_delay_trend: float

    upi_inbound_outbound_ratio_30d: float
    gst_revenue_cv_90d: float
    ewb_volume_growth_mom: float
    filing_compliance_rate: float
    upi_hhi_30d: float
    ewb_distance_per_value_ratio: float
    invoice_to_ewb_lag_hours_median: float
    upi_p2m_ratio_30d: float
    upi_outbound_failure_rate: float

    months_active_gst: int
    data_completeness_score: float
    longest_gap_days: int
    data_maturity_flag: float

    fraud_ring_flag: bool = False
    fraud_confidence: float = 0.0
    cycle_velocity: float = 0.0
    cycle_recurrence: float = 0.0
    counterparty_compliance_avg: float = 0.0


class FeatureBatch(BaseModel):
    """
    batch wrapper around a list of engineered feature vectors
    used for bulk serialization and api transport
    """

    vectors: list[EngineeredFeatureVector]
