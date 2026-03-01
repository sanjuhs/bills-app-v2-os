#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

log() {
  printf "[dev-runner] %s\n" "$1"
}

run_backend() {
  if command -v uv >/dev/null 2>&1; then
    cd "$PROJECT_ROOT/backend" && uv run python manage.py runserver "127.0.0.1:${BACKEND_PORT}"
  else
    cd "$PROJECT_ROOT/backend" && python manage.py runserver "127.0.0.1:${BACKEND_PORT}"
  fi
}

run_frontend() {
  cd "$PROJECT_ROOT" && NEXT_PUBLIC_DJANGO_API_URL="http://127.0.0.1:${BACKEND_PORT}" pnpm exec next dev --port "${FRONTEND_PORT}"
}

log "Starting Django backend on 127.0.0.1:${BACKEND_PORT} and Next.js frontend on ${FRONTEND_PORT}"

run_backend >"$PROJECT_ROOT/backend-dev.log" 2>&1 &
BACKEND_PID=$!
log "Backend started (pid: ${BACKEND_PID})"

cleanup() {
  log "Shutting down services..."
  kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  wait "${BACKEND_PID}" >/dev/null 2>&1 || true
  log "Done"
}

trap cleanup EXIT INT TERM

run_frontend
cleanup
