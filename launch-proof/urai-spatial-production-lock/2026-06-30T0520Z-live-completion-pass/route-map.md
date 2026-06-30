# Route map — URAI Spatial live completion pass

## Source route matrix

The committed status route declares these route groups.

### Public launch routes

| Route | Source status | Readiness note |
| --- | --- | --- |
| `/` | verified | Root/home threshold entry. |
| `/home` | verified | Canonical Home World mirror of root. |
| `/ground` | verified | Private real-life operating layer preview. |
| `/life-map` | verified-source | Single cinematic Life Map source path prepared for public release. |
| `/focus` | verified | Selected memory chamber. |
| `/replay` | verified | Living memory replay surface. |
| `/mirror` | verified | Mirror World reflection route. |
| `/passport` | verified | Identity and permissions layer. |
| `/status` | verified | Public route truth matrix. |
| `/location-map` | verified | Symbolic place atlas. |
| `/privacy-controls` | verified | Dedicated privacy controls route. |

### Guided showcase routes

| Route | Source status | Readiness note |
| --- | --- | --- |
| `/demo` | showcase | Public walkthrough shell. |
| `/demo/life-map` | showcase | Life Map guided entry. |
| `/dream` | realm-shell | Symbolic route outside primary launch spine. |
| `/legacy` | realm-shell | Archive route outside primary launch spine. |
| `/council` | realm-shell | Reflection council surface outside primary launch spine. |
| `/launch` | media | Launch/media surface. |

### Release gates and experiments

| Route | Source status | Readiness note |
| --- | --- | --- |
| `/tier4` | gate | Production gate boundary. |
| `/tier5` | gate | Final release gate boundary. |
| `/spatial/shadow` | experimental | Kept out of primary launch navigation. |
| `/spatial/legacy` | experimental | Kept out of primary launch navigation. |
| `/spatial/ar-vr` | experimental | XR/AR/VR exploration route kept outside primary launch spine. |

### API/system routes

| Route | Source status | Readiness note |
| --- | --- | --- |
| `/api/system/health` | system | Machine health response. |
| `/api/system/capabilities` | system | Capabilities contract. |
| `/api/system/integration-contract` | system | Integration contract. |
| `/api/system/launch-boundary` | system | Launch boundary contract. |
| `/api/body-biometric` | api | Body/signal endpoint. Must not expose private data. |
| `/api/orb-companion` | api | Orb companion endpoint. Must remain gated and non-autonomous until verified. |

### Dynamic generated routes

| Route | Source status | Readiness note |
| --- | --- | --- |
| `/focus/session/[sessionId]` | dynamic | Covered by static parameter checks according to source status. |
| `/life-map/star/[starId]` | dynamic | Star deep link. |
| `/place/[placeId]` | dynamic | Place route. |
| `/place/[placeId]/replay` | dynamic | Place replay route. |
| `/replay/[replayId]` | dynamic | Replay deep link. |
| `/u/[handle]` | dynamic | Public profile handle surface. |

## Live observations from this pass

| URL | Observed result | Readiness |
| --- | --- | --- |
| `https://urai.app/` | Redirected/rendered `/home`; displayed truthful public preview and gated XR copy. | Partial-pass. |
| `https://urai.app/status` | Rendered status dashboard with static preview and backend-waiting language. | Partial-pass. |
| `https://urai.app/life-map` | Rendered Life Map preview with owner-gated replay/passport language. | Partial-pass. |
| `https://urai.app/ground` | Rendered Ground public sample-data world preview and no-autonomous-action safety copy. | Partial-pass. |
| `https://urai-4dc1d.web.app/` | Rendered stale placeholder `Launch build is compiling successfully. Full app deployment is being finalized.` | Fail / stale deploy. |

## Route readiness conclusion

The custom domain public route chain is materially truthful and launch-shaped. The Firebase default hosting target is not fresh. Release cannot be called READY until both intended live URLs render the audited commit/build and live smoke passes on both.
