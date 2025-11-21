#!/usr/bin/env bash

# Run a single worktree's frontend (and optional backend) with simple fe=/be= flags.
# Usage: bash scripts/run-ui.sh [fe=PORT] [be=PORT] [no-backend]
# Defaults: frontend 3000, backend 8080, backend auto-start unless no-backend is provided.

set -euo pipefail

FRONTEND_PORT="3000"
BACKEND_PORT="8080"
START_BACKEND=true

for arg in "$@"; do
  case "$arg" in
    fe=*|frontend=*)
      FRONTEND_PORT="${arg#*=}"
      ;;
    be=*|backend=*)
      BACKEND_PORT="${arg#*=}"
      ;;
    no-backend)
      START_BACKEND=false
      ;;
    *)
      echo "Unknown arg: $arg"
      echo "Usage: $0 [fe=PORT] [be=PORT] [no-backend]"
      exit 1
      ;;
  esac
done

pids=()
cleanup() {
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT

echo "Starting frontend on ${FRONTEND_PORT} (API http://localhost:${BACKEND_PORT}/api/v1)"
(
  cd frontend
  PORT="${FRONTEND_PORT}" HOSTNAME="0.0.0.0" NEXT_PUBLIC_GO_BACKEND_BASE_URL="http://localhost:${BACKEND_PORT}/api/v1" npm run dev
) &
pids+=($!)

if [[ "${START_BACKEND}" == "true" ]]; then
  echo "Starting backend on ${BACKEND_PORT}"
  (
    cd backend
    PORT="${BACKEND_PORT}" go run ./cmd/server
  ) &
  pids+=($!)
else
  echo "Skipping backend (no-backend flag). Ensure your API is reachable at http://localhost:${BACKEND_PORT}/api/v1"
fi

echo "Services are running. Press Ctrl+C to stop."
wait
