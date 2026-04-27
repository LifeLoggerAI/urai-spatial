"use client";

import { useEffect } from "react";

export default function useCanonEsc(onEscape: () => void) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onEscape();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onEscape]);
}
