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
    "no circular transaction patterns detected in counterparty network"
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
### post /audit/replay

**Description:** Time-travel replay endpoint demonstrating event-sourced architecture. Evaluates the exact state of the Polars feature vector as it existed chronologically strictly before `target_timestamp`.

**Request Body:**

```json
{
  "gstin": "07AABCD1234E1Z1",
  "target_timestamp": "2024-03-01T12:00:00Z"
}
```

**Response (200 OK):**

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

  "redis": "connected",
  "model_loaded": true,
  "queue_depth": 0,
  "ram_used_mb": 4218,
  "ram_total_mb": 12288
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
| top_reasons | json array string | worker.py | 5 plain language bullets |
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
| top_reasons | five plain english sentences explaining the primary drivers of the score, generated by phi-3 from shap values |
| recommended_wc_amount | maximum working capital loan amount in inr recommended for this risk band under rbi norms |
| recommended_term_amount | maximum term loan amount in inr recommended for this risk band, 0 means not recommended |
| msme_category | classification based on declared turnover: micro up to rs.5 crore, small up to rs.50 crore, medium up to rs.250 crore |
| cgtmse_eligible | true if the borrower qualifies for credit guarantee fund trust for micro and small enterprises coverage — requires mse classification and no fraud flag |
| mudra_eligible | true if the borrower is in the high_risk band and micro category — refers to pradhan mantri mudra yojana shishu or kishor tier |
| fraud_flag | true if the gstin was detected as part of a circular upi fund rotation ring OR a high-centrality (PageRank > 0.1) bipartite shell mule |
| fraud_details | when fraud_flag is true, contains the list of gstins in the cycle, hub-and-spoke mule status, and a confidence score up to 0.95 |
| shap_waterfall | array of all 43 feature contributions sorted by absolute magnitude, each entry has feature name, shap value, and direction label |
| score_freshness | iso8601 timestamp of when this score was computed by the worker |
| data_maturity_months | how many months of transaction history were available — lower values mean the score is less reliable |
| error | present and non-null only when status is failed, contains the exception message from whichever saga step failed |

---

## section 5 — llm fallback behavior

the saga worker calls [`src/llm/translator.py`](../src/llm/translator.py) to produce the five top_reasons bullets. phi-3 requires the gguf model file at `data/models/phi-3-mini-128k-instruct-q4_k_m.gguf`.

### when phi-3 gguf is present

the worker loads the model via llama-cpp-python at worker startup (not per request). inference runs cpu-only with n_gpu_layers=0. the prompt passes the top 5 shap feature names, values, and direction labels. the model returns exactly 5 bullet points in plain language. parse_llm_output in [`src/llm/prompts.py`](../src/llm/prompts.py) strips markdown formatting and pads or truncates to exactly 5 items.

### when phi-3 gguf is absent

the worker catches the FileNotFoundError at startup. shaptranslator.translate falls back to generating top_reasons directly from feature names and direction labels without any llm call. the output is less fluent but structurally correct. no exception propagates. the score, risk band, and all other fields are unaffected.

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

on a modern multi-core x86 cpu phi-3-mini q4_k_m generates approximately 2 to 4 tokens per second. a typical explanation of 5 bullets at ~80 tokens takes 20 to 40 seconds. the saga worker is async so the fastapi server remains responsive during inference. the 2-second polling in the frontend absorbs the wait transparently.

---

## section 6 — healthcheck interpretation

the get /health response contains six fields. use this table to interpret each field and decide on action.

| field | healthy value | action if unhealthy |
|---|---|---|
| status | ok | any other value means at least one check failed — inspect other fields |
| redis | connected | redis is unreachable — run redis-server config/redis.conf --daemonize yes and verify with redis-cli ping |
| model_loaded | true | xgb_credit.ubj is missing — run python -m src.scoring.trainer to train and persist the model |
| queue_depth | 0 to low single digits | high queue_depth means the worker is not consuming — verify python -m src.api.worker is running in a second terminal |
| ram_used_mb | below 10000 | approaching 12288mb system ceiling — check for memory leaks if worker has been running many hours |
| ram_total_mb | 12288 | informational only — this is the total system ram |

a queue_depth that grows continuously indicates the worker process has crashed or was never started. the api will still accept POST /score requests (they queue in redis) but they will not be processed until the worker is restarted.

---

## section 7 — frontend api integration

### api.js fetch wrappers

[`frontend/src/lib/api.js`](../frontend/src/lib/api.js) exports three functions. all target `http://localhost:8000` as the base url.

| function | method | endpoint | description |
|---|---|---|---|
| postScore(gstin) | POST | /score | submits a gstin, returns {task_id, status, estimated_wait_seconds} |
| getScore(taskId) | GET | /score/{taskId} | polls for result, returns the full score payload or pending/failed response |
| getHealth() | GET | /health | fetches system health metrics |

all three functions throw on non-ok http responses so callers can catch and display errors.

### polling strategy

[`frontend/src/pages/ScoreLookup.jsx`](../frontend/src/pages/ScoreLookup.jsx) implements client-side polling:

1. user enters a 15-character gstin and submits the form
2. input is validated against `/^[A-Z0-9]{15}$/` before submission
3. postScore is called, the returned task_id is stored in component state
4. setInterval is started with a 2-second period, calling getScore(taskId) on each tick
5. when the response status transitions to complete or failed the interval is cleared
6. useEffect cleanup also clears the interval on component unmount to prevent memory leaks

### cors configuration

cors is configured in [`src/api/main.py`](../src/api/main.py) via fastapi's CORSMiddleware. allowed origins are:

```
http://localhost:3000
http://localhost:5173
```

port 5173 is the vite dev server default. port 3000 is the legacy next.js dev server port retained for compatibility. all methods and headers are allowed. credentials are not required because the api is stateless (no cookies, no sessions).

if the frontend is served on a different port (for example a custom vite --port flag), add that origin to the allow_origins list in [`src/api/main.py`](../src/api/main.py) and restart the fastapi server.

---

## 5. api endpoints

defines rest interfaces exposed by fastapi application for orchestration and real-time streaming.

| method | endpoint | payload / response schema | purpose |
|---|---|---|---|
| `post` | `/score` | `ScoreRequest` -> `ScoreSubmitResponse` | initiates asynchronous scoring saga |
| `get` | `/score/{task_id}` | `none` -> `ScoreResult` | polls task completion state and final payload |
| `get` | `/health` | `none` -> `HealthResponse` | system telemetry and model residency status |
| `get` | `/score/{task_id}/stream` | `none` -> `text/event-stream` | server-sent events for realtime pipeline progress |
| `post` | `/score/{task_id}/chat` | `ChatRequest` -> `text/event-stream` | rag-based phi-3 credit analyst q&a |
