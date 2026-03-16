"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveMemoryClusterById } from "@/spatial/clustering/resolveMemoryCluster";

export default function MemoryClusterOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const cluster = useMemo(
    () => resolveMemoryClusterById(selectedStar?.id),
    [selectedStar]
  );

  if (!selectedStar || !cluster) return null;
  if (mode === "replay") return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        top: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.84), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 25,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.66,
          marginBottom: 8,
        }}
      >
        Memory Cluster
      </div>

      <div
        style={{
          fontSize: 22,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {cluster.title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: cluster.axis.length > 0 ? 12 : 14,
        }}
      >
        {cluster.summary}
      </div>

      {cluster.axis.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {cluster.axis.map((item) => (
            <span
              key={item}
              style={{
                fontSize: 11,
                lineHeight: 1,
                padding: "7px 9px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                opacity: 0.84,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {cluster.neighbors.length > 0 ? (
          cluster.neighbors.map((neighbor) => (
            <div
              key={neighbor.id}
              style={{
                display: "grid",
                gap: 4,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.3,
                  fontWeight: 600,
                }}
              >
                {neighbor.title}
              </div>

              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  opacity: 0.7,
                }}
              >
                {[neighbor.chapter, neighbor.timeband, neighbor.emotion]
                  .filter((value): value is string => Boolean(value))
                  .join(" · ")}
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              opacity: 0.68,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Cluster layer is active. Add more real memory nodes to surface stronger adjacency.
          </div>
        )}
      </div>
    </div>
  );
}
