# CreditIQ Pitch & Elite Architecture

## Non-Linear Policy Distillation Model
We encoded standard banking risk policies into a noisy synthetic target, and used XGBoost to distill those hard rules into a smooth, non-linear probability surface. This allows us to extract SHAP values to explain the bank's own policy back to the loan officer in natural language.

## Domain-Specific Tax Evasion (E-Way Bill Smurfing)
E-Way Bills are legally mandatory for movements > ₹50,000. Fraudsters "smurf" transactions by creating multiple invoices between ₹45,000 and ₹49,999. Our model explicitly tracks this `ewb_smurfing_index` to flag structuring patterns, proving deep Indian regulatory domain expertise.

## Cross-Signal Reconciliation Engine
If an MSME has ₹50L in GST invoices but only ₹5L in inbound UPI, they have a massive Accounts Receivable bottleneck. We continuously calculate `gst_upi_receivables_gap` to catch "Cash vs. Accrual" mismatches in real time.

## Hub-and-Spoke Fraud Detection
We upgraded basic cycle loops (A→B→C→A) to compute topological **Eigenvector Centrality (`nx.pagerank`)** over the multi-directed UPI array. If massive cash is trapped by a high-centrality node (`pagerank_score > 0.1`) that possesses zero real-world business footprint (`months_active_gst == 0`), the engine immediately flags it as a **Bipartite Shell Mule** hub and locks `fraud_confidence` to `0.95`.

## "Path to Prime" Counterfactual Explanations
Our cloud-hosted Gemma model via OpenRouter uses SHAP inference not only to explain "why" a score is low, but outputs prescriptive "Path to Prime" actions derived from the hardest-hitting negative attribute, telling the MSME exactly how to improve.

## Regulatory-Constrained Expected Loss
We built an Expected Loss engine (`PD * LGD * Exposure`) to dynamically calculate exact exposure capacity to meet the bank's risk appetite limit. But we also built a policy-gating layer that automatically clamps the algorithmic limit to strictly comply with RBI/CGTMSE regulatory thresholds.

## Continuous Updating (Temporal Decay EMAs)
We replaced static 7d/30d/90d rolling sums with Exponential Moving Averages (`Value * e^{-λt}`), eliminating the cliff effect where a ₹50L invoice at day 31 drops from full weight to zero. The credit score now bleeds down or spikes up with literal daily precision across the API. Half-life mapping: `_7d_*` = 7d, `_30d_*` = 30d, `_90d_*` = 90d.

## Twist 1 — Fraud Ring Topology Dashboard (Live)
The `/risk/fraud-topology` page renders the full multi-directed UPI graph as an interactive **3D force graph** (Three.js / WebGL). Businesses are nodes, payments are directed edges with animated particles. Red = fraud ring, teal = clean. Node size encodes fraud risk weight. A **PageRank centrality bar chart** in the sidebar ranks all nodes by eigenvector centrality — a node with `pagerank_score > 0.1` and zero GST footprint is immediately classified as a Bipartite Shell Mule hub and locks `fraud_confidence = 0.95`. Clicking any node reveals its ring members and confidence score.

## Twist 2 — GST Amnesty Scheme — Dynamic Feature Weight Adjustment (Live)
The Risk Manager can activate an amnesty window for any fiscal quarter via the `/risk/thresholds` page. The `amnesty_config` object (active, quarter, year, `filing_penalty_multiplier`) persists in the backend. At inference time the scoring worker reads this config and **scales `filing_compliance_rate` and `gst_filing_delay_trend`** by the multiplier for any GSTIN whose late filing fell in that quarter — zero model retraining, zero downtime. The Signal Trends analyst page renders an **amber overlay band** on the credit score chart marking the exact amnesty window so analysts can visually identify which score runs were affected.

## E-Way Bill Smurfing Histogram (Live)
The SHAP Explorer now displays a bucketed bar chart of all e-way bill values after scoring. The ₹45,000–₹49,999 band (below the ₹50,000 mandatory E-Way Bill threshold) is highlighted in red. A `smurfing_index` (0–1) is computed as the fraction of bills in the structuring window — a "High Smurfing Risk" badge fires when it exceeds 30%. Imran's (fraud) GSTIN shows a spike of 120 bills in the smurf band vs single digits for clean entities.

## GST vs UPI Receivables Gap Chart (Live)
The SHAP Explorer displays a grouped monthly bar chart comparing **GST-invoiced amounts** (accrual) against **UPI inbound receipts** (cash). A persistent gap signals an AR bottleneck or unaccounted cash — the clearest single indicator that declared turnover does not correspond to real economic activity. Imran's GSTIN shows UPI at only 5–15% of GST invoiced, a textbook circular trading signature.
