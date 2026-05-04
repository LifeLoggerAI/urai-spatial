# Spatial Lock QA Checklist

Use this checklist before release to verify all spatial-lock acceptance criteria in both automated and manual QA.

## Execution commands

Run these commands from repo root and attach logs/screenshots to the sign-off section.

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Acceptance criteria matrix

| ID | Acceptance criterion | Script command(s) | Manual browser verification |
| --- | --- | --- | --- |
| AC-01 | **No blank opening**: first public load renders intentional sky/baseline scene (not empty/black/unstyled shell). | `pnpm build`, `pnpm test` | Open public mode in a fresh incognito session. Confirm initial scene paints immediately with expected sky/baseline visual and no blank frame pause beyond normal loading. Capture screenshot/video evidence. |
| AC-02 | **No raw phase/debug labels in public mode**: public view does not show internal phase text, debug tags, or dev-only status markers. | `pnpm lint`, `pnpm test` | In public mode, traverse opening + transition states and inspect UI overlays/text. Confirm no strings like raw phase names, debug labels, or internal flags are visible. Capture screenshot evidence for each checked state. |
| AC-03 | Home invariant holds: no unintended text/buttons/navigation in home scene. | `pnpm lint`, `pnpm test` | Enter home scene as anonymous user and verify no interactive nav/button/text chrome is visible unless explicitly allowed by product spec. Capture screenshot evidence. |
| AC-04 | Tier1 anonymous renders sky baseline. | `pnpm typecheck`, `pnpm test`, `pnpm build` | Open anonymous Tier1 route and verify sky baseline visuals + expected controls behavior. Capture screenshot evidence. |
| AC-05 | Tier2 requires auth + consent + flags. | `pnpm test` | Attempt Tier2 access with (a) anonymous user, (b) authed without consent, (c) authed with consent but missing flags, and (d) fully eligible user. Verify deny/allow outcomes match policy. Capture per-case evidence. |
| AC-06 | Tier3 requires auth + entitlement + flags + safety. | `pnpm test` | Attempt Tier3 access with each missing requirement and then with all requirements present. Verify deny/allow behavior and safety guard path. Capture per-case evidence. |
| AC-07 | Denied requests emit `spatial_lock_denied` and fallback. | `pnpm test` | Trigger denied Tier2/Tier3 scenarios in browser and confirm fallback UI appears and telemetry event is emitted (network/events console or telemetry dashboard). Capture logs/screenshots. |
| AC-08 | Firestore rules block client writes to entitlement/admin fields. | `pnpm test` | From client context (or emulator UI), attempt direct writes to protected entitlement/admin fields and verify permission denied. Capture emulator/log evidence. |
| AC-09 | Function writes tier lock audit events for denied Tier2/Tier3 checks. | `pnpm test` | Trigger denied checks and verify audit entries are written with expected metadata. Capture function logs/event records. |
| AC-10 | **Life-map persistence after ascent**: life-map/progression state survives ascent transition and remains correct after reload. | `pnpm test`, `pnpm build` | Perform ascent flow, verify life-map state updates, then reload and re-enter flow. Confirm persisted state is restored accurately. Capture before/after + post-reload evidence. |
| AC-11 | **Replay completion toast**: replay completion shows the expected completion toast exactly once per completion event. | `pnpm test` | Complete replay end-to-end in browser and verify toast copy/timing/duplication behavior. Capture screen recording or timestamped screenshots. |
| AC-12 | **Esc unwind sequence**: pressing `Esc` unwinds UI/state in the defined order until safe base state. | `pnpm test` | Enter deepest interactive state, press `Esc` repeatedly, and verify each unwind step occurs in correct sequence with no skips/stalls. Capture step-by-step evidence (video recommended). |

## Final QA sign-off template

Fill one row per criterion with explicit evidence links (PR comment links, screenshots, logs, videos, telemetry query IDs).

| ID | Criterion summary | Script(s) run + result | Manual check result | Evidence links/notes | Sign-off |
| --- | --- | --- | --- | --- | --- |
| AC-01 | No blank opening | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-02 | No raw phase/debug labels in public mode | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-03 | Home invariant: no unintended UI in home scene | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-04 | Tier1 anonymous sky baseline | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-05 | Tier2 auth + consent + flags gating | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-06 | Tier3 auth + entitlement + flags + safety gating | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-07 | `spatial_lock_denied` + fallback on deny | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-08 | Firestore protected field write denial | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-09 | Denied-check audit events written by function | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-10 | Life-map persistence after ascent | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-11 | Replay completion toast | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |
| AC-12 | Esc unwind sequence | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | _Add links_ | Name / Date |

### Release recommendation

- Overall decision: ☐ **Ship** ☐ **Block**
- Blocking issues (if any):
  - 
- QA lead sign-off: 
- Date:
