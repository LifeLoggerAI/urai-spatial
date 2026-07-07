# Build and Audit Commands

Use these commands from the `urai-tier1` runtime root.

## Runtime root

```bash
cd urai-tier1
```

## Main checks

```bash
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run audit:routes
corepack pnpm run tier1:verify
corepack pnpm run tier5:verify
```

## Package scripts confirmed

The runtime package exposes scripts for typecheck, build, route audit, console audit, environment audit, tier verification, unit tests, and visual audit.

## Launch proof rule

A route is not production-certified until the command output, commit SHA, deployment SHA, rollback SHA, and screenshots are attached to release receipts.
