# Life Map reality check — URAI Spatial live completion pass

## Source classification

| Life Map area | Classification | Evidence / note |
| --- | --- | --- |
| Home world entry | Real source surface | Root renders `TierOneExperience mode="home"`, which renders `HomeWorldProduction`. |
| Life Map scene | Real visual/source surface, demo data | `TierOneExperience` imports `lifeMapNodes`, `lifeMapEdges`, `mirrorStates`, and `replayPaths` from `lifeMapDemoData`. |
| Star map data | Demo/static | `lifeMapDemoData.ts` contains hardcoded symbolic/demo nodes and `signalFreshness.freshness = 'demo'`. |
| User-specific persistence | Partial/local only in inspected code | Selected memory ID is stored in `window.sessionStorage` as `urai-lifemap-selected-memory-id`. |
| Real persisted memory/world records | Not verified | No Firestore/auth-backed memory record lifecycle was verified in this pass. |
| Share/export behavior | Unverified | No production share/export lifecycle proof was verified. |
| Replay path | Partial/demo | Replay uses the first demo replay path or fallback manifest ID. |
| Public live Life Map | Partial-pass | `urai.app/life-map` says `Loading latest owner-safe demo data` and `local Life Map fallback`, which is truthful enough for preview but not production persistence. |

## What can be claimed

Allowed:

- `Life Map preview is live.`
- `Sample-safe symbolic Life Map data is visible.`
- `Memory star UI/product shape exists.`
- `Replay/passport remain owner-gated on public preview.`

Not allowed yet:

- `User Life Map persistence is production-ready.`
- `Real private memories are stored and retrieved.`
- `Genesis/auth data is integrated end-to-end.`
- `Share/export/revocation is production-ready.`

## Acceptance criteria for Life Map READY

1. Authenticated user creates or imports a memory/world record.
2. Record persists server-side under correct ownership/security rules.
3. Record appears in Life Map without demo fallback.
4. Focus/replay views load that same real record.
5. User can delete/export/revoke as required by privacy surfaces.
6. Public preview/demo mode remains clearly labeled when using sample data.
