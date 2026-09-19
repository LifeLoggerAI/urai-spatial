# URAI System-of-Systems Canon Recovery

Status: SOURCE-BACKED BASELINE

## Governing principle

UrAi is one ecosystem with multiple systems of record. A repository is not automatically a product, and a product concept is not automatically a production service.

## Current canonical ecosystem map

| System | Canon role | Current repository / authority | Data / responsibility boundary |
|---|---|---|---|
| Main spatial experience | personal world runtime | `urai-spatial/urai-tier1` | scene state, routes, spatial presentation |
| Privacy | binding consent/data-rights control | `urai-privacy` | consent, export, delete, retention, audit, legal hold |
| Content | approved content/copy/localization | `urai-content` | versioned content packs and moderation state |
| Asset Factory | asset execution/provenance | `asset-factory` | generation, validation, conversion, manifests |
| Studio | creative intent/orchestration | `urai-studio` | project/brief/export intent and production orchestration |
| Jobs | async execution or historical hiring system | `urai-jobs` | UNRESOLVED mixed-era identity |
| Analytics | aggregate analytics | `urai-analytics` | privacy-safe aggregate events only unless separately authorized |
| Admin | operator/control plane | `urai-admin` | role-gated operational actions and audit visibility |
| Marketing | acquisition/launch funnel | `urai-marketing` | privacy-minimal lead/waitlist/invite surfaces |
| Communications | outbound/inbound communications | `urai-communications` | consent-gated provider messaging and receipts |
| B2B Portal | partner/customer aggregate surface | `B2Bportal` | partner-facing aggregate data only |
| Investors | investor narrative/data-room surface | `urai-investors` | reviewed claims and gated investor materials |
| Labs | corporate/research support | `urai-labs-llc` | corporate public authority and Labs work |
| Foundation | public-benefit institution | `urai-foundation` | grants, donations, public-interest programs |
| Storytime | narrative/child-facing expansion | `urai-storytime` | story content with child-safety/privacy gate |
| Legacy app repos | historical implementation/reference | `UrAi`, `UrAiProd`, `UrAi-Dev`, `urai-staging` | provenance/reference only unless re-adopted |

## Entity boundary

Repositories do not collapse legal entities:
- URAI Labs LLC: operating/commercial organization.
- URAI IP Holdings LLC: intended IP-holding/licensing boundary subject to controlling legal evidence.
- URAI Foundation: separately governed public-benefit/nonprofit entity.

Do not infer legal ownership from repository location.

## Cross-system contracts recovered

1. Marketing -> Main app: waitlist, invite, demo-unlock events with minimal identity/consent metadata.
2. Main app -> Spatial: approved/fallback-safe state; no silent transfer of raw private-memory ownership.
3. Studio -> Asset Factory: creative intent / job envelope -> governed asset manifest.
4. Studio -> Jobs: execution intent -> queue lifecycle, if the execution-fabric identity is confirmed.
5. Content -> public/app surfaces: immutable version + locale + moderation + policy links.
6. Every personal-data system -> Privacy: consent, retention, export, deletion, unsafe-flow block.
7. Every system -> Analytics: aggregate-only envelope unless separately privacy-approved.
8. Admin -> all systems: read/operate only through explicit role and audit contracts.

## Institutional controls already recovered

- DOER -> CHECKER -> APPROVER -> EVIDENCE for material workflows.
- Source-green != live/provider/runtime verified.
- Public claims cannot outrun evidence.
- Privileged access is least-privilege and evidence-bound.
- Legal/tax/fiduciary/employment/material-payment decisions retain human authority.
- Foundation authority cannot be substituted by Labs authority.

## Missing integration artifacts

The final canon still needs:
- one machine-readable ownership registry normalized to current repos;
- one canonical cross-system event/data-contract index;
- one privacy classification table per event payload;
- one deployment/provider truth pointer per system;
- one owner/checker/approver map per material action;
- one successor/continuity plan for founder/key-person concentration;
- Jobs identity resolution.
