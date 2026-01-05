#!/usr/bin/env bash

# Run a single worktree's frontend (and optional backend) with isolated Postgres.
# Usage: bash scripts/run-ui.sh [fe=PORT] [be=PORT] [db=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install] [use-air]
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
USE_AIR=false
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
    use-air)
      USE_AIR=true
      ;;
    *)
      echo "Unknown arg: $arg"
      echo "Usage: $0 [fe=PORT] [be=PORT] [db=PORT] [env=/path/to/.env] [env_mode=copy|symlink] [no-backend] [no-install] [use-air]"
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
  echo ""
  echo "Shutting down services..."
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
    echo "Stopping and removing Postgres container ${POSTGRES_CONTAINER}..."
    docker stop "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
    docker rm "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
    echo "Removing Postgres volume ${POSTGRES_VOLUME}..."
    docker volume rm "$POSTGRES_VOLUME" >/dev/null 2>&1 || true
    echo "Postgres cleanup complete."
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

  # Prefer explicit dev/prod envs if present
  if [[ -f "$REPO_ROOT/.env.dev" ]]; then
    echo "$REPO_ROOT/.env.dev"
    return
  fi
  if [[ -f "$REPO_ROOT/.env.prod" ]]; then
    echo "$REPO_ROOT/.env.prod"
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
  echo "Installing frontend dependencies (pnpm install)..."
  (
    cd "$dir"
    pnpm install
  )
}

generate_api_types() {
  local frontend_dir="$1"
  local swagger_file="${REPO_ROOT}/backend/cmd/server/docs/swagger.json"

  if [[ ! -f "$swagger_file" ]]; then
    echo "Swagger spec not found at ${swagger_file}, skipping API type generation."
    return
  fi

  echo "Generating API types from Swagger spec..."
  (
    cd "$frontend_dir"
    pnpm generate:api
  )
  echo "API types generated successfully."
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

  # If templated or missing, build from provided env vars (DB_USER/DB_PASSWORD/DB_NAME) with safe defaults.
  if [[ -z "$raw" || "$raw" == *"\${"* ]]; then
    local user="${DB_USER:-${POSTGRES_USER_DEFAULT:-postgres}}"
    local pass="${DB_PASSWORD:-${POSTGRES_PASSWORD_DEFAULT:-postgres}}"
    local name="${DB_NAME:-${POSTGRES_DB_DEFAULT:-financial_chat}}"
    raw="postgres://${user}:${pass}@localhost:${port}/${name}?sslmode=disable"
  fi

  local scheme rest cred_host path_query userpass hostport query path

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
  [[ -z "$path" || "$path" == "/" ]] && path="/${POSTGRES_DB_DEFAULT:-financial_chat}"
  [[ -z "$query" ]] && query="sslmode=disable"

  if [[ "$cred_host" == *"@"* ]]; then
    userpass="${cred_host%%@*}"
    hostport="${cred_host#*@}"
  else
    userpass=""
    hostport="$cred_host"
  fi

  if [[ -z "$userpass" ]]; then
    DB_USER="${DB_USER:-${POSTGRES_USER_DEFAULT:-postgres}}"
    DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD_DEFAULT:-postgres}}"
  else
    DB_USER="${userpass%%:*}"
    DB_PASSWORD="${userpass#*:}"
    [[ -z "$DB_USER" ]] && DB_USER="${POSTGRES_USER_DEFAULT:-postgres}"
    [[ -z "$DB_PASSWORD" ]] && DB_PASSWORD="${POSTGRES_PASSWORD_DEFAULT:-postgres}"
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
  DB_NAME="${DB_NAME:-${path#/}}"
  [[ -z "$DB_NAME" ]] && DB_NAME="${POSTGRES_DB_DEFAULT:-financial_chat}"

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

# Load environment values from .env files (exported for subsequent commands)
load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$file"
    set +a
  fi
}

load_env_file "$BACKEND_ENV_TARGET"
load_env_file "$ENV_TARGET"

# Parse DATABASE_URL (if present) to seed DB_USER/DB_PASSWORD/DB_NAME before defaults.
parse_database_url_vars() {
  local url="$1"
  if [[ -z "$url" ]]; then return; fi
  # strip scheme
  local rest="${url#*://}"
  local cred_host="${rest%%/*}"
  local path="${rest#*/}"
  [[ "$path" == "$rest" ]] && path=""
  if [[ "$cred_host" == *"@"* ]]; then
    local userpass="${cred_host%%@*}"
    DB_USER="${DB_USER:-${userpass%%:*}}"
    DB_PASSWORD="${DB_PASSWORD:-${userpass#*:}}"
  fi
  DB_NAME="${DB_NAME:-${path%%\?*}}"
}

parse_database_url_vars "${DATABASE_URL:-}"
parse_database_url_vars "$(grep -E '^DATABASE_URL=' "$ENV_TARGET" 2>/dev/null | tail -n1 | cut -d= -f2-)"
parse_database_url_vars "$(grep -E '^DATABASE_URL=' "$BACKEND_ENV_TARGET" 2>/dev/null | tail -n1 | cut -d= -f2-)"

# Derive DB credentials from env (.env/.env.example) first; fallback to safe defaults.
DB_USER="${DB_USER:-${POSTGRES_USER:-}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-financial_chat}}"
# Final defaults if nothing provided
POSTGRES_USER_DEFAULT="${DB_USER:-financial_user}"
POSTGRES_PASSWORD_DEFAULT="${DB_PASSWORD:-${DB_PASSWORD}}"
POSTGRES_DB_DEFAULT="${DB_NAME:-financial_chat}"

if [[ -n "$REQUESTED_DB_PORT" ]]; then
  POSTGRES_PORT="$REQUESTED_DB_PORT"
fi

free_port() {
  local port="$1"
  # First, try to stop any Docker container using this port
  local container
  container="$(docker ps --format '{{.ID}} {{.Ports}}' 2>/dev/null | grep ":${port}->" | awk '{print $1}')"
  if [[ -n "$container" ]]; then
    echo "Stopping Docker container using port ${port}: $container"
    docker stop "$container" >/dev/null 2>&1 || true
    sleep 1
    return
  fi
  # If not a Docker container, kill the process directly (but not com.docker)
  local pids
  pids="$(lsof -Pi :"${port}" -sTCP:LISTEN -t 2>/dev/null)"
  if [[ -n "$pids" ]]; then
    for pid in $pids; do
      local proc_name
      proc_name="$(ps -p "$pid" -o comm= 2>/dev/null || true)"
      if [[ "$proc_name" != *"docker"* && "$proc_name" != "com.docker"* ]]; then
        echo "Killing process on port ${port}: $pid ($proc_name)"
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
    sleep 1
  fi
}

pick_available_port() {
  local first_choice="$1"
  # Free the port (stop container or kill process, but not Docker daemon)
  free_port "$first_choice"
  echo "$first_choice"
}

if [[ -z "$POSTGRES_PORT" ]]; then
  POSTGRES_PORT="$(pick_available_port 5432 5640)"
fi

# Ensure DATABASE_URL in .env is concrete (no placeholders); replace templated values if present.

if [[ "${START_BACKEND}" == "true" ]]; then
  DATABASE_URL_BASE="$(extract_database_url)"
  configure_database_env "$DATABASE_URL_BASE" "$POSTGRES_PORT"
  ORIGINAL_DB_PORT="$POSTGRES_PORT"
  ensure_postgres "$POSTGRES_PORT" "${REPO_ROOT}/docker/init.sql"
  if [[ "$POSTGRES_PORT" != "$ORIGINAL_DB_PORT" ]]; then
    configure_database_env "$DATABASE_URL_BASE" "$POSTGRES_PORT"
  fi
  wait_for_postgres "$POSTGRES_CONTAINER" "$DB_USER" "$DB_NAME"

  # Run migrations from backend/migrations folder
  MIGRATIONS_DIR="${REPO_ROOT}/backend/migrations"
  if [[ -d "$MIGRATIONS_DIR" ]]; then
    echo "Running migrations from ${MIGRATIONS_DIR}..."
    for migration in "$MIGRATIONS_DIR"/*.up.sql; do
      if [[ -f "$migration" ]]; then
        echo "  Applying: $(basename "$migration")"
        docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration" 2>&1 | grep -v "already exists\|NOTICE" || true
      fi
    done
    echo "Migrations complete."
  fi
fi

echo "Starting frontend on ${FRONTEND_PORT} (API http://localhost:${BACKEND_PORT}/api/v1)"
(
  ensure_frontend_install "$FRONTEND_DIR"
  generate_api_types "$FRONTEND_DIR"
  cd "$FRONTEND_DIR"
  PORT="${FRONTEND_PORT}" HOSTNAME="0.0.0.0" NEXT_CACHE_DIR="${FRONTEND_DIR}/.next/cache" GO_BACKEND_URL="http://localhost:${BACKEND_PORT}" pnpm run dev
) &
pids+=($!)

if [[ "${START_BACKEND}" == "true" ]]; then
  echo "Starting backend on ${BACKEND_PORT}"
  echo "Postgres container: ${POSTGRES_CONTAINER} (volume ${POSTGRES_VOLUME}) db=${DB_NAME} port=${POSTGRES_PORT}"
  echo "Using DB credentials: user=${DB_USER} name=${DB_NAME}"
  if [[ "${USE_AIR}" == "true" ]]; then
    # Find air binary - check PATH first, then common Go bin locations
    AIR_BIN=""
    if command -v air >/dev/null 2>&1; then
      AIR_BIN="air"
    elif [[ -x "${HOME}/go/bin/air" ]]; then
      AIR_BIN="${HOME}/go/bin/air"
    elif [[ -x "${GOPATH:-${HOME}/go}/bin/air" ]]; then
      AIR_BIN="${GOPATH:-${HOME}/go}/bin/air"
    fi

    if [[ -z "$AIR_BIN" ]]; then
      echo "Air not found. Install with: go install github.com/air-verse/air@latest"
      exit 1
    fi
    echo "Using Air for live reload (${AIR_BIN})"
    (
      cd "$BACKEND_DIR"
      PORT="${BACKEND_PORT}" DATABASE_URL="${DATABASE_URL_OVERRIDE}" "$AIR_BIN"
    ) &
  else
    (
      cd "$BACKEND_DIR"
      PORT="${BACKEND_PORT}" DATABASE_URL="${DATABASE_URL_OVERRIDE}" go run ./cmd/server
    ) &
  fi
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
