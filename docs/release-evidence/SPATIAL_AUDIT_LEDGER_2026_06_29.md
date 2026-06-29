# Spatial audit ledger 2026-06-29

Status: deployed but final live smoke required.

Source state:
- Root route renders TierOneExperience in home mode.
- Home mode renders HomeWorldProduction.
- HomeWorldProduction is the intended production public home surface.
- Deploy proof route exists at /api/system/deploy-proof.
- Required release marker is urai-spatial-public-surface-2026-06-29-homeworldproduction.

Gate state:
- smoke:live checks the deploy proof route.
- check-home-xr-live-deploy-proof checks the deploy proof route.
- Transitional launch copy fails live smoke.
- Prototype and placeholder wording fail live smoke.
- Firebase XR Deploy runs static gates, XR verification, build, deploy, and live proof.
- URAI Spatial Post Deploy Verify reruns proof without redeploying.

Observed deployment state:
- Firebase project observed: urai-4dc1d.
- Live URL observed: https://urai-4dc1d.web.app.
- Firebase deploy completed in operator logs.
- SSR function update completed in operator logs.
- XR verification passed in operator logs.

Current live blocker:
- Live root has returned transitional launch/build-finalizing copy.
- This blocks live verified status until latest main is redeployed and strict smoke passes.

Promotion rule:
- Latest main must be deployed.
- Root and home must render the production home surface.
- /api/system/deploy-proof must return the required marker.
- smoke:home-xr:live must pass.
- smoke:live must pass.
- check-home-xr-live-deploy-proof must pass.
- Commit SHA, live URL, Firebase project, and smoke evidence must be recorded.

Required operator path:
- Run GitHub Actions workflow Firebase XR Deploy.
- Use deploy_target hosting,functions.
- Use live_url https://urai-4dc1d.web.app.
- Then run URAI Spatial Post Deploy Verify with the same live URL.
