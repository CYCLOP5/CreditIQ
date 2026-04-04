#!/usr/bin/env bash
# phase 3 — feature computation
# reads data/raw/ parquets, writes data/features/gstin=*/features.parquet
# must run before phase4_train.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m src.features.engine
$PYTHON scripts/inject_graphs.py
$PYTHON scripts/inject_fraud_features.py
