#!/usr/bin/env bash

# Run a single worktree's frontend (and optional backend) with isolated Postgres.
# Usage: bash scripts/run-ui.sh [fe=PORT] [be=PORT] [db=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install]
# Defaults: frontend 3000, backend 8080, backend + Postgres auto-start unless no-backend is provided. Auto-installs frontend deps if needed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# If this is run from a worktree nested under a parent repo, prefer that root for Next.js/Turbopack.
if [[ -f "$REPO_ROOT/package.json" && -d "$REPO_ROOT/frontend" ]]; then
  ROOT_FOR_NEXT="$REPO_ROOT/frontend"
else
  ROOT_FOR_NEXT="$REPO_ROOT"
fi

FRONTEND_DIR="${REPO_ROOT}/frontend"
BACKEND_DIR="${REPO_ROOT}/backend"
ENV_TARGET="${REPO_ROOT}/.env"

FRONTEND_PORT="3000"
BACKEND_PORT="8080"
REQUESTED_DB_PORT=""
START_BACKEND=true
ENV_SOURCE=""
ENV_MODE="copy" # copy | symlink
AUTO_INSTALL=true
POSTGRES_IMAGE="postgres:15-alpine"

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

WORKTREE_NAME="$(basename "$REPO_ROOT")"
WORKTREE_HASH="$(printf "%s" "$REPO_ROOT" | shasum -a 256 | cut -c1-6)"
WORKTREE_SLUG="$(slugify "${WORKTREE_NAME:-worktree}")-${WORKTREE_HASH}"
POSTGRES_CONTAINER="fcs-${WORKTREE_SLUG}-postgres"
POSTGRES_VOLUME="fcs-${WORKTREE_SLUG}-pgdata"
POSTGRES_PORT=""
# Default DB credentials (used for container creation and fallback URL)
POSTGRES_USER_DEFAULT="financial_user"
POSTGRES_PASSWORD_DEFAULT="financial_pass_dev_2024"
POSTGRES_DB_DEFAULT="financial_chat"
DB_RESET=false

for arg in "$@"; do
  case "$arg" in
    fe=*|frontend=*)
      FRONTEND_PORT="${arg#*=}"
      ;;
    be=*|backend=*)
      BACKEND_PORT="${arg#*=}"
      ;;
    db=*|db_port=*)
      REQUESTED_DB_PORT="${arg#*=}"
      ;;
    db_user=*)
      DB_USER="${arg#*=}"
      ;;
    db_pass=*)
      DB_PASSWORD="${arg#*=}"
      ;;
    db-reset)
      DB_RESET=true
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
      echo "Usage: $0 [fe=PORT] [be=PORT] [db=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install]"
      exit 1
      ;;
esac
done

if [[ ! -d "$FRONTEND_DIR" || ! -d "$BACKEND_DIR" ]]; then
  echo "Run this script from a repository worktree (expected ${FRONTEND_DIR} and ${BACKEND_DIR})."
  exit 1
fi

pids=()
DB_STARTED_BY_SCRIPT=false

cleanup() {
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      # Kill the entire process group to ensure child processes (e.g., npm dev server) exit.
      pgid="$(ps -o pgid= "$pid" 2>/dev/null | tr -d ' ' || true)"
      if [[ -n "$pgid" ]]; then
        kill -TERM "-$pgid" >/dev/null 2>&1 || true
      else
        kill "$pid" >/dev/null 2>&1 || true
      fi
    fi
  done
  if [[ "$DB_STARTED_BY_SCRIPT" == "true" ]]; then
    echo "Stopping Postgres container ${POSTGRES_CONTAINER}"
    docker stop "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

default_db_port() {
  echo 5432
}

find_env_source() {
  if [[ -n "$ENV_SOURCE" ]]; then
    echo "$ENV_SOURCE"
    return
  fi

  # Prefer this worktree's .env
  if [[ -f "$REPO_ROOT/.env" ]]; then
    echo "$REPO_ROOT/.env"
    return
  fi

  # Prefer this worktree's .env.example
  if [[ -f "$REPO_ROOT/.env.example" ]]; then
    echo "$REPO_ROOT/.env.example"
    return
  fi

  # Prefer parent .env if this worktree is nested
  if [[ -f "$REPO_ROOT/../.env" ]]; then
    echo "$REPO_ROOT/../.env"
    return
  fi

  echo ""
}

maybe_seed_env() {
  local target_env="$1"
  if [[ -f "$target_env" ]]; then
    return
  fi

  local source
  source="$(find_env_source)"
  if [[ -z "$source" ]]; then
    echo "Warning: $target_env missing and no env source found; backend may fail to start."
    return
  fi

  if [[ ! -f "$source" ]]; then
    echo "Warning: env source '$source' not found; skipping env copy."
    return
  fi

  if [[ "$ENV_MODE" == "symlink" ]]; then
    ln -s "$source" "$target_env"
    echo "Symlinked env from $source to $target_env"
  else
    cp "$source" "$target_env"
    echo "Copied env from $source to $target_env"
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

extract_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "$DATABASE_URL"
    return
  fi
  if [[ -f "$ENV_TARGET" ]]; then
    local line
    line="$(grep -E '^DATABASE_URL=' "$ENV_TARGET" | tail -n1 || true)"
    if [[ -n "$line" ]]; then
      echo "${line#DATABASE_URL=}"
      return
    fi
  fi
  echo ""
}

configure_database_env() {
  local base_url="$1"
  local port="$2"
  local raw="$base_url"

  # If the URL has template placeholders, ignore it and fall back to defaults.
  if [[ "$raw" == *"\${"* ]]; then
    raw=""
  fi

  if [[ -z "$raw" ]]; then
    raw="postgres://${POSTGRES_USER_DEFAULT}:${POSTGRES_PASSWORD_DEFAULT}@localhost:5432/${POSTGRES_DB_DEFAULT}?sslmode=disable"
  fi

  local scheme rest cred_host path_query userpass hostport query path

  # scheme
  if [[ "$raw" == *"://"* ]]; then
    scheme="${raw%%://*}"
    rest="${raw#*://}"
  else
    scheme="postgres"
    rest="$raw"
  fi
  [[ -z "$scheme" ]] && scheme="postgres"

  cred_host="${rest%%/*}"
  path_query="${rest#*/}"
  [[ "$path_query" == "$rest" ]] && path_query=""

  if [[ "$path_query" == *"?"* ]]; then
    path="/${path_query%%\?*}"
    query="${path_query#*\?}"
  else
    path="/$path_query"
    query=""
  fi
  [[ -z "$path" || "$path" == "/" ]] && path="/${POSTGRES_DB_DEFAULT}"
  [[ -z "$query" ]] && query="sslmode=disable"

  if [[ "$cred_host" == *"@"* ]]; then
    userpass="${cred_host%%@*}"
    hostport="${cred_host#*@}"
  else
    userpass=""
    hostport="$cred_host"
  fi

  if [[ -z "$userpass" ]]; then
    DB_USER="${POSTGRES_USER_DEFAULT}"
    DB_PASSWORD="${POSTGRES_PASSWORD_DEFAULT}"
  else
    DB_USER="${userpass%%:*}"
    DB_PASSWORD="${userpass#*:}"
    [[ "$DB_PASSWORD" == "$DB_USER" ]] && DB_PASSWORD="${POSTGRES_PASSWORD_DEFAULT}"
    [[ -z "$DB_USER" ]] && DB_USER="${POSTGRES_USER_DEFAULT}"
    [[ -z "$DB_PASSWORD" ]] && DB_PASSWORD="${POSTGRES_PASSWORD_DEFAULT}"
  fi

  local host only_host
  if [[ "$hostport" == *":"* ]]; then
    host="${hostport%%:*}"
    only_host="${hostport#*:}"
    [[ -z "$only_host" ]] && only_host="5432"
  else
    host="$hostport"
    only_host="5432"
  fi
  [[ -z "$host" ]] && host="localhost"
  DB_NAME="${path#/}"
  [[ -z "$DB_NAME" ]] && DB_NAME="${POSTGRES_DB_DEFAULT}"

  DATABASE_URL_OVERRIDE="${scheme}://${DB_USER}:${DB_PASSWORD}@localhost:${port}/${DB_NAME}?${query}"
}

get_mapped_port() {
  docker inspect -f '{{ (index (index .HostConfig.PortBindings "5432/tcp") 0).HostPort }}' "$1" 2>/dev/null || true
}

wait_for_postgres() {
  local name="$1"
  local user="$2"
  local db="$3"
  echo "Waiting for Postgres (${name}) to become ready..."
  for _ in {1..30}; do
    local state
    state="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)"
    if [[ "$state" == "exited" || "$state" == "dead" ]]; then
      echo "Postgres container ${name} stopped unexpectedly. Recent logs:"
      docker logs --tail=50 "$name" || true
      exit 1
    fi
    if docker exec "$name" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then
      echo "Postgres is ready."
      return
    fi
    sleep 1
  done
  echo "Postgres did not become ready in time."
  exit 1
}

wait_for_backend() {
  local port="$1"
  local attempts=30
  echo "Waiting for backend health at http://localhost:${port}/api/v1/health"
  for _ in $(seq 1 "$attempts"); do
    if curl -sf "http://localhost:${port}/api/v1/health" >/dev/null 2>&1; then
      echo "Backend is healthy."
      return 0
    fi
    sleep 1
  done
  echo "Backend failed health check after ${attempts}s."
  return 1
}

ensure_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required to run isolated Postgres. Install Docker and try again."
    exit 1
  fi

  local desired_port="$1"
  local init_sql="$2"
  local existing_state
  existing_state="$(docker ps -a --filter "name=^${POSTGRES_CONTAINER}$" --format '{{.State}}' || true)"

  if [[ -n "$existing_state" && "$DB_RESET" == "true" ]]; then
    echo "Removing existing Postgres container and volume (${POSTGRES_CONTAINER}, ${POSTGRES_VOLUME}) for a fresh start..."
    docker rm -f "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
    docker volume rm "$POSTGRES_VOLUME" >/dev/null 2>&1 || true
    existing_state=""
  fi

  if [[ -n "$existing_state" ]]; then
    local mapped_port
    mapped_port="$(get_mapped_port "$POSTGRES_CONTAINER")"
    [[ -z "$mapped_port" ]] && mapped_port="$desired_port"

    if [[ "$existing_state" != "running" ]]; then
      echo "Starting existing Postgres container ${POSTGRES_CONTAINER} (port ${mapped_port})"
      docker start "$POSTGRES_CONTAINER" >/dev/null
      DB_STARTED_BY_SCRIPT=true
    else
      echo "Reusing running Postgres container ${POSTGRES_CONTAINER} (port ${mapped_port})"
    fi
    POSTGRES_PORT="$mapped_port"
    return
  fi

  echo "Launching Postgres container ${POSTGRES_CONTAINER} on port ${desired_port} (volume ${POSTGRES_VOLUME})"
  local args=(
    -d
    --name "$POSTGRES_CONTAINER"
    -p "${desired_port}:5432"
    -e "POSTGRES_USER=${DB_USER}"
    -e "POSTGRES_PASSWORD=${DB_PASSWORD}"
    -e "POSTGRES_DB=${DB_NAME}"
    -v "${POSTGRES_VOLUME}:/var/lib/postgresql/data"
  )
  if [[ -f "$init_sql" ]]; then
    args+=(-v "${init_sql}:/docker-entrypoint-initdb.d/init.sql:ro")
  fi
  args+=("$POSTGRES_IMAGE")
  docker run "${args[@]}" >/dev/null
  DB_STARTED_BY_SCRIPT=true
  POSTGRES_PORT="$desired_port"
}

maybe_seed_env "$ENV_TARGET"
# Also create .env in backend directory for Go application
BACKEND_ENV_TARGET="${BACKEND_DIR}/.env"
if [[ -f "$ENV_TARGET" && ! -f "$BACKEND_ENV_TARGET" ]]; then
  cp "$ENV_TARGET" "$BACKEND_ENV_TARGET"
  echo "Copied .env to backend directory"
fi

if [[ -n "$REQUESTED_DB_PORT" ]]; then
  POSTGRES_PORT="$REQUESTED_DB_PORT"
fi

pick_available_port() {
  local first_choice="$1"
  local fallback_start="$2"
  if ! lsof -Pi :"${first_choice}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "$first_choice"
    return
  fi
  local p="$fallback_start"
  while lsof -Pi :"${p}" -sTCP:LISTEN -t >/dev/null 2>&1; do
    p=$((p+1))
    if [[ $p -gt 65535 ]]; then
      echo "No available port found" >&2
      exit 1
    fi
  done
  echo "$p"
}

if [[ -z "$POSTGRES_PORT" ]]; then
  POSTGRES_PORT="$(pick_available_port 5432 5640)"
fi

# Ensure DATABASE_URL in .env is concrete (no placeholders); replace templated values if present.
sanitize_env_database_url() {
  local target_env="$1"
  local port="$2"
  # Prefer named dev credentials to avoid surprises (must match container creation).
  local default_url="postgres://${POSTGRES_USER_DEFAULT}:${POSTGRES_PASSWORD_DEFAULT}@localhost:${port}/${POSTGRES_DB_DEFAULT}?sslmode=disable"
  if [[ ! -f "$target_env" ]]; then
    echo "DATABASE_URL=${default_url}" >"$target_env"
    return
  fi
  local line
  line="$(grep -E '^DATABASE_URL=' "$target_env" || true)"
  if [[ -z "$line" ]]; then
    echo "DATABASE_URL=${default_url}" >>"$target_env"
    return
  fi
  if echo "$line" | grep -q '\${'; then
    # Replace templated entry with default
    perl -pi -e "s/^DATABASE_URL=.*/DATABASE_URL=${default_url//\//\\/}/" "$target_env"
  fi
}

sanitize_env_database_url "$ENV_TARGET" "$POSTGRES_PORT"
# Also update the backend .env file if it exists
if [[ -f "$BACKEND_ENV_TARGET" ]]; then
  sanitize_env_database_url "$BACKEND_ENV_TARGET" "$POSTGRES_PORT"
fi

if [[ "${START_BACKEND}" == "true" ]]; then
  DATABASE_URL_BASE="$(extract_database_url)"
  configure_database_env "$DATABASE_URL_BASE" "$POSTGRES_PORT"
  ORIGINAL_DB_PORT="$POSTGRES_PORT"
  ensure_postgres "$POSTGRES_PORT" "${REPO_ROOT}/docker/init.sql"
  if [[ "$POSTGRES_PORT" != "$ORIGINAL_DB_PORT" ]]; then
    configure_database_env "$DATABASE_URL_BASE" "$POSTGRES_PORT"
  fi
  wait_for_postgres "$POSTGRES_CONTAINER" "$DB_USER" "$DB_NAME"
fi

echo "Starting frontend on ${FRONTEND_PORT} (API http://localhost:${BACKEND_PORT}/api/v1)"
(
  ensure_frontend_install "$FRONTEND_DIR"
  cd "$FRONTEND_DIR"
  PORT="${FRONTEND_PORT}" HOSTNAME="0.0.0.0" NEXT_CACHE_DIR="${FRONTEND_DIR}/.next/cache" NEXT_PUBLIC_GO_BACKEND_BASE_URL="http://localhost:${BACKEND_PORT}/api/v1" npm run dev -- --turbo
) &
pids+=($!)

if [[ "${START_BACKEND}" == "true" ]]; then
  echo "Starting backend on ${BACKEND_PORT} (DB ${DATABASE_URL_OVERRIDE})"
  (
    cd "$BACKEND_DIR"
    PORT="${BACKEND_PORT}" DATABASE_URL="${DATABASE_URL_OVERRIDE}" go run ./cmd/server
  ) &
  pids+=($!)
  if ! wait_for_backend "$BACKEND_PORT"; then
    echo "Backend did not become healthy; stopping services."
    exit 1
  fi
  echo "Backend health check passed."
else
  echo "Skipping backend (no-backend flag). Ensure your API is reachable at http://localhost:${BACKEND_PORT}/api/v1"
fi

echo "Services are running for worktree ${WORKTREE_NAME}."
echo "Frontend: http://localhost:${FRONTEND_PORT}"
if [[ "${START_BACKEND}" == "true" ]]; then
  echo "Backend:  http://localhost:${BACKEND_PORT}/api/v1"
  echo "Postgres: container ${POSTGRES_CONTAINER} (host port ${POSTGRES_PORT}, db ${DB_NAME})"
else
  echo "Backend:  skipped (no-backend flag)"
fi
echo "Press Ctrl+C to stop."
wait
