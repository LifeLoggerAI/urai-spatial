set -euo pipefail

echo "=== URAI-SPATIAL ESLINT SETUP + FIX START ==="

REPO="${HOME}/urai-spatial"
cd "$REPO"

if [ ! -f package.json ]; then
  echo "ERROR: package.json not found in $REPO"
  exit 1
fi

echo "=== Installing pinned lint deps ==="
pnpm add -D eslint@8.57.1 eslint-config-next@14.2.3

echo "=== Writing .eslintrc.json ==="
cat > .eslintrc.json <<'EOF'
{
  "root": true,
  "extends": ["next/core-web-vitals"],
  "ignorePatterns": [
    ".next/",
    "node_modules/",
    "dist/",
    "out/",
    "build/",
    "coverage/",
    "public/engine/gpu/",
    "public/memories/",
    "public/memory/",
    "public/scenes/",
    "public/shaders/",
    "*.log"
  ]
}
EOF

echo "=== Writing .eslintignore ==="
cat > .eslintignore <<'EOF'
.next
node_modules
dist
out
build
coverage
public/engine/gpu
public/memories
public/memory
public/scenes
public/shaders
*.log
EOF

echo "=== Patching package.json scripts ==="
node <<'EOF'
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));

pkg.scripts = pkg.scripts || {};
pkg.scripts.lint = "next lint";
pkg.scripts["lint:fix"] = "eslint . --ext .js,.jsx,.ts,.tsx --fix";

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
EOF

echo "=== Installing lockfile-resolved deps ==="
pnpm install

echo "=== Running next lint ==="
pnpm lint || true

echo "=== Running eslint autofix pass ==="
pnpm lint:fix || echo "WARN: eslint fix completed with remaining issues"

echo "=== URAI-SPATIAL ESLINT LOCKED ==="
echo "Repo: $REPO"