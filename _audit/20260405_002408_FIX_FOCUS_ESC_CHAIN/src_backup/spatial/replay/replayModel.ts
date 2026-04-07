import type { ReplayState } from "../types";

export function createReplayState(starId: string | null, chapter: string | null): ReplayState {
  return {
    active: !!starId,
    starId,
    chapter
  };
}

export default createReplayState;
