import React from "react";

export default function SceneBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at center, #0f172a 0%, #000000 70%)",
        overflow: "hidden",
      }}
    >
      {/* Subtle vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
