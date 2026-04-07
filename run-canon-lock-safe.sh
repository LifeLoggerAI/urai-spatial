#!/usr/bin/env bash
set +e

LOG="/home/user/urai-spatial/canon_lock_debug_$(date +%Y%m%d_%H%M%S).log"

echo "Logging to: $LOG"
{
  echo "=== START ==="
  date
  echo
  echo "=== PWD ==="
  pwd
  echo
  echo "=== ROOT LS ==="
  ls -la /home/user/urai-spatial
  echo
  echo "=== APP LS ==="
  ls -la /home/user/urai-spatial/urai-tier1
  echo
  echo "=== SRC CHECK ==="
  test -d /home/user/urai-spatial/urai-tier1/src && echo "src exists" || echo "src missing"
  test -d /home/user/urai-spatial/urai-tier1/src/app && echo "src/app exists" || echo "src/app missing"
  test -d /home/user/urai-spatial/urai-tier1/app && echo "app exists" || echo "app missing"
  test -f /home/user/urai-spatial/urai-tier1/package.json && echo "package.json exists" || echo "package.json missing"
  echo
  echo "=== PNPM CHECK ==="
  command -v pnpm || true
  pnpm -v || true
  echo
  echo "=== TYPESCRIPT CHECK ==="
  cd /home/user/urai-spatial/urai-tier1 || exit 91
  pnpm exec tsc --noEmit
  echo "TSC_EXIT=$?"
  echo
  echo "=== BUILD CHECK ==="
  pnpm build
  echo "BUILD_EXIT=$?"
  echo
  echo "=== END ==="
  date
} 2>&1 | tee "$LOG"

echo
echo "Done. Log file: $LOG"
read -r -p "Press Enter to close..."
