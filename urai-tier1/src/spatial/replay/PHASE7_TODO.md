function s{ if(!s || !s.position){ throw new Error("INVALID_STAR_ID") } return s }

import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
# Phase 7: Replay Contract Lock

Goal:
Bind replay to canonical memory data.

Done in this pass:
- canonical resolver added
- selectedStarId -> memory node -> replay scene contract created
- resolver uses real memory dataset first
- fallback replay path remains safe

Remaining:
- wire SpatialScene / replay UI to resolveReplaySceneFromSelectedStar(selectedStarId)
- remove hard-coded placeholder replay copy
- rebuild and preview deploy after UI wire
