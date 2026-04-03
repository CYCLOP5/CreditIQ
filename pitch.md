# CreditIQ Pitch & Elite Architecture

## Non-Linear Policy Distillation Model
We encoded standard banking risk policies into a noisy synthetic target, and used XGBoost to distill those hard rules into a smooth, non-linear probability surface. This allows us to extract SHAP values to explain the bank's own policy back to the loan officer in natural language.

## Domain-Specific Tax Evasion (E-Way Bill Smurfing)
E-Way Bills are legally mandatory for movements > ₹50,000. Fraudsters "smurf" transactions by creating multiple invoices between ₹45,000 and ₹49,999. Our model explicitly tracks this `ewb_smurfing_index` to flag structuring patterns, proving deep Indian regulatory domain expertise.

## Cross-Signal Reconciliation Engine
If an MSME has ₹50L in GST invoices but only ₹5L in inbound UPI, they have a massive Accounts Receivable bottleneck. We continuously calculate `gst_upi_receivables_gap` to catch "Cash vs. Accrual" mismatches in real time.

## Hub-and-Spoke Fraud Detection
We upgraded simple simple-cycles detecting to include `nx.pagerank` over the multi-directed UPI network to catch Bipartite Hub-and-Spoke shell nodes acting as money mules.

## "Path to Prime" Counterfactual Explanations
Our local, CPU-based Phi-3 LLM uses SHAP inference not only to explain "why" a score is low, but outputs prescriptive "Path to Prime" actions derived from the hardest-hitting negative attribute, telling the MSME exactly how to improve.

## Regulatory-Constrained Expected Loss
We built an Expected Loss engine (`PD * LGD * Exposure`) to dynamically calculate exact exposure capacity to meet the bank's risk appetite limit. But we also built a policy-gating layer that automatically clamps the algorithmic limit to strictly comply with RBI/CGTMSE regulatory thresholds.

## Continuous Updating (Temporal Decay EMAs)
We replaced static 30d/90d rolling sums with Exponential Moving Averages (`Value * e^{-λt}`), making the credit score bleed down or spike up with literal daily precision across the API.
