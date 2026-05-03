"use client";
/* URAI_CANON_AUTHORITY_V2 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanonPhase, UraiRuntimeState } from "@/lib/uraiCanon/types";
import { assertLegalTransition, resolveTransitionDuration } from "@/lib/uraiCanon/state";
import { createInitialRuntimeState, normalizeRuntimeState } from "@/lib/uraiCanon/state";

export type SceneAuthority = UraiRuntimeState & {
beginAscent: () => void;
openLifeMap: () => void;
openFocus: (starId: string) => void;
openReplay: (starId?: string | null) => void;
closeReplay: () => void;
goHome: () => void;
escape: () => void;
dispatch: (next: CanonPhase, starId?: string | null) => void;
setPhase: (next: CanonPhase, starId?: string | null) => void;
};

function illegal(message: string): never {
throw new Error([URAI][AUTHORITY] ${message});
}

export function useSceneAuthority(): SceneAuthority {
const [state, setState] = useState<UraiRuntimeState>(() => createInitialRuntimeState());
const ascentTimerRef = useRef<number | null>(null);

const clearTimer = useCallback(() => {
if (ascentTimerRef.current !== null) {
window.clearTimeout(ascentTimerRef.current);
ascentTimerRef.current = null;
}
}, []);

const transit = useCallback((next: CanonPhase, starId?: string | null) => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
assertLegalTransition(prev.phase, next);
return {
...prev,
mode: next,
phase: next,
selectedStarId:
next === "HOME" ? null : typeof starId === "string" ? starId : prev.selectedStarId,
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: next === "REPLAY" ? Date.now() + 2000 : 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
});
}, []);

const beginAscent = useCallback(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "HOME") illegal(beginAscent blocked outside HOME { phase: ${prev.phase} });
return {
...prev,
mode: "ASCENT",
phase: "ASCENT",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
isTransitioning: true,
transitioning: true,
transitionLock: true,
transitionState: "transitioning",
};
});
}, []);

const openLifeMap = useCallback(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase === "LIFEMAP") return prev;
if (prev.phase !== "FOCUS") illegal(openLifeMap blocked outside FOCUS/LIFEMAP { phase: ${prev.phase} });
assertLegalTransition(prev.phase, "LIFEMAP");
return {
...prev,
mode: "LIFEMAP",
phase: "LIFEMAP",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
});
}, []);

const openFocus = useCallback((starId: string) => {
if (!starId) illegal("openFocus missing starId");
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "LIFEMAP") illegal(openFocus blocked outside LIFEMAP { phase: ${prev.phase} });
assertLegalTransition(prev.phase, "FOCUS");
return {
...prev,
mode: "FOCUS",
phase: "FOCUS",
selectedStarId: starId,
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
});
}, []);

const openReplay = useCallback((starId?: string | null) => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "FOCUS") illegal(openReplay blocked outside FOCUS { phase: ${prev.phase} });
assertLegalTransition(prev.phase, "REPLAY");
const nextStarId = typeof starId === "string" ? starId : prev.selectedStarId;
if (!nextStarId) illegal("openReplay missing selectedStarId");
return {
...prev,
mode: "REPLAY",
phase: "REPLAY",
selectedStarId: nextStarId,
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: Date.now() + 2000,
isTransitioning: true,
transitioning: true,
transitionLock: true,
transitionState: "open_replay",
};
});
}, []);

const closeReplay = useCallback(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "REPLAY") illegal(closeReplay blocked outside REPLAY { phase: ${prev.phase} });
if (Date.now() < prev.dwellUntil) return prev;
assertLegalTransition(prev.phase, "FOCUS");
return {
...prev,
mode: "FOCUS",
phase: "FOCUS",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "close_replay",
};
});
}, []);

const goHome = useCallback(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "LIFEMAP") illegal(goHome blocked outside LIFEMAP { phase: ${prev.phase} });
assertLegalTransition(prev.phase, "HOME");
return {
...prev,
mode: "HOME",
phase: "HOME",
selectedStarId: null,
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
});
}, []);

const escape = useCallback(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase === "REPLAY") {
if (Date.now() < prev.dwellUntil) return prev;
return {
...prev,
mode: "FOCUS",
phase: "FOCUS",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "exit_replay",
};
}
if (prev.phase === "FOCUS") {
return {
...prev,
mode: "LIFEMAP",
phase: "LIFEMAP",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "exit_focus",
};
}
if (prev.phase === "LIFEMAP") {
return {
...prev,
mode: "HOME",
phase: "HOME",
selectedStarId: null,
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
dwellUntil: 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
}
return prev;
});
}, []);

const dispatch = useCallback((next: CanonPhase, starId?: string | null) => {
transit(next, starId);
}, [transit]);

const setPhase = useCallback((next: CanonPhase, starId?: string | null) => {
transit(next, starId);
}, [transit]);

useEffect(() => {
clearTimer();
if (state.phase === "ASCENT") {
ascentTimerRef.current = window.setTimeout(() => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "ASCENT") return prev;
return {
...prev,
mode: "LIFEMAP",
phase: "LIFEMAP",
transitionToken: prev.transitionToken + 1,
enteredAt: Date.now(),
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};
});
}, resolveTransitionDuration("HOME", "ASCENT"));
}
return clearTimer;
}, [clearTimer, state.phase, state.transitionToken]);

return useMemo(
() => ({
...state,
beginAscent,
openLifeMap,
openFocus,
openReplay,
closeReplay,
goHome,
escape,
dispatch,
setPhase,
}),
[beginAscent, closeReplay, dispatch, escape, goHome, openFocus, openLifeMap, openReplay, setPhase, state],
);
}

export default useSceneAuthority;
