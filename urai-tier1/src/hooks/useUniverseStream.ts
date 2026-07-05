"use client";

import { useEffect, useRef, useState } from "react";

export function useUniverseStream() {
  const [history, setHistory] = useState<any[]>([]);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const latestRef = useRef<any>(null);

  useEffect(() => {
    const es = new EventSource("/api/universe/stream");

    es.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        latestRef.current = json;

        setHistory((prev) => {
          const next = [...prev, json];
          return next.slice(-100);
        });
      } catch (e) {}
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, []);

  const displayedState = scrubIndex !== null ? history[scrubIndex] : latestRef.current;

  return {
    state: displayedState,
    history,
    scrubIndex,
    setScrubIndex
  };
}