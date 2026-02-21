#!/bin/bash

set -e

echo "🔒 URAI-SPATIAL v1 SHIP READINESS CHECK"

echo "1️⃣ Clearing build cache..."
rm -rf apps/spatial-web/.next

echo "2️⃣ Verifying next.config.js..."
grep -q "output: 'export'" apps/spatial-web/next.config.js || { echo "❌ Missing output: 'export'"; exit 1; }
grep -q "unoptimized: true" apps/spatial-web/next.config.js || { echo "❌ Images not unoptimized"; exit 1; }

echo "3️⃣ Verifying build script..."
grep -q '"build": "next build"' apps/spatial-web/package.json || { echo "❌ Build script incorrect"; exit 1; }

echo "4️⃣ Running production build..."
cd apps/spatial-web
pnpm install
pnpm run build

echo "5️⃣ Checking TypeScript strict mode..."
grep -q '"strict": true' tsconfig.json || { echo "❌ TypeScript strict mode not enabled"; exit 1; }

cd ../../

echo "6️⃣ Verifying Firestore rules exist..."
[ -f infra/firestore.rules ] || { echo "❌ Firestore rules missing"; exit 1; }

echo "7️⃣ Verifying kill switch references..."
grep -R "killSwitch" functions/src || { echo "❌ Kill switch not referenced"; exit 1; }

echo "8️⃣ Checking for placeholder logic..."
grep -R "TODO" functions/src && echo "⚠️ TODOs found — verify manually"

echo "9️⃣ Checking Firebase login..."
firebase login:list || { echo "❌ Not logged into Firebase"; exit 1; }

echo "🔟 Ready for deploy"
echo "Run: firebase deploy"

echo "✅ Spatial v1 build integrity verified."
