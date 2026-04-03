# Mathematical Foundations & Algorithms

This document outlines the mathematical formulas and algorithms used in the CreditIQ MSME Credit Scoring Engine.

## 1. Feature Engineering Formulas

### Temporal Decay EMAs (Exponential Moving Averages)
All velocity, ratio, and concentration features use Exponential Moving Averages (EMA) with temporal decay. This eliminates the cliff effect where a transaction at day 31 drops from full weight to zero weight at the window boundary.

**EMA-weighted sum** (for GST/EWB values):
$$V_{ema}(g, \tau) = \sum_{i} x_i \cdot e^{-\lambda \cdot (t_{now} - t_i)} \quad \text{where } \lambda = \frac{\ln(2)}{\tau}$$

A transaction at exactly $\tau$ days ago contributes **50%** of its original weight. At $2\tau$ → 25%, $3\tau$ → 12.5%.

**EMA-weighted count** (for UPI transaction counts):
$$N_{ema}(g, \tau) = \sum_{i} e^{-\lambda \cdot (t_{now} - t_i)}$$

**EMA-weighted unique count** (for counterparty diversity):
$$U_{ema}(g, \tau) = \sum_{k \in \text{unique\_keys}} \max_{i : \text{key}_i = k} e^{-\lambda \cdot (t_{now} - t_i)}$$

Each unique entity contributes its most recent (highest-weight) observation.

**Half-life mapping**:
| Feature suffix | Half-life $\tau$ | Signal |
|---|---|---|
| `_7d_*` | 7 days | Short-term pulse |
| `_30d_*` | 30 days | Monthly cadence |
| `_90d_*` | 90 days | Quarterly trend |

### Cadence & Filing Intervals
To measure the consistency of filings and transactions:
- **Mean Filing Interval**: $\mu = E\left[\frac{t_{i+1} - t_i}{86400}\right]$ across timestamps.
- **Standard Deviation of Intervals**: $\sigma = \sqrt{\text{Var}\left[\frac{t_{i+1} - t_i}{86400}\right]}$
- **Filing Delay Trend**: $\Delta = \text{delay}_{last} - \text{delay}_{first}$ *(positive = worsening, negative = improving)*

### Herfindahl-Hirschman Index (HHI)
Measures the counterparty concentration for UPI transactions. A high HHI indicates reliance on a small number of counterparties.
$$HHI_{30d}^{UPI}(g) = \sum_{j=1}^{N} s_j^2 \quad \text{where } s_j = \frac{n_j}{\sum_k n_k}$$

### Revenue Coefficient of Variation
Measures revenue stability using the ratio of standard deviation to the mean.
$$CV = \frac{\sigma(\text{monthly revenue})}{\max(\mu(\text{monthly revenue}), 1.0)}$$

### Shannon Entropy
Captures the diversity of HSN (Harmonized System of Nomenclature) codes in E-Way Bills over a 90-day period. High entropy means trading across diverse product sectors.
$$H_{90d}^{HSN}(g) = -\sum_{h=1}^{M} p_h \ln(p_h)$$

### Cash Buffer Days
Estimates the MSME's runway using daily outflow. Computed under RBI/working-capital evaluation norms.
$$\text{Daily Outflow} = \frac{\text{Outbound 30-day Amount}}{30}$$
$$\text{Cash Buffer Days} = \min\left(\frac{\text{Inbound 30-day Amount}}{\text{Daily Outflow}}, 90.0\right)$$

### Statutory Payment Regularity Score
Measures compliance behavior scaled backwards towards 1.0.
$$\text{Score} = \max\left(0.0, 1.0 - \min\left(\frac{\text{Avg Delay in Days}}{30.0}, 1.0\right)\right)$$

## 2. Fraud Detection Metrics

### Cycle Velocity
Calculates the rate at which funds circulate within a detected fraudulent ring (cycle).
$$\text{Cycle Velocity} = \frac{\text{Total Flow in Cycle}}{\max(\text{Window Days}, 1)}$$

### Fraud Confidence Score
A blended 0-1 score indicating the probability that a GSTIN is participating in a circular trading fraud ring. It combines the normalized maximum velocity and recurrence metrics.
$$C_f(g) = \min\!\left(1.0,\; \frac{v_{max}}{\theta_v} \cdot 0.5 + \min\!\left(\frac{r_{max}}{\theta_r},\, 1.0\right) \cdot 0.5\right)$$
*(where $\theta_v$ and $\theta_r$ are the velocity and recurrence thresholds respectively)*

## 3. Credit Scoring Model

### Risk Probability to CIBIL-Aligned Score
The XGBoost model outputs a default probability $P(\text{default})$. This is linearly mapped to the standard 300–900 CIBIL-like credit score scale.
$$S = \text{clip}(900 - 600 \times P_{\text{default}},\; 300,\; 900)$$

### Proxy Label Generation Algorithm
To bootstrap the scoring engine without historical ground-truth defaults, a synthetic rule-based expert framework creates proxy labels with base probability 0.5:
1. **Fraud Flag**: Score +0.45.
2. **Positive Compliance**: Filing rate > 0.8 reduces score by 0.15.
3. **Negative Compliance**: Filing rate < 0.3 increases score by 0.20.
4. **Concentration Risk**: UPI HHI > 0.6 increases score by 0.15.
5. **Cash Buffer**: Buffer > 30 days (-0.10); Buffer < 5 days (+0.15).
6. **Maturity Level**: > 18 months (-0.08); < 3 months (+0.12).
7. **Transaction Health**: Demerit points for high debit failure rates (+0.12) and statutory payment delays (-0.08 if highly regular).
8. Gaussian noise $N(0, 0.05)$ is added to ensure continuity. All values are clipped safely between $[0.05, 0.95]$.


### Regulatory-Constrained Expected Loss (EL) Based Loan Sizing
Instead of purely static rule-based limits, the core engine calculates the algorithmic exposure capacity using Expected Loss:
$$EL = P(\text{default}) \times \text{LGD} \times \text{Exposure}$$
$$\text{Max Algorithmic Loan} = \frac{\text{Risk Appetite}}{P(\text{default}) \times \text{LGD}}$$

To ensure complete banking compliance, this algorithmic capacity is then policy-gated and clamped to the MSME bounds (e.g., CGTMSE 50 Lakh limit):
$$\text{Final Recommended Loan} = \min(\text{Max Algorithmic Loan}, \text{Regulatory Cap})$$

### Multidimensional Nearest-Neighbor Imputation
To alleviate penalties on newly incorporated MSMEs displaying sparse GST filing history, the system performs a localized k-nearest-neighbor (KNN) imputation:
$$\mathbf{X}_{GST}^{(g)} = \frac{1}{k} \sum_{j \in \text{Neighbors}(g)} \mathbf{X}_{GST}^{(j)}$$
where $\text{Neighbors}(g)$ are selected using an Euclidean distance mapped via the UPI volume features $(\mathbf{X}_{UPI})$.

### Temporal Isolation Forest Anomaly Detection
Detects statistically rigid cadence typical of programmatic robotic shell entities.
Given interval deviations across streams (e.g. $\sigma_{GST\_interval}$, $\sigma_{UPI\_interval}$):
The `IsolationForest` splits the data via random thresholds across normal standard deviation boundaries. Anomalously short or highly rigid intervals (low variance) require fewer splits to be isolated.
$$s(\mathbf{x}, n) = 2^{-\frac{E(h(\mathbf{x}))}{c(n)}}$$
If $s(\mathbf{x}, n) > 0.5$ threshold, $x$ is flagged as a temporal anomaly.


### Cross-Signal Reconciliation Engine
Checks for Accounts Receivable bottlenecks by computing the discrepancy between accrued ledger value (GST) and actual cash realization (UPI):
$$\text{Receivables Gap} = \frac{\text{GST 30d Value} - \text{UPI 30d Inbound}}{\max(\text{GST 30d Value}, 1.0)}$$

### E-Way Bill Smurfing Index
Models intentional transaction structuring to evade the strict ₹50,000 regulatory mandate for e-way bills:
$$\text{Smurfing Index} = \frac{|\text{EWBs where } 45000 \leq \text{value} < 50000|}{|\text{Total EWBs}|}$$

### Hub-and-Spoke Bipartite Topology (PageRank)
Beyond simple cycles, we calculate Eigenvector Centrality (PageRank) across the directed UPI network to flag high-centrality money mules with zero GST footprint.

### Hub-and-Spoke Shell Hub Identification
If an MSME exhibits highly centralized cash inflows via Eigenvector Centrality but lacks a fundamental tax accrued footprint, it is deterministically trapped:
$$ \text{Fraud Flag} = \text{True}, \quad \text{Confidence} \to 0.95 \quad \text{if } (\text{PageRank} > 0.1 \land \text{months\_active\_gst} = 0) $$
