"use client";

import { useEffect } from "react";

export function useCanonEsc(onEsc: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onEsc();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEsc]);
}
