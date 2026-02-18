"use client";

import React from "react";

type ConstellationProps = {
  memories: any[];
  hoveredId: string | null;
  proximateId: string | null;
  onClick: (id: string) => void;
};

export default function Constellation({
  memories,
}: ConstellationProps) {
  return (
    <div style={{ color: "white", padding: 10 }}>
      Constellation Placeholder ({memories.length} memories)
    </div>
  );
}
