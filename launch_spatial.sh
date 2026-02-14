#!/usr/bin/env bash
set -euo pipefail

echo "🚀 URAI-SPATIAL PRODUCTION LAUNCH SEQUENCE INITIATED"

PROJECT_NAME="urai-spatial"
VERSION="v1.0.0-spatial"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🔍 Verifying environment..."

command -v node >/dev/null 2>&1 || { echo "❌ Node not installed"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not installed"; exit 1; }
command -v firebase >/dev/null 2>&1 || { echo "❌ Firebase CLI not installed"; exit 1; }

echo "📦 Installing clean dependencies..."
rm -rf node_modules .next
pnpm install --frozen-lockfile

echo "🔎 Typechecking..."
pnpm exec tsc --noEmit

echo "🧹 Linting..."
pnpm exec eslint . --max-warnings=0

echo "🧪 Running tests..."
pnpm exec jest --passWithNoTests

echo "🏗 Building production bundle..."
pnpm build

echo "🔐 Validating required env variables..."
REQUIRED_VARS=("NEXT_PUBLIC_FIREBASE_API_KEY" "NEXT_PUBLIC_FIREBASE_PROJECT_ID")
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR:-}" ]; then
    echo "❌ Missing required env var: $VAR"
    exit 1
  fi
done

echo "🔥 Deploying Firebase Hosting + Functions..."
firebase deploy --only hosting,functions

echo "🏷 Tagging release..."
git add -A
git commit -m "URAI-SPATIAL Production Launch ${VERSION}" || true
git tag -a "${VERSION}" -m "URAI Spatial Production Release ${TIMESTAMP}"
git push origin main --tags

echo "📄 Generating SHIP REPORT..."
cat <<EOF > SHIP_REPORT_${TIMESTAMP}.md
# URAI-SPATIAL Production Release

Version: ${VERSION}
Timestamp: ${TIMESTAMP}

✔ Dependencies installed clean
✔ Typecheck passed
✔ Lint passed
✔ Tests passed
✔ Production build successful
✔ Firebase deployed
✔ Git tagged

Status: LOCKED & LIVE
EOF

echo "🔒 Creating LOCK file..."
echo "${VERSION} - LOCKED ${TIMESTAMP}" > URAI_SPATIAL_LOCK.md

echo "✅ URAI-SPATIAL IS NOW LIVE AND LOCKED."
