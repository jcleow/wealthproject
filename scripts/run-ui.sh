#!/usr/bin/env bash

# Run a single worktree's frontend (and optional backend) with simple fe=/be= flags.
# Usage: bash scripts/run-ui.sh [fe=PORT] [be=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install]
# Defaults: frontend 3000, backend 8080, backend auto-start unless no-backend is provided. Auto-installs frontend deps if needed.

set -euo pipefail

FRONTEND_PORT="3000"
BACKEND_PORT="8080"
START_BACKEND=true
ENV_SOURCE=""
ENV_MODE="copy" # copy | symlink
AUTO_INSTALL=true

for arg in "$@"; do
case "$arg" in
    fe=*|frontend=*)
      FRONTEND_PORT="${arg#*=}"
      ;;
    be=*|backend=*)
      BACKEND_PORT="${arg#*=}"
      ;;
    env=*)
      ENV_SOURCE="${arg#*=}"
      ;;
    env_mode=*)
      ENV_MODE="${arg#*=}"
      ;;
    no-install)
      AUTO_INSTALL=false
      ;;
    no-backend)
      START_BACKEND=false
      ;;
    *)
      echo "Unknown arg: $arg"
      echo "Usage: $0 [fe=PORT] [be=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install]"
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

maybe_seed_env() {
  local target_env="$1"
  if [[ -f "$target_env" ]]; then
    return
  fi
  # Default to a sibling/main .env if present and no explicit source provided
  if [[ -z "$ENV_SOURCE" && -f "../.env" ]]; then
    ENV_SOURCE="../.env"
  fi
  if [[ -z "$ENV_SOURCE" ]]; then
    echo "Warning: $target_env missing and no env= source provided; backend may fail to start."
    return
  fi
  if [[ ! -f "$ENV_SOURCE" ]]; then
    echo "Warning: env source '$ENV_SOURCE' not found; skipping env copy."
    return
  fi
  if [[ "$ENV_MODE" == "symlink" ]]; then
    ln -s "$ENV_SOURCE" "$target_env"
    echo "Symlinked env from $ENV_SOURCE to $target_env"
  else
    cp "$ENV_SOURCE" "$target_env"
    echo "Copied env from $ENV_SOURCE to $target_env"
  fi
}

ensure_frontend_install() {
  if [[ "$AUTO_INSTALL" == "false" ]]; then
    return
  fi
  local dir="$1"
  if [[ -x "$dir/node_modules/.bin/next" ]]; then
    return
  fi
  echo "Installing frontend dependencies (npm install)..."
  (
    cd "$dir"
    npm install
  )
}

echo "Starting frontend on ${FRONTEND_PORT} (API http://localhost:${BACKEND_PORT}/api/v1)"
(
  ensure_frontend_install "frontend"
  cd frontend
  PORT="${FRONTEND_PORT}" HOSTNAME="0.0.0.0" NEXT_PUBLIC_GO_BACKEND_BASE_URL="http://localhost:${BACKEND_PORT}/api/v1" npm run dev
) &
pids+=($!)

if [[ "${START_BACKEND}" == "true" ]]; then
  maybe_seed_env ".env"
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
