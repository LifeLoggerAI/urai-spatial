#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

pkill -f "next start" || true
pkill -f "node.*next.*start" || true

if command -v lsof >/dev/null 2>&1; then
  pids="$(lsof -ti tcp:3001 || true)"
  [ -n "${pids:-}" ] && kill -9 $pids || true
fi

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3001/tcp || true
fi

PORT=3001 pnpm start >/tmp/urai_spatial_prod_smoke.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:3001/" >/tmp/urai_spatial_home.html 2>/dev/null; then
    break
  fi
  sleep 1
done

test -s /tmp/urai_spatial_home.html
grep -qi '<html' /tmp/urai_spatial_home.html
grep -qi '</html>' /tmp/urai_spatial_home.html

echo "smoke route ok"
