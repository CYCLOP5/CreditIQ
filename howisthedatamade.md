# synthetic data generation protocol

> **rationale:** real row-level financial transactions (gst/upi/ewb) are strictly confidential under indian data privacy laws. this protocol defines the mathematical generation of cryptographically valid synthetic datasets used to train creditiq.

---

## table of contents

1. [schema references & compliance](#1-schema-references--compliance)
2. [profile variance strategy](#2-profile-variance-strategy)
3. [mathematical variable constraints](#3-mathematical-variable-constraints)
4. [architectural decisions](#4-architectural-decisions)

---

## 1. schema references & compliance

the synthetic generator strictly enforces compliance with official indian government and financial infrastructure specifications.

| domain | authority / source | application / enforcement |
|---|---|---|
| **e-way bills** | nic (v1.0.0621 schema) | validates `transdistance` (0-4000km), `transmode` (1-4), `supplytype` (o/i) |
| **gst returns** | gstn / gstr-1 specs | structurally valid 15-char gstins; enforcement of gstr-1 11th-of-month filing delays |
| **commodities** | official gst rate books | 8 distinct sectors mapped to exact 4-to-8 digit hsn codes |
| **state details** | indian government | exact 2-digit state codes (e.g., `06` for haryana, `27` for maharashtra) |
| **payments** | npci upi standards | authentic vpa structures (`@sbi`), strict `p2p`/`p2m` and failure status enumerations |

---

## 2. profile variance strategy

to prevent model overfitting and accurately train the graph fraud detector, the dataset utilizes 5 distinct, mathematically weighted msme personas.

| profile type | weight | behavioral characteristics |
|---|---|---|
| `genuine_healthy` | 40% | high compliance (85% on-time gst). balanced upi ratio. stable ewb logic (50–2000 km, sector-consistent hsn). |
| `genuine_struggling` | 25% | low transaction velocity. high variance in gst delays. heavy `failed_funds` rates indicating cash stress. |
| `shell_circular` | 15% | **fraud target.** rotates funds in directed rings (3-4 entities). 0% p2m. utilizes burst-mode time clusters. |
| `paper_trader` | 10% | **fraud target.** extreme ewb volumes. intentionally broken `transdistance` (1-5 km) to simulate fake movement. cross-sector hsn abuse. |
| `new_to_credit` | 10% | vintage < 6 months. high temporal sparsity. |

---

## 3. mathematical variable constraints

values are strictly governed by specific probability density functions and constraints rather than uniform random distributions.

### continuous variables (amounts)
- **lognormal distributions**: evaluated via `numpy.random.lognormal(mean, sigma)`. 
- **application**: realistic heavy-tail skews matching retail reality. ensures massive fraud ring transfers (`shell_circular`: $\mu=11.5$, $\sigma=0.5$) organically contrast baseline retail (`genuine_healthy`: $\mu=10.8$, $\sigma=0.8$).

### temporal variables (timestamps)
- **exponential inter-arrival times**: simulates organic poisson process wait times for standard commerce.
- **gaussian burst clustering**: applied specifically to `shell_circular` profiles to mimic coordinated 2-3 day money laundering spikes.

### categorical definitions (graph edges)
- **edge routing weights**: healthy profiles utilize a 70% random pool / 30% urp (unregistered person) split. fraud profiles dictate a 70% hard-routed loop explicitly to their assigned ring id entity to enforce closed circular multigraph cycles.

---

## 4. architectural decisions

| technology | rejected alternative | rationale |
|---|---|---|
| **python generative (numpy)** | llms (gpt-4) | deterministic cycle-creation requires strict mathematical graphs. llms fail foreign-key relational constraints at 100k+ row scales. numpy triggers in <1.0s. |
| **parquet** | csv or sql inserts | parquet preserves critical data types (preventing 15-digit ewb numeric parsing errors) and reduces disk i/o significantly via columnar compression. |
| **sdv gaussian copula** | random field fills | the generator uses SDV `GaussianCopulaSynthesizer` to model cross-field correlations between business parameters (age, invoice frequency, UPI rate, P2M ratio, filing delays). this produces 250 profiles where e.g. high `business_age_months` naturally correlates with lower `filing_delay_mean`. the time-series transactions are then generated from these copula-derived profiles using numpy distributions. |
---

## 5. target variables & real-world transition strategy

### The Non-Linear Policy Distillation Model
Instead of lacking labels, we framed this as a feature: the XGBoost model acts as a **Non-Linear Policy Distillation Engine**. We encoded standard banking risk policies into a noisy synthetic target in `src/scoring/trainer.py`, and used XGBoost to distill those hard rules into a smooth, non-linear probability surface. this is an intentional structural design to validate the end-to-end streaming architecture (redis → polars → xgboost → shap → llm → fastapi) without requiring true historical loan defaults. 

### real-world nbfc data constraints
acquisition of real row-level financial histories (true non-performing assets, upi handles, gstins) is physically blocked during development due to:
* **indian data privacy laws (dpdp act) & ndas:** financial data constitutes highly sensitive pii requiring strict iso 27001 verifications and legal contracts.
* **proprietary risk models:** true target variables (who defaulted vs who repaid) represent the core intellectual property of banks and nbfcs.

### path to true production
the architecture functions as a massive, scalable "empty pipeline with a synthetic heartbeat". to transition to production alongside a partnered lender:
1. drop the synthetic `generate_proxy_labels` function entirely.
2. reconnect secure nbfc environments (aws s3 / kafka streams) directly to the polars ingestion engine.
3. the xgboost model dynamically transitions to learning true institutional risk patterns without rewriting the feature engineering, inference, or dashboard layers.
