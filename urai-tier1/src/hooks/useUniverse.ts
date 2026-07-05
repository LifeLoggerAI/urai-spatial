"use client";

import { useEffect, useState } from "react";

export function useUniverse() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      const res = await fetch("/api/universe");
      const json = await res.json();
      setState(json.result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { state, refresh, loading };
}
