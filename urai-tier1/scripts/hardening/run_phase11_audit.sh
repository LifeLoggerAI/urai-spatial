#!/usr/bin/env bash
set -u -o pipefail
set +H

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TS="${1:-$(date +%Y%m%d_%H%M%S)}"
OUT_DIR="$APP_DIR/_audit/phase11-runtime/$TS"

mkdir -p "$OUT_DIR"

log() {
  printf '\n== %s ==\n' "$*" | tee -a "$OUT_DIR/run.log"
}

run() {
  printf '\n$ %s\n' "$*" | tee -a "$OUT_DIR/run.log"
  bash -lc "$*" 2>&1 | tee -a "$OUT_DIR/run.log"
  RC=${PIPESTATUS[0]}
  echo "RC=$RC" | tee -a "$OUT_DIR/run.log"
  return 0
}

cd "$APP_DIR" || exit 1

log "env"
run "pwd"
run "node -v"
run "pnpm -v"
run "df -h /home"

log "config sanity"
run "ls -la next.config.* 2>/dev/null || true"
run "[ -f firebase.json ] && sed -n '1,220p' firebase.json || true"
run "test -f next.config.js && sed -n '1,220p' next.config.js || true"

log "clean build"
run "rm -rf .next out"
run "pnpm build"

log "export output"
run "test -d out"
run "find out -maxdepth 2 -type f | wc -l | tee \"$OUT_DIR/out_count.txt\""
run "du -sh out | tee \"$OUT_DIR/out_size.txt\""
run "find out -type f -printf '%s %p\n' | sort -nr | sed -n '1,40p' | tee \"$OUT_DIR/out_largest.txt\""

log "repo payload scan"
run "find public src -type f -printf '%s %p\n' 2>/dev/null | sort -nr | sed -n '1,60p' | tee \"$OUT_DIR/source_largest.txt\""

log "dynamic usage scan"
run "grep -RInE 'window\\.|document\\.|localStorage\\.|sessionStorage\\.|navigator\\.|requestAnimationFrame\\(' src 2>/dev/null | tee \"$OUT_DIR/dynamic_scan.txt\" || true"

log "image asset scan"
run "find public src -type f \\( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.svg' -o -iname '*.gif' \\) -printf '%s %p\n' 2>/dev/null | sort -nr | sed -n '1,80p' | tee \"$OUT_DIR/image_assets.txt\""

log "summary"
run "printf 'OUT_DIR=%s\n' \"$OUT_DIR\""
