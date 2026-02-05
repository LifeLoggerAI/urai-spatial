set -euo pipefail

echo "=== ESLINT SETUP + FIX START (URAI-SPATIAL) ==="

cd ~/urai-spatial

# Ensure correct versions
pnpm install eslint@^8.57.0 eslint-config-next@14.2.3 -D

# Create .eslintrc.json (Strict / Next Core Web Vitals)
cat > .eslintrc.json <<'EOF'
{
  "extends": "next/core-web-vitals"
}
EOF

# Add .eslintignore
cat > .eslintignore <<'EOF'
.next
node_modules
dist
out
build
coverage
*.log
EOF

# Patch package.json scripts
node -e '
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path));
pkg.scripts = pkg.scripts || {};
pkg.scripts.lint = "eslint . --ext .js,.jsx,.ts,.tsx";
pkg.scripts["lint:fix"] = "eslint . --ext .js,.jsx,.ts,.tsx --fix";
fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
'

# Run install and auto-fix
pnpm install
pnpm lint:fix || echo "⚠️ ESLint fix pass complete with issues"

echo "=== ESLINT LOCKED: STRICT MODE ENABLED ==="
