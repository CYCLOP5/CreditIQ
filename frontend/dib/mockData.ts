// ============================================================
// Central Mock Store — all mock data for MSME Credit Platform
// ============================================================

// ---- USERS ----
export const MOCK_USERS = [
  // { id: "usr_001", name: "Priya Sharma",   email: "priya@bakerycraft.in",      role: "msme",           gstin: "19HLPRM4249Z3Z1", status: "active",    created_at: "2024-08-15T10:00:00+05:30" },
  // { id: "usr_002", name: "Rahul Desai",    email: "rahul@boltautomotive.in",   role: "msme",           gstin: "09EXVAF9205D6Z0", status: "active",    created_at: "2024-06-01T09:00:00+05:30" },
  { id: "usr_003", name: "Imran Shaikh",   email: "imran@textilezone.in",      role: "msme",           gstin: "33QEFVT7885F2Z4", status: "active",    created_at: "2024-03-20T08:00:00+05:30" },
  { id: "usr_004", name: "Anjali Mehta",   email: "anjali@sbiloans.co.in",     role: "loan_officer",   bank_id: "bank_001",       status: "active",    created_at: "2024-01-10T09:00:00+05:30" },
  { id: "usr_005", name: "Vikram Nair",    email: "vikram@analyst.platform.in",role: "credit_analyst",                            status: "active",    created_at: "2024-02-05T09:00:00+05:30" },
  { id: "usr_006", name: "Deepa Krishnan", email: "deepa@risk.platform.in",    role: "risk_manager",                              status: "active",    created_at: "2024-01-01T09:00:00+05:30" },
  { id: "usr_007", name: "Arjun Kapoor",   email: "arjun@admin.platform.in",   role: "admin",                                     status: "active",    created_at: "2023-12-01T09:00:00+05:30" },
];

// ---- BANKS ----
export const MOCK_BANKS = [
  { id: "bank_001", name: "State Bank of India", registration_number: "RBI-SCB-0001", status: "active",    officer_count: 3, api_key_count: 2, created_at: "2024-01-10T00:00:00+05:30" },
  { id: "bank_002", name: "Canara Bank",          registration_number: "RBI-SCB-0045", status: "active",    officer_count: 1, api_key_count: 1, created_at: "2024-03-01T00:00:00+05:30" },
  { id: "bank_003", name: "HDFC Bank",            registration_number: "RBI-PVT-0201", status: "active",    officer_count: 2, api_key_count: 1, created_at: "2024-05-15T00:00:00+05:30" },
  { id: "bank_004", name: "Axis Bank",            registration_number: "RBI-PVT-0312", status: "suspended", officer_count: 0, api_key_count: 0, created_at: "2024-07-01T00:00:00+05:30" },
];

// ---- SCORES ----
export const MOCK_SCORES: Record<string, any> = {
  task_abc001: {
    task_id: "task_abc001", gstin: "19HLPRM4249Z3Z1", status: "complete",
    credit_score: 731, risk_band: "low_risk",
    top_reasons: [
      "Strong 30-day UPI inflow velocity indicates healthy cash receipts",
      "GST filing compliance rate is consistently high across last 6 periods",
      "E-way bill volume shows steady month-over-month growth of 12%",
      "UPI inbound-to-outbound ratio suggests net positive cash position",
      "No circular transaction patterns detected in counterparty network",
    ],
    recommended_wc_amount: 2500000, recommended_term_amount: 5000000,
    msme_category: "small", cgtmse_eligible: true, mudra_eligible: false,
    fraud_flag: false, fraud_details: null,
    shap_waterfall: [
      { feature: "upi_30d_inbound_count",      value: 0.142, direction: "decreases_risk" },
      { feature: "filing_compliance_rate",      value: 0.098, direction: "decreases_risk" },
      { feature: "eway_bill_mom_growth",        value: 0.087, direction: "decreases_risk" },
      { feature: "upi_inbound_outbound_ratio",  value: 0.074, direction: "decreases_risk" },
      { feature: "gst_revenue_cv_90d",          value: 0.063, direction: "increases_risk"  },
      { feature: "fraud_ring_flag",             value: 0.001, direction: "decreases_risk" },
      { feature: "longest_gap_days",            value: 0.041, direction: "increases_risk"  },
      { feature: "counterparty_count_30d",      value: 0.038, direction: "decreases_risk" },
      { feature: "avg_invoice_value_90d",       value: 0.031, direction: "decreases_risk" },
      { feature: "gst_late_filing_streak",      value: 0.028, direction: "increases_risk"  },
    ],
    score_freshness: "2026-04-03T09:15:00+05:30", data_maturity_months: 14, error: null,
  },
  task_abc002: {
    task_id: "task_abc002", gstin: "09EXVAF9205D6Z0", status: "complete",
    credit_score: 594, risk_band: "medium_risk",
    top_reasons: [
      "High coefficient of variation in GST revenue suggests irregular income",
      "Two late GST filings in the last 3 periods indicate compliance risk",
      "UPI inbound-to-outbound ratio is below healthy threshold",
      "E-way bill volume has declined 8% month-over-month for 2 consecutive months",
      "Counterparty concentration risk: top 2 buyers account for 78% of inflows",
    ],
    recommended_wc_amount: 1000000, recommended_term_amount: 0,
    msme_category: "micro", cgtmse_eligible: false, mudra_eligible: false,
    fraud_flag: false, fraud_details: null,
    shap_waterfall: [
      { feature: "gst_revenue_cv_90d",         value: 0.183, direction: "increases_risk"  },
      { feature: "gst_late_filing_streak",      value: 0.141, direction: "increases_risk"  },
      { feature: "upi_inbound_outbound_ratio",  value: 0.112, direction: "increases_risk"  },
      { feature: "eway_bill_mom_growth",        value: 0.098, direction: "increases_risk"  },
      { feature: "counterparty_concentration",  value: 0.089, direction: "increases_risk"  },
      { feature: "upi_30d_inbound_count",       value: 0.054, direction: "decreases_risk" },
      { feature: "filing_compliance_rate",      value: 0.047, direction: "decreases_risk" },
      { feature: "fraud_ring_flag",             value: 0.001, direction: "decreases_risk" },
      { feature: "avg_invoice_value_90d",       value: 0.033, direction: "increases_risk"  },
      { feature: "longest_gap_days",            value: 0.028, direction: "increases_risk"  },
    ],
    score_freshness: "2026-04-02T14:30:00+05:30", data_maturity_months: 6, error: null,
  },
  task_abc003: {
    task_id: "task_abc003", gstin: "33QEFVT7885F2Z4", status: "complete",
    credit_score: 381, risk_band: "high_risk",
    top_reasons: [
      "GSTIN is detected as part of a circular UPI fund rotation ring",
      "Inbound and outbound UPI transactions mirror each other with high regularity",
      "GST filing compliance has deteriorated sharply in last 2 periods",
      "E-way bill activity has ceased entirely for 45 days",
      "Counterparty network shows all three flagged entities transacting exclusively with each other",
    ],
    recommended_wc_amount: 0, recommended_term_amount: 0,
    msme_category: "micro", cgtmse_eligible: false, mudra_eligible: false,
    fraud_flag: true,
    fraud_details: { cycle_members: ["33QEFVT7885F2Z4", "29BCGFH1234S1ZP", "29XYZAB5678T1ZQ"], confidence: 0.91 },
    shap_waterfall: [
      { feature: "fraud_ring_flag",             value: 0.312, direction: "increases_risk" },
      { feature: "upi_circular_pattern_score",  value: 0.274, direction: "increases_risk" },
      { feature: "gst_late_filing_streak",      value: 0.198, direction: "increases_risk" },
      { feature: "eway_bill_activity_days",     value: 0.145, direction: "increases_risk" },
      { feature: "counterparty_concentration",  value: 0.133, direction: "increases_risk" },
      { feature: "upi_30d_inbound_count",       value: 0.041, direction: "decreases_risk" },
      { feature: "filing_compliance_rate",      value: 0.038, direction: "increases_risk" },
      { feature: "avg_invoice_value_90d",       value: 0.021, direction: "increases_risk" },
    ],
    score_freshness: "2026-04-01T11:00:00+05:30", data_maturity_months: 9, error: null,
  },
};

// gstin → task_id mapping
export const GSTIN_TASK_MAP: Record<string, string> = {
  "19HLPRM4249Z3Z1": "task_abc001",
  "09EXVAF9205D6Z0": "task_abc002",
  "33QEFVT7885F2Z4": "task_abc003",
};

// ---- SCORE HISTORY ----
export const MOCK_SCORE_HISTORY: Record<string, any[]> = {
  "09EXVAF9205D6Z0": [
    { task_id: "hist_001", credit_score: 641, risk_band: "low_risk",    score_freshness: "2025-10-01T10:00:00+05:30", key_features: { filing_compliance_rate: 0.92, gst_revenue_cv_90d: 0.18, upi_30d_inbound_count: 142, eway_bill_mom_growth: 0.05,  longest_gap_days: 8  } },
    { task_id: "hist_002", credit_score: 628, risk_band: "low_risk",    score_freshness: "2025-11-01T10:00:00+05:30", key_features: { filing_compliance_rate: 0.88, gst_revenue_cv_90d: 0.24, upi_30d_inbound_count: 130, eway_bill_mom_growth: -0.02, longest_gap_days: 12 } },
    { task_id: "hist_003", credit_score: 611, risk_band: "medium_risk", score_freshness: "2025-12-01T10:00:00+05:30", key_features: { filing_compliance_rate: 0.83, gst_revenue_cv_90d: 0.29, upi_30d_inbound_count: 118, eway_bill_mom_growth: -0.06, longest_gap_days: 15 } },
    { task_id: "hist_004", credit_score: 598, risk_band: "medium_risk", score_freshness: "2026-01-01T10:00:00+05:30", key_features: { filing_compliance_rate: 0.80, gst_revenue_cv_90d: 0.31, upi_30d_inbound_count: 110, eway_bill_mom_growth: -0.08, longest_gap_days: 18 } },
    { task_id: "hist_005", credit_score: 594, risk_band: "medium_risk", score_freshness: "2026-04-02T14:30:00+05:30", key_features: { filing_compliance_rate: 0.78, gst_revenue_cv_90d: 0.34, upi_30d_inbound_count: 104, eway_bill_mom_growth: -0.08, longest_gap_days: 21 } },
  ],
};

// ---- LOAN REQUESTS ----
export const MOCK_LOAN_REQUESTS = [
  { id: "lr_001", gstin: "19HLPRM4249Z3Z1", gstin_masked: "19****49Z3Z1", bank_id: "bank_001", bank_name: "State Bank of India", loan_type: "working_capital", amount_requested: 2000000, purpose: "Purchase raw materials for festive season inventory",   status: "data_shared",          denial_reason: null, amount_offered: null,    created_at: "2026-03-28T10:00:00+05:30", updated_at: "2026-03-30T14:00:00+05:30" },
  { id: "lr_002", gstin: "09EXVAF9205D6Z0", gstin_masked: "09****05D6Z0", bank_id: "bank_002", bank_name: "Canara Bank",          loan_type: "working_capital", amount_requested: 800000,  purpose: "Working capital for auto parts procurement",              status: "permission_requested",  denial_reason: null, amount_offered: null,    created_at: "2026-04-01T09:00:00+05:30", updated_at: "2026-04-01T15:30:00+05:30" },
  { id: "lr_003", gstin: "19HLPRM4249Z3Z1", gstin_masked: "19****49Z3Z1", bank_id: "bank_003", bank_name: "HDFC Bank",           loan_type: "term_loan",        amount_requested: 4000000, purpose: "Equipment upgrade for production line",                    status: "submitted",             denial_reason: null, amount_offered: null,    created_at: "2026-04-02T11:00:00+05:30", updated_at: "2026-04-02T11:00:00+05:30" },
  { id: "lr_004", gstin: "09EXVAF9205D6Z0", gstin_masked: "09****05D6Z0", bank_id: "bank_001", bank_name: "State Bank of India", loan_type: "term_loan",        amount_requested: 1500000, purpose: "Office renovation",                                       status: "denied",                denial_reason: "Credit score does not meet minimum threshold for term loans. High revenue volatility and two recent late GST filings noted.", amount_offered: null, created_at: "2026-02-15T09:00:00+05:30", updated_at: "2026-02-28T16:00:00+05:30" },
  { id: "lr_005", gstin: "19HLPRM4249Z3Z1", gstin_masked: "19****49Z3Z1", bank_id: "bank_001", bank_name: "State Bank of India", loan_type: "working_capital", amount_requested: 1500000, purpose: "Seasonal stock purchase",                                  status: "approved",              denial_reason: null, amount_offered: 1500000, created_at: "2025-10-10T09:00:00+05:30", updated_at: "2025-10-18T12:00:00+05:30" },
];

// ---- PERMISSIONS ----
export const MOCK_PERMISSIONS = [
  { id: "perm_001", loan_request_id: "lr_001", gstin: "19HLPRM4249Z3Z1", bank_id: "bank_001", bank_name: "State Bank of India", status: "granted", requested_at: "2026-03-29T09:00:00+05:30", responded_at: "2026-03-30T14:00:00+05:30", expires_at: "2026-04-29T14:00:00+05:30" },
  { id: "perm_002", loan_request_id: "lr_002", gstin: "09EXVAF9205D6Z0", bank_id: "bank_002", bank_name: "Canara Bank",          status: "pending", requested_at: "2026-04-01T15:30:00+05:30", responded_at: null,                        expires_at: "2026-04-08T15:30:00+05:30" },
  { id: "perm_003", loan_request_id: "lr_004", gstin: "09EXVAF9205D6Z0", bank_id: "bank_001", bank_name: "State Bank of India", status: "granted", requested_at: "2026-02-16T10:00:00+05:30", responded_at: "2026-02-17T11:00:00+05:30", expires_at: "2026-03-17T11:00:00+05:30" },
];

// ---- DISPUTES ----
export const MOCK_DISPUTES = [
  { id: "disp_001", gstin: "33QEFVT7885F2Z4", msme_name: "TextileZone",       description: "Our GSTIN has been flagged as part of a fraud ring. The two other entities listed are suppliers we transact with regularly for fabric procurement. These are legitimate B2B transactions. We have GST invoices for all transfers.", status: "under_review", analyst_id: "usr_005", analyst_name: "Vikram Nair", resolution_note: null, created_at: "2026-04-02T08:00:00+05:30", updated_at: "2026-04-02T11:00:00+05:30" },
  { id: "disp_002", gstin: "19AACFC5432Q1ZY", msme_name: "CraftPaper Exports", description: "Flagged incorrectly. All UPI transfers are advance payments to raw material vendors, not circular fund rotation.", status: "resolved", analyst_id: "usr_005", analyst_name: "Vikram Nair", resolution_note: "Transaction graph reviewed. Edge pattern is consistent with vendor payment cycle, not circular rotation. Confidence score revised. GSTIN unflagged and re-scored.", created_at: "2026-02-10T10:00:00+05:30", updated_at: "2026-02-14T16:00:00+05:30" },
];

// ---- TRANSACTION GRAPH (per-GSTIN) ----
export const MOCK_GRAPH_TEXTILEZONE = {
  nodes: [
    { id: "33QEFVT7885F2Z4", label: "TextileZone",   flagged: true,  total_volume_inr: 4200000 },
    { id: "29BCGFH1234S1ZP", label: "FabricWorld",   flagged: true,  total_volume_inr: 3800000 },
    { id: "29XYZAB5678T1ZQ", label: "ThreadMasters", flagged: true,  total_volume_inr: 3600000 },
    { id: "29AAACL9900M1ZT", label: "Loomex Pvt Ltd",flagged: false, total_volume_inr: 520000  },
  ],
  edges: [
    { source: "33QEFVT7885F2Z4", target: "29BCGFH1234S1ZP", tx_count: 24, total_amount_inr: 1800000 },
    { source: "29BCGFH1234S1ZP", target: "29XYZAB5678T1ZQ", tx_count: 22, total_amount_inr: 1650000 },
    { source: "29XYZAB5678T1ZQ", target: "33QEFVT7885F2Z4", tx_count: 23, total_amount_inr: 1740000 },
    { source: "33QEFVT7885F2Z4", target: "29AAACL9900M1ZT", tx_count: 4,  total_amount_inr: 160000  },
  ],
};

// ---- GLOBAL TRANSACTION GRAPH ----
export const MOCK_GLOBAL_GRAPH = {
  nodes: [
    { id: "33QEFVT7885F2Z4", label: "TextileZone",    flagged: true,  total_volume_inr: 4200000 },
    { id: "29BCGFH1234S1ZP", label: "FabricWorld",    flagged: true,  total_volume_inr: 3800000 },
    { id: "29XYZAB5678T1ZQ", label: "ThreadMasters",  flagged: true,  total_volume_inr: 3600000 },
    { id: "29AAACL9900M1ZT", label: "Loomex Pvt Ltd", flagged: false, total_volume_inr: 520000  },
    { id: "19HLPRM4249Z3Z1", label: "BakeryCraft",    flagged: false, total_volume_inr: 8100000 },
    { id: "09EXVAF9205D6Z0", label: "BoltAutomotive", flagged: false, total_volume_inr: 2300000 },
    { id: "07AABCP4321F1ZR", label: "PaperTrade Co",  flagged: true,  total_volume_inr: 950000  },
    { id: "07BCEFG8765H1ZS", label: "DocuPrint Hub",  flagged: true,  total_volume_inr: 890000  },
    { id: "07XYZHI2345J1ZU", label: "PrintZone Delhi",flagged: true,  total_volume_inr: 870000  },
  ],
  edges: [
    { source: "33QEFVT7885F2Z4", target: "29BCGFH1234S1ZP", tx_count: 24, total_amount_inr: 1800000 },
    { source: "29BCGFH1234S1ZP", target: "29XYZAB5678T1ZQ", tx_count: 22, total_amount_inr: 1650000 },
    { source: "29XYZAB5678T1ZQ", target: "33QEFVT7885F2Z4", tx_count: 23, total_amount_inr: 1740000 },
    { source: "33QEFVT7885F2Z4", target: "29AAACL9900M1ZT", tx_count: 4,  total_amount_inr: 160000  },
    { source: "07AABCP4321F1ZR", target: "07BCEFG8765H1ZS", tx_count: 18, total_amount_inr: 720000  },
    { source: "07BCEFG8765H1ZS", target: "07XYZHI2345J1ZU", tx_count: 17, total_amount_inr: 680000  },
    { source: "07XYZHI2345J1ZU", target: "07AABCP4321F1ZR", tx_count: 16, total_amount_inr: 640000  },
    { source: "19HLPRM4249Z3Z1", target: "29AAACL9900M1ZT", tx_count: 6,  total_amount_inr: 240000  },
    { source: "09EXVAF9205D6Z0", target: "19HLPRM4249Z3Z1", tx_count: 2,  total_amount_inr: 85000   },
  ],
};

// ---- REMINDERS ----
export const MOCK_REMINDERS: Record<string, any[]> = {
  "19HLPRM4249Z3Z1": [
    { id: "rem_001", type: "gst_filing",         title: "GSTR-3B — March 2026",               due_date: "2026-04-20", amount: null,  description: "Monthly GST return for March 2026. Covers output tax liability and ITC.", status: "upcoming"  },
    { id: "rem_002", type: "gst_filing",         title: "GSTR-1 — March 2026",                due_date: "2026-04-11", amount: null,  description: "Outward supply return for March 2026.",                                    status: "due"       },
    { id: "rem_003", type: "gst_filing",         title: "GSTR-9 — Annual Return FY 2024-25",  due_date: "2025-12-31", amount: null,  description: "Annual GST reconciliation return for FY 2024-25.",                        status: "completed" },
    { id: "rem_004", type: "installment_payment",title: "SBI Working Capital EMI — April 2026",due_date: "2026-04-05", amount: 68500, description: "Monthly EMI for Working Capital loan sanctioned Oct 2025. Loan ID: LC/WC/2025/4421.", status: "due"  },
    { id: "rem_005", type: "installment_payment",title: "SBI Working Capital EMI — May 2026",  due_date: "2026-05-05", amount: 68500, description: "Monthly EMI for Working Capital loan sanctioned Oct 2025.", status: "upcoming" },
  ],
  "09EXVAF9205D6Z0": [
    { id: "rem_006", type: "gst_filing", title: "GSTR-3B — March 2026",     due_date: "2026-04-20", amount: null, description: "Monthly GST return for March 2026.",        status: "upcoming" },
    { id: "rem_007", type: "gst_filing", title: "GSTR-1 — February 2026",   due_date: "2026-03-11", amount: null, description: "Outward supply return for February 2026.", status: "overdue"  },
    { id: "rem_008", type: "gst_filing", title: "GSTR-3B — February 2026",  due_date: "2026-03-20", amount: null, description: "Monthly GST return for February 2026.",    status: "overdue"  },
  ],
};

// ---- NOTIFICATIONS ----
export const MOCK_NOTIFICATIONS: Record<string, any[]> = {
  usr_001: [
    { id: "notif_001", type: "score_ready",       title: "Your credit score is ready",           body: "Score: 731 — Low Risk. View your full report.",                                            read: false, created_at: "2026-04-03T09:15:00+05:30", action_url: "/msme/score-report" },
    { id: "notif_002", type: "permission_request",title: "State Bank of India requested your data",body: "SBI has requested access to your credit data for loan request #lr_001.",                 read: true,  created_at: "2026-03-29T09:05:00+05:30", action_url: "/msme/loans"        },
    { id: "notif_003", type: "reminder",          title: "GSTR-1 due in 8 days",                body: "GSTR-1 for March 2026 is due on 11 April 2026.",                                          read: false, created_at: "2026-04-03T08:00:00+05:30", action_url: "/msme/reminders"    },
  ],
  usr_002: [
    { id: "notif_004", type: "permission_request",title: "Canara Bank requested your data",       body: "Canara Bank has requested access to your credit data for loan #lr_002. Approve or deny.", read: false, created_at: "2026-04-01T15:35:00+05:30", action_url: "/msme/loans"        },
    { id: "notif_005", type: "loan_decision",     title: "SBI has denied your loan request",      body: "Your term loan request of ₹15,00,000 was denied. Reason: Credit score below threshold.", read: true,  created_at: "2026-02-28T16:05:00+05:30", action_url: "/msme/loans"        },
    { id: "notif_006", type: "reminder",          title: "GSTR-1 overdue — February 2026",        body: "Your GSTR-1 for February 2026 was due on 11 March. Please file immediately.",             read: false, created_at: "2026-03-12T08:00:00+05:30", action_url: "/msme/reminders"    },
  ],
  usr_003: [
    { id: "notif_007", type: "score_ready",       title: "Fraud alert on your account",          body: "Your GSTIN has been flagged. Credit score: 381 — High Risk. You can raise a dispute.",   read: false, created_at: "2026-04-01T11:05:00+05:30", action_url: "/msme/disputes"     },
    { id: "notif_008", type: "dispute_update",    title: "Dispute assigned to analyst",           body: "Your dispute has been assigned to Vikram Nair for review.",                               read: false, created_at: "2026-04-02T11:05:00+05:30", action_url: "/msme/disputes"     },
  ],
  usr_004: [
    { id: "notif_009", type: "loan_request",      title: "New loan request from an MSME",         body: "A new working capital request of ₹20,00,000 has been submitted.",                        read: false, created_at: "2026-03-28T10:05:00+05:30", action_url: "/bank/loan-queue"   },
    { id: "notif_010", type: "permission_granted",title: "Data access approved",                  body: "The MSME owner has approved your data access request for loan #lr_001.",                  read: false, created_at: "2026-03-30T14:05:00+05:30", action_url: "/bank/msme/lr_001"  },
  ],
  usr_005: [
    { id: "notif_011", type: "dispute_update",    title: "New dispute in queue",                  body: "GSTIN 33QEFVT7885F2Z4 has raised a fraud flag dispute.",                                 read: false, created_at: "2026-04-02T08:05:00+05:30", action_url: "/analyst/dispute-queue" },
  ],
  usr_006: [],
  usr_007: [],
};

// ---- FRAUD ALERTS ----
export const MOCK_FRAUD_ALERTS = [
  { gstin: "33QEFVT7885F2Z4", msme_name: "TextileZone",   fraud_details: { cycle_members: ["33QEFVT7885F2Z4","29BCGFH1234S1ZP","29XYZAB5678T1ZQ"], confidence: 0.91 }, flagged_at: "2026-04-01T11:00:00+05:30", dispute_count: 1, dispute_status: "under_review" },
  { gstin: "07AABCP4321F1ZR", msme_name: "PaperTrade Co", fraud_details: { cycle_members: ["07AABCP4321F1ZR","07BCEFG8765H1ZS","07XYZHI2345J1ZU"], confidence: 0.74 }, flagged_at: "2026-03-15T14:00:00+05:30", dispute_count: 0, dispute_status: null           },
];

// ---- RISK THRESHOLDS ----
export const MOCK_RISK_THRESHOLDS = {
  bands: [
    { band: "very_low_risk", min_score: 750, max_score: 900 },
    { band: "low_risk",      min_score: 650, max_score: 749 },
    { band: "medium_risk",   min_score: 550, max_score: 649 },
    { band: "high_risk",     min_score: 300, max_score: 549 },
  ],
  recommendation_rules: [
    { msme_category: "micro",  risk_band: "very_low_risk", max_wc_amount: 1000000,  max_term_amount: 2000000  },
    { msme_category: "micro",  risk_band: "low_risk",      max_wc_amount: 750000,   max_term_amount: 0        },
    { msme_category: "micro",  risk_band: "medium_risk",   max_wc_amount: 300000,   max_term_amount: 0        },
    { msme_category: "micro",  risk_band: "high_risk",     max_wc_amount: 0,        max_term_amount: 0        },
    { msme_category: "small",  risk_band: "very_low_risk", max_wc_amount: 5000000,  max_term_amount: 10000000 },
    { msme_category: "small",  risk_band: "low_risk",      max_wc_amount: 2500000,  max_term_amount: 5000000  },
    { msme_category: "small",  risk_band: "medium_risk",   max_wc_amount: 1000000,  max_term_amount: 0        },
    { msme_category: "small",  risk_band: "high_risk",     max_wc_amount: 0,        max_term_amount: 0        },
    { msme_category: "medium", risk_band: "very_low_risk", max_wc_amount: 20000000, max_term_amount: 50000000 },
    { msme_category: "medium", risk_band: "low_risk",      max_wc_amount: 10000000, max_term_amount: 20000000 },
    { msme_category: "medium", risk_band: "medium_risk",   max_wc_amount: 5000000,  max_term_amount: 0        },
    { msme_category: "medium", risk_band: "high_risk",     max_wc_amount: 0,        max_term_amount: 0        },
  ],
  system_config: { fraud_confidence_threshold: 0.7, data_maturity_min_months: 3 },
};

// ---- API KEYS ----
export const MOCK_API_KEYS = [
  { id: "key_001", bank_id: "bank_001", bank_name: "State Bank of India", key_prefix: "sk_sbi_...J4X9", status: "active",  quota_per_day: 500, usage_today: 47, created_at: "2024-02-01T00:00:00+05:30", last_used_at: "2026-04-03T08:52:00+05:30", revoked_at: null },
  { id: "key_002", bank_id: "bank_001", bank_name: "State Bank of India", key_prefix: "sk_sbi_...K7M2", status: "active",  quota_per_day: 200, usage_today: 12, created_at: "2025-06-15T00:00:00+05:30", last_used_at: "2026-04-02T17:30:00+05:30", revoked_at: null },
  { id: "key_003", bank_id: "bank_002", bank_name: "Canara Bank",          key_prefix: "sk_cnr_...P3Q8", status: "active",  quota_per_day: 300, usage_today: 8,  created_at: "2024-04-01T00:00:00+05:30", last_used_at: "2026-04-03T07:10:00+05:30", revoked_at: null },
  { id: "key_004", bank_id: "bank_003", bank_name: "HDFC Bank",            key_prefix: "sk_hdf_...R1Z5", status: "revoked", quota_per_day: 100, usage_today: 0,  created_at: "2024-08-01T00:00:00+05:30", last_used_at: "2025-12-10T14:20:00+05:30", revoked_at: "2026-01-05T09:00:00+05:30" },
];

export const MOCK_KEY_001_USAGE = [
  { date: "2026-03-28", request_count: 41 },
  { date: "2026-03-29", request_count: 38 },
  { date: "2026-03-30", request_count: 52 },
  { date: "2026-03-31", request_count: 45 },
  { date: "2026-04-01", request_count: 50 },
  { date: "2026-04-02", request_count: 49 },
  { date: "2026-04-03", request_count: 47 },
];

// ---- SYSTEM HEALTH ----
export const MOCK_HEALTH_OK = {
  status: "ok", redis: "connected", model_loaded: true,
  queue_depth: 2, ram_used_mb: 4218, ram_total_mb: 12288,
};

// ---- AUDIT LOG ----
export const MOCK_AUDIT_LOG = [
  { id: "aud_001", user_id: "usr_005", user_name: "Vikram Nair",    role: "credit_analyst", action: "dispute_assigned",   target_type: "dispute",         target_id: "disp_001", metadata: { gstin: "33QEFVT7885F2Z4" },                                           timestamp: "2026-04-02T11:00:00+05:30" },
  { id: "aud_002", user_id: "usr_004", user_name: "Anjali Mehta",   role: "loan_officer",   action: "permission_requested",target_type: "permission",      target_id: "perm_002", metadata: { bank_id: "bank_001", gstin_masked: "09****05D6Z0" },                 timestamp: "2026-04-01T15:30:00+05:30" },
  { id: "aud_003", user_id: "usr_001", user_name: "Priya Sharma",   role: "msme",           action: "permission_granted", target_type: "permission",      target_id: "perm_001", metadata: { bank_id: "bank_001" },                                                timestamp: "2026-03-30T14:00:00+05:30" },
  { id: "aud_004", user_id: "usr_004", user_name: "Anjali Mehta",   role: "loan_officer",   action: "loan_denied",        target_type: "loan_request",    target_id: "lr_004",   metadata: { amount: 1500000, denial_reason: "Score below threshold" },             timestamp: "2026-02-28T16:00:00+05:30" },
  { id: "aud_005", user_id: "usr_006", user_name: "Deepa Krishnan", role: "risk_manager",   action: "threshold_updated",  target_type: "risk_thresholds", target_id: "system",   metadata: { changed_fields: ["fraud_confidence_threshold"], old_value: 0.65, new_value: 0.7 }, timestamp: "2026-03-01T10:00:00+05:30" },
  { id: "aud_006", user_id: "usr_007", user_name: "Arjun Kapoor",   role: "admin",          action: "api_key_revoked",    target_type: "api_key",         target_id: "key_004",  metadata: { bank_id: "bank_003", bank_name: "HDFC Bank" },                         timestamp: "2026-01-05T09:00:00+05:30" },
];

// ---- FEATURE LABEL MAP (SHAP) ----
export const FEATURE_LABELS: Record<string, string> = {
  upi_30d_inbound_count:       "30-Day UPI Inflow Count",
  filing_compliance_rate:      "GST Filing Compliance Rate",
  eway_bill_mom_growth:        "E-way Bill Monthly Growth",
  upi_inbound_outbound_ratio:  "UPI Inflow/Outflow Ratio",
  gst_revenue_cv_90d:          "GST Revenue Volatility (90d)",
  fraud_ring_flag:             "Fraud Ring Detection",
  longest_gap_days:            "Longest Filing Gap (days)",
  counterparty_count_30d:      "Counterparty Count (30d)",
  avg_invoice_value_90d:       "Avg Invoice Value (90d)",
  gst_late_filing_streak:      "GST Late Filing Streak",
  gst_late_filing_count:       "GST Late Filing Count",
  upi_circular_pattern_score:  "UPI Circular Pattern Score",
  eway_bill_activity_days:     "E-way Bill Activity Days",
  counterparty_concentration:  "Counterparty Concentration",
};
