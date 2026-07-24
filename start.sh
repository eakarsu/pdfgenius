#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"
[ -f .env ] || { printf 'Missing ignored .env runtime configuration.\n' >&2; exit 2; }
set -a
source .env
set +a

: "${SERVER_PORT:?SERVER_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
[ "$SERVER_PORT" != "$FRONTEND_PORT" ] || { printf 'API and UI ports must be distinct.\n' >&2; exit 2; }
for port in "$SERVER_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf 'Port %s is already occupied.\n' "$port" >&2
    exit 2
  fi
done

node scripts/assert-local-prototype.js
node server.js &
api_pid=$!
npm run start -- --port "$FRONTEND_PORT" --strictPort &
ui_pid=$!

cleanup() {
  trap - EXIT INT TERM
  kill "$api_pid" "$ui_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  wait "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _attempt in {1..45}; do
  if curl -fsS "http://127.0.0.1:$SERVER_PORT/api/health" >/dev/null 2>&1 &&
     curl -fsS "http://127.0.0.1:$FRONTEND_PORT/login" >/dev/null 2>&1; then
    printf 'PDFGenius ready: API %s, UI %s\n' "$SERVER_PORT" "$FRONTEND_PORT"
    while kill -0 "$api_pid" 2>/dev/null && kill -0 "$ui_pid" 2>/dev/null; do
      sleep 1
    done
    printf 'A managed PDFGenius service exited.\n' >&2
    exit 1
  fi
  kill -0 "$api_pid" 2>/dev/null || exit 1
  kill -0 "$ui_pid" 2>/dev/null || exit 1
  sleep 1
done
printf 'PDFGenius readiness timed out.\n' >&2
exit 1
