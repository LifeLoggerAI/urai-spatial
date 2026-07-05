"use client";

import { useEffect, useState } from "react";

export function useUniverseStream() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const es = new EventSource("/api/universe/stream");

    es.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        setState(json);
      } catch (e) {}
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  return state;
}
