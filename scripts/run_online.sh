#!/usr/bin/env bash
# full online pipeline — redis + api + frontend
# phase 0 (redis) → 1 → 2 → 3 → 4 → 5 → 6 (background) → 7
set -euo pipefail
SCRIPTS="$(dirname "$0")"
ROOT="$(dirname "$0")/.."

echo "starting redis"
redis-server "$ROOT/config/redis.conf" --daemonize yes

bash "$SCRIPTS/phase1_generate.sh"
bash "$SCRIPTS/phase2_redis_ingest.sh"
bash "$SCRIPTS/phase3_features.sh"
bash "$SCRIPTS/phase4_train.sh"
bash "$SCRIPTS/phase5_tests.sh"

echo "starting api server in background"
bash "$SCRIPTS/phase6_api.sh" &
API_PID=$!
echo "api pid $API_PID"

bash "$SCRIPTS/phase7_frontend.sh"
