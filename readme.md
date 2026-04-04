# creditiq  msme credit scoring engine

> real-time credit scoring for indian msmes using gst, upi, and e-way bill signals with graph-based fraud detection, xgboost ml scoring, shap explainability, and llm-powered plain-language explanations , all running on a single machine, zero cloud, zero gpu.

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  creditiq  e-way bill fraud detection & msme credit scoring pipeline      │
 │                                                                              │
 │  faker → redis streams → polars features → networkx fraud → xgboost score   │
 │  → shap explain → phi-3 llm → fastapi → react dashboard                    │
 └──────────────────────────────────────────────────────────────────────────────┘
```

> **domain knowledge architecture:** the core logic is explicitly split between regulatory and technical domains:
> * [theorymsme.md](theoryMSME.md): defines strategic limits, bank of india msme guidelines, and cgtmse boundaries.
> * [signals.md](signals.md): details the technical ml engineering features (p2m vs p2p velocity, temporal scc detection, hsn entropy).

| resource | link |
|---|---|
| mathematical foundations | [math.md](math.md) |
| tools, libraries & alternatives | [tools.md](tools.md) |
| ml feature intent & signals | [signals.md](signals.md) |
| data generation & profiles | [howisthedatamade.md](howisthedatamade.md) |
| database & redis schemas | [schema.md](schema.md) |
| system bootstrapping | [bootstrap.md](bootstrap.md) |
| api service architecture | [api.md](api.md) |
| frontend architecture & apps | [frontend.md](frontend.md) |
| core msme behaviors | [theorymsme.md](theoryMSME.md) |

---

## table of contents

1. [project overview](#1-project-overview)
2. [system architecture](#2-system-architecture)
3. [tools, libraries & models](#3-tools-libraries--models)
4. [mathematical equations & algorithms](#4-mathematical-equations--algorithms)
5. [e-way bill domain knowledge](#5-e-way-bill-domain-knowledge)
6. [data pipeline deep dive](#6-data-pipeline-deep-dive)
7. [graph-based fraud detection](#7-graph-based-fraud-detection)
8. [ml model](#8-ml-model)
9. [api design](#9-api-design)
10. [frontend dashboard](#10-frontend-dashboard)
11. [judging criteria addressed](#11-judging-criteria-addressed)
12. [running the system](#12-running-the-system)

---

## 1. project overview

### what this system is

creditiq is a **full-stack, end-to-end msme credit scoring engine** that ingests three indian financial signal streams — **gst invoices**, **upi transactions**, and **e-way bills** — to produce a creditworthiness score on the cibil-aligned 300–900 scale, detect circular transaction fraud rings, explain every score with shap attribution and llm-generated plain language, and present results through a polished react dashboard.

### the problem it solves

india's **63 million msmes** face a **₹25 lakh crore credit gap** (ifc estimate). traditional credit scoring relies on cibil bureau data, which most micro-enterprises lack. the gst network (gstn), upi payment rails, and the e-way bill system generate a continuous stream of structured financial signals that can substitute for bureau data — but no existing system fuses all three signals, detects *circular trading fraud* in real time, and translates ml decisions into language a loan officer or msme owner can understand.

creditiq does exactly that.

### stakeholders

| stakeholder | role in system |
|---|---|
| **loan officer** | reviews credit scores, approves/rejects loan applications |
| **credit analyst** | inspects shap feature contributions and signal trends |
| **risk manager** | monitors fraud topology, sets risk thresholds |
| **admin** | manages system configuration and user access |
| **msme owner** | views own business credit score and report |

### high-level pipeline summary

```
synthetic data generation (faker + numpy distributions)
        ↓
redis streams (3 streams: gst, upi, e-way bill)
        ↓
polars feature engine (46 engineered features)
        ↓
networkx fraud detection (scc + cycle enumeration)
        ↓
xgboost scoring (probability → 300–900 scale)
        ↓
shap explainability (top 6 feature attributions)
        ↓
phi-3 mini llm (plain-language reasons + path to prime action)
        ↓
fastapi rest api (async saga worker pattern)
        ↓
react + next.js ui dashboard (multiple interactive portals)
```

---



### next-gen hackathon flex features
this platform implements advanced algorithmic features specifically engineered to dominate hackathon criteria (see [pitch.md](pitch.md)):

* **deterministic grammar-constrained genai:** using gbnf grammars, the llm outputs strict json suspicious activity reports (sar) based on cycle metrics, fundamentally preventing text hallucination.
* **dynamic algorithmic risk pricing:** beyond static rule bands, expected loss (pd × lgd × exposure) mathematically bounds the maximum safe loan amount to stay strictly under the portfolio risk appetite.
* **multidimensional nearest-neighbor imputation:** elegantly solves the "cold-start" sparse data problem via `sklearn.impute.knnimputer`, projecting expected gst features using rich upi telemetry neighbors.
* **temporal cadence anomaly detection:** an isolation forest mathematically isolates synthetic/robotic transaction velocities, flagging shell company bots based entirely on non-human cadence variance.
* **event-sourced audit trail:** provides a `/audit/replay` endpoint for strict regulatory review, literally rewinding the temporal stream to logically rebuild exact historical decision contexts.
* **temporal graph validation:** circular transaction rings are only flagged if the cashflows actually move sequentially forward in time (`is_temporal_cycle`), significantly reducing false positives vs strict simple cycle detection.

### twist implementations

**twist 1 — fraud ring topology visualisation (implemented)**
the fraud topology dashboard (`/risk/fraud-topology`) renders the full multi-directed upi graph as an interactive 3d force graph using three.js. businesses are nodes, upi payments are directed edges with particle animation. fraud ring members are coloured red, clean entities teal. node size encodes fraud risk weight. a ranked bar chart on the sidebar shows **eigenvector centrality (pagerank)** for every node — high pagerank with zero gst footprint immediately flags a bipartite shell mule hub. clicking any node reveals its ring membership and confidence score. role-gated to `risk_manager`.

**twist 2 — gst amnesty scheme feature weight adjustment (implemented)**
the risk thresholds page (`/risk/thresholds`) includes a **gst amnesty configuration panel** accessible to the `risk_manager`. the risk manager toggles amnesty on/off, selects the fiscal quarter (q1–q4) and year, and sets a `filing_penalty_multiplier` (0.0 = full waiver, 1.0 = no change). the config persists in the mock db via `put /risk-thresholds`. the scoring worker reads `amnesty_config.active` at inference time and scales `filing_compliance_rate` and `gst_filing_delay_trend` by the multiplier for gstins that filed late during the amnesty window — no model retraining required. the signal trends analyst page renders an amber **amnesty overlay band** on both the credit score trend chart and the feature signal chart, marking the exact quarter window.

### advanced signal visualisations

* **ewb smurfing histogram** (`/analyst/shap-explorer`): after scoring any gstin, displays a bucketed bar chart of e-way bill values. the ₹45,000–₹49,999 "smurf band" (below the mandatory ₹50,000 reporting threshold) is highlighted in red. a smurfing index (0–1) is computed and a "high smurfing risk" badge fires when the index exceeds 30%.
* **gst vs upi receivables gap chart** (`/analyst/shap-explorer`): grouped monthly bar chart comparing gst-invoiced amounts against actual upi inbound receipts. large gaps expose accounts-receivable bottlenecks or unaccounted cash flows. a callout shows the gap percentage for the latest period.
* **ewb smurfing index signal trend** (`/analyst/signal-trends`): `ewb_smurfing_index` is now a sixth toggleable feature line in the credit analyst signal trends chart, alongside filing compliance, gst revenue cv, upi inbound count, eway bill growth, and filing gap days.

## 2. system architecture

### end-to-end pipeline diagram

```mermaid
flowchart td
    a[faker + numpy distributions] -->|synthetic gst, upi, ewb signals| b[redis streams]
    b -->|consumer group pull| c[async saga worker]
    c -->|raw events| d[polars lazy feature engine]
    d -->|46-dim feature vector| e[networkx fraud detector]
    e -->|clean vector or fraud flag| f[xgboost scoring model]
    f -->|raw score + feature vector| g[shap treeexplainer]
    g -->|top 5 shap vectors| h[phi-3-mini int4 via llama.cpp cpu-only]
    h -->|plain language reasons| i[redis state store]
    i -->|result payload| j[fastapi rest endpoint]
    j -->|json response| k[react + next.js app router]
    d -->|parquet spill| l[disk cache]
    l -->|historical read| d
```

### layer summary

| layer | component | key technology | source file |
|---|---|---|---|
| **1. data generation** | synthetic msme profiles + 3 signal streams | faker, numpy lognormal | [`src/ingestion/generator.py`](src/ingestion/generator.py) |
| **2. message bus** | redis streams with consumer groups | redis-py async | [`src/ingestion/redis_producer.py`](src/ingestion/redis_producer.py) |
| **3. feature engineering** | 46 engineered features across 6 sub-vectors | polars lazy evaluation | [`src/features/engine.py`](src/features/engine.py) |
| **4. fraud detection** | scc decomposition + bounded cycle enumeration | networkx | [`src/fraud/cycle_detector.py`](src/fraud/cycle_detector.py) |
| **5. ml scoring** | gradient boosted trees, 300–900 scale | xgboost hist | [`src/scoring/model.py`](src/scoring/model.py) |
| **6. explainability** | shap treeexplainer + llm translation | shap + llama-cpp-python | [`src/scoring/explainer.py`](src/scoring/explainer.py) |
| **7. api** | async rest with saga pattern | fastapi + uvicorn | [`src/api/main.py`](src/api/main.py) |
| **8. dashboard** | next.js app router interactive portals | react 18 + next 14 | [`frontend/app/layout.tsx`](frontend/app/layout.tsx) |

### redis streams as message bus

three dedicated streams carry signal data ([`config/settings.py`](config/settings.py:18)):

| stream | key | content |
|---|---|---|
| gst invoices | `stream:gst_invoices` | invoice id, taxable value, buyer gstin, filing status |
| upi transactions | `stream:upi_transactions` | amount, direction, counterparty vpa, txn type, status |
| e-way bills | `stream:eway_bills` | invoice value, transport distance, hsn code, doc date |

each stream is capped at **10,000 entries** via `xadd ... maxlen ~ 10000` to prevent unbounded memory growth. a single consumer group `cg_feature_engine` consumes all streams via `xreadgroup` ([`src/ingestion/redis_producer.py`](src/ingestion/redis_producer.py:50)).

a fourth stream, `stream:score_requests`, carries scoring job requests from the api to the saga worker ([`src/api/routes.py`](src/api/routes.py:33)).

### offline vs online modes

| mode | script | what it does |
|---|---|---|
| **offline** | [`scripts/run_offline.sh`](scripts/run_offline.sh) | phase 1→3→4→5: generate data, compute features, train model, run tests. **no redis, no api, no frontend.** |
| **online** | [`scripts/run_online.sh`](scripts/run_online.sh) | full pipeline: start redis → generate data → stream to redis → features → train → test → api (background) → frontend |

the offline pipeline is useful for model development and ci/cd; the online pipeline demonstrates the full real-time system.

---

## 3. tools, libraries & models

a comprehensive breakdown of every library used, why it was chosen, and what alternatives were considered is in [**tools.md**](tools.md).

### quick reference

| library | purpose | source |
|---|---|---|
| fastapi + uvicorn | async rest api server | [`src/api/main.py`](src/api/main.py) |
| redis-py (async) | message bus + state store | [`src/ingestion/redis_producer.py`](src/ingestion/redis_producer.py) |
| polars | feature engineering (lazy evaluation) | [`src/features/engine.py`](src/features/engine.py) |
| xgboost | gradient boosted tree classifier | [`src/scoring/trainer.py`](src/scoring/trainer.py) |
| shap | treeexplainer for feature attributions | [`src/scoring/explainer.py`](src/scoring/explainer.py) |
| networkx | directed multigraph fraud detection | [`src/fraud/graph_builder.py`](src/fraud/graph_builder.py) |
| faker | synthetic pii and structural data | [`src/ingestion/generator.py`](src/ingestion/generator.py) |
| llama-cpp-python | local phi-3 llm inference (cpu-only) | [`src/llm/translator.py`](src/llm/translator.py) |
| pydantic v2 | schema validation across all layers | [`src/features/schemas.py`](src/features/schemas.py) |
| numpy + scipy | numerical computation + sparse matrices | [`src/scoring/trainer.py`](src/scoring/trainer.py) |
| pyarrow | parquet i/o backend for polars | [`pyproject.toml`](pyproject.toml) |
| psutil | system memory monitoring | [`src/api/routes.py`](src/api/routes.py) |
| pytest + pytest-asyncio | test framework for async code | [`tests/test_api.py`](tests/test_api.py) |
| httpx | async http test client | [`tests/test_api.py`](tests/test_api.py) |
| sdv | gaussian copula profile synthesis | [`src/ingestion/generator.py`](src/ingestion/generator.py) |
| react 18 | frontend ui library | [`frontend/package.json`](frontend/package.json) |
| next 14 | frontend framework (app router) | [`frontend/next.config.mjs`](frontend/next.config.mjs) |

---

## 4. mathematical equations & algorithms

complete mathematical foundations with latex notation are in [**math.md**](math.md).

### key formulas at a glance

**ema-weighted velocity** (e.g., gst 30-day value) — [`src/features/engine.py`](src/features/engine.py:67):

$$v_{ema}^{gst}(g, 30) = \sum_{i : \text{gstin}_i = g} \text{taxable\_value}_i \cdot e^{-\frac{\ln 2}{30} \cdot (t_{now} - t_i)}$$

**herfindahl-hirschman index** for upi counterparty concentration — [`src/features/engine.py`](src/features/engine.py:170):

$$hhi_{30d}^{upi}(g) = \sum_{j=1}^{n} s_j^2 \quad \text{where } s_j = \frac{n_j}{\sum_k n_k}$$

**shannon entropy** for hsn code diversity — [`src/features/engine.py`](src/features/engine.py:326):

$$h_{90d}^{hsn}(g) = -\sum_{h=1}^{m} p_h \ln(p_h)$$

**fraud confidence score** — [`src/fraud/cycle_detector.py`](src/fraud/cycle_detector.py:140):

$$c_f(g) = \min\!\left(1.0,\; \frac{v_{max}}{\theta_v} \cdot 0.5 + \min\!\left(\frac{r_{max}}{\theta_r},\, 1.0\right) \cdot 0.5\right)$$

**credit score mapping** — [`src/scoring/model.py`](src/scoring/model.py:62):

$$s = 900 - 600 \cdot p(\text{default})$$

---

## 5. e-way bill domain knowledge

### what is an e-way bill?

an **electronic way bill (e-way bill)** is a mandatory document required under the **indian gst framework** (section 68 of the cgst act, rule 138) for the movement of goods exceeding ₹50,000 in value. generated via the nic (national informatics centre) portal, it captures:

- **who**: consignor (`fromgstin`) and consignee (`togstin`) gstins
- **what**: hsn code, product description, quantity, taxable amount
- **where**: origin/destination state codes, pincodes, actual dispatch/ship states
- **how**: transport mode (road/rail/air/ship), vehicle number, transporter id
- **how much**: total invoice value, cgst/sgst/igst/cess breakdown

the system uses the **official ewb json schema** (version 1.0.0621) documented in [`ewaybillformats/`](ewaybillformats/).

### ewb schema fields (from [`ewaybillformats/ewb_attributes_new - ewb attributes.csv`](ewaybillformats/EWB_Attributes_new%20-%20EWB%20Attributes.csv))

| field | type | fraud-indicative | why |
|---|---|---|---|
| `fromgstin` / `togstin` | text(15) |  **high** | cycle detection — same gstins appearing as both buyer/seller |
| `totinvvalue` | number(18) |  **high** | inflated values in circular rings |
| `transdistance` | number(4) |  **high** | paper traders show suspiciously low distances (1–5 km) |
| `mainhsncode` | text(8) |  **medium** | hsn code shifts indicate non-genuine trading |
| `docdate` vs generation timestamp | text(10) |  **medium** | large lags between invoice and ewb generation |
| `transmode` | number(1) |  **low** | road (1) is 70% of traffic; unusual modes may indicate fraud |
| `supplytype` | char(1) |  **low** | outward (o) vs inward (i) pattern analysis |

### fraud patterns detected

| pattern | how it manifests in ewb data | how creditiq detects it |
|---|---|---|
| **circular trading** | a→b→c→a with inflated `totinvvalue` | scc decomposition + cycle enumeration in [`src/fraud/cycle_detector.py`](src/fraud/cycle_detector.py) |
| **split invoicing** | multiple ewbs just below ₹50,000 threshold | anomalous `ewb_volume_growth_mom` + high frequency with low values |
| **ghost entities** | gstins with ewbs but zero gst filings | `data_completeness_score` < 1.0 and `months_active_gst` = 0 |
| **paper trading** | high ewb volume, very low `transdistance` (1–5 km) | `ewb_distance_per_value_ratio` near zero — [`src/features/engine.py`](src/features/engine.py:219) |
| **hsn code manipulation** | frequent commodity shifts to exploit tax rates | `hsn_entropy_90d` and `hsn_shift_count_90d` — [`src/features/engine.py`](src/features/engine.py:326) |

### state codes used

the system generates synthetic data across 11 indian states, using official gst state codes from the master codes spec ([`ewaybillformats/ewb_attributes_new - master codes.csv`](ewaybillformats/EWB_Attributes_new%20-%20Master%20Codes.csv)):

| state | code |
|---|---|
| haryana | 6 |
| delhi | 7 |
| rajasthan | 8 |
| uttar pradesh | 9 |
| west bengal | 19 |
| chhattisgarh | 22 |
| gujarat | 24 |
| maharashtra | 27 |
| karnataka | 29 |
| tamil nadu | 33 |
| telangana | 36 |

---

## 6. data pipeline deep dive

### phase 1: synthetic data generation

[`src/ingestion/generator.py`](src/ingestion/generator.py) creates **250 msme profiles** across 5 behavioural types:

| profile type | weight | gst volume | upi pattern | ewb pattern | fraud ring |
|---|---|---|---|---|---|
| `genuine_healthy` | 40% | high, consistent | balanced in/out, diverse counterparties | moderate distance, sector-consistent hsn | no |
| `genuine_struggling` | 25% | low, variable | erratic, higher failure rates | low volume | no |
| `shell_circular` | 15% | medium-high, uniform | **burst patterns**, ring counterparty rotation | minimal physical movement | **yes** — grouped into rings of 3–4 |
| `paper_trader` | 10% | very high, artificially uniform | mixed | high volume, **very low distance** (1–5 km), cross-sector hsn | no |
| `new_to_credit` | 10% | sparse | sparse | minimal | no |

**distributions used** ([`src/ingestion/generator.py`](src/ingestion/generator.py:248)):
- **transaction amounts**: lognormal — `np.random.lognormal(mean, sigma)` with profile-specific parameters (e.g., `shell_circular` uses μ=12.2, σ=0.4 for high uniform values)
- **timestamps**: exponential inter-arrival times for natural clustering; burst mode for shell companies uses gaussian clusters around 2–3 activity windows
- **filing behaviour**: weighted random choice — healthy profiles are 85% on-time; struggling profiles are 55% on-time

**hsn code sectors** — 8 commodity sectors with 8 codes each (64 total), from [`src/ingestion/generator.py`](src/ingestion/generator.py:29):

| sector | example hsn codes |
|---|---|
| iron & steel | 7201, 7202, 7204, 7207, 7208, 7209, 7210, 7213 |
| textiles | 5208, 5209, 5210, 5211, 6001, 6002, 6006, 5201 |
| food grains | 1001–1008 |
| chemicals | 2801–2804, 2901, 2902, 3801, 3802 |
| machinery | 8401–8408 |
| electronics | 8501–8508 |
| plastics | 3901–3908 |
| paper | 4801–4805, 4701–4703 |

**output**: chunked parquet files at `data/raw/` — 10,000 records per chunk.

### phase 2: redis stream ingestion

[`src/ingestion/redis_producer.py`](src/ingestion/redis_producer.py) reads parquet chunks and publishes records to redis via `xadd` in pipeline batches of 500:

```python
pipe = client.pipeline(transaction=false)
for row in batch:
    fields = row_to_redis_fields(row)
    pipe.xadd(stream_name, fields, maxlen=settings.stream_maxlen, approximate=true)
await pipe.execute()
```

consumer groups are created with `xgroup create ... $ mkstream` — the `$` id means only new messages are consumed.

### phase 3: feature extraction

[`src/features/engine.py`](src/features/engine.py) computes **46 features** grouped into 6 sub-vectors:

#### velocity features (11 features) — ema-weighted

all velocity features use **exponential moving averages** (half-life = window name) instead of hard cutoffs. this eliminates the cliff effect where a large invoice dropping past the window boundary causes an instant score change.

| feature | half-life | signal | formula |
|---|---|---|---|
| `gst_7d_value` | 7 days | gst | ema-weighted sum of `taxable_value` |
| `gst_30d_value` | 30 days | gst | ema-weighted sum of `taxable_value` |
| `gst_90d_value` | 90 days | gst | ema-weighted sum of `taxable_value` |
| `upi_7d_inbound_count` | 7 days | upi | ema-weighted count of inbound transactions |
| `upi_30d_inbound_count` | 30 days | upi | ema-weighted count of inbound transactions |
| `upi_90d_inbound_count` | 90 days | upi | ema-weighted count of inbound transactions |
| `ewb_7d_value` | 7 days | ewb | ema-weighted sum of `tot_inv_value` |
| `ewb_30d_value` | 30 days | ewb | ema-weighted sum of `tot_inv_value` |
| `ewb_90d_value` | 90 days | ewb | ema-weighted sum of `tot_inv_value` |
| `gst_30d_unique_buyers` | 30 days | gst | ema-weighted unique count of `buyer_gstin` |
| `upi_30d_unique_counterparties` | 30 days | upi | ema-weighted unique count of `counterparty_vpa` |

#### cadence features (5 features)

| feature | computation |
|---|---|
| `gst_mean_filing_interval_days` | mean of `diff(timestamp)` in days |
| `gst_std_filing_interval_days` | std dev of `diff(timestamp)` |
| `upi_inbound_std_interval_days` | std dev of inbound upi inter-arrival times |
| `ewb_median_interval_days` | median of ewb inter-arrival times |
| `gst_filing_delay_trend` | delta of last 3 `filing_delay_days` values |

#### ratio & stability features (9 features)

| feature | what it captures |
|---|---|
| `upi_inbound_outbound_ratio_30d` | net cash position — healthy msmes > 1.0 |
| `gst_revenue_cv_90d` | revenue stability — coefficient of variation |
| `ewb_volume_growth_mom` | month-over-month ewb growth rate |
| `filing_compliance_rate` | on-time filings / total filings |
| `upi_hhi_30d` | counterparty concentration (hhi) |
| `ewb_distance_per_value_ratio` | distance per ₹ — low = paper trading signal |
| `invoice_to_ewb_lag_hours_median` | median hours between invoice date and ewb generation |
| `upi_p2m_ratio_30d` | p2m (merchant) / total inbound — healthy businesses > 0.5 |
| `upi_outbound_failure_rate` | failed / total outbound — cash flow stress signal |

#### sparsity features (4 features)

| feature | what it captures |
|---|---|
| `months_active_gst` | count of distinct months with gst filings |
| `data_completeness_score` | fraction of 3 signal types present (0–1) |
| `longest_gap_days` | max inter-event gap across all signals |
| `data_maturity_flag` | 1.0 if `months_active_gst` ≥ 3, else 0.0 |

#### extended features (8 features)

| feature | what it captures |
|---|---|
| `upi_daily_avg_throughput` | total upi amount / active days |
| `upi_top3_concentration` | top 3 counterparties as fraction of total inbound |
| `upi_dormancy_periods` | number of weeks with zero upi activity |
| `hsn_entropy_90d` | shannon entropy of hsn code distribution |
| `hsn_shift_count_90d` | number of dominant hsn code changes across 30d buckets |
| `cash_buffer_days` | estimated days of cash runway from upi flows |
| `statutory_payment_regularity_score` | 1 − (avg_filing_delay / 30), clamped to [0,1] |
| `debit_failure_rate_90d` | 90-day outbound failure rate |

#### fraud features (9 features, populated by fraud module)

| feature | source |
|---|---|
| `fraud_ring_flag` | cycle detector |
| `fraud_confidence` | blended velocity + recurrence score |
| `cycle_velocity` | max funds rotated per unit time |
| `cycle_recurrence` | max repeat count of cycle path |
| `counterparty_compliance_avg` | average compliance of counterparties (future) |
| `counterparty_fraud_exposure` | fraction of counterparties flagged (future) |

| `gst_upi_receivables_gap` | cross-signal reconciliation engine |
| `ewb_smurfing_index` | e-way bill structuring detection |
| `pagerank_score` | hub-and-spoke centrality score |

all features are validated against the pydantic schema [`engineeredfeaturevector`](src/features/schemas.py:73) before storage.

---

## 7. graph-based fraud detection

### how the transaction graph is built

[`src/fraud/graph_builder.py`](src/fraud/graph_builder.py) constructs a **directed multigraph** using networkx:

- **nodes** = unique gstins (both `from_gstin` and `to_gstin`)
- **edges** = individual financial transactions with attributes: `amount`, `timestamp`, `txn_type`, `edge_id`
- **multigraph** = parallel edges allowed (same pair of gstins can have multiple transactions)

edge construction from upi data ([`upi_edges_from_transactions()`](src/fraud/graph_builder.py:106)):
- only **outbound + success** upi transactions become directed edges
- edge direction: `gstin → counterparty_vpa`

### cycle detection algorithm

[`src/fraud/cycle_detector.py`](src/fraud/cycle_detector.py) implements a multi-step fraud detection pipeline:

**step 1 — scc decomposition** ([`_extract_candidate_sccs()`](src/fraud/cycle_detector.py:66)):

only strongly connected components with **≥ 3 nodes** are candidates. uses `networkx.strongly_connected_components()` which implements tarjan's or kosaraju's algorithm in o(v + e).

**step 2 — bounded cycle enumeration** ([`_detect_cycles_in_scc()`](src/fraud/cycle_detector.py:78)):

```python
nx.simple_cycles(scc_graph, length_bound=5)
```

this uses the gupta-suzumura bounded algorithm with complexity proportional to $d^k$ (where $d$ = average degree, $k$ = length bound) rather than the exponential johnson algorithm.

**step 3 — cycle metric computation** ([`_compute_cycle_metrics()`](src/fraud/cycle_detector.py:88)):

for each detected cycle a→b→c→a:
- **cycle velocity** = total fund flow / window_days
- **cycle recurrence** = count of days where all pairs in the cycle had transactions
- **amount concentration** = cycle flow / total flow for participating nodes

**step 4 — participant flagging** ([`_flag_participants()`](src/fraud/cycle_detector.py:131)):

if `fraud_confidence > 0.5`, the gstin is flagged. confidence is a 50/50 blend of velocity and recurrence thresholds.

### topology conversion for frontend

[`src/fraud/topology_converter.py`](src/fraud/topology_converter.py) converts the networkx graph to json for the react frontend:
- **nodes**: `{id, label, fraud: bool}`
- **edges**: `{source, target, amount}` (parallel edges collapsed with summed amounts for `multigraph_to_json`)

---

## 8. ml model

### architecture: xgboost with histogram method

[`src/scoring/trainer.py`](src/scoring/trainer.py) trains an `xgbclassifier` with these hyperparameters:

| parameter | value | rationale |
|---|---|---|
| `tree_method` | `hist` | memory-efficient histogram-based splitting |
| `max_depth` | 6 | prevents overfitting on 250 samples |
| `learning_rate` | 0.1 | standard for moderate dataset size |
| `n_estimators` | 300 | with early stopping at 20 rounds |
| `subsample` | 0.8 | row subsampling for regularization |
| `colsample_bytree` | 0.8 | feature subsampling per tree |
| `eval_metric` | `["auc", "logloss"]` | dual metrics for validation |

### training pipeline

1. **load features** from `data/features/gstin=*/features.parquet` via [`load_feature_parquets()`](src/scoring/trainer.py:130)
2. **generate proxy labels** via rule-based [`generate_proxy_labels()`](src/scoring/trainer.py:86) — a continuous 0–1 score from 13 business rules + gaussian noise
3. **binarize** at threshold 0.5: label > 0.5 → high risk (1), else low risk (0)
4. **build feature matrix** from 46 feature columns ([`feature_columns`](src/scoring/trainer.py:14))
5. **train/val split**: 80/20 with `random_state=42`
6. **sparse conversion** if sparsity > 50% via [`to_sparse_if_needed()`](src/scoring/trainer.py:167)
7. **train** with eval set and early stopping
8. **persist** model as `data/models/xgb_credit.ubj` + `feature_columns.json` + `label_encoder.json`

### proxy label generation logic

the proxy labeling in [`generate_proxy_labels()`](src/scoring/trainer.py:86) uses 13 rules:

| condition | score adjustment |
|---|---|
| `fraud_ring_flag == 1` | +0.45 (near-certain default) |
| `filing_compliance_rate > 0.8 and gst_30d_value > 0` | −0.15 |
| `filing_compliance_rate < 0.3` | +0.20 |
| `upi_inbound_outbound_ratio > 1.5` | −0.10 |
| `upi_hhi > 0.6` | +0.15 (concentration risk) |
| `cash_buffer_days > 30` | −0.10 |
| `cash_buffer_days < 5` | +0.15 |
| `data_maturity_flag < 1.0` | +0.10 |
| `months_active_gst > 18` | −0.08 |
| `months_active_gst < 3` | +0.12 |
| `debit_failure_rate > 0.2` | +0.12 |
| `statutory_payment_regularity > 0.7` | −0.08 |
| gaussian noise n(0, 0.05) | added to all |

### score calibration

[`creditscorer._prob_to_score()`](src/scoring/model.py:62) maps xgboost probability to the cibil-aligned 300–900 scale:

$$s = \text{clip}(900 - 600 \times p_{default},\; 300,\; 900)$$

### risk band assignment

| band | score range | working capital | term loan | cgtmse |
|---|---|---|---|---|
| **very low risk** | 750–900 | up to ₹50 lakh | up to ₹1 crore |  eligible |
| **low risk** | 650–749 | up to ₹25 lakh | up to ₹50 lakh |  eligible |
| **medium risk** | 550–649 | up to ₹10 lakh | up to ₹25 lakh |  eligible |
| **high risk** | 300–549 | up to ₹5 lakh | not recommended |  (mudra eligible) |

### shap explainability

[`creditexplainer`](src/scoring/explainer.py) wraps `shap.treeexplainer`:

1. computes shap values for all 46 features
2. extracts **top 6 features by absolute shap magnitude**
3. labels each as `increases_risk` (positive shap) or `decreases_risk` (negative shap)
4. prepares **waterfall chart data** with base value + cumulative contributions

### llm translation

[`shaptranslator`](src/llm/translator.py) uses **phi-3-mini-128k-instruct** (q4_k_m quantization) via llama-cpp-python for cpu-only inference:

- prompt template: [`src/llm/prompts.py`](src/llm/prompts.py) using phi-3 `<|system|>...<|end|><|user|>...<|end|><|assistant|>` chat format
- output: 6 plain-language items (5 explanation bullets + 1 "path to prime" prescriptive action)
- throughput: ~2–4 tokens/second on cpu
- fallback when gguf absent: raw feature names + direction labels

---

## 9. api design

### endpoints

#### `post /score` — submit scoring request

**source**: [`src/api/routes.py`](src/api/routes.py:25)

| field | description |
|---|---|
| request body | `{"gstin": "22aaaaa0000a1z5"}` — validated by [`scorerequest`](src/api/schemas.py:12) |
| validation | exactly 15 ascii alphanumeric characters, uppercased |
| action | generates uuid task_id → pushes to `stream:score_requests` → creates `score:{task_id}` hash with status `pending` |
| response | http 202: `{"task_id": "...", "status": "pending", "estimated_wait_seconds": 30}` |

#### `get /score/{task_id}` — poll score result

**source**: [`src/api/routes.py`](src/api/routes.py:51)

| status | response |
|---|---|
| `pending` / `processing` | `{"task_id": "...", "status": "pending"}` |
| `complete` | full [`scoreresult`](src/api/schemas.py:42) payload with all 14 fields |
| `failed` | `{"task_id": "...", "status": "failed", "error": "..."}` |
| not found | http 404: `{"detail": "task not found"}` |

#### `get /health` — system health

**source**: [`src/api/routes.py`](src/api/routes.py:92)

returns [`healthresponse`](src/api/schemas.py:73): `{status, redis_connected, model_loaded, worker_queue_depth, system_ram_used_gb, system_ram_total_gb}`

### async saga worker

[`src/api/worker.py`](src/api/worker.py) is a **standalone async process** that consumes from `stream:score_requests` via `xreadgroup`:

```
┌─────────────┐    xreadgroup     ┌──────────────┐
│  fastapi     │  ← score_req ←   │  redis stream │
│  post /score │  → xadd →        │              │
└─────────────┘                   └──────┬───────┘
                                         │
                                    ┌────▼─────┐
                                    │  worker   │
                                    │  saga     │
                                    └────┬─────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                     ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
                     │features │   │ fraud   │   │xgboost  │
                     │ engine  │   │detector │   │ score   │
                     └─────────┘   └─────────┘   └────┬────┘
                                                      │
                                                 ┌────▼────┐
                                                 │  shap   │
                                                 │explain  │
                                                 └────┬────┘
                                                      │
                                                 ┌────▼────┐
                                                 │ phi-3   │
                                                 │ llm     │
                                                 └────┬────┘
                                                      │
                                                 ┌────▼────┐
                                                 │ redis   │
                                                 │ hset    │
                                                 └─────────┘
```

the saga has a **three-tier feature resolution fallback** ([`_resolve_feature_vector()`](src/api/worker.py:82)):
1. **cache hit**: read from `data/features/gstin=.../features.parquet`
2. **raw data**: compute features from `data/raw/*.parquet`
3. **demo fallback**: load a random cached gstin's features and relabel

if any saga step fails, the worker writes `status=failed` + error message and `xack`s the message — **no poison pill blocking**.

---

## 10. frontend dashboard

### technology stack

| technology | version | purpose |
|---|---|---|
| react | 18.3 | ui component library |
| vite | 5.4 | build tool and hmr dev server |
| custom css | — | hand-crafted design system (no tailwind runtime) |

the frontend uses **zero external ui component libraries**. all charts, data viz, and ui primitives are hand-built using svg and css.

### application architecture ([`frontend/src/app.jsx`](frontend/src/App.jsx))

the app uses **next.js app router**. the `app` directory drives which page renders. the dashboards are divided by intent (`/msme`, `/analyst`, `/admin`, `/risk`). all features operate via live api endpoints, with no critical data hardcoded on the client-side. see [frontend.md](frontend.md) for details.

### pages

#### 1. score report ([`frontend/app/msme/score-report/page.tsx`](frontend/app/msme/score-report/page.tsx))

- live status polling via `get /score/{task_id}`
- displays: credit score, risk band, msme category, data maturity, cgtmse/mudra eligibility badges
- shap waterfall visualizing the top impactful features

#### 2. fraud queue & topology ([`frontend/app/risk/fraud-queue/page.tsx`](frontend/app/risk/fraud-queue/page.tsx))

- **circular svg graph layout** — nodes placed on a regular polygon inscribed in a circle
- directed edges with arrowhead markers
- fraudulent nodes colored red with  badge
- falls back to single-node display when only the flagged gstin is available

#### 4. system health ([`frontend/src/pages/systemhealth.jsx`](frontend/src/pages/SystemHealth.jsx))

- auto-refreshes every 5 seconds via `get /health`
- 4-card grid: api status, redis connection, model loaded, worker queue depth
- ram usage progress bar with color thresholds (green < 65%, amber < 85%, red ≥ 85%)

### workflow pages

the app also includes a complete **loan officer workflow** with 10+ screens:
- login → role selection → gstin submission → score report → score history → application queue → applicant detail → decision form → comparison → shap explainability → signal explorer → model performance → dashboard

### api communication ([`frontend/src/lib/api.js`](frontend/src/lib/api.js))

three fetch wrappers targeting `http://localhost:8000`:

| function | method | endpoint |
|---|---|---|
| `scoreApi.submit(gstin)` | post | `/score` |
| `scoreApi.get(taskid)` | get | `/score/{taskid}` |
| `scoreApi.health()` | get | `/health` |

detailed mappings for other portals are in `frontend/dib/api.ts` and documentated in [frontend.md](frontend.md).

all throw on non-ok responses for consistent error handling.

---

## 11. judging criteria addressed

### scalability

| aspect | implementation | reference |
|---|---|---|
| **horizontal message bus** | redis streams with consumer groups — multiple workers can consume the same stream | [`src/api/worker.py`](src/api/worker.py:220) |
| **stateless api** | fastapi workers share nothing — all state in redis | [`src/api/main.py`](src/api/main.py:26) |
| **partitioned feature cache** | parquet files partitioned by gstin — scales to millions | [`src/features/engine.py`](src/features/engine.py:26) |
| **graph partitioning** | time-windowed partitioning when node count exceeds 50,000 | [`src/fraud/graph_builder.py`](src/fraud/graph_builder.py:92) |
| **memory pressure guards** | psutil-based ram monitoring in feature engine | [`src/features/engine.py`](src/features/engine.py:22) |
| **stream trimming** | `xadd maxlen ~ 10000` prevents unbounded redis growth | [`config/settings.py`](config/settings.py:22) |

### innovation

| innovation | detail |
|---|---|
| **three-signal fusion** | first system to fuse gst + upi + e-way bill for msme scoring |
| **graph-based circular fraud** | scc + bounded cycle enumeration on directed multigraphs |
| **llm-powered explanations** | local phi-3-mini translates shap vectors to plain language — no cloud api |
| **cibil-aligned scoring** | 300–900 scale with rbi-compliant cgtmse/mudra eligibility |
| **real-time dashboard** | custom svg visualizations for shap waterfall and fraud topology |

### practicality

- based on **official nic e-way bill json schema** (v1.0.0621) from [`ewaybillformats/`](ewaybillformats/)
- **gstin validation** follows the 15-character format: 2-digit state code + 10-char pan-like + entity + check
- **risk bands** align with cibil's official poor/average/good/excellent tiers
- **loan recommendations** follow rbi's no-collateral mandate up to ₹10 lakh and cgtmse coverage caps
- **hsn codes** are real 4-digit codes from the indian gst harmonized system

### feasibility

| what can be demonstrated live | status |
|---|---|
| synthetic data generation for 250 msmes |  works |
| feature engineering across 43 dimensions |  works |
| fraud detection with cycle enumeration |  works |
| xgboost model training and inference |  works |
| shap explainability |  works |
| rest api with async scoring |  works |
| react dashboard completely wired to live backend via `frontend/dib/api.ts` |  works |
| llm translation |  works (requires gguf download) |

### ease of use

```bash
# one command for everything
./scripts/run_online.sh
```

the system provides:
- **7 individual phase scripts** for granular control
- **one-command offline** pipeline for model development
- **one-command online** pipeline for full demo
- **role-based ui** with onboarding flow for first-time users
- **auto-polling** dashboard that updates in real time

### architecture

```
src/
├── ingestion/          # phase 1-2: generation + redis streaming
├── features/           # phase 3: polars feature engineering
├── fraud/              # phase 4: networkx graph fraud detection
├── scoring/            # phase 4: xgboost training + inference
├── llm/                # phase 6: phi-3 llm translation
├── api/                # phase 6: fastapi server + saga worker
└── dashboard/          # (streamlit stubs — replaced by react)

frontend/
├── app/              # next.js app router pages (/msme, /admin, etc.)
├── components/       # shadcn primitives + shared blocks
├── dib/              # api wrappers (api.ts) & auth contexts
└── hooks/            # async data hooks (useScore)

config/                 # settings + redis configuration
scripts/                # phase scripts + orchestration
tests/                  # pytest unit + integration tests
```

clean separation: each module has its own `__init__.py`, schemas, and single-responsibility classes.

### code quality

| quality measure | implementation |
|---|---|
| **type hints** | full type annotations on all function signatures |
| **pydantic v2 schemas** | validated schemas for all data types ([`src/features/schemas.py`](src/features/schemas.py), [`src/api/schemas.py`](src/api/schemas.py)) |
| **async/await** | all redis operations and api handlers are async |
| **test coverage** | 25+ tests across api, features, fraud, scoring, and llm parsing |
| **docstrings** | every function has a docstring describing behaviour |
| **no global mutable state** | all configuration via pydantic-settings ([`config/settings.py`](config/settings.py)) |

### maintainability

| aspect | implementation |
|---|---|
| **config-driven** | all paths, thresholds, stream names in [`config/settings.py`](config/settings.py) via environment variables |
| **modular phases** | each phase is an independent python module runnable standalone |
| **parquet-based** | feature cache uses open parquet format — tools like duckdb or spark can read it |
| **fallback chains** | three-tier feature resolution; llm fallback to raw features; demo mode for missing data |
| **idempotent operations** | consumer group creation ignores `busygroup`; cache overwrites safely |

---

## 12. running the system

### prerequisites

| requirement | minimum |
|---|---|
| **python** | ≥ 3.11 |
| **node.js** | ≥ 18 |
| **redis** | ≥ 7.0 |
| **ram** | 12 gb recommended |
| **os** | linux (tested on arch linux 6.19) |

### installation

```bash
# clone the repository
git clone https://github.com/your-org/miku-miku-rabbit-beam.git
cd miku-miku-rabbit-beam

# create python environment (conda/mamba)
conda create -n credit-scoring python=3.11
conda activate credit-scoring

# install python dependencies
pip install -e .

# install frontend dependencies
cd frontend && pnpm install && cd ..
```

### optional: download phi-3 llm

for llm-powered plain-language explanations (not required — system falls back gracefully):

```bash
# download phi-3-mini gguf to data/models/
mkdir -p data/models
# place phi-3.1-mini-128k-instruct-q4_k_m.gguf in data/models/
```

### one-command offline run

```bash
./scripts/run_offline.sh
```

runs: **generate data → compute features → train model → run tests**

no redis required. no api server. perfect for model development.

### one-command online run

```bash
./scripts/run_online.sh
```

runs: **start redis → generate data → stream to redis → compute features → train → tests → start api (background) → start frontend**

open `http://localhost:5173` to access the dashboard.

### individual phase scripts

| script | phase | what it does |
|---|---|---|
| [`scripts/phase1_generate.sh`](scripts/phase1_generate.sh) | 1 | generate synthetic data to `data/raw/` |
| [`scripts/phase2_redis_ingest.sh`](scripts/phase2_redis_ingest.sh) | 2 | stream parquets into redis (requires redis running) |
| [`scripts/phase3_features.sh`](scripts/phase3_features.sh) | 3 | compute features from raw data, write to `data/features/` |
| [`scripts/phase4_train.sh`](scripts/phase4_train.sh) | 4 | train xgboost model, save to `data/models/` |
| [`scripts/phase5_tests.sh`](scripts/phase5_tests.sh) | 5 | run full pytest suite |
| [`scripts/phase6_api.sh`](scripts/phase6_api.sh) | 6 | start fastapi server on port 8000 |
| [`scripts/phase7_frontend.sh`](scripts/phase7_frontend.sh) | 7 | install pnpm deps + start frontend dev server on port 3000 |

### environment variables

all configurable via `.env` file or environment variables ([`config/settings.py`](config/settings.py)):

| variable | default | description |
|---|---|---|
| `redis_url` | `redis://localhost:6379/0` | redis connection string |
| `redis_max_memory_mb` | `2048` | redis memory limit |
| `max_polars_memory_mb` | `3072` | polars memory ceiling |
| `max_networkx_memory_mb` | `1536` | networkx graph memory ceiling |
| `parquet_cache_path` | `data/features` | feature cache directory |
| `raw_data_path` | `data/raw` | raw data directory |
| `models_path` | `data/models` | model artifacts directory |
| `graphs_path` | `data/graphs` | graph edge parquets |
| `xgb_model_path` | `data/models/xgb_credit.ubj` | xgboost model file |
| `phi3_model_path` | `data/models/phi-3.1-mini-128k-instruct-q4_k_m.gguf` | phi-3 gguf path |
| `uvicorn_workers` | `2` | api server worker count |
| `stream_maxlen` | `10000` | redis stream max length |
| `consumer_group` | `cg_feature_engine` | consumer group name |

### testing

```bash
# run all tests
python -m pytest tests/ -v

# run specific test modules
python -m pytest tests/test_features.py -v    # feature engineering tests
python -m pytest tests/test_fraud.py -v       # fraud detection tests
python -m pytest tests/test_scoring.py -v     # scoring model tests
python -m pytest tests/test_api.py -v         # api integration tests (requires redis)
```

---

## license

see [license](LICENSE) for details.

---

<p align="center">
  <strong>creditiq</strong> — built for the ignisia hackathon<br>
  <em>miku-miku-rabbit-beam</em>
</p>
