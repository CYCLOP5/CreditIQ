# test suite documentation

## overview

the credit scoring engine test suite contains **36 test cases** across **3 test files**. tests cover the full stack: api endpoints, feature engineering (including EMA decay), fraud detection graph algorithms, and scoring/explainability layers.

run all tests:

```bash
python -m pytest tests/ -v
```

requires: `pytest`, `pytest-asyncio`, `httpx`, and a running redis server (for api tests).

---

## test files

| file | tests | focus area |
|---|---|---|
| `tests/test_api.py` | 6 | fastapi http endpoints, redis integration, request validation |
| `tests/test_features.py` | 9 | feature engine, ema decay, hhi concentration, compliance rates |
| `tests/test_fraud.py` | 8 | cycle detection, graph construction, edge filtering, fraud merging |
| `tests/test_scoring.py` | 13 | proxy labels, score mapping, shap explainability, band boundaries |

---

## tests/test_api.py — api endpoint integration tests

uses `httpx.AsyncClient` with ASGI transport against the real fastapi app. a real redis connection is injected into `app.state.redis` via the `real_redis` fixture. each test cleans up its redis keys after execution.

### test_health_returns_200

**what it tests:** the `GET /health` endpoint returns a 200 response with all expected health fields.

**assertions:**
- status code is 200
- `status` is `"ok"`
- `redis_connected` is `True` (real redis is running)
- `model_loaded` is a boolean
- `worker_queue_depth` is an integer
- `system_ram_used_gb` and `system_ram_total_gb` are floats

### test_submit_score_returns_202_for_valid_gstin

**what it tests:** `POST /score` with a valid 15-character gstin returns 202 accepted.

**assertions:**
- status code is 202
- response contains `task_id` (uuid4, 36 chars)
- `status` is `"pending"`
- `estimated_wait_seconds` is an integer

### test_submit_score_rejects_invalid_gstin

**what it tests:** `POST /score` with a gstin shorter than 15 characters gets rejected by pydantic validation.

**assertions:**
- status code is 422 (unprocessable entity)

### test_get_score_nonexistent_task_returns_404

**what it tests:** `GET /score/{task_id}` for a task_id that doesn't exist in redis.

**assertions:**
- status code is 404
- response detail contains `"task not found"`

### test_get_score_pending_task_returns_200_pending

**what it tests:** `GET /score/{task_id}` when the task exists but is still pending.

**setup:** seeds a redis hash directly with `status: pending`.

**assertions:**
- status code is 200
- `status` is `"pending"`
- `task_id` matches the seeded value

### test_get_score_complete_task_returns_full_result

**what it tests:** `GET /score/{task_id}` when the task has completed with a full scoring payload.

**setup:** seeds a complete redis hash with all score fields (credit_score=723, risk_band=low_risk, etc.).

**assertions:**
- status code is 200
- `credit_score` is 723
- `risk_band` is `"low_risk"`
- `top_reasons` has exactly 5 items
- `cgtmse_eligible` is True, `mudra_eligible` is False
- `fraud_flag` is False
- `msme_category` is `"small"`

---

## tests/test_features.py — feature engine unit tests

tests the `FeatureEngine` class directly using synthetic polars DataFrames. helper functions `make_gst_df`, `make_upi_df`, `make_ewb_df` generate realistic test data with controlled parameters.

### test_feature_engine_returns_vector_for_known_gstin

**what it tests:** the engine successfully computes a feature vector from 3-month synthetic data (100 GST invoices, 30 inbound + 10 outbound UPI txns, 20 eway bills).

**assertions:**
- result is an `EngineeredFeatureVector` instance
- `upi_30d_inbound_count > 0`
- `gst_30d_value > 0`
- `data_completeness_score == 1.0` (all 3 signal types present)
- `data_maturity_flag == 1.0` (≥3 months history)

### test_feature_engine_empty_data_returns_zeros

**what it tests:** when all three input DataFrames are empty (no data for the gstin), the engine returns safe zero-filled values instead of crashing.

**assertions:**
- `gst_30d_value == 0.0`
- `upi_30d_inbound_count == 0.0`
- `fraud_ring_flag == False`
- `data_completeness_score == 0.0`

### test_upi_hhi_high_concentration

**what it tests:** when all 20 inbound UPI transactions come from a single counterparty (`singlevendor@upi`), HHI approaches 1.0 (perfect concentration).

**assertions:**
- `upi_hhi_30d >= 0.9`

### test_upi_hhi_low_concentration

**what it tests:** when inbound UPI transactions come from 20 different counterparties, HHI is low (diversified).

**assertions:**
- `upi_hhi_30d < 0.2`

### test_filing_compliance_rate_all_ontime

**what it tests:** when all GST filings have `filing_status = "ontime"`, compliance rate is perfect.

**assertions:**
- `filing_compliance_rate == 1.0`

### test_filing_compliance_rate_all_late

**what it tests:** when all GST filings have `filing_status = "delayed"`, compliance rate is zero.

**assertions:**
- `filing_compliance_rate == 0.0`

### test_upi_outbound_failure_rate

**what it tests:** with 5 successful and 5 failed outbound UPI transactions, the failure rate is approximately 50%.

**assertions:**
- `upi_outbound_failure_rate ≈ 0.5` (within ±0.05 tolerance for EMA weighting)

### test_data_maturity_flag_below_threshold

**what it tests:** with only 40 GST invoices spread over a short period (fewer than 3 active months), the maturity flag is 0.

**assertions:**
- `data_maturity_flag == 0.0`

### test_ema_no_cliff_effect

**what it tests:** **the key EMA regression test**. creates two GST invoices: one at "now" (₹10,000) and one 31 days before "now" (₹1,00,000). with the old hard-cutoff logic, the day-31 invoice would be excluded entirely from `gst_30d_value` (returning only 10,000). with EMA (half-life=30), the day-31 invoice still contributes ≈47.7% of its weight.

**assertions:**
- `gst_30d_value > 10000.0` (day-31 transaction contributes)
- `gst_30d_value < 110000.0` (EMA decay reduces it below full value)
- `gst_30d_value ≈ 57711.0` (expected: 10000×1.0 + 100000×e^(-ln2/30×31), within 5%)

---

## tests/test_fraud.py — fraud graph detection tests

tests the `CycleDetector`, `FraudGraphBuilder`, and associated graph algorithms. uses networkx `MultiDiGraph` structures.

### test_cycle_detection_finds_simple_ring

**what it tests:** a 3-node circular graph (A→B→C→A) repeated 10 times is detected as a fraud ring.

**assertions:**
- all 3 nodes have `fraud_ring_flag == True`

### test_cycle_detection_no_cycle_in_dag

**what it tests:** a directed acyclic graph (A→B→C, no closing edge) produces no fraud flags.

**assertions:**
- all nodes have `fraud_ring_flag == False`

### test_cycle_detection_4_node_ring

**what it tests:** a 4-node ring (A→B→C→D→A) is detected within the max cycle length bound of 5.

**assertions:**
- all 4 nodes have `fraud_ring_flag == True`

### test_upi_edges_from_transactions_filters_correctly

**what it tests:** the edge extraction function only includes outbound+success UPI transactions as graph edges.

**setup:** 3 transactions — 1 outbound+success, 1 inbound+success, 1 outbound+failed_funds.

**assertions:**
- result DataFrame has exactly 1 row (only the outbound+success edge)

### test_graph_builder_incremental_add

**what it tests:** `add_edges_incremental` appends new edges to an existing graph without losing prior edges.

**assertions:**
- after adding 1 edge to a 2-edge graph, total edges = 3

### test_merge_fraud_into_features

**what it tests:** the `merge_fraud_into_features` function correctly updates fraud fields on `EngineeredFeatureVector` instances.

**assertions:**
- `fraud_ring_flag == True`
- `fraud_confidence ≈ 0.8`

### test_cycle_detector_confidence_high_velocity

**what it tests:** fraud confidence is high (>0.5) when cycle velocity is large (₹1 crore per edge × 10 repeats).

**assertions:**
- `fraud_confidence > 0.5` for all nodes in the ring

### test_partition_by_time_window

**what it tests:** `partition_by_time_window` splits edge DataFrames into correct 7-day windowed batches.

**assertions:**
- at least 2 partitions are created
- each partition has non-zero rows

---

## tests/test_scoring.py — scoring model & explainability tests

uses unittest-style test classes. tests scoring math, proxy label generation, shap explainers, and band boundary correctness.

### TestProxyLabelFraudFlag::test_proxy_label_fraud_flag

**what it tests:** a feature vector with `fraud_ring_flag=1` generates a proxy label > 0.8 (high default probability).

**assertions:**
- label > 0.8

### TestProxyLabelCompliant::test_proxy_label_compliant

**what it tests:** a healthy MSME profile (high compliance, good cash buffer, no fraud, 24 months active) generates a low default probability.

**assertions:**
- label < 0.35

### TestProbToScoreRange::test_prob_to_score_range

**what it tests:** all probabilities between 0.0 and 1.0 map to scores within the 300-900 range.

**assertions:**
- for each probability in [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]: 300 ≤ score ≤ 900

### TestProbToScoreRange::test_prob_zero_is_max_score

**what it tests:** `P(default)=0.0` (no risk) maps to the maximum score of 900.

**assertions:**
- `_prob_to_score(0.0) == 900`

### TestProbToScoreRange::test_prob_one_is_min_score

**what it tests:** `P(default)=1.0` (certain default) maps to the minimum score of 300.

**assertions:**
- `_prob_to_score(1.0) == 300`

### TestScoreToBandBoundaries::test_score_to_band_boundaries

**what it tests:** exact boundary correctness for all 4 risk bands.

**assertions:**
- 300 → `high_risk`, 549 → `high_risk`
- 550 → `medium_risk`, 649 → `medium_risk`
- 650 → `low_risk`, 749 → `low_risk`
- 750 → `very_low_risk`, 900 → `very_low_risk`

### TestTopKFeaturesCount::test_top_k_features_count

**what it tests:** `top_k_features(k=6)` returns exactly 6 items from a 40-feature shap row.

**assertions:**
- `len(result) == 6`

### TestTopKFeaturesStructure::test_top_k_features_structure

**what it tests:** each item returned by `top_k_features` has the required keys and valid values.

**assertions:**
- each item has keys: `feature_name`, `shap_value`, `direction`, `abs_magnitude`
- `direction` is either `"increases_risk"` or `"decreases_risk"`
- `abs_magnitude >= 0.0`

### TestParseLlmOutput5Lines::test_parse_llm_output_5_lines

**what it tests:** a well-formed 5-line LLM output is parsed into exactly 6 strings (5 + padded "Path to Prime").

**assertions:**
- `len(result) == 6`
- all items are non-empty strings

### TestParseLlmOutputTooFew::test_parse_llm_output_too_few

**what it tests:** a 3-line LLM output is padded to exactly 6 items with fallback messages.

**assertions:**
- `len(result) == 6`
- `result[3] == "insufficient signal data for this factor"`

### TestWaterfallDataStructure::test_waterfall_data_structure

**what it tests:** `waterfall_data` returns the expected structure for SHAP waterfall charts.

**assertions:**
- result contains keys: `base_value`, `contributions`, `final_prediction`
- `contributions` has 10 items (matching input feature count)
- `final_prediction == base_value + sum(shap_values)` (within 5 decimal places)
- each contribution has keys: `feature`, `shap_value`, `direction`

### TestBandThresholdsCorrect::test_band_thresholds_correct

**what it tests:** the RISK_BANDS dictionary has correct boundary values (medium_risk starts at 550, not 500).

**assertions:**
- `medium_risk["min"] == 550`
- `high_risk["max"] == 549`

### TestBandThresholdsCorrect::test_no_gap_between_bands

**what it tests:** band boundaries are contiguous with no gaps between them.

**assertions:**
- `high_risk["max"] + 1 == medium_risk["min"]` (549 + 1 = 550)
- `medium_risk["max"] + 1 == low_risk["min"]` (649 + 1 = 650)
- `low_risk["max"] + 1 == very_low_risk["min"]` (749 + 1 = 750)
