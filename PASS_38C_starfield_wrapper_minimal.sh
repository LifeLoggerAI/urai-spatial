#!/usr/bin/env bash
set -euo pipefail

APP="/home/user/urai-spatial/urai-tier1"
cd "$APP"

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT_DIR="$APP/_audit/PASS_38C_starfield_wrapper_minimal_$TS"
BACKUP_DIR="$AUDIT_DIR/backup"
mkdir -p "$AUDIT_DIR" "$BACKUP_DIR"

log(){ printf '%s\n' "$*" | tee -a "$AUDIT_DIR/run.log"; }
fail(){ log "FATAL: $*"; exit 1; }

backup(){
  local rel="$1"
  [ -f "$APP/$rel" ] || fail "missing file: $rel"
  mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
  cp -f "$APP/$rel" "$BACKUP_DIR/$rel"
  log "BACKUP: $rel"
}

STARFIELD="src/spatial/components/Starfield.tsx"
LIFEMAP="src/spatial/components/LifeMapStarfield.tsx"

backup "$STARFIELD"
backup "$LIFEMAP"

log "=== VERIFY FILES EXIST ==="
[ -f "$LIFEMAP" ] || fail "missing $LIFEMAP"
grep -n "export default function" "$LIFEMAP" | tee -a "$AUDIT_DIR/run.log" >/dev/null || fail "LifeMapStarfield missing default export"

log "=== WRITE STARFIELD WRAPPER ==="
cat > "$STARFIELD" <<'EOF'
'use client'

export { default } from './LifeMapStarfield'
EOF

log "=== PROOF ==="
sed -n '1,20p' "$STARFIELD" | tee -a "$AUDIT_DIR/run.log"
grep -n "export { default } from './LifeMapStarfield'" "$STARFIELD" | tee -a "$AUDIT_DIR/run.log" >/dev/null || fail "wrapper default export missing"

log "=== TYPECHECK ==="
pnpm exec tsc --noEmit 2>&1 | tee -a "$AUDIT_DIR/run.log"

log "=== BUILD ==="
pnpm exec next build --webpack 2>&1 | tee -a "$AUDIT_DIR/run.log"

log "PASS 38C COMPLETE"
