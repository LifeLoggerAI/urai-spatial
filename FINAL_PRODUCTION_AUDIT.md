# URAI Final Production Audit — 2026-06-23

Scope: `LifeLoggerAI/urai-spatial` as the public production source of truth, with system-of-systems findings for Studio, Marketing, legacy UrAi, Asset Factory, Jobs, Content, Admin, Analytics, and connected integration surfaces.

## Executive verdict

URAI Spatial is live as a public route spine and the latest source contains the missing `/privacy-controls` route. The public deployment at `https://urai.app` is not fully current with `main`: `/privacy-controls` still serves the Home fallback on the live site until a fresh static build and Firebase Hosting deploy is run.

Do not call the entire URAI system-of-systems fully production-locked until the live cloud, provider, worker, billing, storage, domain, observability, and evidence gates listed below are cleared.

## Production source of truth

- Public Spatial product: `LifeLoggerAI/urai-spatial`, branch `main`.
- Static Hosting config: `firebase.static.json`, public directory `urai-tier1/out`.
- Root package manager: `pnpm@10.0.0`.
- Root Node engine: `>=22`.
- Canonical public URL checked: `https://urai.app`.

## Completed in this audit pass

- Added source route `urai-tier1/src/app/privacy-controls/page.tsx`.
- Commit: `84c6e28af89100e78643cbd4ad070d868ff3092f`.
- The route includes production copy and visible controls for world memory, location precision, model access, exports, workforce actions, and legacy/presence.
- Created cross-repo system audit in `LifeLoggerAI/urai-labs-llc/docs/SYSTEM_OF_SYSTEMS_AUDIT_2026-06-23.md`.
- Commit: `218ba0574c585d555fcc78f68d614e217b1a5c41`.

## Live route verification

Checked through browser/web inspection on `https://urai.app`.

| Route | Live result | Production status |
| --- | --- | --- |
| `/` | Home threshold rendered with sky/ground route zones, orb, private signals, workforce, and route rail. | Green |
| `/home` | Same Home threshold surface. | Green |
| `/ground` | Ground World rendered with private real-life operating layer, workforce stations, consent, objects, and approval copy. | Green |
| `/life-map` | Life Map rendered with thirty-four public-safe stars and route links into Focus, Replay, Mirror, Passport, Status, Privacy, and Home. | Green |
| `/focus` | Selected memory chamber rendered for The Quiet Reset. | Green |
| `/replay` | Living memory film rendered for The Quiet Reset. | Green |
| `/mirror` | Reachable, but deployed copy is thin compared with current source. | Yellow: redeploy/source alignment needed |
| `/passport` | Reachable, but deployed copy is older/thinner than current source. | Yellow: redeploy/source alignment needed |
| `/privacy-controls` | Live URL currently serves Home fallback instead of the new Privacy Controls route. | Red until redeployed |
| `/location-map` | Reachable symbolic atlas with demo places; deployed copy is thinner than current source. | Yellow: redeploy/source alignment needed |
| `/status` | Reachable launch status surface; deployed copy is older/thinner than current source. | Yellow: redeploy/source alignment needed |

## Commands inspected / required

Spatial supports:

```bash
pnpm bootstrap:check
pnpm lock:static
pnpm build:static
pnpm smoke:live
pnpm live:deploy:static
pnpm publish:live:static
```

Required production refresh:

```bash
cd ~/urai-spatial
git pull origin main
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
pnpm lock:static
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

## Build/test/deploy result for this audit session

Build and deploy were not run from the ChatGPT container because the active runtime had no mounted repo workspace, no Firebase CLI/token, and `curl` DNS lookup for `urai.app` failed from the container. Live route verification was performed through browser/web inspection instead.

Container evidence:

```text
pwd -> /
git version -> 2.47.3
node -> v22.16.0
npm -> 10.9.2
curl -I https://urai.app/ -> curl: (6) Could not resolve host: urai.app
```

## System readiness matrix

| System | Current grade | Source truth | Remaining production requirement |
| --- | --- | --- | --- |
| Spatial | B+ source / B live | Main route spine exists and `/privacy-controls` is now in source. | Fresh static build, Firebase deploy, live smoke, screenshot evidence. |
| Studio | B | Video Factory page, queue path, render panel, release check, health/provider guards exist. | Run release check, capture routes, render artifacts, prove real MP4 composition. |
| Marketing | C+ static / blocked dynamic | Static/release path exists. | Firebase billing and managed secret access before Functions can lock. |
| Legacy UrAi | B compatibility / C production source | Older app has smoke/release scripts but different Node/runtime expectations. | Keep as compatibility/legacy; do not treat as primary production source. |
| Asset Factory | B repo-side / C live | Local proof, launch readiness, deploy and smoke scripts exist. | Staging/production smoke with local fallback disabled, provider/storage/auth/worker/Stripe/domain evidence. |
| Jobs | B repo-side / C live | Local verification documented; prod scripts exist. | Production env, worker URLs, domains, smoke, worker health, release evidence. |
| Content | B repo-side / blocked deploy | Content checks and provider/observability checks exist. | Deploy guard intentionally blocks until provider evidence, deployed smoke, E2E, observability, rollback evidence. |
| Admin | B repo-side | Security, rules, registry, release/deploy/verify scripts exist. | Production preflight and live verification evidence. |
| Analytics | B repo-side | Full check, production lock, live smoke, Firestore smoke, Spatial E2E, HTTP/B2B smoke scripts exist. | Live production evidence and monitoring proof. |

## Remaining blockers

### Code blockers

- No launch-critical Spatial source blocker remains after adding `/privacy-controls`.
- Live `/privacy-controls` remains red only because production hosting is behind `main`.

### Configuration blockers

- `urai.app` must be redeployed from latest Spatial `main`.
- Studio must be configured with live Asset Factory and connected system URLs.
- Jobs production environment and worker URLs must be configured.
- Content deploy guard remains intentionally closed until required evidence exists.

### Billing / secret / account blockers

- Marketing Functions require Firebase/GCP billing and managed secret access.
- Asset Factory production lock requires Firebase service account/storage/IAM, auth tokens, provider credentials, Stripe secrets, and cron secret.

### Asset / original-art blockers

- Spatial can ship with safe procedural/fallback assets.
- Full Asset Factory production asset layer still requires provider-backed generation and final binary artifact evidence.

### Nice-to-have polish

- Mirror deployed page should receive the richer source version and a visual pass.
- Passport deployed page should receive the richer source version and a visual pass.
- Location Map should receive the richer source version and emotional-weather visual pass.
- Status should receive the richer route matrix source version.
- Mobile screenshot evidence should be captured for all launch routes.

## Final readiness call

Spatial is not fully live-green until the latest main is deployed and `/privacy-controls` renders its own route on production.

System-of-systems is not AAA+++ production locked until Spatial deploy freshness, Studio render proof, Asset Factory provider/live proof, Marketing billing/secret unlock, Jobs prod worker proof, Content deploy guard clearance, Admin/Analytics live verification, and final evidence capture are all complete.
