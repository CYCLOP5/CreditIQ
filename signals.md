# signal intelligence framework

## overview

this is the domain knowledge layer that informs both feature engineering and fraud detection. it maps real-world indian msme financial behavior to measurable signals derived from upi transaction data, e-way bills, gst filings, and bank statements. each signal pillar targets a distinct dimension of creditworthiness that cannot be captured by traditional bureau scores. together the four pillars construct a composite trust profile grounded in actual economic activity rather than credit history.

---

## section 1, upi transaction signal — digital heartbeat

upi transaction data is the highest-frequency signal available for indian msmes. every payment received or made leaves a timestamped, counterparty-linked record. the patterns within this stream reveal cash flow health, customer diversity, and operational rhythm at a resolution unavailable from quarterly filings.

### p2p vs p2m distinction

p2m ratio, the proportion of customer-to-business transactions, signals legitimate retail or service presence. a business with high p2m inflows is receiving payments from multiple distinct merchant-category senders rather than from peers. shell companies and circular traders typically show high p2p ratios because their inflows come from a small ring of counterparties paying each other.

feature: `upi_p2m_ratio_30d`

### settlement recency and velocity

daily average throughput measures the mean daily transaction volume over a rolling window. shell companies show dormant periods followed by burst activity, a signature of synthetic round-tripping. healthy msmes maintain a consistent daily heartbeat aligned with their business rhythm, whether daily retail collections or weekly wholesale receipts.

features: `upi_daily_avg_throughput`, `upi_dormancy_periods`

### customer concentration risk

if 80 percent of inflows come from 3 upi ids it is likely circular trading. this is measured using the herfindahl-hirschman index applied to the distribution of counterparty vpas. low hhi indicates diverse customer base. high hhi is a concentration warning even if the total volume appears healthy.

features: `upi_hhi_30d`, `upi_top3_concentration`

### failed transaction rate

high technical declines or insufficient funds on outgoing vendor payments are early warning signs of liquidity crunch. a business that cannot reliably pay its suppliers has a stressed treasury even if inbound volumes look healthy. this signal catches deteriorating situations before they appear in gst or bureau data.

feature: `upi_outbound_failure_rate`

---

## section 2, goods movement pillar — physical validation

the e-way bill system captures every movement of goods above 50,000 rupees in value. for a physical goods business this stream provides ground truth about whether declared turnover corresponds to actual logistics activity. paper traders can file gst invoices with no physical goods movement. the e-way bill stream exposes this mismatch.

### e-way bill and gst reconciliation

cross-verify gst turnover with e-way bill distance and weight. formula: `ewb_revenue_per_kg = total_invoice_value / total_quantity_kg`. anomaly if revenue is high but goods movement is near zero for a physical goods business. a textile trader declaring 50 lakh quarterly turnover with zero e-way bills is a direct contradiction.

### hsn code consistency

sudden hsn code shifts are a red flag for entry-provider shell firms. a business that suddenly switches from trading steel to trading cotton textiles between quarters is almost certainly being repurposed as a fake invoice generator. measure entropy of hsn code distribution across 90 days. low entropy means consistent product type. high entropy or sudden chapter shifts are high-confidence fraud signals.

features: `hsn_entropy_90d`, `hsn_shift_count_90d`

### logistics latency

time between invoice date and e-way bill generation date should reflect realistic logistics planning. instantaneous generation of e-way bills for very long distances suggests paper-only trading where bills are generated in bulk without physical goods movement. legitimate long-distance consignments require vehicle booking, loading time, and departure preparation.

features: `invoice_to_ewb_lag_hours_median`, `ewb_distance_time_anomaly_flag`

### relevant e-way bill fields used

`transDistance`, `hsnCode`, `mainHsnCode`, `qtyUnit`, `quantity`, `totInvValue`, `vehicleType`, `fromStateCode`, `toStateCode`

---

## section 3, cash flow hygiene — operational discipline

beyond transaction volume, the pattern of a business's cash management reveals its operational maturity. businesses that maintain adequate buffers, pay statutory obligations on time, and avoid debit failures are demonstrably lower risk regardless of bureau score.

### buffer days metric

calculate how many days the business can survive on current balance if all inflows stop. formula: `buffer_days = current_balance / avg_daily_outflow_30d`. a business with 30 or more buffer days is well-managed. a business with fewer than 5 buffer days is running hot and is highly vulnerable to any demand shock.

feature: `cash_buffer_days`

### statutory compliance flow

regular automated payments for gst, epf, esic signal a business that prioritizes obligations. companies that consistently pay statutory dues treat their financial commitments seriously and have predictable outflow patterns. irregular or absent statutory payments indicate either cash stress or deliberate non-compliance, both of which are negative credit signals.

feature: `statutory_payment_regularity_score`

### debit failures

dishonoured auto-debts or sip failures are massive negative intent signals even without a loan history. a business that cannot maintain auto-debit mandates for small recurring amounts will have difficulty servicing a loan emi. this is particularly valuable for first-time borrowers with no previous lender relationship.

feature: `debit_failure_rate_90d`

### account aggregator note

the sahamati aa framework allows consent-based bank statement sharing from licensed financial information providers. this enables real-time bank data access without manual uploads. the account aggregator ecosystem connects 140 plus financial information providers including all major banks and allows data sharing in a standardized format under rbi regulation. reference: `https://sahamati.org.in/how-to-join-the-account-aggregator-network-to-share-and-access-financial-data/`

---

## section 4, anti-fraud and shell detection — network intelligence

individual signal analysis can be fooled by a well-constructed shell company. network analysis reveals structural fraud patterns that are invisible at the single-entity level. a business may appear healthy in isolation but be embedded in a fraud ring that manipulates all its signals simultaneously.

### circular trading loop detection

if company a pays b, b pays c, and c pays a within 48 hours this is money round-tripping used to inflate turnover. each company in the ring appears to have high upi velocity and strong cash flow, but the same rupees are simply rotating. detection via networkx scc decomposition followed by simple_cycles with length bound 5. short cycles with high recurrence are the strongest signal.

metrics: `cycle_velocity`, `cycle_recurrence`

### entity linkage analysis

shared gst registration address, mobile number, or email across multiple independent companies is a classic shell company trait. a single building in mumbai hosting 40 registered companies is an obvious red flag. high entity clustering at a single address or phone number is a structural indicator of coordinated fraud even if each company's individual transactions appear normal.

metric: `address_entity_cluster_size`

### counterparty risk profiling

a borrowers primary suppliers and customers with low gst compliance scores indicate contagion default risk. if a business depends on suppliers who are themselves non-compliant, the supply chain is fragile. if its customers are predominantly low-rated entities, receivables collection is at risk. this network effect is not captured by any single-entity analysis.

features: `counterparty_compliance_avg`, `counterparty_fraud_exposure`

---

## section 5, trust score decision matrix

| upi pattern | eway bill correlation | statutory compliance | verdict |
|---|---|---|---|
| high frequency, diverse counterparties, low hhi | high volume, consistent hsn codes | regular gst and epf payments | high trust, eligible for wc up to rs.50 lakh and term loan up to rs.1 crore under cgtmse |
| high volume, concentrated inflows, top 3 vpa over 80 percent | low or zero movement | irregular | high fraud risk, decline |
| low volume, consistent daily heartbeat | moderate, stable hsn | high, regular statutory payments | stable small business, eligible for working capital up to rs.10 lakh collateral-free |
| burst pattern with dormant windows | paper-only, zero logistics latency | absent | shell company pattern, flag for manual review |
| any | any | any with detected cycles in networkx | confirmed fraud ring, hard decline, cgtmse ineligible |

---

## section 6, feature engineering mapping

| feature name | pillar | source signal | implemented in |
|---|---|---|---|
| upi_30d_inbound_count | digital heartbeat | upi stream | src/features/engine.py |
| upi_inbound_outbound_ratio_30d | digital heartbeat | upi stream | src/features/engine.py |
| upi_hhi_30d | digital heartbeat | upi stream | src/features/engine.py |
| upi_outbound_failure_rate | digital heartbeat | upi stream | src/features/engine.py |
| ewb_distance_per_value_ratio | physical validation | eway bill stream | src/features/engine.py |
| hsn_entropy_90d | physical validation | eway bill stream | src/features/engine.py |
| invoice_to_ewb_lag_hours_median | physical validation | gst + eway bill | src/features/engine.py |
| cash_buffer_days | cash flow hygiene | bank statement / upi | src/features/engine.py |
| statutory_payment_regularity_score | cash flow hygiene | bank statement | src/features/engine.py |
| fraud_ring_flag | anti-fraud | upi graph | src/fraud/cycle_detector.py |
| fraud_confidence | anti-fraud | upi graph | src/fraud/cycle_detector.py |
| counterparty_compliance_avg | anti-fraud | gst stream | src/features/engine.py |
| upi_p2m_ratio_30d | digital heartbeat | upi stream | src/features/engine.py |
| upi_daily_avg_throughput | digital heartbeat | upi stream | src/features/engine.py |
| upi_dormancy_periods | digital heartbeat | upi stream | src/features/engine.py |
| upi_top3_concentration | digital heartbeat | upi stream | src/features/engine.py |
| debit_failure_rate_90d | cash flow hygiene | bank statement | src/features/engine.py |
| address_entity_cluster_size | anti-fraud | gst registration data | src/fraud/graph_builder.py |
| counterparty_fraud_exposure | anti-fraud | upi graph | src/fraud/cycle_detector.py |
| hsn_shift_count_90d | physical validation | eway bill stream | src/features/engine.py |

---

## section 8, msme classification and lending signal integration

### msme category and credit limit context

the msme category (micro, small, medium) determines which credit schemes a borrower qualifies for. our pipeline derives msme_category from declared annual turnover in the synthetic profile generator.

| category | turnover range | relevant schemes |
|---|---|---|
| micro | ≤ rs.5 crore | mudra, cgtmse, saral model, psb 59-minute |
| small | rs.5-50 crore | cgtmse, scbl/sbs model, composite loan |
| medium | rs.50-250 crore | sme/ms model, external credit rating required at rs.50 crore+ |

only micro and small enterprises (mse) are eligible for cgtmse coverage. medium enterprises use collateral-based or external credit-rated products.

### digital transaction ratio signal

the bank of india policy provides a wc assessment bonus when digital transactions form ≥ 25% of total business turnover.

- standard nayak method: wc = 20% of annual turnover
- digital bonus method: wc = 30% of digital portion + 25% of non-digital portion

our pipeline approximates digital turnover ratio using `upi_30d_inbound_count` and `upi_inbound_outbound_ratio_30d`. when the ratio crosses the 25% threshold, the wc credit limit tier is upgraded within the same risk band.

feature signal: `upi_p2m_ratio_30d` combined with absolute upi volume relative to estimated annual gst turnover.

### udyam registration as a binary feature

udyam registration is the official msme portal registration. registered businesses have:
- access to psl-backed loans from scheduled commercial banks
- cgtmse guarantee eligibility
- psb loans in 59 minutes platform access
- priority in government procurement

feature: `udyam_registered` bool. in synthetic pipeline this is a randomly assigned flag with 80% base registration rate among micro and 70% among small enterprises.

### gst filing regularity cross-referenced with itr

digital lending platforms (psb 59-minute, nbfc fintechs) require both gst filing history and itr filing history. a business with good gst compliance but missing itr filings is flagged as a data completeness risk. conversely, a business with strong itr but erratic gst filing shows regulatory discipline but potential gst fraud risk.

signals used:
- `filing_compliance_rate`: ratio of on-time gst filings to total due filings
- `gst_filing_delay_trend`: signed trend in filing delay over last 3 periods
- `data_completeness_score`: fraction of expected signals actually present, includes itr proxy

### zed certification as optional creditworthiness signal

zed (zero defect zero effect) certification from the ministry of msme indicates quality and environmental process maturity. certified businesses receive roi concessions from participating banks. in our pipeline, `zed_level` is an optional enum field (none, bronze, silver, gold) that influences the llm explanation bullet points to note interest rate benefits.

### cgtmse eligibility assessment

cgtmse eligibility is derived procedurally from three conditions:
1. msme category must be micro or small (not medium)
2. `fraud_ring_flag` must be false
3. credit_score must be ≥ 550 (medium_risk lower bound)

when all three conditions are met, `cgtmse_eligible` is set to true in the scoring response. this triggers the cgtmse-augmented loan limit tier in the recommendation.

### alignment with cibil official score bands

our synthetic score is calibrated to the cibil 300-900 scale. band boundaries are aligned with the official cibil classification published in the ministry of msme knowyourlender 2025 guide.

| our band | our range | cibil label | cibil range |
|---|---|---|---|
| very_low_risk | 750-900 | excellent | 750-900 |
| low_risk | 650-749 | good | 650-750 |
| medium_risk | 550-649 | average | 550-650 |
| high_risk | 300-549 | poor | 300-550 |

the cibil poor threshold is 550, not 500. the medium_risk lower bound was corrected from 500 to 550 to match this official band definition.

---

## section 7, account aggregator framework — consent-based bank data

the sahamati aa framework enables consent-based bank statement sharing from licensed financial information providers under rbi regulation. this is the legal mechanism by which cash flow hygiene signals are obtained in production. reference: https://sahamati.org.in/how-to-join-the-account-aggregator-network-to-share-and-access-financial-data/

### aa ecosystem scope

140 plus financial information providers connected including all major scheduled commercial banks. data sharing is standardized under the financial information providers specification. the borrower grants one-time consent through their bank's aa module. the lender (financial information user) receives a time-bounded, purpose-limited data fetch.

### data available via aa

- bank account statements with full transaction history
- fixed deposit and recurring deposit balances
- mutual fund portfolio summaries
- insurance policy data
- equity holding statements

### integration note for this pipeline

in the synthetic pipeline, bank statement data is simulated via the sdv gaussian copula synthesizer. in a production deployment the bank statement stream would be replaced by aa api calls that return standardized json conforming to the rbi aa technical specification. the feature engine is designed to be agnostic to whether the bank statement data arrives from aa or from synthetic generation — both paths produce the same polars dataframe schema consumed by `src/features/engine.py`.

### sandbox access

sahamati provides sandbox access for development and testing. for this hackathon prototype, the synthetic generator replaces real aa data entirely. no live aa integration is implemented or required. the architecture is designed to swap in a real aa client by replacing the generator's bank statement output with aa api responses without modifying the feature engine.

### E-Way Bill Smurfing (Structuring)
E-Way bills are legally mandatory for movements above ₹50,000. Fraudsters frequently execute "smurfing" (structuring) by generating multiple bills between ₹45,000 and ₹49,999 to avoid closer scrutiny while staying under reporting limits.
feature: `ewb_smurfing_index`

### Hub-and-Spoke Fraud & PageRank
Circular rings (A -> B -> C -> A) are common, but sophisticated fraud also leverages Bipartite Hub-and-Spoke models where many disconnected mules funnel money to a central shell node. We calculate `nx.pagerank` on the UPI graph. If a node traps cash with `pagerank_score > 0.1` but has absolutely zero GST footprint (`months_active_gst == 0`), the graph instantly forces `fraud_ring_flag = True` and locks `fraud_confidence = 0.95`. This deterministically catches massive mule hubs.
feature: `pagerank_score`

### Cross-Signal Reconciliation (Cash vs Accrual)
Comparing 30-day GST value against 30-day UPI inbound volume exposes massive Accounts Receivable bottlenecks or unaccounted cash flows. If GST is ₹50L and UPI is ₹5L, the business is starving for liquidity despite looking healthy on paper.
feature: `gst_upi_receivables_gap`

### Path to Prime Counterfactuals
By examining the most negative SHAP value, our GenAI module acts as an automated advisory bot. It generates a "Path to Prime" prescriptive action, telling the specific MSME exactly what business behavior to change (e.g., "increase cash buffer to >10 days") to climb into the Prime scoring band.
