# Route map — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: source + live web fetch.

## Source route status

Public source routes remain documented in `urai-tier1/src/app/status/page.tsx`, including `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status`, `/location-map`, and `/privacy-controls`.

## Live parity matrix

| Route | `urai.app` live | `urai-4dc1d.web.app` live | Verdict |
| --- | --- | --- | --- |
| `/` | Redirects/renders `/home`; truthful public preview copy present. | Stale placeholder copy present. | Split/fail for parity. |
| `/home` | Renders Home threshold/product surface. | Fetch showed incomplete `Spatial Universe` output. | Split/fail for parity. |
| `/status` | Renders status dashboard; static preview/backend-waiting/private-actions-off language. | Internal error from web fetch. | Split/fail. |
| `/life-map` | Renders owner-safe demo data/local fallback and owner-gated Replay/Passport language. | Internal error from web fetch. | Split/fail. |
| `/ground` | Renders public sample-data Ground preview with safety disclaimer. | Internal error from web fetch. | Split/fail. |
| `/xr` | No dedicated `/xr` source route verified in this pass. XR route in source/status is `/spatial/ar-vr` experimental. | Not verified. | Unverified. |
| `/spatial/ar-vr` | Source marks as experimental outside primary launch spine. | Not live-verified in this pass. | Source-only unverified. |

## Route conclusion

The custom domain is public-preview usable. Firebase default hosting is not fresh and is not route-parity safe. READY requires both targets to serve the same current build and pass smoke scripts.
