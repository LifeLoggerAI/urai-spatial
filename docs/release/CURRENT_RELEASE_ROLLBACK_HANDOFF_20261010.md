# UrAi current release and rollback handoff — 2026-10-10

Preparation only. No production release, merge, independent approval, provider activation or rollback was executed by this handoff.

## Candidate and authority

The inspected engineering candidate is PR [#1785](https://github.com/LifeLoggerAI/urai-spatial/pull/1785), head `14dc7494d1da3efbbe5eeefc2bfb737283f99f5c`, based on visual-owner head `7fab9aeeafb1a454aad78758c584902f86622b9a`. Native runs for this head were beginning at preparation time. GitHub subsequently reports `mergeable=true` and computed merge `b23f23b2998662c0fc11f57dea1605919a98bba0`; an earlier `mergeable=false` is no longer a current conflict. This remains a draft child of the visual owner, not a merged production PR to main.

Production authority remains `LifeLoggerAI/urai-spatial`, runtime `urai-tier1`, canonical origin `https://urai.app`, Firebase project/site `urai-4dc1d`. Follow [deployment authority](../system/DEPLOYMENT_AUTHORITY.md) and [recovery policy](ROLLBACK.md). Do not replace the existing integration controller, transfer approvals across changed heads, or use legacy repositories for recovery.

After eligible owner integration, record the actual independently approved final PR head, main containment, required exact-head results and legitimate independent approval. The final production workflow requires a merged PR whose base is main and whose head exactly matches `release_sha`, plus a successful exact-head Release Governance Guard associated with that PR. PR #1785 cannot be supplied directly while it targets the visual-owner branch. Source changes invalidate this dated candidate observation.

## Existing deployment process

The executable guarded process is [.github/workflows/spatial-governed-wif-deploy.yml](../../.github/workflows/spatial-governed-wif-deploy.yml), “URAI Governed WIF Production Deploy.” Historical general shell deployment examples in older runbooks do not replace this protected process.

Inputs are `release_sha`, `rollback_sha`, `pull_request` and `confirm`. Dispatch must run on main, under protected environment `production`, after explicit production-release authorization. The workflow uses Node 22, pnpm 10.0.0 and Firebase CLI 15.22.3. Its production identity is:

| Binding | Source value |
|---|---|
| Project/site | `urai-4dc1d` |
| Public certification origin | `https://urai.app` |
| WIF provider | `projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions` |
| WIF service account | `urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com` |
| Hosting config/output | `firebase.static.json` / `urai-tier1/out` |
| Functions config/source | `firebase.json` / `apps/functions` |
| Deployment scope | Functions and Hosting |

These are source bindings, not verification of current IAM, billing, domain connection, secrets or backend health. `.firebaserc` has the canonical aliases and no explicit Hosting targets; the workflow captures releases for the canonical project/site before mutation.

Before release, retain the current live Hosting version/release identity, valid public fingerprint where available, approved recovery commit, asset manifest checksum, Functions/rules versions where applicable and reviewed release evidence. `rollback_sha` must be distinct from and ancestral to `release_sha`; the workflow builds its exact Functions source before production mutation. When the current live fingerprint is valid, its `releaseSha` must equal the supplied recovery SHA. Do not assume the historical public SHA is a tested rollback merely because it appeared in a fingerprint.

Once authorization and actual values exist, the existing workflow can be dispatched with this command. Replace each value with its verified release record; this command has not been run:

```bash
gh workflow run spatial-governed-wif-deploy.yml \
  --repo LifeLoggerAI/urai-spatial --ref main \
  -f release_sha="$URAI_REVIEWED_RELEASE_SHA" \
  -f rollback_sha="$URAI_PROVEN_RECOVERY_SHA" \
  -f pull_request="$URAI_MERGED_MAIN_PR" \
  -f confirm=DEPLOY_URAI_APP
```

The workflow installs frozen dependencies, loads public Firebase configuration from `/__/firebase/init.json` and requires project/auth-domain parity, builds `pnpm build:static` and `pnpm --filter urai-functions build`, and creates the static release bundle. It proves action-managed external-account ADC with no private key, captures current Hosting release authority, deploys Functions first and Hosting second, then runs exact live smoke. It certifies and republishes the fingerprint only after that smoke passes and repeats smoke against the certified fingerprint. It does not deploy Firestore rules/indexes; their required acceptance and any separately authorized scope remain explicit.

## Verification and evidence

Use the deployment workflow's `scripts/urai-post-deploy-smoke.mjs` calls and retain both `deployment-receipt/postdeploy/live-content-parity.json` and `certified-live-content-parity.json`. The script requires the actual release/recovery/authority SHAs, `git rev-parse HEAD:apps/functions` and the SHA-256 of `firebase.static.json`; use exact reviewed source for these values. It certifies only `https://urai.app`, not a provider alias as a replacement.

The existing smoke checks fingerprint/build parity, adopted route content, slash/non-slash behavior, Focus/Replay query continuity and protected server boundaries. It includes `/login`, `/privacy-policy` and `/support`, the three routes missing from the dated production readback retained by R76. Its anonymous HTTP checks do not prove private signed-in memory flows, real provider delivery, physical accessibility, artistic acceptance or the full journey. Those existing acceptance records remain separate requirements.

Retain the workflow run URL and complete `deployment-receipt/`, `release-bundle/manifest.json` and final fingerprint artifact. Confirm its outcomes, not merely workflow dispatch or HTTP 200. The older `spatial-post-deploy-verify.yml` is supplemental; it does not replace the guarded workflow's exact release/recovery/Functions/config identity checks.

## Existing automatic rollback and recovery

If any deployment, initial smoke, fingerprint certification, certified Hosting publication or final smoke fails after the Functions deployment starts, the guarded workflow attempts rollback and leaves the release failed/NO-GO.

Its existing rollback step restores the predeployment Hosting version captured in `deployment-receipt/predeploy/version-name.txt` through Firebase Hosting's releases API, then redeploys Functions from the prebuilt exact recovery worktree using:

```bash
npx --yes firebase-tools@15.22.3 deploy \
  --only functions --project urai-4dc1d \
  --config firebase.json --non-interactive
```

This is the workflow's recovery command, executed within the recorded recovery worktree under its short-lived WIF identity; it is not authorization for an ad hoc local deployment. The workflow checks the resulting Hosting version and retains `deployment-receipt/rollback/restore-result.json`, `functions.log`, `releases-after-restore.json` and `functions-source-sha.txt`. An attempted rollback is not successful recovery until the restored identity, public routes/APIs, privacy/security negative paths and monitoring satisfy the existing [recovery policy](ROLLBACK.md).

For later recovery, stop further release activity, preserve failure evidence, select the recorded known-good version/source and use the reviewed canonical recovery process. Asset recovery follows the last admitted manifest and checksum verification without paid regeneration. Jobs/provider recovery pauses dispatch, preserves in-flight work/idempotency/audit state, restores the admitted worker, and verifies queue/dead-letter/callback/cost behavior before replay. Do not use the older hosting-only provenance helper as proof for this Functions-and-Hosting deployment: its current schema intentionally expects `hosting-only` and `pending-post-deploy-smoke`.

## Still-unverified operational dependencies

R76 retains dated public production SHA `748e50398d85effeaa4ed17aaf78d4076dddbb45`, fingerprint project `urai-4dc1d`, deploy-proof project `unknown`, and the three public route gaps above. This is dated evidence, not current release or recovery certification. Current provider/control-plane credentials, domain bindings, backend account standing and authenticated positive/negative acceptance must be read back through their authorized environments; they were not available to this service lane.

Communications #94's current source is `e0963e36ea6e64c06ab01327923aaf40168a4cc0`, but Staging #109 at `66cf11063b49ffde3f08a8afd72b4e21a884faa4` deliberately admits only Communications main `40cd2f4b6d422734869486a49cddac9e103a58f1` or retained working #84 `274f53573f4d3bf843047e285f080083a55fe1ab`. It needs legitimate exact-head LimberNutz0 approval, eligible repository permission, current checks and protected source/account/budget/callback bindings before its existing process can run. No APPROVED review was returned; one historical bot COMMENTED review is not approval. Active Spatial staging consumers remain empty and the old Stripe #1600 binding is historical. Do not dispatch those old profiles as proof of the current integrated candidate. SendGrid remains read-only; Stripe LIVE remains disabled.

Local preparation verified 34 Communications callback/deadline/authority/origin/sender/token tests, 23 Staging approval/source-binding tests and its consumer validator against published source. The existing rollback-provenance self-test passes 10 cases. These are source/controlled-local checks, not production recovery or launch acceptance.
