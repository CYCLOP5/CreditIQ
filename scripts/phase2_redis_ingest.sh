#!/usr/bin/env bash
# phase 2 — stream data/raw/ parquets into redis streams
# requires redis running: redis-server config/redis.conf --daemonize yes
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m src.ingestion.redis_producer
