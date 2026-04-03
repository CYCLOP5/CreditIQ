#!/usr/bin/env bash
# phase 7 — next.js frontend dev server
# requires node 18+ and pnpm installed
set -euo pipefail
cd "$(dirname "$0")/../frontend"
pnpm install
pnpm run dev
