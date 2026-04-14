#!/usr/bin/env bash
set -euo pipefail
cd "/home/user/urai-spatial/urai-tier1" || exit 1
tar -czf "launch-pack/founder-showcase-20260408_022008.tar.gz" -C "launch-pack" "founder-showcase-20260408_022008"
echo "PACKED=launch-pack/founder-showcase-20260408_022008.tar.gz"
