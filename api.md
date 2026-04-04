# api runbook

operational reference for the msme credit scoring api. covers endpoints, saga worker lifecycle, redis key schema, score field glossary, llm fallback, healthcheck interpretation, and frontend integration.

---

## section 1 — endpoints

### post /score

submits a gstin for credit scoring. the request is queued immediately and processed asynchronously by the saga worker. the caller receives a task_id and polls for the result.

**request**

```http
POST /score HTTP/1.1
Content-Type: application/json

{"gstin": "22AAAAA0000A1Z5"}
```

gstin must be exactly 15 alphanumeric characters. any other value returns http 422 with pydantic validation details.

**curl example**

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"gstin":"22AAAAA0000A1Z5"}'
```

**response — http 202**

```json
{
  "task_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "pending",
  "estimated_wait_seconds": 30
}
```

---

### get /score/{task_id}

returns the current status and, when complete, the full scoring payload for a previously submitted task.

**curl example**

```bash
curl http://localhost:8000/score/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

**response — http 200 (pending)**

```json
{
  "task_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "pending"
}
```

**response — http 200 (complete)**

```json
{
  "task_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "gstin": "22AAAAA0000A1Z5",
  "status": "complete",
  "credit_score": 723,
  "risk_band": "low_risk",
  "top_reasons": [
     "strong 30 day upi inflow velocity indicates healthy cash receipts",
     "gst filing delay trend is improving over last 3 periods",
     "eway bill volume shows consistent month over month growth",
     "upi inbound to outbound ratio suggests net positive cash position",
     "no circular transaction patterns detected in counterparty network",
     "Path to Prime: maintain consistent gst filing cadence to strengthen score"
  ],
  "recommended_wc_amount": 2500000,
  "recommended_term_amount": 5000000,
  "msme_category": "small",
  "cgtmse_eligible": true,
  "mudra_eligible": false,
  "fraud_flag": false,
  "fraud_details": null,
  "shap_waterfall": [
    {"feature": "upi_30d_inbound_count", "value": 0.142, "direction": "decreases_risk"},
    {"feature": "filing_compliance_rate", "value": 0.098, "direction": "decreases_risk"},
    {"feature": "fraud_ring_flag", "value": -0.001, "direction": "decreases_risk"}
  ],
  "score_freshness": "2026-04-03T13:12:45+05:30",
  "data_maturity_months": 8,
  "error": null
}
```

**response — http 200 (failed)**

```json
{
  "task_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "failed",
  "error": "feature engine: no parquet partitions found for gstin"
}
```

**response — http 404 (unknown task_id)**

```json
{"detail": "task not found"}
```

---

### get /health

returns system and model readiness signals. intended for liveness and readiness probes and for the system health dashboard page.

**curl example**

```bash
curl http://localhost:8000/health
```

**response — http 200**

```json
{
  "status": "ok",
  "redis_connected": true,
  "model_loaded": true,
  "worker_queue_depth": 0,
  "system_ram_used_gb": 4.12,
  "system_ram_total_gb": 12.0
}
```

---

### post /audit/replay

time-travel replay endpoint demonstrating event-sourced architecture. evaluates the exact state of the polars feature vector as it existed chronologically strictly before `target_timestamp`.

**request body**

```json
{
  "gstin": "07AABCD1234E1Z1",
  "target_timestamp": "2024-03-01T12:00:00Z"
}
```

**response — http 200**

```json
{
  "gstin": "07AABCD1234E1Z1",
  "target_timestamp": "2024-03-01T12:00:00",
  "replayed_events_count": 845,
  "state": {
    "gst_7d_value": 45000.0,
    "upi_7d_inbound_count": 14.0,
    "temporal_anomaly_flag": 0.0,
    "computed_at": "2024-03-01T15:20:00.123456"
  }
}
```

---

## section 2 — saga worker lifecycle

### startup sequence

three processes must be running in order:

| terminal | command | purpose |
|---|---|---|
| terminal 0 | `redis-server config/redis.conf --daemonize yes` | state store and message broker |
| terminal 1 | `python -m src.api.main` | fastapi server, handles http |
| terminal 2 | `python -m src.api.worker` | saga worker, processes queue |

the fastapi server and the saga worker are separate os processes. the server only reads and writes redis hashes. the worker does all inference.

### lifespan events (src/api/main.py)

on startup the lifespan function:
1. creates a redis client and stores it on app.state.redis
2. pings redis — crashes intentionally if redis is unreachable
3. calls xgroup_create on stream:score_requests with mkstream=true and id=0 — idempotent, safe to repeat
4. configures cors middleware for localhost:3000 and localhost:5173

on shutdown the redis client is closed.

### worker main loop (src/api/worker.py)

the worker runs as an asyncio event loop:

```
xreadgroup(group=cg_score_worker, consumer=worker-0, streams={stream:score_requests: >}, count=1, block=5000)
  → for each message:
      read gstin from message payload
      execute saga steps in sequence
      write result to score:{task_id} hash
      xack stream:score_requests cg_score_worker message_id
```

the worker blocks for up to 5 seconds waiting for new messages before looping. this avoids busy-polling.

### saga execution steps

each step runs sequentially. cpu-bound steps are offloaded with run_in_executor to avoid blocking the asyncio loop.

| step | function | output written to redis |
|---|---|---|
| 1 feature resolution | three-tier: parquet cache → raw parquet + feature engine → demo fallback | — |
| 2 fraud detection | cycle_detector.detect on networkx graph from upi edges | fraud_flag, fraud_details |
| 3 xgboost inference | creditscorer.score on feature vector | credit_score, risk_band, recommended_wc_amount, recommended_term_amount, msme_category, cgtmse_eligible, mudra_eligible |
| 4 shap computation | creditexplainer.waterfall_data | shap_waterfall |
| 5 llm translation | shaptranslator.translate or fallback | top_reasons |
| 6 final write | hset score:{task_id} with all fields | status=complete, score_freshness |

### compensation (saga failure)

if any step raises an exception the worker:
1. writes status=failed and error=exception message to score:{task_id}
2. calls xack to remove the message from the pending entries list
3. logs the traceback
4. continues to the next message — no crash

this ensures a failed gstin never blocks the queue.

---

## section 3 — redis keys reference

### stream:score_requests

| field | description |
|---|---|
| key format | stream:score_requests |
| producer | src/api/routes.py post /score handler |
| consumer | src/api/worker.py xreadgroup cg_score_worker |
| maxlen | ~10000 (xadd trimming) |
| message fields | task_id (uuid4 string), gstin (15-char string) |

### stream:gst_invoices

| field | description |
|---|---|
| key format | stream:gst_invoices |
| producer | src/ingestion/redis_producer.py |
| consumer | saga worker feature resolution step (optional) |
| maxlen | ~10000 (xadd trimming) |
| message fields | see schema.md section 1 |

### stream:upi_transactions

| field | description |
|---|---|
| key format | stream:upi_transactions |
| producer | src/ingestion/redis_producer.py |
| consumer | saga worker feature resolution step (optional) |
| maxlen | ~10000 (xadd trimming) |
| message fields | see schema.md section 1 |

### stream:eway_bills

| field | description |
|---|---|
| key format | stream:eway_bills |
| producer | src/ingestion/redis_producer.py |
| consumer | saga worker feature resolution step (optional) |
| maxlen | ~10000 (xadd trimming) |
| message fields | see schema.md section 1 |

### score:{task_id}

redis hash created by post /score and updated by the saga worker.

| field | type | set by | description |
|---|---|---|---|
| status | string | routes.py then worker.py | pending → complete or failed |
| gstin | string | routes.py | the requested gstin |
| created_at | iso8601 string | routes.py | when the request was received |
| credit_score | int string | worker.py | 300-900 score, absent while pending |
| risk_band | string | worker.py | very_low_risk low_risk medium_risk high_risk |
| top_reasons | json array string | worker.py | 6 plain language bullets (5 explanations + 1 Path to Prime) |
| recommended_wc_amount | int string | worker.py | working capital in inr |
| recommended_term_amount | int string | worker.py | term loan in inr |
| msme_category | string | worker.py | micro small medium |
| cgtmse_eligible | bool string | worker.py | true or false |
| mudra_eligible | bool string | worker.py | true or false |
| fraud_flag | bool string | worker.py | true or false |
| fraud_details | json string or null | worker.py | cycle members and confidence if flagged |
| shap_waterfall | json array string | worker.py | all feature shap values sorted by magnitude |
| score_freshness | iso8601 string | worker.py | when inference completed |
| data_maturity_months | int string | worker.py | months of history available |
| error | string | worker.py | error message, present only when status=failed |

redis hashes store all values as strings. the api routes.py handler casts numeric fields before serialising to json.

---

## section 4 — score result field glossary

| field | plain meaning |
|---|---|
| task_id | unique identifier for this scoring job, returned immediately on submission |
| gstin | the 15-character goods and services tax identification number that was scored |
| credit_score | the creditworthiness score from 300 (highest risk) to 900 (lowest risk), following the cibil scale |
| risk_band | human-readable risk tier: very_low_risk 750-900, low_risk 650-749, medium_risk 550-649, high_risk 300-549 |
| top_reasons | six plain english sentences explaining the primary drivers of the score (5 from Qwen 72B via OpenRouter API/shap + 1 actionable 'path to prime' step), generated by Qwen 72B via OpenRouter API from shap values |
| recommended_wc_amount | maximum working capital loan amount in inr recommended for this risk band under rbi norms |
| recommended_term_amount | maximum term loan amount in inr recommended for this risk band, 0 means not recommended |
| msme_category | classification based on declared turnover: micro up to rs.5 crore, small up to rs.50 crore, medium up to rs.250 crore |
| cgtmse_eligible | true if the borrower qualifies for credit guarantee fund trust for micro and small enterprises coverage — requires mse classification and no fraud flag |
| mudra_eligible | true if the borrower is in the high_risk band and micro category — refers to pradhan mantri mudra yojana shishu or kishor tier |
| fraud_flag | true if the gstin was detected as part of a circular upi fund rotation ring OR a high-centrality (PageRank > 0.1) bipartite shell mule |
| fraud_details | when fraud_flag is true, contains the list of gstins in the cycle, hub-and-spoke mule status, and a confidence score up to 0.95 |
| shap_waterfall | array of all 46 feature contributions sorted by absolute magnitude, each entry has feature name, shap value, and direction label |
| score_freshness | iso8601 timestamp of when this score was computed by the worker |
| data_maturity_months | how many months of transaction history were available — lower values mean the score is less reliable |
| error | present and non-null only when status is failed, contains the exception message from whichever saga step failed |

---

## section 5 — llm fallback behavior

the saga worker calls [`src/llm/translator.py`](../src/llm/translator.py) to produce the five top_reasons bullets. Qwen 72B via OpenRouter API requires the gguf model file at `data/models/Qwen 72B via OpenRouter API-mini-128k-instruct-cloud endpoint.gguf`.

### when Qwen 72B via OpenRouter API gguf is present

the worker loads the model via OpenRouter API at worker startup (not per request). inference runs cpu-only with n_gpu_layers=0. the prompt passes the top 5 shap feature names, values, and direction labels. the model returns exactly 5 bullet points in plain language plus a 6th 'path to prime' actionable step. parse_llm_output in [`src/llm/prompts.py`](../src/llm/prompts.py) strips markdown formatting and pads or truncates to exactly 6 items.

### when Qwen 72B via OpenRouter API gguf is absent

the worker catches the urllib exception. shaptranslator.translate falls back to generating top_reasons directly from feature names and direction labels without any llm call. the output is less fluent but structurally correct. no exception propagates. the score, risk band, and all other fields are unaffected.

### fallback output example

```json
"top_reasons": [
  "upi_30d_inbound_count decreases_risk",
  "filing_compliance_rate decreases_risk",
  "fraud_ring_flag decreases_risk",
  "gst_revenue_cv_90d increases_risk",
  "longest_gap_days increases_risk"
]
```

### llm performance note

Using OpenRouter's infrastructure, generating a typical explanation of 5 bullets takes less than two seconds. The saga worker architecture remains fully async so the fastapi server remains responsive while it awaits network JSON.

---

## section 6 — healthcheck interpretation

the get /health response contains six fields. use this table to interpret each field and decide on action.

| field | healthy value | action if unhealthy |
|---|---|---|
| status | ok | any other value means at least one check failed — inspect other fields |
| redis | connected | redis is unreachable — run redis-server config/redis.conf --daemonize yes and verify with redis-cli ping |
| model_loaded | true | xgb_credit.ubj is missing — run python -m src.scoring.trainer to train and persist the model |
| queue_depth | 0 to low single digits | high queue_depth means the worker is not consuming — verify python -m src.api.worker is running in a second terminal |
| ram_used_gb | below 10.0 | approaching system ceiling — check for memory leaks if worker has been running many hours |
| ram_total_gb | varies | informational only — this is the total system ram |

a queue_depth that grows continuously indicates the worker process has crashed or was never started. the api will still accept POST /score requests (they queue in redis) but they will not be processed until the worker is restarted.

---

## section 7 — frontend api integration

[`frontend/dib/api.ts`](../frontend/dib/api.ts) exports functions grouped by feature (e.g. `scoreApi`, `msmeApi`). all target `http://localhost:8000` as the base url.

| function | method | endpoint | description |
|---|---|---|---|
| postScore(gstin) | POST | /score | submits a gstin, returns {task_id, status, estimated_wait_seconds} |
| getScore(taskId) | GET | /score/{taskId} | polls for result, returns the full score payload or pending/failed response |
| getHealth() | GET | /health | fetches system health metrics |

all three functions throw on non-ok http responses so callers can catch and display errors.

### polling strategy

[`frontend/hooks/useScore.ts`](../frontend/hooks/useScore.ts) implements client-side polling:

```typescript
1. user enters a 15-character gstin and submits the form
2. input is validated against `/^[A-Z0-9]{15}$/` before submission
3. postScore is called, the returned task_id is stored in component state
4. setInterval is started with a 2-second period, calling getScore(taskId) on each tick
5. when the response status transitions to complete or failed the interval is cleared
6. useEffect cleanup also clears the interval on component unmount to prevent memory leaks
```

### cors configuration

cors is configured in [`src/api/main.py`](../src/api/main.py) via fastapi's CORSMiddleware. allowed origins are:

```
http://localhost:3000
http://localhost:5173
```

port 5173 is the vite dev server default. port 3000 is the legacy next.js dev server port retained for compatibility. all methods and headers are allowed. credentials are not required because the api is stateless (no cookies, no sessions).

if the frontend is served on a different port (for example a custom next dev --port flag), add that origin to the allow_origins list in [`src/api/main.py`](../src/api/main.py) and restart the fastapi server.

---

## section 8 — endpoint quick reference

defines rest interfaces exposed by fastapi application for orchestration and real-time streaming.

| method | endpoint | payload / response schema | purpose |
|---|---|---|---|
| `post` | `/score` | `ScoreRequest` -> `ScoreSubmitResponse` | initiates asynchronous scoring saga |
| `get` | `/score/{task_id}` | `none` -> `ScoreResult` | polls task completion state and final payload |
| `get` | `/health` | `none` -> `HealthResponse` | system telemetry and model residency status |
| `get` | `/score/{task_id}/stream` | `none` -> `text/event-stream` | server-sent events for realtime pipeline progress |
| `post` | `/score/{task_id}/chat` | `ChatRequest` -> `text/event-stream` | rag-based Qwen 72B via OpenRouter API credit analyst q&a |
| `post` | `/audit/replay` | `AuditReplayRequest` -> `AuditReplayResponse` | event-sourced time-travel replay of feature state |

---

## section 9 — ui proxy endpoints 

the following frontend-specific proxies are exposed. they are fully stateful and interact actively with the python backend.

| workflow | endpoints | purpose | required role |
|---|---|---|---|
| auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | injects local jwt and grants session access for rbac testing | none |
| msme | `POST /loan-requests`, `PUT /permissions/{id}`, `POST /disputes` | msme user lifecycle creating scopes | requires `msme` role |
| bank | `GET /loan-requests`, `GET /loan-requests/{id}/score`, `PUT /loan-requests/{id}/decision` | loan officer queues. score fetches directly access redis if permission is granted | requires `loan_officer` |
| analyst | `GET /score-history`, `GET /transactions/{gstin}/graph`, `PUT /disputes/{id}/resolve` | analyst tools querying data topology | requires `credit_analyst` |
| analyst | `GET /transactions/{gstin}/ewb-distribution` | bucketed e-way bill value histogram for smurfing detection. returns `buckets[]` (range, count, smurf_band flag) and `smurfing_index` (0–1). ₹45K–₹49,999 band is highlighted as the mandatory-threshold structuring window | requires `credit_analyst` or `risk_manager` |
| analyst | `GET /transactions/{gstin}/receivables-gap` | monthly GST-invoiced vs UPI-inbound comparison exposing cash/accrual reconciliation gaps. returns `monthly[]` with `gst_invoiced`, `upi_inbound`, and `gap` fields | requires `credit_analyst` or `risk_manager` |
| risk | `GET /fraud-alerts`, `GET /risk-thresholds`, `GET /transactions/graph` | systemic risk review covering parameters and topology. `/transactions/graph` now returns nodes with `pagerank_score` field for eigenvector centrality ranking | requires `risk_manager` |
| risk | `PUT /risk-thresholds` | persists risk band boundaries, system config, and the new `amnesty_config` object (active, quarter, year, filing_penalty_multiplier). when amnesty is active the scoring worker suppresses `filing_compliance_rate` and `gst_filing_delay_trend` penalties for the specified fiscal quarter | requires `risk_manager` |
| admin | `GET /banks`, `GET /api-keys`, `GET /users`, `GET /audit-log` | simulated tenant administration endpoints | requires `admin` |

---

## section 10 — amnesty config schema

the `amnesty_config` sub-object lives inside the `risk_thresholds` document and is read/written via `PUT /risk-thresholds`.

```json
{
  "amnesty_config": {
    "active": false,
    "quarter": 1,
    "year": 2025,
    "filing_penalty_multiplier": 0.0,
    "description": "GST amnesty: late filings in selected quarter will not be penalised in credit scoring"
  }
}
```

| field | type | description |
|---|---|---|
| `active` | bool | master on/off toggle. when false the amnesty has no effect |
| `quarter` | int 1–4 | fiscal quarter (Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar) |
| `year` | int | fiscal year start (e.g. 2025 = FY 2025–26) |
| `filing_penalty_multiplier` | float 0–1 | 0.0 = full waiver of filing penalty. 1.0 = no change |
| `description` | string | human-readable label shown in the risk thresholds UI |

the scoring worker checks `amnesty_config.active` before weighting `filing_compliance_rate`. if the GSTIN's late filing occurred within the amnesty quarter window the feature value is scaled by `filing_penalty_multiplier` before XGBoost inference — no model retraining required.

---

## section 11 — fraud graph node schema

the `/transactions/graph` endpoint returns enriched nodes with centrality data:

```json
{
  "nodes": [
    {
      "id": "19DUTDZ1506O6Z3",
      "label": "Textile Zone (Imran)",
      "flagged": true,
      "pagerank_score": 0.24
    }
  ],
  "edges": [
    {
      "source": "19DUTDZ1506O6Z3",
      "target": "SHELL_HUB_01",
      "weight": 8,
      "amount": 4500000
    }
  ]
}
```

`pagerank_score` is the normalised nx.pagerank score (0–1). nodes with `pagerank_score > 0.1` and zero GST footprint are classified as **Bipartite Shell Mule hubs** and immediately lock `fraud_confidence = 0.95`. the fraud topology dashboard renders this as a ranked horizontal bar chart alongside the 3D force graph.
