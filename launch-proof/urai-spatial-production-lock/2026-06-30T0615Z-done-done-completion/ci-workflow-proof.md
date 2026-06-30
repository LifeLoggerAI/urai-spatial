# CI/workflow proof — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: workflow YAML inspection + GitHub status metadata. Workflow dispatch execution unavailable here.

## Workflows present

### Firebase XR Deploy

Manual `workflow_dispatch` workflow. It is designed to:

1. Install dependencies.
2. Run static release gates.
3. Bake XR navmesh.
4. Run `pnpm xr:verify`.
5. Run `pnpm typecheck`.
6. Run `pnpm build`.
7. Deploy Firebase hosting.
8. Optionally deploy functions.
9. Run live smoke and deploy-proof checks.

### URAI Spatial Post Deploy Verify

Manual `workflow_dispatch` workflow. It is designed to:

1. Install dependencies.
2. Run static proof checks.
3. Run `pnpm xr:verify`.
4. Run `pnpm smoke:home-xr:live`.
5. Run `pnpm smoke:live`.
6. Run `scripts/check-home-xr-live-deploy-proof.mjs`.

## Execution status

No tool available in this pass exposed `workflow_dispatch` triggering. No workflow runs were returned for the starting SHA. Therefore deploy/CI proof is blocked.

## Exact owner action

Run manually in GitHub Actions:

1. `Firebase XR Deploy`
   - `deploy_target`: `hosting`
   - `live_url`: `https://urai-4dc1d.web.app`
2. `URAI Spatial Post Deploy Verify`
   - `live_url`: `https://urai-4dc1d.web.app`
3. `URAI Spatial Post Deploy Verify`
   - `live_url`: `https://urai.app`

Attach run IDs, URLs, logs, artifacts, Firebase release ID, and deploy-proof JSON to the next proof folder.
