# Tier 5 Integration Contract

## Purpose

Tier 5 records the final release boundary for URAI Spatial as part of the wider URAI system.

## Local surfaces

- Page: `/tier5`
- API: `/api/system/tier5`
- Replay surfaces: `/replay`, `/replay/[replayId]`
- Legacy and mirror surfaces: `/spatial/legacy`, `/mirror`, `/dream`, `/ascent`, `/council`
- Entitlement boundary: `/api/entitlement`

## System contracts

| System | Expected input | Expected output | State | Fallback |
|---|---|---|---|---|
| URAI app/core | release contract and route availability | read-only readiness state | contract-gated | `/tier5` static readiness |
| urai-jobs | job orchestration contract | blocked or queued status | contract-gated | no job execution claimed |
| urai-content | content package reference | safe static/fallback content | contract-gated | no external content provider assumed |
| asset factory | asset request contract | disabled or fallback asset state | contract-gated | static visual fallback |
| urai-studio | StudioSpatialExport handoff | validated contract shape only | contract-gated | no provider sync claimed |
| analytics | aggregate readiness contract | no raw event stream | contract-gated | no analytics provider assumed |
| business portal | tenant and entitlement state | blocked until auth/billing review | credential-blocked | no enterprise capability claimed |
| Firebase / Firestore | server-governed entitlement and consent state | protected API response | credential-blocked | fallback/read-only state |
| Stripe | checkout and entitlement update | paid access state | credential-blocked | unpaid/read-only state |

## Safety rules

- Missing systems remain blocked, disabled, or fallback-safe.
- No secrets, service accounts, tokens, raw user records, or private logs are rendered.
- Browser evidence and deployment evidence are separate release requirements.
