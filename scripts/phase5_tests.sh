#!/usr/bin/env bash
# phase 5 — run all unit tests
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=/home/cyclops/miniforge3/envs/credit-scoring/bin/python
$PYTHON -m pytest tests/ -v
