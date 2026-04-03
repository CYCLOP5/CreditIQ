# bootstrap — run all pipeline phases

all commands run from project root with the credit-scoring conda env active

## activate environment

```bash
mamba activate credit-scoring
```

---

## phase 0 — redis startup

redis must be running before any ingestion or api commands

```bash
redis-server config/redis.conf --daemonize yes
```

verify:

```bash
redis-cli ping
```

expected output:

```
PONG
```

---

## phase 1 — synthetic data generation

generates gst invoices upi transactions eway bills for ~250 msme profiles
writes chunked parquets to data/raw/

```bash
python -m src.ingestion.generator
```

expected output:

```
starting synthetic msme data generation
building msme profiles
generating gst invoice stream
generating upi transaction stream
generating eway bill stream
writing profile metadata
generation complete
```

---

## phase 2 — redis stream ingestion

streams all data/raw/ parquets into redis streams
redis must be running (phase 0)

```bash
python -m src.ingestion.redis_producer
```

expected output ends with:

```
all streams loaded total NNNNNN records
```

note: required for the api worker (phase 6). not required for offline training (phases 3-4).

---

## phase 3 — feature computation

reads data/raw/ parquets, computes per-gstin feature vectors
writes hive-partitioned cache to data/features/gstin=*/features.parquet

```bash
python -m src.features.engine
```

expected output:

```
gst chunks N upi chunks N ewb chunks N
loaded gst NNNNN upi NNNNN ewb NNNNN rows
starting batch feature computation for N gstins
processed 50 of N gstins
batch complete N feature vectors computed
feature pipeline complete
```

important: must be run before src.scoring.trainer. skipping causes polars.exceptions.ComputeError: expanded paths were empty.

---

## phase 4 — model training

loads data/features/gstin=*/features.parquet, generates proxy labels
trains xgboost, saves model to data/models/xgb_credit.ubj

```bash
python -m src.scoring.trainer
```

expected output:

```
loading feature parquets
feature parquets found N
loaded N rows
feature matrix shape (N, 43)
training xgboost model
val auc: 0.XX
model saved
training complete
```

---

## phase 5 — run tests

runs all unit and integration tests

```bash
python -m pytest tests/ -v
```

note: tests/test_api.py requires httpx and pytest-asyncio. the pyproject.toml configures asyncio_mode=auto so no explicit markers needed.

---

## phase 6 — api server

requires model trained (phase 4) and redis running (phase 0)

start the fastapi server (terminal 1):

```bash
python -m src.api.main
```

or via uvicorn directly:

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --workers 2
```

start the saga worker (terminal 2, separate process):

```bash
python -m src.api.worker
```

health check:

```bash
curl http://localhost:8000/health
```

submit a score request:

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"gstin":"22AAAAA0000A1Z5"}'
```

poll for result (replace TASK_ID with returned task_id):

```bash
curl http://localhost:8000/score/TASK_ID
```

---

## phase 7 — frontend dev server

requires node 18+ and npm

```bash
cd frontend && npm install && npm run dev
```

dashboard available at http://localhost:5173

---

## phi-3 model download (optional, required for llm explanations)

download the phi-3 gguf model manually to data/models/

```bash
# using huggingface-cli
pip install huggingface-hub
huggingface-cli download microsoft/Phi-3-mini-128k-instruct-gguf \
  Phi-3-mini-128k-instruct-Q4_K_M.gguf \
  --local-dir data/models/
```

```bash
# rename to match expected filename
mv data/models/Phi-3-mini-128k-instruct-Q4_K_M.gguf \
   data/models/phi-3-mini-128k-instruct-q4_k_m.gguf
```

if the gguf file is absent the worker uses feature names as fallback explanations. no crash occurs.

---

## full offline training sequence (no api, no redis)

you can run the steps manually or execute the offline bash script:

```bash
mamba activate credit-scoring
bash scripts/run_offline.sh
```

manual sequence:
```bash
python -m src.ingestion.generator
python -m src.features.engine
python -m src.scoring.trainer
python -m pytest tests/ -v
```

---

## full online sequence (api + dashboard)

you can fire up the entire real-time stack via the online script:

```bash
mamba activate credit-scoring
bash scripts/run_online.sh
```

manual sequence:
```bash
redis-server config/redis.conf --daemonize yes
python -m src.ingestion.generator
python -m src.ingestion.redis_producer
python -m src.features.engine
python -m src.scoring.trainer
python -m src.api.main &
python -m src.api.worker &
cd frontend && npm install && npm run dev
```

---

## common errors

| error | cause | fix |
|---|---|---|
| polars.exceptions.ComputeError: expanded paths were empty | phase 3 was skipped | run python -m src.features.engine first |
| no raw parquets run src.ingestion.generator first | phase 1 was skipped | run python -m src.ingestion.generator first |
| redis.exceptions.ConnectionError | redis not started | run redis-server config/redis.conf --daemonize yes |
| FileNotFoundError: data/models/xgb_credit.ubj | phase 4 was skipped | run python -m src.scoring.trainer first |
| no data found exiting | feature engine produced zero partitions | check data/raw/ has parquets, re-run phase 3 |
| BUSYGROUP consumer group name already exists | worker restarted after crash | safe to ignore — consumer group creation is idempotent |
| xgboost ValueError: feature names | special chars in feature column names | sanitize_feature_name() in trainer.py strips angle brackets |
| llm inference very slow (under 1 token/sec) | cpu thermal throttle or single core | check cpu temp, verify llama-cpp-python cpu build is correct |
| ECONNREFUSED at localhost:8000 | api server not started | run python -m src.api.main in terminal 1 |
