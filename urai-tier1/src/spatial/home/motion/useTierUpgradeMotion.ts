"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HomeWorldState } from "../homeWorldTypes";
import { useReducedMotion } from "./useReducedMotion";

export function useTierUpgradeMotion(state: HomeWorldState) {
  const reducedMotion = useReducedMotion();
  const previous = useRef({ groundTier: state.groundTier, orbTier: state.orbTier, skyTier: state.skyTier });
  const [upgrading, setUpgrading] = useState(false);

  const tierSignature = useMemo(
    () => `${state.groundTier}-${state.orbTier}-${state.skyTier}`,
    [state.groundTier, state.orbTier, state.skyTier],
  );

  useEffect(() => {
    const movedUp =
      state.groundTier > previous.current.groundTier ||
      state.orbTier > previous.current.orbTier ||
      state.skyTier > previous.current.skyTier;

    previous.current = {
      groundTier: state.groundTier,
      orbTier: state.orbTier,
      skyTier: state.skyTier,
    };

    if (!movedUp || reducedMotion) return;

    setUpgrading(true);
    const timer = window.setTimeout(() => setUpgrading(false), 1600);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, state.groundTier, state.orbTier, state.skyTier, tierSignature]);

  return { upgrading, reducedMotion };
}
