# Release checklist — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`

## READY checklist

- [x] Prior WebXR resolver fix present on main.
- [x] Custom domain public preview renders truthful conservative copy.
- [x] Life Map public preview labels demo/local fallback and owner gating.
- [x] XR remains progressive enhancement in source/copy.
- [ ] Latest-main install and dependency bootstrap passed.
- [ ] Latest-main typecheck passed.
- [ ] Latest-main lint passed.
- [ ] Latest-main tests passed.
- [ ] Latest-main build/static build passed.
- [ ] Latest-main `xr:verify` passed.
- [ ] Latest-main `lock:all` passed.
- [ ] Firebase default host redeployed fresh.
- [ ] Custom domain and Firebase default host serve same intended release.
- [ ] `/api/system/deploy-proof` returns latest audited SHA on both targets.
- [ ] Stale placeholder removed from Firebase default host.
- [ ] `pnpm smoke:live` passes for both targets.
- [ ] `pnpm smoke:home-xr:live` passes for both targets.
- [ ] Meta Quest Browser physical WebXR session proof captured.
- [ ] Browser/device fallback QA captured.
- [ ] Life Map persistence either proven or publicly locked as demo/local fallback.

## Launch decision

Do not launch as READY. Launch only as truthful public preview until unchecked items are complete.
