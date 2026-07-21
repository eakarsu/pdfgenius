#!/usr/bin/env bash
set -eu

if [ "${NODE_ENV:-development}" != "test" ]; then
  printf 'Production-style startup is disabled. See PROJECT_STATUS.json and OPERATIONS.md.\n' >&2
  exit 1
fi

export PDFGENIUS_PROTOTYPE_ACK=I_UNDERSTAND_PDFGENIUS_IS_LOCAL_ONLY
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:${FRONTEND_PORT:-3000}}"
exec node server.js
