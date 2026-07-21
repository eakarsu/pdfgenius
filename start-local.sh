#!/usr/bin/env bash
set -eu

printf 'Starting the acknowledged local-only prototype; synthetic data only.\n' >&2
exec npm run dev
