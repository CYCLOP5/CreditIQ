#!/usr/bin/env bash
# phase 6 — fastapi server
# requires redis running and model trained (phases 0, 4)
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m src.api.main
