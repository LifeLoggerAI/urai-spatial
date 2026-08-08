"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lifeMapTypeLabels, type LifeMapNode, type LifeMapNodeType } from "./lifeMapData";
import { requestLifeMapSelection } from "./lifeMapSelection";
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

export default function LifeMapSemanticNavigator() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitDemo = params.get("demo") === "1";
  const overviewRequested = params.get("overview") === "1";
  const { nodes, eras, loading, sourceMode } = useLifeMapEvents(explicitDemo ? "demo-user" : undefined);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LifeMapNodeType | "all">("all");
  const [eraFilter, setEraFilter] = useState("all");
  const [portalReady, setPortalReady] = useState(false);
  const navigatorRef = useRef<HTMLDetailsElement>(null);
  const desiredNavigatorOpenRef = useRef(false);
  const selectedId = overviewRequested ? null : params.get("node") || params.get("memoryId");
  const selected = nodes.find((node) => node.id === selectedId) || null;

  const visibleNodes = useMemo(() => nodes.filter((node) => matchesSearch(node, search) && (typeFilter === "all" || node.type === typeFilter) && (eraFilter === "all" || node.eraId === eraFilter)), [eraFilter, nodes, search, typeFilter]);

  const setNavigatorOpen = useCallback((open: boolean) => {
    desiredNavigatorOpenRef.current = open;
    if (navigatorRef.current) navigatorRef.current.open = open;
  }, []);

  useLayoutEffect(() => {
    const navigator = navigatorRef.current;
    if (navigator && navigator.open !== desiredNavigatorOpenRef.current) navigator.open = desiredNavigatorOpenRef.current;
  });

  useEffect(() => {
    const navigator = navigatorRef.current;
    if (!navigator) return;
    const observer = new MutationObserver(() => {
      desiredNavigatorOpenRef.current = navigator.open;
    });
    observer.observe(navigator, { attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, []);

  const withIdentity = useCallback((next: URLSearchParams) => {
    if (explicitDemo) next.set("demo", "1");
    const manifestId = params.get("manifestId");
    if (manifestId) next.set("manifestId", manifestId);
    return next;
  }, [explicitDemo, params]);

  const selectNode = useCallback((node: LifeMapNode, source: "semantic" | "keyboard" | "pointer" = "semantic") => {
    setNavigatorOpen(false);
    requestLifeMapSelection(node.id, source);
    const next = withIdentity(new URLSearchParams());
    next.set("memoryId", node.id);
    next.set("node", node.id);
    if (node.eraId) next.set("era", node.eraId);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [router, setNavigatorOpen, withIdentity]);

  const overview = useCallback(() => {
    setNavigatorOpen(false);
    const next = withIdentity(new URLSearchParams());
    const memoryId = params.get("memoryId");
    const node = params.get("node");
    if (memoryId) next.set("memoryId", memoryId);
    if (node) next.set("node", node);
    next.set("overview", "1");
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [params, router, setNavigatorOpen, withIdentity]);

  const step = useCallback((direction: number) => {
    const candidates = visibleNodes.length ? visibleNodes : nodes;
    if (!candidates.length) return;
    const current = selected ? candidates.findIndex((node) => node.id === selected.id) : -1;
    selectNode(candidates[(current + direction + candidates.length) % candidates.length], "keyboard");
  }, [nodes, selectNode, selected, visibleNodes]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "Home" || event.key.toLowerCase() === "o") { event.preventDefault(); overview(); }
      if (event.key === "/") {
        event.preventDefault();
        setNavigatorOpen(true);
        window.setTimeout(() => document.getElementById("life-map-search")?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [overview, setNavigatorOpen, step]);

  const related = selected ? nodes.filter((node) => selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)) : [];

  const journeyRail = <nav className="life-map-journey-rail" data-testid="life-map-journey-rail" data-selected={selected ? "true" : "false"} data-portal-owner="document-body" aria-label="Life Map journey controls">
    <button type="button" onClick={() => step(-1)} aria-label="Previous visible life object">Previous</button>
    <button type="button" onClick={() => step(1)} aria-label="Next visible life object">Next</button>
    <button type="button" onClick={overview}>Overview</button>
  </nav>;

  return <>
    {portalReady ? createPortal(journeyRail, document.body) : null}

    <details ref={navigatorRef} className="life-map-navigator" data-life-map-navigator>
      <summary>Search life</summary>
      <section aria-label="Search and filter Life Map">
        <label htmlFor="life-map-search">Search memories, people, dates, places, themes, and eras</label>
        <input id="life-map-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the constellation" />
        <div className="filter-row" aria-label="Filter by life object type">{TYPE_FILTERS.map((type) => <button key={type} type="button" data-active={typeFilter === type ? "true" : "false"} onClick={() => setTypeFilter(type)}>{type === "all" ? "All" : lifeMapTypeLabels[type]}</button>)}</div>
        <div className="filter-row" aria-label="Filter by era"><button type="button" data-active={eraFilter === "all" ? "true" : "false"} onClick={() => setEraFilter("all")}>All eras</button>{eras.map((era) => <button key={era.id} type="button" data-active={eraFilter === era.id ? "true" : "false"} onClick={() => setEraFilter(era.id)}>{era.title}</button>)}</div>
        <div className="semantic-results" role="list" aria-label="Visible Life Map objects" data-visible-count={visibleNodes.length}>
          {loading ? <p>Opening constellation…</p> : visibleNodes.length ? visibleNodes.map((node) => <button className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id={node.id} role="listitem" key={node.id} type="button" data-selected={selected?.id === node.id ? "true" : "false"} onClick={(event) => selectNode(node, event.detail === 0 ? "keyboard" : "pointer")}><strong>{node.title}</strong><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span><small>{node.summary}</small></button>) : <p>No life objects match these filters.</p>}
        </div>
        <p className="privacy-truth">{sourceMode === "explicit-demo" ? "Disclosed sample universe · not your memories" : sourceMode === "private" ? "Private universe" : sourceMode}</p>
      </section>
    </details>

    {selected ? <aside className="life-map-semantic-inspector" aria-label="Selected life object details">
      <span>{lifeMapTypeLabels[selected.type]} · {selected.dateLabel}</span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
      <small>{selected.privacyLevel || "private"}{selected.locked ? " · sealed" : ""}</small>
      {related.length ? <div className="related-paths"><strong>Connected path</strong>{related.map((node) => <button key={node.id} type="button" onClick={() => selectNode(node)}>{node.title}</button>)}</div> : null}
      <p className="action-owner-note">Focus, Replay, and Overview remain in the single spatial action rail.</p>
    </aside> : null}

    <style jsx global>{`
      .life-map-journey-rail{position:fixed!important;z-index:2147483600!important;left:50%!important;bottom:max(18px,env(safe-area-inset-bottom))!important;top:auto!important;transform:translateX(-50%)!important;display:flex;align-items:center;gap:7px;min-height:62px;height:62px;max-height:62px;box-sizing:border-box;overflow:hidden;padding:7px;border:1px solid rgba(195,240,255,.3);border-radius:999px;background:rgba(2,7,18,.94);box-shadow:0 12px 42px rgba(0,0,0,.55);backdrop-filter:blur(18px);visibility:visible;opacity:1;pointer-events:auto;isolation:isolate}.life-map-journey-rail[data-selected='true']{position:fixed!important;top:max(104px,calc(env(safe-area-inset-top) + 88px))!important;bottom:auto!important;left:50%!important;transform:translateX(-50%)!important;min-height:62px;height:62px;max-height:62px}button{font:inherit}.life-map-journey-rail button,.life-map-navigator button,.life-map-semantic-inspector button{min-height:48px;border:1px solid rgba(220,248,255,.2);border-radius:999px;background:rgba(10,25,40,.96);color:#f8fbff;padding:0 16px;font-weight:800;cursor:pointer}.life-map-journey-rail button{position:relative;z-index:1;height:48px;max-height:48px;min-width:48px;box-sizing:border-box;align-self:center;visibility:visible;opacity:1;pointer-events:auto;touch-action:manipulation}.life-map-navigator{position:fixed;z-index:42;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 36px));border:1px solid rgba(195,240,255,.2);border-radius:22px;background:rgba(2,7,18,.9);backdrop-filter:blur(24px);color:#f8fbff}.life-map-navigator summary{padding:15px 18px;font-weight:800;cursor:pointer}.life-map-navigator section{display:grid;gap:12px;max-height:70vh;padding:0 16px 16px}.life-map-navigator label{font-size:12px;color:rgba(230,245,255,.75)}.life-map-navigator input{min-height:48px;border:1px solid rgba(205,244,255,.2);border-radius:16px;background:rgba(6,17,29,.95);color:#fff;padding:0 14px;font:inherit}.filter-row{display:flex;gap:7px;overflow:auto}.filter-row button{min-height:38px;white-space:nowrap;padding:0 12px;font-size:11px}.filter-row button[data-active='true']{border-color:rgba(221,250,255,.8);background:rgba(24,67,88,.95)}.semantic-results{display:grid;gap:8px;overflow:auto}.semantic-results>button{height:auto;display:grid;gap:4px;text-align:left;padding:12px 14px;border-radius:16px}.semantic-results>button[data-selected='true']{border-color:rgba(221,250,255,.85);background:rgba(18,58,78,.95)}.semantic-results span,.semantic-results small{color:rgba(225,243,255,.68)}.semantic-results small{line-height:1.35}.privacy-truth{margin:0;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:rgba(194,244,255,.7)}.life-map-semantic-inspector{position:fixed;z-index:41;left:max(20px,env(safe-area-inset-left));bottom:max(88px,calc(env(safe-area-inset-bottom) + 76px));width:min(470px,calc(100vw - 40px));display:grid;gap:12px;padding:20px;border:1px solid rgba(195,240,255,.2);border-radius:24px;background:rgba(4,12,23,.9);backdrop-filter:blur(22px);color:#f8fbff}.life-map-semantic-inspector span,.life-map-semantic-inspector small{font-size:11px;color:rgba(214,242,255,.7);text-transform:uppercase;letter-spacing:.12em}.life-map-semantic-inspector h2{margin:0;font-size:clamp(24px,4vw,42px);line-height:.95}.life-map-semantic-inspector p{margin:0;color:rgba(235,246,255,.78);line-height:1.45}.related-paths{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.related-paths button{min-height:42px;padding:0 13px;font-size:12px}.related-paths strong{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(214,242,255,.7)}.action-owner-note{font-size:11px;color:rgba(214,242,255,.62)!important}@media(max-width:760px){.life-map-journey-rail{bottom:max(10px,env(safe-area-inset-bottom))!important;width:calc(100vw - 24px);justify-content:center}.life-map-journey-rail button{flex:1}.life-map-journey-rail[data-selected='true']{position:fixed!important;top:max(104px,calc(env(safe-area-inset-top) + 88px))!important;bottom:auto!important;left:50%!important;transform:translateX(-50%)!important;width:min(354px,calc(100vw - 24px));min-height:62px!important;height:62px!important;max-height:62px!important;overflow:hidden!important}.life-map-journey-rail[data-selected='true'] button{flex:1 1 0;height:48px!important;min-height:48px!important;max-height:48px!important;padding-inline:8px}.life-map-navigator{right:12px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 62px));width:calc(100vw - 24px)}.life-map-navigator section{max-height:62vh}.life-map-semantic-inspector{left:12px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 62px));width:calc(100vw - 24px);max-height:38vh;overflow:auto;padding:15px}.related-paths{display:none}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `}</style>
  </>;
}
