"use client";
/* URAI_CANON_COMPAT_INTERACTION_LOCK_V2 */
import { useMemo } from "react";
import type { UraiCommand, UraiRuntimeState } from "@/lib/uraiCanon/types";

type Args = {
command?: UraiCommand | null;
state?: UraiRuntimeState | null;
};

export function useCanonInteractionLock(args: Args): boolean {
return useMemo(() => {
void args.command;
return Boolean(
args.state?.inputLocked ||
args.state?.isTransitioning ||
args.state?.transitioning ||
args.state?.transitionLock ||
(args.state?.transitionState && args.state.transitionState !== "idle"),
);
}, [
args.command,
args.state?.inputLocked,
args.state?.isTransitioning,
args.state?.transitioning,
args.state?.transitionLock,
args.state?.transitionState,
]);
}

export default useCanonInteractionLock;
