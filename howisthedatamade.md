# Synthetic Data Generation Protocol

> **Rationale:** Real row-level financial transactions (GST/UPI/EWB) are strictly confidential under Indian data privacy laws. This protocol defines the mathematical generation of cryptographically valid synthetic datasets used to train CreditIQ.

---

## Table of Contents

1. [Schema References & Compliance](#1-schema-references--compliance)  
2. [Profile Variance Strategy](#2-profile-variance-strategy)  
3. [Mathematical Variable Constraints](#3-mathematical-variable-constraints)  
4. [Architectural Decisions](#4-architectural-decisions)  
5. [Target Variables & Real-World Transition Strategy](#5-target-variables--real-world-transition-strategy)

---

## 1. Schema References & Compliance

The synthetic generator strictly enforces compliance with official Indian government and financial infrastructure specifications.

| Domain | Authority / Source | Application / Enforcement |
|---|---|---|
| **E-Way Bills** | NIC (v1.0.0621 schema) | Validates `transdistance` (0–4000 km), `transmode` (1–4), `supplytype` (O/I) |
| **GST Returns** | GSTN / GSTR-1 specs | Structurally valid 15-character GSTINs; enforcement of GSTR-1 11th-of-month filing delays |
| **Commodities** | Official GST rate books | 8 distinct sectors mapped to exact 4–8 digit HSN codes |
| **State Details** | Indian Government | Exact 2-digit state codes (e.g., `06` for Haryana, `27` for Maharashtra) |
| **Payments** | NPCI UPI standards | Authentic VPA structures (`@sbi`), strict `P2P`/`P2M` and failure status enumerations |

---

## 2. Profile Variance Strategy

To prevent model overfitting and accurately train the graph fraud detector, the dataset utilizes 5 distinct, mathematically weighted MSME personas.

| Profile Type | Weight | Behavioral Characteristics |
|---|---|---|
| `genuine_healthy` | 40% | High compliance (85% on-time GST). Balanced UPI ratio. Stable EWB logic (50–2000 km, sector-consistent HSN). |
| `genuine_struggling` | 25% | Low transaction velocity. High variance in GST delays. Heavy `failed_funds` rates indicating cash stress. |
| `shell_circular` | 15% | **Fraud target.** Rotates funds in directed rings (3–4 entities). 0% P2M. Utilizes burst-mode time clusters. |
| `paper_trader` | 10% | **Fraud target.** Extreme EWB volumes. Intentionally broken `transdistance` (1–5 km) to simulate fake movement. Cross-sector HSN abuse. |
| `new_to_credit` | 10% | Vintage < 6 months. High temporal sparsity. |

---

## 3. Mathematical Variable Constraints

Values are strictly governed by specific probability density functions and constraints rather than uniform random distributions.

### Continuous Variables (Amounts)
- **Lognormal distributions**: Evaluated via `numpy.random.lognormal(mean, sigma)`  
- **Application**: Realistic heavy-tail skews matching retail reality. Ensures massive fraud ring transfers (`shell_circular`: μ = 11.5, σ = 0.5) organically contrast baseline retail (`genuine_healthy`: μ = 10.8, σ = 0.8)

### Temporal Variables (Timestamps)
- **Exponential inter-arrival times**: Simulates organic Poisson process wait times for standard commerce  
- **Gaussian burst clustering**: Applied specifically to `shell_circular` profiles to mimic coordinated 2–3 day money laundering spikes  

### Categorical Definitions (Graph Edges)
- **Edge routing weights**:  
  - Healthy profiles: 70% random pool / 30% URP (Unregistered Person) split  
  - Fraud profiles: 70% hard-routed loop explicitly to their assigned ring-ID entity to enforce closed circular multigraph cycles  

---

## 4. Architectural Decisions

| Technology | Rejected Alternative | Rationale |
|---|---|---|
| **Python generative (NumPy)** | LLMs (GPT-4) | Deterministic cycle creation requires strict mathematical graphs. LLMs fail foreign-key relational constraints at 100k+ row scales. NumPy executes in <1.0s. |
| **Parquet** | CSV or SQL inserts | Parquet preserves critical data types (preventing 15-digit EWB numeric parsing errors) and reduces disk I/O significantly via columnar compression |
| **SDV Gaussian Copula** | Random field fills | Uses `GaussianCopulaSynthesizer` to model cross-field correlations between business parameters (age, invoice frequency, UPI rate, P2M ratio, filing delays). Produces 250 profiles where, e.g., high `business_age_months` correlates with lower `filing_delay_mean`. Time-series transactions are then generated from these copula-derived profiles using NumPy distributions |

---

## 5. Target Variables & Real-World Transition Strategy

### The Non-Linear Policy Distillation Model

Instead of lacking labels, we framed this as a feature: the XGBoost model acts as a **Non-Linear Policy Distillation Engine**. We encoded standard banking risk policies into a noisy synthetic target in `src/scoring/trainer.py`, and used XGBoost to distill those hard rules into a smooth, non-linear probability surface.

This is an intentional structural design to validate the end-to-end streaming architecture:

`redis → polars → xgboost → shap → llm → fastapi`

without requiring true historical loan defaults.

---

### Real-World NBFC Data Constraints

Acquisition of real row-level financial histories (true non-performing assets, UPI handles, GSTINs) is blocked during development due to:

- **Indian data privacy laws (DPDP Act) & NDAs:** Financial data constitutes highly sensitive PII requiring strict ISO 27001 compliance and legal contracts  
- **Proprietary risk models:** True target variables (who defaulted vs who repaid) represent the core intellectual property of banks and NBFCs  

---

### Path to True Production

The architecture functions as a scalable "empty pipeline with a synthetic heartbeat." To transition to production alongside a partnered lender:

1. Remove the synthetic `generate_proxy_labels` function entirely  
2. Connect secure NBFC environments (AWS S3 / Kafka streams) directly to the Polars ingestion engine  
3. Allow the XGBoost model to dynamically learn true institutional risk patterns without rewriting feature engineering, inference, or dashboard layers  
