You are my senior principal engineer for URAI Spatial.

Repository: urai-spatial

MISSION:
Fully implement, wire, test, and lock Tier-1, Tier-2, Tier-3, Tier-4, and Tier-5.

Do not stop at analysis. Modify the repo.

CORE FLOW:
home -> ascent -> life-map -> focus -> replay

FIX THIS ERROR FIRST:
Element type is invalid: expected a string or class/function but got undefined.
Check the render method of HomePage.

Find every component rendered by HomePage and fix:
- missing exports
- wrong default imports
- wrong named imports
- broken barrel exports
- undefined component references
- client/server component boundary issues in Next.js
- components imported from incorrect paths

Pay special attention to imports like:
import X from "./Component"
versus:
import { X } from "./Component"

TIER-1 UI:
- Wire /home
- Wire /ascent
- Wire /life-map
- Wire /focus
- Wire /replay
- Connect Home, Ascent, LifeMap, Focus, and Replay views.
- Add global ESC unwind handling.
- Fix locked UI states.
- Prevent dead-end transition states.
- Prevent undefined component renders.

TIER-2 SERVICE:
Create or complete:
src/services/codexService.ts

Implement:
- sealChain()
- archiveChain()
- finalizeReplay()
- unwindCanon()
- restoreFocusState()
- startAscent()
- enterFocus()
- exitFocus()
- startReplay()
- stopReplay()

Rules:
- sealed chains become immutable
- archived chains are replay-safe
- replay cannot overwrite active canon
- failed ascent automatically triggers unwind
- focus lock always clears safely
- route refresh restores valid state

TIER-3 DOMAIN:
Create or complete all TypeScript interfaces for:
- CanonChain
- CanonEvent
- ReplayEvent
- SpatialMemory
- FocusState
- TransitionState
- TierLockState
- SpatialRouteState
- UnwindSnapshot

TIER-4 EXPERIENCE:
Complete:
- transition engine
- home ascent
- life-map traversal
- focus zoom
- replay warp
- ESC unwind animation
- deterministic replay restoration
- transition cancellation safety

TIER-5 INFRA:
Update firestore.rules with user-scoped permissions for:
- replayEvents
- spatialMemories
- canonChains
- focusStates
- transitionStates

Required rule blocks:
match /users/{userId}/replayEvents/{eventId} {
  allow read, write: if request.auth.uid == userId;
}

match /users/{userId}/spatialMemories/{memoryId} {
  allow read, write: if request.auth.uid == userId;
}

Also verify firestore.indexes.json contains needed indexes for:
- canonChains by status and updatedAt
- replayEvents by replayId and timestamp
- spatialMemories by createdAt
- transitionStates by active and updatedAt

LIVE SYNC:
Create or complete:
src/hooks/useCanonSync.ts

Requirements:
- Firestore onSnapshot sync
- canon chain live updates
- replay event live updates
- focus state live updates
- transition state live updates
- automatic cleanup of subscriptions
- no dangling listeners
- no memory leaks
- safe hydration after refresh

TESTING:
Add or fix tests for:
- HomePage renders without undefined components
- /home smoke test
- /ascent smoke test
- /life-map smoke test
- /focus smoke test
- /replay smoke test
- ESC unwind
- canon sealing
- replay restoration
- focus lock clearing
- transition interruption recovery

Run:
- lint
- typecheck
- unit tests
- build
- Playwright smoke tests if configured

FINAL OUTPUT:
Give:
- files changed
- exact bug causing HomePage undefined component error
- tests run
- tests passed/failed
- Tier-1 lock status
- Tier-2 lock status
- Tier-3 lock status
- Tier-4 lock status
- Tier-5 lock status
- remaining blockers
- readiness score
