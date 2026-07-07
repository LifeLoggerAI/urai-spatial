"use client";

import { useEffect, useRef, useState } from "react";

type Branch = {
  id: string;
  history: any[];
  scrubIndex: number | null;
  parentId: string | null;
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useUniverseStream() {
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [currentBranchId, setCurrentBranchId] = useState<string>("main");

  const latestRef = useRef<any>(null);

  useEffect(() => {
    setBranches({
      main: {
        id: "main",
        history: [],
        scrubIndex: null,
        parentId: null,
      },
    });
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/universe-stream");

    es.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        latestRef.current = json;
        setBranches((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => {
            updated[id] = {
              ...updated[id],
              history: [...updated[id].history, json].slice(-100),
            };
          });
          return updated;
        });
      } catch {}
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  function forkAt(index: number) {
    setBranches((prev) => {
      const base = prev[currentBranchId];
      if (!base) return prev;
      const newId = createId();
      return {
        ...prev,
        [newId]: {
          id: newId,
          history: base.history.slice(0, index + 1),
          scrubIndex: index,
          parentId: currentBranchId,
        },
      };
    });
  }

  function mergeBranches(targetId: string, sourceId: string) {
    setBranches((prev) => {
      const target = prev[targetId];
      const source = prev[sourceId];
      if (!target || !source) return prev;
      const mergedId = createId();
      return {
        ...prev,
        [mergedId]: {
          id: mergedId,
          history: [...target.history, ...source.history].slice(-100),
          scrubIndex: null,
          parentId: targetId,
        },
      };
    });
  }

  function synthesizeReality(inputBranchIds?: string[]) {
    const ids = inputBranchIds ?? Object.keys(branches);
    const selected = ids.map((id) => branches[id]).filter(Boolean);
    const allEvents = selected.flatMap((b) => b.history);
    return {
      id: "ai-synthesis",
      events: allEvents.length,
      branches: selected.length,
    };
  }

  return {
    state: {
      branches,
      currentBranchId,
      setCurrentBranchId,
      forkAt,
      mergeBranches,
      synthesizeReality,
      history: latestRef.current,
      scrubIndex: null,
      setScrubIndex: () => {},
    },
  };
}
