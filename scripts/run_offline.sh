#!/usr/bin/env bash
# full offline training pipeline — no redis, no api, no frontend
# phase 1 → 3 → 4 → 5
set -euo pipefail
SCRIPTS="$(dirname "$0")"
bash "$SCRIPTS/phase1_generate.sh"
bash "$SCRIPTS/phase3_features.sh"
bash "$SCRIPTS/phase4_train.sh"
bash "$SCRIPTS/phase5_tests.sh"
