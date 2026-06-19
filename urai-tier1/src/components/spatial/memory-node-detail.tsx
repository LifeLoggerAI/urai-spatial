"use client";

import Link from "next/link";
import type { LifeMapNode } from "@/lib/firebase/firebaseSpatialSchema";

type Props = { node: LifeMapNode & { id: string }; onClose?: () => void; compact?: boolean };

function formatNodeTimestamp(timestamp: LifeMapNode["timestamp"]) {
  const value = timestamp as unknown;

  let date: Date;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    date = (value as { toDate: () => Date }).toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    date = new Date();
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function MemoryNodeDetail({ node, onClose, compact = false }: Props) {
  const date = formatNodeTimestamp(node.timestamp);
  return (
    <section className={`nodeDetail ${compact ? "nodeDetail--compact" : ""}`} aria-label={`Memory detail for ${node.title}`}>
      <div className="nodeDetail__top"><span>{node.type}</span>{onClose ? <button type="button" onClick={onClose} aria-label="Close memory detail">×</button> : null}</div>
      <h1>{node.title}</h1>
      <p>{node.summary}</p>
      <dl><dt>Date</dt><dd>{date}</dd><dt>Privacy</dt><dd>{node.privacyLevel}</dd><dt>Tags</dt><dd>{node.emotionalTags.join(" · ")}</dd><dt>Source</dt><dd>{node.sourceRefs.map((ref) => ref.collection).join(", ")}</dd></dl>
      <div className="nodeDetail__actions"><button type="button">Reflect</button><button type="button">Start Ritual</button><Link href="/spatial/life-map">View Forecast</Link><Link href="/spatial/legacy">Open Legacy Thread</Link>{node.type === "shadow" ? <Link href="/spatial/shadow">Enter Shadow Realm</Link> : null}</div>
      <style jsx>{`.nodeDetail{position:relative;display:grid;gap:.75rem;max-width:42rem;padding:1.2rem;border:1px solid rgba(178,230,255,.2);border-radius:1.2rem;background:rgba(4,14,28,.7);backdrop-filter:blur(16px);color:#e6f9ff}.nodeDetail--compact{position:absolute;left:50%;bottom:7rem;z-index:20;width:min(92vw,28rem);transform:translateX(-50%)}.nodeDetail__top{display:flex;justify-content:space-between;align-items:center}.nodeDetail__top span{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:#91dfff}.nodeDetail__top button{border:1px solid rgba(255,255,255,.2);border-radius:999px;background:transparent;color:#e6f9ff;width:2rem;height:2rem}.nodeDetail h1{margin:0;font-size:1.35rem}.nodeDetail p{margin:0;color:#c7e6f0}.nodeDetail dl{display:grid;grid-template-columns:auto 1fr;gap:.35rem .8rem;margin:0}.nodeDetail dt{color:#91b9c8}.nodeDetail dd{margin:0}.nodeDetail__actions{display:flex;flex-wrap:wrap;gap:.5rem}.nodeDetail__actions :global(a),.nodeDetail__actions button{border:1px solid rgba(160,228,255,.24);border-radius:999px;background:rgba(61,139,180,.18);color:#dff7ff;padding:.55rem .75rem;text-decoration:none;font-weight:700}`}</style>
    </section>
  );
}
