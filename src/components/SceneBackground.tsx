"use client";

import React from "react";

export default function SceneBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at center, #0f172a 0%, #020617 45%, #000000 78%, #000000 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 38%, rgba(0,0,0,0.28) 68%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}