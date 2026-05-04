"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const HOME_WORLD_ASCENT_MS = 1180;

export function useAscentTransition(target = "/life-map") {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const enter = () => {
    if (opening) return;
    setOpening(true);
  };

  useEffect(() => {
    if (!opening) return;

    const timer = window.setTimeout(() => {
      router.push(target, { scroll: false });
    }, HOME_WORLD_ASCENT_MS);

    return () => window.clearTimeout(timer);
  }, [opening, router, target]);

  return { opening, enter, setOpening };
}
