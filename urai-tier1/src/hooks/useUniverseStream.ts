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

  // init main branch
  useEffect(() => {
    setBranches({
      main: {
        id: "main",
        history: [],
        scrubIndex: null,
        parentId: null
      }
    });
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/universe/stream");

    es.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        latestRef.current = json;

        setBranches((prev) => {
          const updated = { ...prev };

          Object.keys(updated).forEach((id) => {
            updated[id] = {
              ...updated[id],
              history: [...updated[id].history, json].slice(-100)
            };
          });

          return updated;
        });
      } catch (e) {}
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  function forkAt(index: number) {
    setBranches((prev) => {
      const base = prev[currentBranchId];
      if (!base) return prev;

      const newId = createId();
      const forkHistory = base.history.slice(0, index + 1);

      return {
        ...prev,
        [newId]: {
          id: newId,
          history: forkHistory,
          scrubIndex: index,
          parentId: currentBranchId
        }
      };
    });

    setCurrentBranchId((id) => id);
  }

  const current = branches[currentBranchId];

  const displayedState =
    current?.scrubIndex !== null
      ? current?.history[current.scrubIndex]
      : latestRef.current;

  function setScrubIndex(index: number | null) {
    setBranches((prev) => {
      const b = prev[currentBranchId];
      if (!b) return prev;

      return {
        ...prev,
        [currentBranchId]: {
          ...b,
          scrubIndex: index
        }
      };
    });
  }

  return {
    state: displayedState,
    history: current?.history ?? [],
    scrubIndex: current?.scrubIndex ?? null,
    setScrubIndex,
    forkAt,
    branches,
    currentBranchId,
    setCurrentBranchId
  };
}
