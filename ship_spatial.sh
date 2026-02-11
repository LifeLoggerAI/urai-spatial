#!/usr/bin/env bash
set -e

echo "=== URAI-SPATIAL RELEASE ==="

# 1. Clean
rm -rf .next dist build

# 2. Install
pnpm install

# 3. Lint
pnpm lint

# 4. Type check
pnpm tsc --noEmit

# 5. Run tests
pnpm test

# 6. Production build
pnpm build

# 7. Generate integrity hash
shasum -a 256 .next > BUILD.sha256

# 8. Git tag
git add .
git commit -m "release: v1.0.0-spatial sealed"
git tag -a v1.0.0-spatial -m "URAI-Spatial Production Lock"

echo "=== READY TO DEPLOY ==="
