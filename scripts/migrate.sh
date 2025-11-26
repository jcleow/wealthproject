#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper to run golang-migrate against the configured database.
# Usage:
#   ./scripts/migrate.sh up            # migrate to latest
#   ./scripts/migrate.sh down 3        # migrate down 3 steps
#   ./scripts/migrate.sh up 5          # migrate up to version 5

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env if present so we can reuse the same DATABASE_URL as main.go
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  source "${REPO_ROOT}/.env"
  set +a
fi

# Default migrations directory; can be overridden via MIGRATIONS_DIR env.
MIGRATIONS_DIR="${MIGRATIONS_DIR:-}"
if [[ -z "$MIGRATIONS_DIR" ]]; then
  if [[ -d "${REPO_ROOT}/backend/migrations" ]]; then
    MIGRATIONS_DIR="${REPO_ROOT}/backend/migrations"
  elif [[ -d "${REPO_ROOT}/migrations" ]]; then
    MIGRATIONS_DIR="${REPO_ROOT}/migrations"
  else
    echo "No migrations directory found. Set MIGRATIONS_DIR." >&2
    exit 1
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Please export it before running." >&2
  exit 1
fi

if ! command -v migrate >/dev/null 2>&1; then
  echo "migrate CLI not found. Install from https://github.com/golang-migrate/migrate/tree/master/cmd/migrate" >&2
  exit 1
fi

CMD="${1:-}"; shift || true
TARGET="${1:-}"

if [[ -z "$CMD" ]]; then
  echo "Usage: $0 <up|down> [steps|version]" >&2
  exit 1
fi

case "$CMD" in
  up)
    if [[ -n "$TARGET" ]]; then
      migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" goto "$TARGET"
    else
      migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" up
    fi
    ;;
  down)
    if [[ -n "$TARGET" ]]; then
      migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" down "$TARGET"
    else
      migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" down 1
    fi
    ;;
  *)
    echo "Unknown command: $CMD (use up|down)" >&2
    exit 1
    ;;
esac
