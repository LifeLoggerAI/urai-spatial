"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lifeMapTypeLabels, type LifeMapNode, type LifeMapNodeType } from "./lifeMapData";
import { useLifeMapEvents } from "./useLifeMapEvents";

const TYPE_FILTERS: readonly (LifeMapNodeType | "all")[] = ["all", "memory", "relationship", "season", "recovery", "threshold", "ritual", "forecast", "legacy"];

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches("input,textarea,select,[role='textbox']"));
}

function matchesSearch(node: LifeMapNode, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [node.title, node.subtitle, node.summary, node.dateLabel, node.type, node.eraId, node.clusterId, ...(node.tags || [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function activateWorldLabel(node: LifeMapNode) {
  const labels = Array.from(document.querySelectorAll<HTMLButtonElement>("button.life-map-world-label"));
  const owner = labels.find((button) => button.getAttribute("role") !== "listitem" && (button.dataset.lifeMapNodeId === node.id || button.querySelector("strong")?.textContent?.trim() === node.title.trim()));
  if (!owner) return false;
  owner.click();
  return true;
}

export default function LifeMapSemanticNavigator() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitDemo = params.get("demo") === "1";
  const { nodes, eras, loading, sourceMode } = useLifeMapEvents(explicitDemo ? "demo-user" : undefined);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LifeMapNodeType | "all">("all");
  const [eraFilter, setEraFilter] = useState("all");
  const selectedId = params.get("node") || params.get("memoryId");
  const selected = nodes.find((node) => node.id === selectedId) || null;

  const visibleNodes = useMemo(() => nodes.filter((node) => matchesSearch(node, search) && (typeFilter === "all" || node.type === typeFilter) && (eraFilter === "all" || node.eraId === eraFilter)), [eraFilter, nodes, search, typeFilter]);

  const withIdentity = useCallback((next: URLSearchParams) => {
    if (explicitDemo) next.set("demo", "1");
    const manifestId = params.get("manifestId");
    if (manifestId) next.set("manifestId", manifestId);
    return next;
  }, [explicitDemo, params]);

  const selectNode = useCallback((node: LifeMapNode) => {
    activateWorldLabel(node);
    const next = withIdentity(new URLSearchParams());
    next.set("memoryId", node.id);
    next.set("node", node.id);
    if (node.eraId) next.set("era", node.eraId);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [router, withIdentity]);

  const overview = useCallback(() => {
    const next = withIdentity(new URLSearchParams());
    next.set("overview", "1");
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [router, withIdentity]);

  const step = useCallback((direction: number) => {
    const candidates = visibleNodes.length ? visibleNodes : nodes;
    if (!candidates.length) return;
    const current = selected ? candidates.findIndex((node) => node.id === selected.id) : -1;
    selectNode(candidates[(current + direction + candidates.length) % candidates.length]);
  }, [nodes, selectNode, selected, visibleNodes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "Home" || event.key.toLowerCase() === "o") { event.preventDefault(); overview(); }
      if (event.key === "/") {
        event.preventDefault();
        const details = document.querySelector<HTMLDetailsElement>("[data-life-map-navigator]");
        if (details) details.open = true;
        window.setTimeout(() => document.getElementById("life-map-search")?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [overview, step]);

  const related = selected ? nodes.filter((node) => selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)) : [];

  return <>
    <nav className="life-map-journey-rail" data-selected={selected ? "true" : "false"} aria-label="Life Map journey controls">
      <button type="button" onClick={() => step(-1)} aria-label="Previous visible life object">←</button>
      <button type="button" onClick={() => step(1)} aria-label="Next visible life object">→</button>
      <button type="button" onClick={overview}>Overview</button>
    </nav>
    <details className="life-map-navigator" data-life-map-navigator>
      <summary>Search life</summary>
      <section aria-label="Search and filter Life Map">
        <label htmlFor="life-map-search">Search memories, people, dates, places, themes, and eras</label>
        <input id="life-map-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the constellation" />
        <div className="filter-row" aria-label="Filter by life object type">{TYPE_FILTERS.map((type) => <button key={type} type="button" data-active={typeFilter === type ? "true" : "false"} onClick={() => setTypeFilter(type)}>{type === "all" ? "All" : lifeMapTypeLabels[type]}</button>)}</div>
        <div className="filter-row" aria-label="Filter by era"><button type="button" data-active={eraFilter === "all" ? "true" : "false"} onClick={() => setEraFilter("all")}>All eras</button>{eras.map((era) => <button key={era.id} type="button" data-active={eraFilter === era.id ? "true" : "false"} onClick={() => setEraFilter(era.id)}>{era.title}</button>)}</div>
        <div className="semantic-results" role="list" aria-label="Visible Life Map objects" data-visible-count={visibleNodes.length}>
          {loading ? <p>Opening constellation…</p> : visibleNodes.length ? visibleNodes.map((node) => <button className="life-map-world-label" data-life-map-node-id={node.id} role="listitem" key={node.id} type="button" data-selected={selected?.id === node.id ? "true" : "false"} onClick={() => selectNode(node)}><strong>{node.title}</strong><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span><small>{node.summary}</small></button>) : <p>No life objects match these filters.</p>}
        </div>
        <p className="privacy-truth">{sourceMode === "explicit-demo" ? "Disclosed sample universe · not your memories" : sourceMode === "private" ? "Private universe" : sourceMode}</p>
      </section>
    </details>
    {selected ? <aside className="life-map-semantic-inspector" aria-label="Selected life object details"><span>{lifeMapTypeLabels[selected.type]} · {selected.dateLabel}</span><h2>{selected.title}</h2><p>{selected.summary}</p><small>{selected.privacyLevel || "private"}{selected.locked ? " · sealed" : ""}</small>{related.length ? <div className="related-paths"><strong>Connected path</strong>{related.map((node) => <button key={node.id} type="button" onClick={() => selectNode(node)}>{node.title}</button>)}</div> : null}<p className="action-owner-note">Focus, Replay, and Overview remain in the single spatial action rail.</p></aside> : null}
    <style jsx>{`
      button{font:inherit}.life-map-journey-rail{position:fixed;z-index:40;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:7px;padding:7px;border:1px solid #bdefff33;border-radius:999px;background:#020712c7}.life-map-journey-rail[data-selected='true']{top:max(104px,calc(env(safe-area-inset-top) + 88px));bottom:auto}.life-map-journey-rail button,.life-map-navigator button,.life-map-semantic-inspector button{min-height:48px;border:1px solid #dcf8ff33;border-radius:999px;background:#0a1928e6;color:#f8fbff;padding:0 16px;font-weight:800}.life-map-navigator{position:fixed;z-index:42;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 36px));border:1px solid #c3f0ff33;border-radius:22px;background:#020712e6;color:#f8fbff}.life-map-navigator summary{padding:15px 18px;font-weight:800}.life-map-navigator section{display:grid;gap:12px;max-height:70vh;padding:0 16px 16px}.life-map-navigator input{min-height:48px;border:1px solid #cdf4ff33;border-radius:16px;background:#06111df2;color:#fff;padding:0 14px}.filter-row{display:flex;gap:7px;overflow:auto}.filter-row button{min-height:38px;white-space:nowrap;padding:0 12px;font-size:11px}.semantic-results{display:grid;gap:8px;overflow:auto}.semantic-results>button{height:auto;display:grid;gap:4px;text-align:left;padding:12px 14px;border-radius:16px}.semantic-results span,.semantic-results small{color:#e1f3ffad}.privacy-truth{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#c2f4ffb3}.life-map-semantic-inspector{position:fixed;z-index:41;left:max(20px,env(safe-area-inset-left));bottom:max(88px,calc(env(safe-area-inset-bottom) + 76px));width:min(470px,calc(100vw - 40px));display:grid;gap:12px;padding:20px;border:1px solid #c3f0ff33;border-radius:24px;background:#040c17e6;color:#f8fbff}.life-map-semantic-inspector h2,.life-map-semantic-inspector p{margin:0}.related-paths{display:flex;flex-wrap:wrap;gap:7px}.action-owner-note{font-size:11px}@media(max-width:760px){.life-map-journey-rail{bottom:max(10px,env(safe-area-inset-bottom));width:calc(100vw - 24px)}.life-map-navigator{right:12px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 62px));width:calc(100vw - 24px)}.life-map-navigator section{max-height:62vh}.life-map-semantic-inspector{left:12px;width:calc(100vw - 24px);max-height:38vh;overflow:auto}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `}</style>
  </>;
}
