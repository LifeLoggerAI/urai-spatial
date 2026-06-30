# Route live proof — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: live web fetch.

## Custom domain: `https://urai.app`

| URL | Observed result | Status |
| --- | --- | --- |
| `/` | Redirected to `/home`; public-safe spatial surface; private data/autonomous actions/headset entry gated. | PASS/PARTIAL |
| `/home` | Home threshold rendered; Life Map/Ground navigation present. | PASS/PARTIAL |
| `/status` | Static launch preview; public visual routes live; dynamic service wiring pending; private actions off. | PASS/PARTIAL |
| `/life-map` | Owner-safe demo data, local Life Map fallback, Replay/Passport owner-gated. | PASS/PARTIAL |
| `/ground` | Public sample-data world preview; no autonomous action/passive sensing/medical inference/private account access. | PASS/PARTIAL |

## Firebase default host: `https://urai-4dc1d.web.app`

| URL | Observed result | Status |
| --- | --- | --- |
| `/` | Stale placeholder: `Launch build is compiling successfully. Full app deployment is being finalized.` | FAIL |
| `/home` | Incomplete `Spatial Universe` text only in fetched output. | FAIL/PARTIAL |
| `/status` | Internal Error from fetch. | FAIL |
| `/life-map` | Internal Error from fetch. | FAIL |
| `/ground` | Internal Error from fetch. | FAIL |

## Acceptance result

Firebase default host does not meet production-lock acceptance. Stale placeholder copy remains and multiple public routes are not live-parity with the custom domain.
