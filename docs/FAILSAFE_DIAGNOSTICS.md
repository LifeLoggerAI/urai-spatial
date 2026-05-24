# Failsafe Diagnostics

When provider credentials are absent, spatial runtime must stay in deterministic fallback mode.

## Checklist
- Verify `.env.local` based on `.env.example`.
- Keep demo fallback toggles enabled.
- Ensure smoke checks pass for `/`, `/life-map`, `/spatial` in fallback mode.

## Suggested command order
- `corepack pnpm install`
- `corepack pnpm bootstrap:check`
- `corepack pnpm check:types`
- `corepack pnpm lint`
- `corepack pnpm test:unit`
- `corepack pnpm build`
