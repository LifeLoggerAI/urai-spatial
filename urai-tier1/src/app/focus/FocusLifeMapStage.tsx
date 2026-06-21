"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { lifeMapNodes } from "@/spatial/v1/lifeMapDemoData";

const DEFAULT_MEMORY_ID = lifeMapNodes[0]?.id;

function normalizeMemoryId(value: string | null) {
  if (!value) return undefined;
  return lifeMapNodes.some((node) => node.id === value) ? value : undefined;
}

export function FocusLifeMapStage() {
  const searchParams = useSearchParams();

  const selectedNodeId = useMemo(() => {
    return (
      normalizeMemoryId(searchParams.get("memoryId")) ||
      normalizeMemoryId(searchParams.get("nodeId")) ||
      normalizeMemoryId(searchParams.get("manifestId")) ||
      DEFAULT_MEMORY_ID
    );
  }, [searchParams]);

  return <TierOneExperience mode="focus" selectedNodeId={selectedNodeId} />;
}
