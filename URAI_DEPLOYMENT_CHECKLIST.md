# URAI Deployment Checklist

Do not deploy URAI Genesis until this checklist is green.

## Identity

- Repo: `LifeLoggerAI/urai-spatial`
- Branch: `urai-genesis-final-integration`
- Runtime app: `urai-tier1`
- Local preview: port `3001`
- Package manager: pnpm workspace

## Required checks

Run from a writable clone. In Firebase Studio, `/home` may be full, so a `/tmp` clone with redirected caches is recommended.

```bash
cd /tmp/urai-work/urai-spatial
git fetch origin urai-genesis-final-integration
git checkout urai-genesis-final-integration
rm -rf /tmp/urai-home /tmp/npm-cache /tmp/pnpm-store /tmp/xdg-cache /tmp/xdg-data
mkdir -p /tmp/urai-home /tmp/npm-cache /tmp/pnpm-store /tmp/xdg-cache /tmp/xdg-data
HOME=/tmp/urai-home NPM_CONFIG_CACHE=/tmp/npm-cache npm_config_cache=/tmp/npm-cache XDG_CACHE_HOME=/tmp/xdg-cache XDG_DATA_HOME=/tmp/xdg-data npx --yes --package pnpm@10.0.0 pnpm install --store-dir /tmp/pnpm-store
HOME=/tmp/urai-home NPM_CONFIG_CACHE=/tmp/npm-cache npm_config_cache=/tmp/npm-cache XDG_CACHE_HOME=/tmp/xdg-cache XDG_DATA_HOME=/tmp/xdg-data npx --yes --package pnpm@10.0.0 pnpm --filter urai-tier1 typecheck
HOME=/tmp/urai-home NPM_CONFIG_CACHE=/tmp/npm-cache npm_config_cache=/tmp/npm-cache XDG_CACHE_HOME=/tmp/xdg-cache XDG_DATA_HOME=/tmp/xdg-data npx --yes --package pnpm@10.0.0 pnpm --filter urai-tier1 build
HOME=/tmp/urai-home NPM_CONFIG_CACHE=/tmp/npm-cache npm_config_cache=/tmp/npm-cache XDG_CACHE_HOME=/tmp/xdg-cache XDG_DATA_HOME=/tmp/xdg-data npx --yes --package pnpm@10.0.0 pnpm --filter urai-tier1 test
```

## Preview command

```bash
HOME=/tmp/urai-home NPM_CONFIG_CACHE=/tmp/npm-cache npm_config_cache=/tmp/npm-cache XDG_CACHE_HOME=/tmp/xdg-cache XDG_DATA_HOME=/tmp/xdg-data npx --yes --package pnpm@10.0.0 pnpm --dir urai-tier1 exec next dev --hostname 0.0.0.0 --port 3001 --webpack
```

Open `http://localhost:3001` in the Firebase Studio preview.

## Manual release gates

- Home opens to the spatial orb world.
- Enter the Sky opens the spatial memory layer.
- Bottom nav works without raw debug text.
- `/life-map` renders spatial LifeMap, not the previous simple TimelineView list.
- Reduced-motion behavior does not block navigation.
- Audio requires user action and does not autoplay.
- No secrets or environment files are committed.
- No production deploy is run until the above checks pass.
