#!/usr/bin/env bash
# Runs the WhatsUp smoke and/or acceptance suites in Docker (no Python or Node needed on the host).
# Usage, from anywhere (WSL or Git Bash):  bash test/run-tests.sh [smoke|acceptance|all]
set -euo pipefail

cd "$(dirname "$0")/.."

case "${1:-all}" in
  smoke) target="smoke" ;;
  acceptance) target="acceptance" ;;
  all) target="smoke acceptance" ;;
  *) echo "Usage: bash test/run-tests.sh [smoke|acceptance|all]" >&2; exit 2 ;;
esac

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (local demo credentials)."
fi

compose=(docker compose -f compose.yaml -f test/compose.test.yaml --profile test)

echo "== Starting the stack (database, backend, frontend :3000, frontend-mock :3001)…"
"${compose[@]}" up --build --detach --wait frontend frontend-mock

echo "== Running: pytest ${target}"
# shellcheck disable=SC2086  # word splitting of $target is intended
"${compose[@]}" run --rm --build tests python -m pytest ${target}

echo "== Done. JUnit report: test/reports/junit.xml — stop the stack with: npm run stop"
