#!/usr/bin/env bash
# phase 4 — model training
# reads data/features/gstin=*/features.parquet, writes data/models/xgb_credit.ubj
# requires phase3_features.sh to have been run first
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m src.scoring.trainer
