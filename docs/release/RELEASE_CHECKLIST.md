# URAI Canonical Release Checklist

Last verified: 2026-07-03

A release is not complete because source was merged. Every applicable gate below requires direct current evidence.

## 1. Authority and scope

- [x] Canonical repository is `LifeLoggerAI/urai-spatial`.
- [x] Canonical application is `urai-tier1`.
- [x] Legacy `UrAi` automatic production deployment removed by PR #352.
- [ ] Historical production aliases removed or blocked in every other legacy repository.
- [ ] Exact release scope recorded, including excluded or preview-only features.

## 2. Source and rollback

- [ ] Exact source commit recorded.
- [ ] Current deployed commit or deploy-proof marker captured.
- [ ] Known-good rollback commit selected.
- [ ] Rollback commands reviewed.
- [ ] Asset rollback source selected.
- [ ] Functions/rules rollback source selected where applicable.

## 3. Reproducible validation

- [ ] Frozen dependency installation passes.
- [ ] Lockfile remains unchanged.
- [ ] Typecheck passes.
- [ ] Lint passes where configured.
- [ ] Unit tests pass.
- [ ] Integration and contract tests pass.
- [ ] Privacy/rules checks pass.
- [ ] Build passes.
- [ ] Static route generation/export passes where intended.
- [ ] Browser smoke passes.
- [ ] Mobile and reduced-motion checks pass.
- [ ] Accessibility checks pass.
- [ ] Security and public-copy gates pass.

## 4. Assets and providers

- [ ] Required asset manifest is complete.
- [ ] Paths and filename case are validated.
- [ ] Checksums, dimensions, format, transparency, and file sizes are validated.
- [ ] Mobile-safe variants and fallbacks exist.
- [ ] No incomplete provider output can replace production assets.
- [ ] No paid request is required, or explicit authorization is recorded.
- [ ] Provider-dependent claims have bounded authenticated evidence.

## 5. Deployment

- [ ] Required workflow gates are green for the exact source commit.
- [ ] Approved Firebase project and Hosting target confirmed.
- [ ] No legacy automatic workflow can overwrite the target.
- [ ] Deployment executed from the exact source commit.
- [ ] Deployment workflow and timestamp recorded.
- [ ] Monitoring receives deployment/runtime signals.

## 6. Public verification

- [ ] `https://urai.app` resolves to the canonical runtime.
- [ ] Core route fingerprints pass.
- [ ] Slash and non-slash forms resolve consistently.
- [ ] Focus query `memoryId=quiet-reset` is preserved.
- [ ] Replay queries `memoryId` and `manifestId` are preserved.
- [ ] Legacy runtime fingerprints are absent.
- [ ] Error and privacy paths behave truthfully.
- [ ] `/status` reflects evidence rather than aspiration.
- [ ] Custom-domain smoke artifact is saved.

## 7. XR claim boundary

- [ ] Automated XR source and browser checks pass.
- [ ] Non-XR fallback passes.
- [ ] Physical Quest checklist completed only on real hardware.
- [ ] Device model, browser version, route, controls, comfort, performance, and timestamp recorded.
- [ ] No full-device claim is made from code tests alone.

## Release decision

Status for current head during this update: **BLOCKED — mandatory workflows are queued and production deployment/custom-domain evidence is not recorded.**
