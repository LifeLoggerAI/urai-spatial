# Wave 3 URAI Spatial Launch Lock Evidence

Domain: uraispatial.com

Repo: LifeLoggerAI/urai-spatial

Status: implementation evidence in progress

## Required role

URAI Spatial is the spatial, XR, AR, VR, and immersive interface layer for life-map galaxy, dream planetarium, AR ritual viewer, companion presence, and future spatial URAI experiences.

## Required public routes

- `/`
- `/life-map-galaxy`
- `/dream-planetarium`
- `/ar-ritual-viewer`
- `/companion-presence`
- `/xr-privacy`
- `/preview-request`
- `/privacy`
- `/terms`

## Required public boundary

Public pages may describe spatial previews and concepts, but must not imply production-ready XR capabilities unless verified.

Public pages must not expose private app data, user memory data, personal life-map records, or unreleased spatial assets.

## Required routing

- App users route to `https://urai.app`
- Privacy and XR data questions route to `https://uraiprivacy.com`
- Studio production work routes to `https://uraistudio.com`
- Partner/demo requests write to approved backend or `leads` with `leadType=spatial_preview`

## Required shared foundation

- Shared visual foundation or equivalent
- Metadata/no-index pattern
- URAI Privacy link
- UTM/source capture on preview request form
- QA script for metadata, privacy links, no-index, and placeholder/debug text

## Evidence still required before approval

- Confirm public routes exist
- Confirm preview routes are polished and claim-safe
- Confirm no private app/user data is exposed
- Confirm preview request form writes to approved backend
- Confirm UTM/source capture works
- Run build/typecheck/QA
- Confirm DNS and SSL for `uraispatial.com`
- Record production deployment URL
- Record latest deploy commit
- Record owner approval

## Current launch decision

Do not mark approved until route, preview, privacy, data-boundary, form, DNS/SSL, build, and QA evidence are recorded.
