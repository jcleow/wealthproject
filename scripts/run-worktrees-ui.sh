#!/usr/bin/env bash

# Run two worktrees' frontends (and optional backends) side by side on different ports.
# Optionally seed env files into each worktree (copy or symlink).

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <worktree_a_path> <worktree_b_path>"
  echo "Env options:"
  echo "  FRONTEND_PORT_A (default 3000)"
  echo "  FRONTEND_PORT_B (default 3001)"
  echo "  BACKEND_PORT_A  (default 8080)"
  echo "  BACKEND_PORT_B  (default 8081)"
  echo "  API_BASE_A      (default http://localhost:8080/api/v1)"
  echo "  API_BASE_B      (default http://localhost:8081/api/v1)"
  echo "  START_BACKEND   (set to true to also run go server in each worktree)"
  echo "  ENV_SOURCE      (path to .env to copy/symlink into each worktree if missing)"
  echo "  ENV_MODE        (copy|symlink, default copy)"
  exit 1
fi

WT_A="$1"
WT_B="$2"

FRONTEND_PORT_A="${FRONTEND_PORT_A:-3000}"
FRONTEND_PORT_B="${FRONTEND_PORT_B:-3001}"
BACKEND_PORT_A="${BACKEND_PORT_A:-8080}"
BACKEND_PORT_B="${BACKEND_PORT_B:-8081}"
API_BASE_A="${API_BASE_A:-http://localhost:8080/api/v1}"
API_BASE_B="${API_BASE_B:-http://localhost:8081/api/v1}"
START_BACKEND="${START_BACKEND:-false}"
ENV_SOURCE="${ENV_SOURCE:-}"
ENV_MODE="${ENV_MODE:-copy}" # copy | symlink

pids=()

cleanup() {
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT

require_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Missing directory: $dir"
    exit 1
  fi
}

maybe_seed_env() {
  local target_env="$1"
  if [[ -f "$target_env" ]]; then
    return
  fi
  if [[ -z "$ENV_SOURCE" ]]; then
    echo "Warning: $target_env missing and no ENV_SOURCE provided; backend may fail to start."
    return
  fi
  if [[ ! -f "$ENV_SOURCE" ]]; then
    echo "Warning: ENV_SOURCE '$ENV_SOURCE' not found; skipping env copy."
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

start_frontend() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local api_base="$4"

  require_dir "$dir/frontend"
  echo "Starting ${name} frontend on port ${port} (API ${api_base}) from ${dir}"
  (
    cd "$dir/frontend"
    PORT="$port" HOSTNAME="0.0.0.0" NEXT_PUBLIC_GO_BACKEND_BASE_URL="$api_base" npm run dev
  ) &
  pids+=($!)
}

start_backend() {
  local name="$1"
  local dir="$2"
  local port="$3"

  require_dir "$dir/backend"
  maybe_seed_env "$dir/.env"
  echo "Starting ${name} backend on port ${port} from ${dir}"
  (
    cd "$dir/backend"
    PORT="$port" go run ./cmd/server
  ) &
  pids+=($!)
}

start_frontend "A" "$WT_A" "$FRONTEND_PORT_A" "$API_BASE_A"
start_frontend "B" "$WT_B" "$FRONTEND_PORT_B" "$API_BASE_B"

if [[ "$START_BACKEND" == "true" ]]; then
  start_backend "A" "$WT_A" "$BACKEND_PORT_A"
  start_backend "B" "$WT_B" "$BACKEND_PORT_B"
fi

echo "Both worktrees are running. Press Ctrl+C to stop all."
wait
