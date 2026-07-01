"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FocusChamber from "./FocusChamber";
import { lifeMapEdges, lifeMapNodes, type LifeMapNode } from "./lifeMapModel";
import { buildFocusChamberNode } from "./focusTier5Model";

const fallbackNode: LifeMapNode = {
  id: "focus-fallback-node",
  userId: "demo-user",
  title: "Pattern Node",
  subtitle: "Rhythm returning after static.",
  description: "A safe fallback focus node used when the LifeMap has not hydrated yet.",
  timestamp: "2026-05-04T12:00:00.000Z",
  nodeType: "insight",
  emotionalTone: "clarity",
  emotionalIntensity: 0.62,
  auraColor: "#9bdcff",
  glyphType: "insight",
  chapterId: "chapter-becoming",
  season: "spring",
  importanceScore: 72,
  privacyLevel: "private",
  x: 50,
  y: 44,
  z: 12,
  clusterId: "cluster-focus-fallback",
  relatedPeople: [],
  relatedLocations: [],
  relatedTags: ["focus", "pattern", "clarity"],
  sourceSignals: ["focus route", "spatial fallback", "private pattern"],
  replayScript: ["The camera slows near this point.", "The aura opens around the pattern.", "The companion names the signal gently."],
  narratorLine: "Notice how this moment belongs to a larger pattern.",
  visualState: "glowing",
  isMilestone: false,
  isShadow: false,
  isRecovery: false,
  isDream: false,
  isRelationship: false,
  isRitual: false,
  createdAt: "2026-05-04T12:00:00.000Z",
  updatedAt: "2026-05-04T12:00:00.000Z",
};

function backgroundStar(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.6,
    opacity: 0.22 + (((index * 13) % 65) / 100),
    delay: ((index * 17) % 9) / 10,
  };
}

function resolveNode(nodeId: string | null | undefined): LifeMapNode {
  return lifeMapNodes.find((node) => node.id === nodeId) ?? lifeMapNodes[0] ?? fallbackNode;
}

export default function FocusRouteStage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const node = resolveNode(searchParams?.get("node"));
  const [showReplay, setShowReplay] = useState(false);
  const stars = useMemo(() => Array.from({ length: 220 }, (_, index) => backgroundStar(index)), []);
  const chamber = useMemo(() => buildFocusChamberNode(node), [node]);
  const mapNodes = lifeMapNodes.length > 0 ? lifeMapNodes : [fallbackNode];

  return (
    <main className="focus-route-stage" data-testid="urai-spatial-stage" data-mode={showReplay ? "replay" : "focus"}>
      <div className="focus-route-stage__bg" />
      <div className="focus-route-stage__stars" data-testid="lifemap-starfield">
        {stars.map((star, index) => (
          <i key={index} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, opacity: star.opacity, animationDelay: `${star.delay}s` }} />
        ))}
      </div>
      <svg className="focus-route-stage__lines" aria-hidden="true">
        {lifeMapEdges.map((edge) => {
          const from = mapNodes.find((item) => item.id === edge.from);
          const to = mapNodes.find((item) => item.id === edge.to);
          if (!from || !to) return null;
          const active = from.id === node.id || to.id === node.id;
          return <line key={edge.id} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} data-active={active ? "true" : "false"} />;
        })}
      </svg>
      <div className="focus-route-stage__nodes" aria-hidden="true">
        {mapNodes.map((item) => (
          <span key={item.id} data-selected={item.id === node.id ? "true" : "false"} style={{ left: `${item.x}%`, top: `${item.y}%`, background: item.id === node.id ? "white" : item.auraColor, boxShadow: `0 0 ${item.id === node.id ? 72 : 28}px ${item.auraColor}` }} />
        ))}
      </div>
      {showReplay ? (
        <section className="focus-route-stage__replay" data-testid="urai-replay-overlay" role="dialog" aria-label={`${node.title} replay`}>
          <p>REPLAY STREAM</p>
          <h1>{chamber.replay.title}</h1>
          <ol>{chamber.replay.phases.map((phase) => <li key={phase.id}><b>{phase.label}</b><span>{phase.text}</span></li>)}</ol>
          <button type="button" onClick={() => setShowReplay(false)}>Collapse Replay / Return</button>
        </section>
      ) : (
        <FocusChamber node={node} nodes={mapNodes} edges={lifeMapEdges} onReplay={() => setShowReplay(true)} onUnwind={() => router.push("/life-map")} />
      )}
    </main>
  );
}
