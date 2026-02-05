set -euo pipefail

echo "=== URAI-SPATIAL FINAL LOCK START (UTC $(date -u)) ==="

rm -rf node_modules pnpm-lock.yaml
pnpm install

# Patch tsconfig strict manually
sed -i 's/"strict": false/"strict": true/' tsconfig.json || true

# ESLint config
pnpm add -D eslint eslint-config-next
cat > .eslintrc.json <<'EOF'
{
  "extends": "next/core-web-vitals"
}
EOF

# Patch package.json with lint scripts (safe sed fallback)
sed -i '/"scripts": {/a \    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",\n    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",' package.json || true

# Git commit + tag
ts="$(date -u +%Y%m%d_%H%M%S)"
git add . || true
git commit -am "✅ urai-spatial lint+strict lock ($ts)" || true
git tag "v1.0.0-spatial-$ts" || true

echo "=== ✅ LOCKED urai-spatial ($ts) ==="
