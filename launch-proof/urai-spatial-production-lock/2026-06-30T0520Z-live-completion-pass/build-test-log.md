# Build / test log — URAI Spatial live completion pass

## Commands actually executable in this pass

This pass used the GitHub connector and web live fetches. It could inspect source, commits, CI status metadata, and public URL text responses. It could not run shell commands, install dependencies, start local Next.js, run Playwright, run Firebase deploy, or physically validate a headset.

## Source/metadata checks performed

| Check | Result |
| --- | --- |
| Repo access | Confirmed admin/push access through GitHub connector. |
| Default branch | `main`. |
| Prior resolver fix containment | Confirmed: `main` is ahead of `1b9284215f05afa7844da270377c6191431d65bd` by one proof commit before this pass. |
| Latest main before this proof pass | `174ae2221d74a84068e033433c218f32005bcee3`. |
| WebXR resolver file | Present with `resolveWebXREntryStateById`. |
| Combined status for latest main | No statuses returned. |
| Workflow runs for latest main | No workflow runs returned. |

## Commands still required locally/CI

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm bootstrap:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm build:static
pnpm xr:verify
pnpm lock:all
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai.app pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:home-xr:live
```

## Build status conclusion

No latest-main build/test pass was proven by GitHub CI metadata in this pass. Prior build evidence exists in repository docs for an older commit, but current latest-main readiness requires fresh execution after the WebXR resolver fix and proof commits.
