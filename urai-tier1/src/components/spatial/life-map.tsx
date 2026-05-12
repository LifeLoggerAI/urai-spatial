"use client";

import Link from "next/link";
import { useState } from "react";
import { demoConstellationEdges, demoLifeMapNodes, demoMemoryStars } from "@/lib/spatial/publicSafeSpatialData";
import { MemoryNodeDetail } from "./memory-node-detail";
import { PublicPreviewBadge } from "./public-preview-badge";

export function LifeMap() {
  const [activeNodeId, setActiveNodeId] = useState(demoLifeMapNodes[0]?.id ?? null);
  const activeNode = demoLifeMapNodes.find((node) => node.id === activeNodeId) ?? demoLifeMapNodes[0];

  return (
    <main className="lifeMap" aria-label="URAI Spatial 3D Life Map">
      <div className="lifeMap__scene" data-urai-world-layer="3d" data-urai-fallback-mode="css-3d">
        <svg className="lifeMap__edges" viewBox="0 0 100 100" aria-hidden="true">
          {demoConstellationEdges.map((edge) => {
            const from = demoLifeMapNodes.find((node) => node.id === edge.fromNodeId);
            const to = demoLifeMapNodes.find((node) => node.id === edge.toNodeId);
            if (!from || !to) return null;
            return <line key={edge.id} x1={50 + from.position.x * 8} y1={50 - from.position.y * 7} x2={50 + to.position.x * 8} y2={50 - to.position.y * 7} />;
          })}
        </svg>
        {demoMemoryStars.map((star) => {
          const node = demoLifeMapNodes.find((item) => item.id === star.nodeId);
          return (
            <button key={star.id} type="button" className="lifeMap__node" aria-label={`Open ${node?.title ?? star.label}`} onClick={() => setActiveNodeId(star.nodeId)} style={{ left: `${50 + star.position.x * 8}%`, top: `${50 - star.position.y * 7}%`, transform: `translateZ(${Math.abs(star.position.z) * 16}px)`, ["--node-color" as string]: node?.visual.color ?? "#9fe8ff", ["--node-size" as string]: `${1.1 + (node?.visual.size ?? 0.4)}rem` }}>
              <span />
              <em>{node?.title}</em>
            </button>
          );
        })}
      </div>
      <aside className="lifeMap__fallback" aria-label="Accessible Life Map node list">
        <h1>Life Map</h1>
        <p>3D memory starfield powered by public-safe Firestore-shaped demo data.</p>
        {demoLifeMapNodes.map((node) => <button key={node.id} type="button" onClick={() => setActiveNodeId(node.id)}>{node.title}<small>{node.type}</small></button>)}
      </aside>
      {activeNode ? <MemoryNodeDetail node={activeNode} /> : null}
      <Link className="lifeMap__home" href="/spatial">Return to Spatial Home</Link>
      <PublicPreviewBadge />
      <style jsx>{`.lifeMap{position:relative;min-height:100svh;overflow:hidden;background:radial-gradient(circle at 50% 40%,rgba(67,181,240,.18),transparent 18rem),linear-gradient(180deg,#071935,#02060f);color:#e6f9ff;font-family:Inter,ui-sans-serif,system-ui;padding:2rem;display:grid;grid-template-columns:1fr minmax(18rem,26rem);gap:1rem}.lifeMap__scene{position:relative;min-height:calc(100svh - 4rem);border:1px solid rgba(177,229,255,.12);border-radius:2rem;background:radial-gradient(circle at 50% 50%,rgba(67,181,240,.13),transparent 36%),rgba(3,10,22,.45);perspective:900px;transform-style:preserve-3d;overflow:hidden}.lifeMap__edges{position:absolute;inset:0;width:100%;height:100%;opacity:.56}.lifeMap__edges line{stroke:rgba(142,224,255,.32);stroke-width:.25}.lifeMap__node{position:absolute;z-index:3;width:var(--node-size);height:var(--node-size);margin:-.65rem 0 0 -.65rem;border:0;border-radius:999px;background:transparent;cursor:pointer}.lifeMap__node span{position:absolute;inset:18%;border-radius:999px;background:var(--node-color);box-shadow:0 0 2rem var(--node-color);animation:nodePulse 5s ease-in-out infinite}.lifeMap__node em{position:absolute;top:1.45rem;left:50%;transform:translateX(-50%);width:max-content;max-width:10rem;font-size:.67rem;font-style:normal;color:#cdefff;background:rgba(3,10,22,.68);border:1px solid rgba(180,230,255,.18);border-radius:999px;padding:.22rem .48rem}.lifeMap__node:focus-visible{outline:2px solid #dff7ff;outline-offset:7px}.lifeMap__fallback{display:grid;align-content:start;gap:.5rem;padding:1rem;border:1px solid rgba(177,229,255,.15);border-radius:1.5rem;background:rgba(4,14,28,.6);backdrop-filter:blur(12px)}.lifeMap__fallback h1{margin:0}.lifeMap__fallback p{margin:0 0 .5rem;color:#b9d9e7}.lifeMap__fallback button{display:flex;justify-content:space-between;gap:.75rem;border:1px solid rgba(160,228,255,.18);border-radius:.9rem;background:rgba(42,96,130,.18);color:#e6f9ff;padding:.65rem .75rem;text-align:left}.lifeMap__fallback small{color:#8dcde5}.lifeMap__home{position:absolute;left:1rem;top:1rem;color:#bfefff;text-decoration:none;border:1px solid rgba(180,230,255,.18);border-radius:999px;padding:.45rem .7rem;background:rgba(4,14,28,.45)}@keyframes nodePulse{0%,100%{opacity:.68;transform:scale(.9)}50%{opacity:1;transform:scale(1.24)}}@media(max-width:880px){.lifeMap{grid-template-columns:1fr;padding:1rem}.lifeMap__scene{min-height:58svh}.lifeMap__fallback{order:3}.lifeMap__node em{display:none}}@media(prefers-reduced-motion:reduce){.lifeMap__node span{animation:none}}`}</style>
    </main>
  );
}

export default LifeMap;
