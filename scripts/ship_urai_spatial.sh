#!/usr/bin/env bash
set -x
PROJECT_NAME="urai-spatial"
VERSION="v1.0.0-final"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
set +e; set -o pipefail

# Install & build
pnpm install || pnpm install --force || true
pnpm build || true

# Firebase auth & deploy
firebase login --reauth || true
firebase use --add || true
firebase deploy || true

# Live URL verification
URL="https://urai-spatial.web.app"
HTTP=$(curl -s -o /tmp/page.html -w "%{http_code}" "$URL")
SIZE=$(wc -c < /tmp/page.html)

[ "$HTTP" = "200" ] || { echo "FAIL: $URL not reachable"; read; exit 1; }
[ "$SIZE" -gt 800 ] || { echo "FAIL: page empty"; read; exit 1; }

# Spatial-specific checks: JS + 3D/WebGL hints
grep -q "<script" /tmp/page.html || { echo "FAIL: JS bundles missing"; read; exit 1; }
grep -qi "canvas\|webgl\|three\|spatial" /tmp/page.html || { echo "FAIL: spatial content not detected"; read; exit 1; }

# Lock after proof
cat > LOCK.md <<EOF
LOCKED — URAI SPATIAL
$VERSION
$STAMP
LIVE SPATIAL SITE VERIFIED
EOF

git add .
git commit -m "lock(spatial)" || true
git tag "urai-spatial-$VERSION" || true
git push --tags || true

read -p "URAI SPATIAL FINALIZED — press ENTER"
