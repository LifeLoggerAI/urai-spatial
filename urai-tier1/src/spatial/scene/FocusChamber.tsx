"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { LifeMapEdge, LifeMapNode } from "./lifeMapModel";
import {
  buildFocusChamberNode,
  getFocusCompletionTiers,
  type FocusLayerId,
} from "./focusTier5Model";

type FocusChamberProps = {
  node: LifeMapNode;
  nodes: LifeMapNode[];
  edges: LifeMapEdge[];
  onReplay: () => void;
  onUnwind: () => void;
  onModeJump?: (mode: string) => void;
};

const layerOrder: FocusLayerId[] = ["signal", "why", "pattern", "replay", "ritual", "council"];

function relatedIdsFor(node: LifeMapNode, edges: LifeMapEdge[]) {
  return edges
    .filter((edge) => edge.from === node.id || edge.to === node.id)
    .map((edge) => (edge.from === node.id ? edge.to : edge.from));
}

function causalIdsFor(node: LifeMapNode, edges: LifeMapEdge[]) {
  return edges.filter((edge) => edge.to === node.id).map((edge) => edge.from);
}

export default function FocusChamber({ node, nodes, edges, onReplay, onUnwind, onModeJump }: FocusChamberProps) {
  const [activeLayer, setActiveLayer] = useState<FocusLayerId>("signal");
  const relatedNodeIds = useMemo(() => relatedIdsFor(node, edges), [edges, node]);
  const causalNodeIds = useMemo(() => causalIdsFor(node, edges), [edges, node]);
  const chamber = useMemo(
    () => buildFocusChamberNode(node, relatedNodeIds, causalNodeIds),
    [causalNodeIds, node, relatedNodeIds],
  );
  const tiers = useMemo(() => getFocusCompletionTiers(chamber), [chamber]);
  const layer = chamber.layers.find((item) => item.id === activeLayer) ?? chamber.layers[0];
  const relatedNodes = chamber.relatedNodeIds
    .map((id) => nodes.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is LifeMapNode => Boolean(candidate));

  const style = {
    "--focus-aura": chamber.auraColor,
    "--focus-scale": chamber.camera.scale,
    "--focus-blur": `${chamber.camera.blur}px`,
    "--focus-radius": `${chamber.camera.auraRadius}px`,
  } as CSSProperties;

  return (
    <section
      className="focus-chamber"
      data-testid="urai-focus-chamber"
      data-tier5={tiers["tier-5"] ? "complete" : "partial"}
      role="dialog"
      aria-label={`${chamber.title} focus chamber`}
      style={style}
    >
      <div className="focus-chamber__aura" aria-hidden="true" />
      <div className="focus-chamber__orbit" aria-hidden="true">
        {relatedNodes.slice(0, 6).map((related, index) => (
          <i key={related.id} style={{ "--orbit-index": index, "--orbit-aura": related.auraColor } as CSSProperties} />
        ))}
      </div>

      <header className="focus-chamber__header">
        <p>{chamber.nodeType.toUpperCase()} NODE / {chamber.privacyTier.toUpperCase()}</p>
        <h1>{chamber.title}</h1>
        <strong>{chamber.subtitle}</strong>
        <span>{chamber.explainabilitySummary}</span>
      </header>

      <nav className="focus-chamber__tabs" aria-label="Focus layers">
        {layerOrder.map((id) => (
          <button key={id} type="button" className={activeLayer === id ? "active" : ""} onClick={() => setActiveLayer(id)}>
            {chamber.layers.find((item) => item.id === id)?.label ?? id}
          </button>
        ))}
      </nav>

      <article className="focus-chamber__layer" data-testid={`focus-layer-${layer.id}`}>
        <p>{layer.label}</p>
        <h2>{layer.headline}</h2>
        <span>{layer.body}</span>
        <ul>
          {layer.evidence.slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <aside className="focus-chamber__intel" data-testid="focus-intelligence-ledger">
        <p>WIRED STATUS</p>
        <dl>
          <div><dt>Source signals</dt><dd>{chamber.sourceSignalIds.length}</dd></div>
          <div><dt>Related stars</dt><dd>{chamber.relatedNodeIds.length}</dd></div>
          <div><dt>Causal roots</dt><dd>{chamber.causalNodeIds.length}</dd></div>
          <div><dt>Next state</dt><dd>{chamber.nextLikelyState}</dd></div>
          <div><dt>Replay phases</dt><dd>{chamber.replay.phases.length}</dd></div>
          <div><dt>Scroll</dt><dd>{chamber.replay.exportableScrollId}</dd></div>
        </dl>
      </aside>

      <div className="focus-chamber__tiers" data-testid="focus-tier-locks">
        {Object.entries(tiers).map(([tier, complete]) => (
          <b key={tier} data-complete={complete ? "true" : "false"}>{tier.replace("tier-", "T")}</b>
        ))}
      </div>

      <footer className="focus-chamber__actions">
        <button type="button" onClick={onReplay} disabled={!chamber.replayAvailable}>Replay</button>
        <button type="button" onClick={() => onModeJump?.(chamber.nextLikelyState)}>Open {chamber.nextLikelyState}</button>
        <button type="button">{chamber.replay.ritualEnding}</button>
        <button type="button" onClick={onUnwind}>Unwind</button>
      </footer>

      <style jsx>{`
        .focus-chamber {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 30;
          width: min(680px, calc(100vw - 32px));
          max-height: min(780px, calc(100dvh - 112px));
          overflow: hidden;
          transform: translate(-50%, -50%) scale(calc(0.92 + (var(--focus-scale) - 1) * 0.12));
          border: 1px solid color-mix(in srgb, var(--focus-aura) 42%, rgba(255, 255, 255, 0.22));
          border-radius: 34px;
          background:
            radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--focus-aura) 24%, transparent), transparent 38%),
            linear-gradient(145deg, rgba(2, 6, 23, 0.84), rgba(6, 12, 32, 0.68));
          box-shadow:
            0 0 var(--focus-radius) color-mix(in srgb, var(--focus-aura) 44%, transparent),
            0 28px 120px rgba(0, 0, 0, 0.62);
          color: white;
          padding: 22px;
          backdrop-filter: blur(24px);
        }

        .focus-chamber__aura {
          position: absolute;
          inset: -24%;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--focus-aura) 24%, transparent), transparent 38%),
            conic-gradient(from 120deg, transparent, color-mix(in srgb, var(--focus-aura) 18%, transparent), transparent, rgba(255,255,255,0.08), transparent);
          filter: blur(var(--focus-blur));
          opacity: 0.82;
          animation: focus-breathe 7s ease-in-out infinite alternate;
        }

        .focus-chamber__orbit {
          position: absolute;
          inset: 16px;
          pointer-events: none;
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 30px;
        }

        .focus-chamber__orbit i {
          position: absolute;
          left: calc(50% + cos(calc(var(--orbit-index) * 60deg)) * 46%);
          top: calc(50% + sin(calc(var(--orbit-index) * 60deg)) * 42%);
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 24px var(--orbit-aura);
        }

        .focus-chamber__header,
        .focus-chamber__tabs,
        .focus-chamber__layer,
        .focus-chamber__intel,
        .focus-chamber__tiers,
        .focus-chamber__actions {
          position: relative;
          z-index: 2;
        }

        .focus-chamber__header p,
        .focus-chamber__layer p,
        .focus-chamber__intel p {
          margin: 0 0 8px;
          color: rgba(226, 241, 255, 0.58);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.28em;
        }

        .focus-chamber__header h1 {
          margin: 0;
          font-size: clamp(32px, 6vw, 58px);
          line-height: 0.95;
          letter-spacing: -0.055em;
        }

        .focus-chamber__header strong {
          display: block;
          margin-top: 8px;
          color: rgba(255,255,255,0.76);
        }

        .focus-chamber__header span {
          display: block;
          margin-top: 12px;
          max-width: 54ch;
          color: rgba(232, 245, 255, 0.72);
          line-height: 1.55;
        }

        .focus-chamber__tabs,
        .focus-chamber__actions,
        .focus-chamber__tiers {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        button {
          min-height: 38px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.09);
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          padding: 0 14px;
        }

        button.active,
        .focus-chamber__actions button:first-child {
          background: white;
          color: #020617;
        }

        .focus-chamber__layer {
          margin-top: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          background: rgba(0,0,0,0.22);
          padding: 16px;
        }

        .focus-chamber__layer h2 {
          margin: 0;
          font-size: 22px;
        }

        .focus-chamber__layer span {
          display: block;
          margin-top: 8px;
          color: rgba(255,255,255,0.76);
          line-height: 1.55;
        }

        .focus-chamber__layer ul {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 14px 0 0;
          padding: 0;
          list-style: none;
        }

        .focus-chamber__layer li,
        .focus-chamber__tiers b {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.72);
          font-size: 11px;
          font-weight: 800;
          padding: 7px 10px;
        }

        .focus-chamber__intel {
          margin-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 14px;
        }

        .focus-chamber__intel dl {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }

        .focus-chamber__intel div {
          border-radius: 16px;
          background: rgba(255,255,255,0.07);
          padding: 10px;
        }

        .focus-chamber__intel dt {
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          text-transform: uppercase;
        }

        .focus-chamber__intel dd {
          margin: 4px 0 0;
          color: rgba(255,255,255,0.86);
          font-size: 12px;
          font-weight: 800;
        }

        .focus-chamber__tiers b[data-complete="true"] {
          background: color-mix(in srgb, var(--focus-aura) 24%, rgba(255,255,255,0.08));
          color: white;
          box-shadow: 0 0 18px color-mix(in srgb, var(--focus-aura) 38%, transparent);
        }

        @keyframes focus-breathe {
          from { opacity: 0.54; transform: scale(0.98) rotate(-2deg); }
          to { opacity: 0.92; transform: scale(1.04) rotate(3deg); }
        }

        @media (max-width: 720px) {
          .focus-chamber { padding: 16px; }
          .focus-chamber__intel dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .focus-chamber__aura { animation: none; }
        }
      `}</style>
    </section>
  );
}
