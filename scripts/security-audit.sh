#!/usr/bin/env bash
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BASE_COMMIT=f68d8be20f7e642e956c59536a85e8be3a370802
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/pdfgenius-security.XXXXXX")
LIST_FILE="$TMP_ROOT/files.txt"
CANDIDATE_FILE="$TMP_ROOT/candidates.txt"
trap 'rm -rf "$TMP_ROOT"' EXIT HUP INT TERM

if ! command -v gitleaks >/dev/null 2>&1; then
  printf 'security-audit: gitleaks is required; no scan was performed\n' >&2
  exit 127
fi

git -C "$ROOT" ls-files --cached --others --exclude-standard > "$CANDIDATE_FILE"
while IFS= read -r relative; do
    [ -f "$ROOT/$relative" ] && printf '%s\n' "$relative"
done < "$CANDIDATE_FILE" > "$LIST_FILE"

tar -C "$ROOT" -cf - -T "$LIST_FILE" | tar -C "$TMP_ROOT" -xf -
gitleaks dir "$TMP_ROOT" --redact --no-banner

if [ "$(git -C "$ROOT" rev-parse HEAD)" != "$BASE_COMMIT" ]; then
  gitleaks git "$ROOT" --log-opts="$BASE_COMMIT..HEAD" --redact --no-banner
else
  printf 'security-audit: no committed changes after reviewed source snapshot\n'
fi

printf 'security-audit: candidate content and post-boundary history passed\n'
