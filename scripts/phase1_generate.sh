#!/usr/bin/env bash
# phase 1 — synthetic data generation
# writes chunked parquets to data/raw/
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m src.ingestion.generator
