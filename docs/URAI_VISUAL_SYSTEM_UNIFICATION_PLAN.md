# URAI Visual System Unification Plan

Status: active implementation plan
Canonical repo: `LifeLoggerAI/urai-spatial`
Canonical runtime root: `urai-tier1`
Canonical public surface: `https://urai.app`

## Decision

URAI should not merge every repo into one monolith. The correct architecture is:

- one canonical public runtime: `urai-spatial/urai-tier1`
- one canonical visual system consumed by all URAI surfaces
- multiple product repos/domains that inherit the same brand language

This keeps the ecosystem clean while making every surface feel like one company.

## Product/domain map

| Surface | Role | Visual treatment |
|---|---|---|
| `URAI.app` | Main spatial world and public product front door | Full cinematic spatial system |
| `URAIstudio.com` / `urai-studio` | creation engine, asset forge, creator tooling | same tokens, denser tool UI, creator panels |
| `URAIanalytics.com` / `urai-analytics` | intelligence, telemetry, analytics | same tokens, more dashboard/control-plane surfaces |
| `URAImarketing.com` / `urai-marketing` | campaigns, launch pages, public funnel | same tokens, stronger narrative sections |
| `urai-admin` | internal control plane | same tokens, restrained operator UI |
| `urai-foundation` | mission/foundation presence | same tokens, calmer institutional variant |

## Visual system rule

Every new URAI surface must use the shared URAI visual language before adding local polish.

Allowed:

- route-specific composition
- product-specific copy
- local interaction details
- cinematic overrides that still use URAI tokens

Not allowed:

- unrelated color palettes
- one-off final-pass CSS that redefines the entire brand
- public pages that look like separate companies
- duplicated graphic systems that fight the canonical runtime

## Implementation phases

### Phase 1: Canonical tokens

Add `urai-tier1/src/app/urai-design-system.css` and import it after existing CSS in `layout.tsx` so it becomes the final stabilizing brand layer.

This file defines:

- color tokens
- glass/material tokens
- glow tokens
- radius and spacing tokens
- typography rhythm
- shared buttons, panels, portals, badges, route rails, loading states
- reduced-motion behavior
- domain/product identity hooks

### Phase 2: Adopt in canonical runtime

Adopt token classes gradually in:

- home spatial world
- Life Map
- Ground
- Focus
- Replay
- Passport
- Status
- Proof/Receipts
- Studio/asset surfaces

Do not rewrite every route in one pass. Each route must keep working while visual drift is reduced.

### Phase 3: Cross-repo carryover

For each supporting repo, copy or package the design-system layer and document the import point:

- `urai-studio`: creator/control variant
- `urai-analytics`: intelligence/control variant
- `urai-marketing`: narrative/funnel variant
- `urai-admin`: operator/control variant
- `urai-foundation`: institutional/mission variant

### Phase 4: Evidence and gate

Before claiming visual unification complete, record:

- exact commit SHA
- list of routes using design tokens
- screenshots or visual receipts
- build/typecheck result
- route smoke result
- domain mapping decision record

## Acceptance criteria

- `urai.app` opens into the canonical spatial world.
- The default world, Ground, Life Map, Focus, Replay, Passport, Status, Proof, and Receipts use the same visual language.
- Supporting repos/domains present as product wings of URAI, not unrelated startups.
- One design-system file is imported as the final global brand authority.
- No production-ready, XR-certified, provider-complete, or legal/IP ownership claims are added by this visual work.

## Current non-goals

- Do not merge all repos into one repository.
- Do not claim V1-V100 completion.
- Do not deploy production from this plan alone.
- Do not rewrite legal ownership text without counsel-approved entity records.
- Do not make unsupported live XR, sensing, marketplace, clinical, or provider-active claims.
