"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { LifeMapEdge, LifeMapMode, LifeMapNode } from "./lifeMapModel";
import { buildFocusChamberNode, getFocusCompletionTiers, type FocusLayerId } from "./focusTier5Model";

type FocusChamberProps = {
  node: LifeMapNode;
  nodes: LifeMapNode[];
  edges: LifeMapEdge[];
  onReplay: () => void;
  onUnwind: () => void;
  onModeJump?: (mode: LifeMapMode) => void;
};

const layers: FocusLayerId[] = ["signal", "why", "pattern", "replay", "ritual", "council"];

function relatedIdsFor(node: LifeMapNode, edges: LifeMapEdge[]) {
  return edges.filter((edge) => edge.from === node.id || edge.to === node.id).map((edge) => (edge.from === node.id ? edge.to : edge.from));
}

function causalIdsFor(node: LifeMapNode, edges: LifeMapEdge[]) {
  return edges.filter((edge) => edge.to === node.id).map((edge) => edge.from);
}

export default function FocusChamber({ node, nodes, edges, onReplay, onUnwind, onModeJump }: FocusChamberProps) {
  const [activeLayer, setActiveLayer] = useState<FocusLayerId>("signal");
  const relatedNodeIds = useMemo(() => relatedIdsFor(node, edges), [node, edges]);
  const causalNodeIds = useMemo(() => causalIdsFor(node, edges), [node, edges]);
  const chamber = useMemo(() => buildFocusChamberNode(node, relatedNodeIds, causalNodeIds), [node, relatedNodeIds, causalNodeIds]);
  const tiers = useMemo(() => getFocusCompletionTiers(chamber), [chamber]);
  const layer = chamber.layers.find((item) => item.id === activeLayer) ?? chamber.layers[0];
  const relatedNodes = relatedNodeIds.map((id) => nodes.find((item) => item.id === id)).filter((item): item is LifeMapNode => Boolean(item));
  const style = {
    "--focus-aura": chamber.auraColor,
    "--focus-radius": `${chamber.camera.auraRadius}px`,
    "--focus-blur": `${chamber.camera.blur}px`,
  } as CSSProperties;

  return (
    <section className="focus-chamber" data-testid="urai-focus-chamber" data-tier5={tiers["tier-5"] ? "complete" : "partial"} role="dialog" aria-label={`${chamber.title} focus chamber`} style={style}>
      <div className="aura" aria-hidden="true" />
      <header>
        <p>{chamber.nodeType.toUpperCase()} NODE</p>
        <h1>{chamber.title}</h1>
        <strong>{chamber.subtitle}</strong>
        <span>{chamber.explainabilitySummary}</span>
      </header>

      <nav aria-label="Focus layers">
        {layers.map((id) => (
          <button key={id} type="button" className={activeLayer === id ? "active" : ""} onClick={() => setActiveLayer(id)}>
            {chamber.layers.find((item) => item.id === id)?.label ?? id}
          </button>
        ))}
      </nav>

      <article data-testid={`focus-layer-${layer.id}`}>
        <p>{layer.label}</p>
        <h2>{layer.headline}</h2>
        <span>{layer.body}</span>
        <ul>{layer.evidence.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <aside data-testid="focus-intelligence-ledger">
        <p>WIRED STATUS</p>
        <dl>
          <div><dt>Sources</dt><dd>{chamber.sourceSignalIds.length}</dd></div>
          <div><dt>Related</dt><dd>{relatedNodes.length}</dd></div>
          <div><dt>Causal</dt><dd>{chamber.causalNodeIds.length}</dd></div>
          <div><dt>Next</dt><dd>{chamber.nextLikelyState}</dd></div>
          <div><dt>Replay</dt><dd>{chamber.replay.phases.length}</dd></div>
          <div><dt>Scroll</dt><dd>{chamber.replay.exportableScrollId}</dd></div>
        </dl>
      </aside>

      <div className="tiers" data-testid="focus-tier-locks">
        {Object.entries(tiers).map(([tier, complete]) => <b key={tier} data-complete={complete ? "true" : "false"}>{tier.replace("tier-", "T")}</b>)}
      </div>

      <footer>
        <button type="button" onClick={onReplay} disabled={!chamber.replayAvailable}>Replay</button>
        <button type="button" onClick={() => onModeJump?.(chamber.nextLikelyState)}>Open {chamber.nextLikelyState}</button>
        <button type="button">{chamber.replay.ritualEnding}</button>
        <button type="button" onClick={onUnwind}>Unwind</button>
      </footer>

      <style jsx>{`
        .focus-chamber { position:absolute; left:50%; top:50%; z-index:30; width:min(680px, calc(100vw - 32px)); max-height:min(780px, calc(100dvh - 112px)); overflow:hidden; transform:translate(-50%, -50%); border:1px solid color-mix(in srgb, var(--focus-aura) 42%, rgba(255,255,255,.22)); border-radius:34px; background:radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--focus-aura) 24%, transparent), transparent 38%), linear-gradient(145deg, rgba(2,6,23,.84), rgba(6,12,32,.68)); box-shadow:0 0 var(--focus-radius) color-mix(in srgb, var(--focus-aura) 44%, transparent), 0 28px 120px rgba(0,0,0,.62); color:white; padding:22px; backdrop-filter:blur(24px); }
        .aura { position:absolute; inset:-24%; pointer-events:none; background:radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--focus-aura) 24%, transparent), transparent 38%); filter:blur(var(--focus-blur)); opacity:.82; animation:focus-breathe 7s ease-in-out infinite alternate; }
        header, nav, article, aside, .tiers, footer { position:relative; z-index:2; }
        header p, article p, aside p { margin:0 0 8px; color:rgba(226,241,255,.58); font-size:11px; font-weight:900; letter-spacing:.28em; }
        h1 { margin:0; font-size:clamp(32px, 6vw, 58px); line-height:.95; letter-spacing:-.055em; }
        h2 { margin:0; font-size:22px; }
        header strong, header span, article span { display:block; margin-top:8px; color:rgba(255,255,255,.76); line-height:1.55; }
        nav, footer, .tiers, ul { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; padding:0; list-style:none; }
        button { min-height:38px; border:1px solid rgba(255,255,255,.18); border-radius:999px; background:rgba(255,255,255,.09); color:white; cursor:pointer; font:inherit; font-size:12px; font-weight:800; padding:0 14px; }
        button.active, footer button:first-child { background:white; color:#020617; }
        article { margin-top:16px; border:1px solid rgba(255,255,255,.12); border-radius:24px; background:rgba(0,0,0,.22); padding:16px; }
        li, .tiers b { border:1px solid rgba(255,255,255,.12); border-radius:999px; background:rgba(255,255,255,.08); color:rgba(255,255,255,.72); font-size:11px; font-weight:800; padding:7px 10px; }
        aside { margin-top:14px; border-top:1px solid rgba(255,255,255,.1); padding-top:14px; }
        dl { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; margin:0; }
        aside div { border-radius:16px; background:rgba(255,255,255,.07); padding:10px; }
        dt { color:rgba(255,255,255,.48); font-size:10px; text-transform:uppercase; }
        dd { margin:4px 0 0; color:rgba(255,255,255,.86); font-size:12px; font-weight:800; }
        .tiers b[data-complete="true"] { background:color-mix(in srgb, var(--focus-aura) 24%, rgba(255,255,255,.08)); color:white; box-shadow:0 0 18px color-mix(in srgb, var(--focus-aura) 38%, transparent); }
        @keyframes focus-breathe { from { opacity:.54; transform:scale(.98); } to { opacity:.92; transform:scale(1.04); } }
        @media (max-width:720px) { .focus-chamber { padding:16px; } dl { grid-template-columns:repeat(2, minmax(0,1fr)); } }
        @media (prefers-reduced-motion:reduce) { .aura { animation:none; } }
      `}</style>
    </section>
  );
}
