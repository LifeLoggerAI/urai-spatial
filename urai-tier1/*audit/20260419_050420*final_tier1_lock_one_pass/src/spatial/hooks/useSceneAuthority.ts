"use client";

import { useState } from "react";
import { INITIAL_STATE, assertLegalTransition, normalizeRuntimeState } from "@/lib/uraiCanon/state";
import type { CanonPhase, UraiRuntimeState } from "@/lib/uraiCanon/types";

type Authority = {
state: UraiRuntimeState;
beginAscent: () => void;
openLifeMap: () => void;
openFocus: (id: string) => void;
openReplay: () => void;
closeReplay: () => void;
escape: () => void;
};

export function useSceneAuthority(): Authority {
const [state, setState] = useState<UraiRuntimeState>(INITIAL_STATE);

const transition = (to: CanonPhase, starId?: string | null) => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
assertLegalTransition(prev.phase, to);
return normalizeRuntimeState({
...prev,
phase: to,
mode: to,
selectedStarId: typeof starId === "string" ? starId : prev.selectedStarId,
enteredAt: Date.now(),
dwellUntil: to === "REPLAY" ? Date.now() + 2000 : 0,
transitionState:
to === "ASCENT"
? "open_ascent"
: to === "LIFEMAP"
? "open_lifemap"
: to === "FOCUS"
? "open_focus"
: to === "REPLAY"
? "open_replay"
: "idle",
});
});
};

return {
state,
beginAscent: () => transition("ASCENT"),
openLifeMap: () => transition("LIFEMAP"),
openFocus: (id: string) => transition("FOCUS", id),
openReplay: () => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "FOCUS" || !prev.selectedStarId) return prev;
assertLegalTransition(prev.phase, "REPLAY");
return normalizeRuntimeState({
...prev,
phase: "REPLAY",
mode: "REPLAY",
dwellUntil: Date.now() + 2000,
transitionState: "open_replay",
});
});
},
closeReplay: () => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase !== "REPLAY") return prev;
return normalizeRuntimeState({
...prev,
phase: "FOCUS",
mode: "FOCUS",
transitionState: "close_replay",
});
});
},
escape: () => {
setState((prevRaw) => {
const prev = normalizeRuntimeState(prevRaw);
if (prev.phase === "REPLAY") {
return normalizeRuntimeState({
...prev,
phase: "FOCUS",
mode: "FOCUS",
transitionState: "close_replay",
});
}
if (prev.phase === "FOCUS") {
return normalizeRuntimeState({
...prev,
phase: "LIFEMAP",
mode: "LIFEMAP",
transitionState: "close_focus",
});
}
if (prev.phase === "LIFEMAP") {
return normalizeRuntimeState({
...prev,
phase: "HOME",
mode: "HOME",
selectedStarId: null,
transitionState: "close_lifemap",
});
}
return prev;
});
}
};
}
