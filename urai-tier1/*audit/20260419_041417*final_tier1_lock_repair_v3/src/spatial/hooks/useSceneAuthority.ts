"use client";
import { useState, useCallback } from "react";
import { INITIAL_STATE, canTransition } from "@/lib/uraiCanon/state";

export function useSceneAuthority() {
const [state, setState] = useState(INITIAL_STATE);

const setPhase = useCallback((to, starId = null) => {
setState(prev => {
if (!canTransition(prev.phase, to)) return prev;
return {
phase: to,
selectedStarId: starId ?? prev.selectedStarId,
enteredAt: Date.now(),
dwellUntil: to === "REPLAY" ? Date.now() + 2000 : 0,
};
});
}, []);

const beginAscent = () => setPhase("ASCENT");
const openLifeMap = () => setPhase("LIFEMAP");
const openFocus = (id) => setPhase("FOCUS", id);
const openReplay = () => {
setState(prev => {
if (prev.phase !== "FOCUS" || !prev.selectedStarId) return prev;
return {
...prev,
phase: "REPLAY",
enteredAt: Date.now(),
dwellUntil: Date.now() + 2000,
};
});
};

const escape = () => {
setState(prev => {
if (prev.phase === "REPLAY") {
if (Date.now() < prev.dwellUntil) return prev;
return { ...prev, phase: "FOCUS" };
}
if (prev.phase === "FOCUS") return { ...prev, phase: "LIFEMAP" };
if (prev.phase === "LIFEMAP") return { ...prev, phase: "HOME", selectedStarId: null };
return prev;
});
};

return {
state,
beginAscent,
openLifeMap,
openFocus,
openReplay,
escape,
};
}
