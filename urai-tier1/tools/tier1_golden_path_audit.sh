#!/usr/bin/env bash
set -euo pipefail

PASS_NAME="tier1_golden_path_audit"
TS="$(date +%Y%m%d_%H%M%S)"
ROOT="$(pwd)"
AUDIT_ROOT="${ROOT}/_audit/${TS}_${PASS_NAME}"
REPORT="${AUDIT_ROOT}/REPORT.txt"
SUMMARY="${AUDIT_ROOT}/SUMMARY.txt"
mkdir -p "${AUDIT_ROOT}"

log()  { printf '%s\n' "$*" | tee -a "${REPORT}"; }
pass() { printf 'PASS: %s\n' "$*" | tee -a "${REPORT}"; }
fail() { printf 'FAIL: %s\n' "$*" | tee -a "${REPORT}"; exit 1; }

need_file() {
  local f="$1"
  [ -f "$f" ] || fail "required file missing: $f"
  pass "found file: $f"
}

need_dir() {
  local d="$1"
  [ -d "$d" ] || fail "required directory missing: $d"
  pass "found directory: $d"
}

count_matches() {
  local pattern="$1"
  shift
  grep -RInE --exclude='*.bak' --exclude='*.tmp' --exclude='*.broken' --exclude='*.disabled' --exclude='*.orig' --exclude='*.rej' --exclude='*.old' --exclude='*.save' --exclude='*~' --exclude='*.swp' --exclude='*.swo' --exclude='*.bak.*' --exclude='*.tmp.*' "$pattern" "$@" 2>/dev/null | wc -l | tr -d ' '
}

dump_matches() {
  local title="$1"
  local pattern="$2"
  shift 2
  {
    printf '\n==== %s ====\n' "$title"
    grep -RInE --exclude='*.bak' --exclude='*.tmp' --exclude='*.broken' --exclude='*.disabled' --exclude='*.orig' --exclude='*.rej' --exclude='*.old' --exclude='*.save' --exclude='*~' --exclude='*.swp' --exclude='*.swo' --exclude='*.bak.*' --exclude='*.tmp.*' "$pattern" "$@" 2>/dev/null || true
  } >> "${REPORT}"
}

section() {
  printf '\n==================================================\n' | tee -a "${REPORT}"
  printf '%s\n' "$1" | tee -a "${REPORT}"
  printf '==================================================\n' | tee -a "${REPORT}"
}

section "TIER-1 GOLDEN PATH AUDIT"
log "root: ${ROOT}"
log "audit: ${AUDIT_ROOT}"

need_dir "src"
need_file "package.json"
need_file "tsconfig.json"

COMMON_FILES=(
  "src/app/page.tsx"
  "src/spatial/scene/SpatialScene.tsx"
  "src/spatial/components/CinematicCameraRig.tsx"
  "src/spatial/components/Starfield.tsx"
  "src/spatial/components/LifeMapStarfield.tsx"
  "src/spatial/components/FocusSubject.tsx"
  "src/spatial/components/ReplayScene.tsx"
  "src/spatial/components/HomeEnvironment.tsx"
  "src/lib/uraiCanon/state.ts"
  "src/lib/uraiCanon/types.ts"
)

section "FILE PRESENCE"
for f in "${COMMON_FILES[@]}"; do
  if [ -f "$f" ]; then
    pass "present: $f"
  else
    log "WARN: expected anchor not found: $f"
  fi
done

section "1. BUILD / TYPECHECK"
command -v pnpm >/dev/null 2>&1 || fail "pnpm not installed"
log "pnpm found: $(command -v pnpm)"

{
  printf '\n==== pnpm typecheck ====\n'
  pnpm typecheck
} >> "${REPORT}" 2>&1 || fail "typecheck failed; see ${REPORT}"
pass "typecheck clean"

{
  printf '\n==== pnpm build ====\n'
  pnpm build
} >> "${REPORT}" 2>&1 || fail "build failed; see ${REPORT}"
pass "build clean"

section "2. STATE AUTHORITY"
STATE_MATCHES="$(count_matches 'selectedStarId|selectedStar|transitionPhase|mode' src)"
DISPATCH_MATCHES="$(count_matches 'dispatch\(\{[^)]*type:' src)"
USESTATE_MODE_MATCHES="$(grep -RInE 'useState\([^)]*\)' src 2>/dev/null | grep -E 'mode|selectedStar|transitionPhase' | wc -l | tr -d ' ' || true)"

log "state-related references total: ${STATE_MATCHES}"
log "dispatch calls total: ${DISPATCH_MATCHES}"
log "local state authority risks: ${USESTATE_MODE_MATCHES}"

dump_matches "dispatch calls" 'dispatch\(\{[^)]*type:' src
dump_matches "local state authority risks" 'useState\([^)]*\)' src

if [ "${USESTATE_MODE_MATCHES}" -gt 0 ]; then
  fail "local state appears to control canonical flow; inspect REPORT"
fi
pass "no obvious local canonical-state ownership found"

section "3. CANON FLOW ENFORCEMENT"
for token in OPEN_FOCUS OPEN_REPLAY; do
  if grep -Rqs "$token" src; then
    pass "found action token: $token"
  else
    fail "missing canonical action token: $token"
  fi
done
dump_matches "canonical flow tokens" 'OPEN_FOCUS|OPEN_REPLAY|ascent|arrive_lifemap|open_focus|open_replay|close_focus|close_replay|go_home' src

section "4. ESC / BACKCHAIN"
ESC_MATCHES="$(count_matches 'ESCAPE|ESC|esc\(' src)"
dump_matches "esc/backchain references" 'ESCAPE|ESC|esc\(' src
log "esc-related references: ${ESC_MATCHES}"
[ "${ESC_MATCHES}" -gt 0 ] || fail "no esc/backchain logic found"
pass "esc/backchain logic exists"

section "5. TRANSITION PHASES"
PHASE_TOKENS='idle|ascent|arrive_lifemap|open_focus|open_replay|close_focus|close_replay|go_home'
PHASE_COUNT="$(count_matches "${PHASE_TOKENS}" src)"
dump_matches "transition phase tokens" "${PHASE_TOKENS}" src
log "phase-token references: ${PHASE_COUNT}"
[ "${PHASE_COUNT}" -ge 8 ] || fail "transition phase system appears incomplete"
pass "transition phase system appears present"

section "6. CAMERA AUTHORITY"
dump_matches "camera authority references" 'camera|Camera|useThree|lookAt|position\.set|lerp|damp' src/spatial src/lib
CAMERA_COMPONENT_WRITES="$(grep -RInE 'camera\.(position|rotation|quaternion)|lookAt\(' src/spatial src/lib 2>/dev/null | wc -l | tr -d ' ' || true)"
log "camera mutation references: ${CAMERA_COMPONENT_WRITES}"
[ -f "src/spatial/components/CinematicCameraRig.tsx" ] || fail "CinematicCameraRig.tsx missing"
[ "${CAMERA_COMPONENT_WRITES}" -gt 0 ] || fail "no camera authority behavior found"
pass "camera rig present"
pass "camera authority behavior found"

section "7. MODE ISOLATION"
dump_matches "mode checks" "mode === 'home'|mode === 'lifemap'|mode === 'focus'|mode === 'replay'" src
MODE_CHECKS="$(count_matches "mode === 'home'|mode === 'lifemap'|mode === 'focus'|mode === 'replay'" src)"
log "mode guard references: ${MODE_CHECKS}"
[ "${MODE_CHECKS}" -ge 4 ] || fail "mode isolation checks incomplete"
pass "mode isolation checks present"

section "8. FOCUS LAW"
dump_matches "focus-related refs" 'FocusSubject|selectedStarId|selectedStar|open_focus|focusTransition' src
FOCUS_COUNT="$(count_matches 'FocusSubject|selectedStarId|selectedStar|open_focus|focusTransition' src)"
log "focus refs: ${FOCUS_COUNT}"
[ "${FOCUS_COUNT}" -ge 5 ] || fail "focus law appears under-implemented"
pass "focus path appears implemented"

section "9. REPLAY LAW"
dump_matches "replay-related refs" 'ReplayScene|OPEN_REPLAY|open_replay|close_replay|replay' src
REPLAY_COUNT="$(count_matches 'ReplayScene|OPEN_REPLAY|open_replay|close_replay|replay' src)"
log "replay refs: ${REPLAY_COUNT}"
[ "${REPLAY_COUNT}" -ge 5 ] || fail "replay path appears under-implemented"
pass "replay path appears implemented"

section "10. INTERACTION LOCKING"
dump_matches "transition locking refs" 'pointer-events|pointerEvents|isTransitioning|transitionLock|lockWindow|interactionLock|disabled' src
LOCK_COUNT="$(count_matches 'pointer-events|pointerEvents|isTransitioning|transitionLock|lockWindow|interactionLock|disabled' src)"
log "interaction-lock refs: ${LOCK_COUNT}"
[ "${LOCK_COUNT}" -gt 0 ] || fail "no interaction lock found during transitions"
pass "interaction lock signals present"

section "11. DETERMINISM RISKS"
dump_matches "randomness/time risks" 'Math\.random|Date\.now|performance\.now' src
RAND_COUNT="$(count_matches 'Math\.random|Date\.now' src)"
log "randomness refs: ${RAND_COUNT}"
[ "${RAND_COUNT}" -eq 0 ] || fail "determinism risk: randomness found in src"
pass "no obvious randomness in core src"

section "12. DEV LOCK / NEXT PROCESS CHECK"
LOCKFILE=".next/dev/lock"
if [ -f "${LOCKFILE}" ]; then
  log "WARN: found ${LOCKFILE}"
  if command -v lsof >/dev/null 2>&1; then
    {
      printf '\n==== lsof on .next/dev/lock ====\n'
      lsof "${LOCKFILE}" || true
    } >> "${REPORT}" 2>&1
  fi
else
  pass "no lingering .next dev lock file found"
fi

section "13. FINAL SUMMARY"
PASS_COUNT="$(grep -c '^PASS:' "${REPORT}" || true)"
FAIL_COUNT="$(grep -c '^FAIL:' "${REPORT}" || true)"
WARN_COUNT="$(grep -c '^WARN:' "${REPORT}" || true)"

{
  printf 'TIER-1 GOLDEN PATH SUMMARY\n'
  printf 'audit_dir=%s\n' "${AUDIT_ROOT}"
  printf 'passes=%s\n' "${PASS_COUNT}"
  printf 'fails=%s\n' "${FAIL_COUNT}"
  printf 'warns=%s\n' "${WARN_COUNT}"
  printf '\nDecision:\n'
  printf -- '- PASS means the repo cleared static enforcement checks and build gates.\n'
  printf -- '- This does not certify experiential lock by itself.\n'
  printf -- '- Use this as the repo authority gate before runtime/video certification.\n'
} | tee "${SUMMARY}"

pass "audit complete"
log "report: ${REPORT}"
log "summary: ${SUMMARY}"
