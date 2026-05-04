"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NodeType = "signal" | "threshold" | "recovery" | "pattern" | "memory" | "council" | "return";
type Mode = "home" | "lifemap" | "focus" | "replay" | "mirror";
type Filter = "all" | NodeType;

type LifeNode = {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  description: string;
  timestamp: string;
  emotion: string;
  intensity: number;
  auraColor: string;
  x: number;
  y: number;
  z: number;
  constellationGroupId: string;
  replayAvailable: boolean;
  replayId?: string;
  narratorLine: string;
  replayScript: string[];
  visited: boolean;
  locked: boolean;
};

type LifeGroup = {
  id: string;
  label: string;
  nodeIds: string[];
  color: string;
};

const lifeNodes: LifeNode[] = [
  { id: "pattern-01", type: "pattern", title: "Pattern Recognition", subtitle: "The loop finally became visible", description: "A scattered set of signals resolves into one readable emotional pattern.", timestamp: "2026-01-08", emotion: "clarity", intensity: 0.91, auraColor: "#7dd3fc", x: 52, y: 33, z: 3, constellationGroupId: "current-season", replayAvailable: true, replayId: "replay-pattern-01", narratorLine: "Notice how this moment belongs to a larger pattern.", replayScript: ["The camera slows near the first recognized loop.", "The aura widens as old friction becomes language.", "The insight returns you to choice.", "The final phase holds on return."], visited: true, locked: false },
  { id: "recovery-01", type: "recovery", title: "Recovery Bloom", subtitle: "A soft return after overload", description: "The first visible brightening after a hard emotional dip.", timestamp: "2026-01-12", emotion: "recovery", intensity: 0.84, auraColor: "#86efac", x: 28, y: 58, z: 2, constellationGroupId: "recovery-arc", replayAvailable: true, replayId: "replay-recovery-01", narratorLine: "This was the beginning of a recovery bloom.", replayScript: ["The dark weather thins.", "A green bloom opens around the rebound.", "The return becomes easier to trust.", "The final phase holds on return."], visited: true, locked: false },
  { id: "threshold-01", type: "threshold", title: "Threshold Crossing", subtitle: "The before and after door", description: "A pressure point that changed the shape of the chapter.", timestamp: "2026-01-15", emotion: "tension", intensity: 0.78, auraColor: "#fb923c", x: 20, y: 30, z: 4, constellationGroupId: "threshold-arc", replayAvailable: true, replayId: "replay-threshold-01", narratorLine: "This was not failure. It was the door before the return.", replayScript: ["The route contracts near the door.", "The body remembers the crossing.", "The map opens on the other side.", "The final phase holds on return."], visited: true, locked: false },
  { id: "council-01", type: "council", title: "Council Reflection", subtitle: "Inner voices gathered", description: "Multiple perspectives stopped competing and became a council.", timestamp: "2026-01-18", emotion: "wisdom", intensity: 0.68, auraColor: "#c4b5fd", x: 77, y: 48, z: 5, constellationGroupId: "becoming", replayAvailable: true, replayId: "replay-council-01", narratorLine: "The council does not force the answer; it lets the pattern speak.", replayScript: ["Several quiet voices orbit the center.", "One voice softens.", "The council returns a grounded answer.", "The final phase holds on return."], visited: false, locked: false },
  { id: "signal-01", type: "signal", title: "Quiet Signal", subtitle: "A small rhythm shifted", description: "A passive signal that looked minor until it repeated across days.", timestamp: "2026-01-21", emotion: "calm", intensity: 0.46, auraColor: "#dbeafe", x: 64, y: 64, z: 1, constellationGroupId: "current-season", replayAvailable: false, narratorLine: "Small signals often arrive before the story has a name.", replayScript: [], visited: false, locked: false },
  { id: "memory-01", type: "memory", title: "Memory Bloom", subtitle: "A scene regained color", description: "A memory surfaced with enough emotional context to become a star.", timestamp: "2026-01-24", emotion: "memory", intensity: 0.72, auraColor: "#fef3c7", x: 43, y: 70, z: 2, constellationGroupId: "current-season", replayAvailable: true, replayId: "replay-memory-01", narratorLine: "The memory did not return alone; it brought meaning with it.", replayScript: ["The star brightens from the edge.", "A warm scene opens behind the route.", "The memory becomes safe to hold.", "The final phase holds on return."], visited: true, locked: false },
  { id: "memory-02", type: "memory", title: "Soft Morning", subtitle: "A low-intensity anchor", description: "A simple calm moment that gives the galaxy emotional texture.", timestamp: "2026-01-27", emotion: "peace", intensity: 0.39, auraColor: "#bae6fd", x: 17, y: 74, z: 1, constellationGroupId: "current-season", replayAvailable: true, replayId: "replay-memory-02", narratorLine: "This quiet moment mattered because it stabilized the field.", replayScript: ["Light gathers at the lower edge.", "The route slows.", "The morning becomes an anchor.", "The final phase holds on return."], visited: false, locked: false },
  { id: "signal-shadow-01", type: "signal", title: "Shadow Signal", subtitle: "The old pattern flickered", description: "A difficult recurrence shown as information, not judgment.", timestamp: "2026-02-01", emotion: "shadow", intensity: 0.88, auraColor: "#a78bfa", x: 37, y: 42, z: 3, constellationGroupId: "shadow-return", replayAvailable: true, replayId: "replay-shadow-01", narratorLine: "This cluster carries pain, but also evidence of survival.", replayScript: ["Fog gathers around an old loop.", "The signal is named without blame.", "A return route appears.", "The final phase holds on return."], visited: true, locked: false },
  { id: "return-01", type: "return", title: "Return Point", subtitle: "The system came back online", description: "A return node where calm, rhythm, and agency reconnect.", timestamp: "2026-02-04", emotion: "return", intensity: 0.82, auraColor: "#f8fafc", x: 58, y: 78, z: 2, constellationGroupId: "return-arc", replayAvailable: true, replayId: "replay-return-01", narratorLine: "The return matters because you found the path back.", replayScript: ["The route brightens from shadow to white.", "The body exhales.", "The return becomes the proof.", "The final phase holds on return."], visited: true, locked: false },
  { id: "relationship-01", type: "memory", title: "Relationship Echo", subtitle: "A bond changed shape", description: "A social orbit where warmth, distance, and meaning became visible together.", timestamp: "2026-02-07", emotion: "connection", intensity: 0.74, auraColor: "#f0abfc", x: 83, y: 25, z: 4, constellationGroupId: "relationship-arc", replayAvailable: true, replayId: "replay-relationship-01", narratorLine: "This relationship changed shape here.", replayScript: ["Two orbits pass each other slowly.", "The echo shows warmth and distance.", "The bond is held without forcing it.", "The final phase holds on return."], visited: false, locked: false },
  { id: "recovery-ritual-01", type: "recovery", title: "Ritual Anchor", subtitle: "A repeatable act became medicine", description: "A private ritual stabilized the week and converted stress into rhythm.", timestamp: "2026-02-10", emotion: "growth", intensity: 0.63, auraColor: "#34d399", x: 71, y: 72, z: 2, constellationGroupId: "recovery-arc", replayAvailable: true, replayId: "replay-ritual-01", narratorLine: "The ritual mattered because it made recovery repeatable.", replayScript: ["The bloom becomes a small repeated circle.", "The circle becomes a route.", "The route becomes trust.", "The final phase holds on return."], visited: false, locked: false },
  { id: "becoming-01", type: "return", title: "Becoming Star", subtitle: "The map opened wider", description: "A bright marker where the previous chapter loosened and the next self became visible.", timestamp: "2026-02-14", emotion: "becoming", intensity: 0.96, auraColor: "#ffffff", x: 89, y: 68, z: 5, constellationGroupId: "becoming", replayAvailable: true, replayId: "replay-becoming-01", narratorLine: "You were becoming someone new before you had language for it.", replayScript: ["The camera pulls out from the old route.", "The white bloom opens.", "The map holds the new shape.", "The final phase holds on return."], visited: true, locked: false },
  { id: "pattern-02", type: "pattern", title: "Rhythm Anchor", subtitle: "Routine became visible", description: "A stabilizing habit pattern lit up as a repeatable support line.", timestamp: "2026-02-18", emotion: "rhythm", intensity: 0.57, auraColor: "#93c5fd", x: 13, y: 53, z: 2, constellationGroupId: "current-season", replayAvailable: false, narratorLine: "A routine can become a hidden bridge back to yourself.", replayScript: [], visited: false, locked: false },
  { id: "signal-02", type: "signal", title: "Signals Synced", subtitle: "Private inputs aligned", description: "Several passive inputs agreed enough to form a trustworthy map signal.", timestamp: "2026-02-22", emotion: "sync", intensity: 0.52, auraColor: "#67e8f9", x: 34, y: 18, z: 1, constellationGroupId: "threshold-arc", replayAvailable: false, narratorLine: "The signal is quiet, but it is consistent.", replayScript: [], visited: false, locked: false },
  { id: "memory-03", type: "memory", title: "Memory Still Forming", subtitle: "A locked star gathers context", description: "This star is intentionally protected until enough private signal exists.", timestamp: "2026-02-25", emotion: "forming", intensity: 0.49, auraColor: "#e9d5ff", x: 8, y: 24, z: 1, constellationGroupId: "shadow-return", replayAvailable: false, narratorLine: "This memory is still forming.", replayScript: [], visited: false, locked: true }
];

const groups: LifeGroup[] = [
  { id: "current-season", label: "Current Season", nodeIds: ["pattern-01", "signal-01", "memory-01", "memory-02", "pattern-02"], color: "#7dd3fc" },
  { id: "recovery-arc", label: "Recovery Arc", nodeIds: ["recovery-01", "recovery-ritual-01", "return-01", "becoming-01"], color: "#86efac" },
  { id: "relationship-arc", label: "Relationship Arc", nodeIds: ["council-01", "relationship-01", "becoming-01"], color: "#f0abfc" },
  { id: "threshold-arc", label: "Threshold Arc", nodeIds: ["signal-02", "threshold-01", "signal-shadow-01"], color: "#fb923c" },
  { id: "shadow-return", label: "Shadow to Return", nodeIds: ["memory-03", "signal-shadow-01", "return-01"], color: "#a78bfa" },
  { id: "becoming", label: "Becoming", nodeIds: ["council-01", "return-01", "becoming-01"], color: "#ffffff" }
];

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "memory", label: "Memory" },
  { id: "pattern", label: "Pattern" },
  { id: "recovery", label: "Recovery" },
  { id: "threshold", label: "Threshold" },
  { id: "council", label: "Council" },
  { id: "signal", label: "Signal" },
  { id: "return", label: "Return" }
];

const eras = ["Current Season", "Recovery Arc", "Relationship Arc", "Shadow to Return", "Becoming"];
const typeColors: Record<NodeType, string> = { signal: "#67e8f9", threshold: "#fb923c", recovery: "#86efac", pattern: "#7dd3fc", memory: "#fef3c7", council: "#c4b5fd", return: "#f8fafc" };
const replayPhases = ["MEMORY", "EMOTION", "PATTERN / INSIGHT", "RETURN"];

function bgStar(index: number) {
  return { x: (index * 37 + 13) % 100, y: (index * 61 + 7) % 100, size: 1 + ((index * 11) % 4), opacity: 0.18 + (((index * 19) % 70) / 100), delay: ((index * 23) % 12) / 10, layer: index % 3 };
}

function groupForEra(era: string) {
  if (era === "Shadow to Return") return "shadow-return";
  return groups.find((group) => group.label === era)?.id ?? "current-season";
}

function routePairs(group: LifeGroup) {
  return group.nodeIds.slice(0, -1).map((from, index) => [from, group.nodeIds[index + 1]] as const);
}

function modeFromRoute(pathname: string | null, phase: string | null): Mode {
  const source = `${pathname ?? ""} ${phase ?? ""}`.toLowerCase();
  if (source.includes("replay")) return "replay";
  if (source.includes("mirror")) return "mirror";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  return "home";
}

function routeForMode(mode: Mode, selectedId: string | null) {
  if (mode === "home") return "/home";
  if (mode === "lifemap") return "/life-map";
  if (mode === "focus") return `/focus${selectedId ? `?node=${encodeURIComponent(selectedId)}` : ""}`;
  if (mode === "replay") return `/replay${selectedId ? `?node=${encodeURIComponent(selectedId)}` : ""}`;
  return `/mirror${selectedId ? `?node=${encodeURIComponent(selectedId)}` : ""}`;
}

export function LifeMapCanonicalSurface() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeMode = modeFromRoute(pathname, searchParams.get("phase"));
  const routeNode = searchParams.get("node");
  const [mode, setMode] = useState<Mode>(routeMode);
  const [selectedId, setSelectedId] = useState<string | null>(routeNode && lifeNodes.some((node) => node.id === routeNode) ? routeNode : null);
  const [filter, setFilter] = useState<Filter>("all");
  const [era, setEra] = useState("Current Season");
  const [panel, setPanel] = useState<"filter" | "era" | null>(null);
  const [progress, setProgress] = useState(0);
  const [replayPaused, setReplayPaused] = useState(false);
  const [returnHeld, setReturnHeld] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastEscAt, setLastEscAt] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stars = useMemo(() => Array.from({ length: 280 }, (_, index) => bgStar(index)), []);

  const selected = lifeNodes.find((node) => node.id === selectedId) ?? null;
  const activeGroupId = selected?.constellationGroupId ?? groupForEra(era);
  const activeEraGroup = groupForEra(era);
  const visibleNodes = lifeNodes.filter((node) => filter === "all" || node.type === filter || node.id === selectedId);
  const activePatterns = lifeNodes.filter((node) => node.type === "pattern").length;
  const phaseIndex = Math.min(replayPhases.length - 1, Math.floor(progress / 25));

  useEffect(() => {
    if (mode !== "replay" || progress < 100) return;
    const id = window.setTimeout(() => setReturnHeld(true), 900);
    return () => window.clearTimeout(id);
  }, [mode, progress]);

  useEffect(() => {
    setReducedMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  useEffect(() => {
    setMode(routeMode);
    if (routeMode === "focus" || routeMode === "replay" || routeMode === "mirror") {
      const nextNode = routeNode && lifeNodes.some((node) => node.id === routeNode) ? routeNode : "pattern-01";
      setSelectedId(nextNode);
    }
    if (routeMode === "home") setSelectedId(null);
  }, [routeMode, routeNode]);

  useEffect(() => {
    document.querySelector('[data-testid="urai-spatial-stage"]')?.setAttribute("data-mode", mode);
    document.querySelector('[data-testid="urai-spatial-stage"]')?.setAttribute("data-canonical-lifemap", "true");
  }, [mode]);

  useEffect(() => {
    if (mode !== "replay") return;
    setProgress(0);
    setReplayPaused(false);
    setReturnHeld(false);
  }, [mode, selectedId]);

  useEffect(() => {
    if (mode !== "replay" || replayPaused) return;
    const id = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 2));
    }, 90);
    return () => window.clearInterval(id);
  }, [mode, replayPaused]);

  const navigate = (nextMode: Mode, nextNodeId: string | null = selectedId) => {
    const normalizedSelected = nextMode === "home" || nextMode === "lifemap" ? null : nextNodeId;
    if (isTransitioning) return;
    if (nextMode === mode && normalizedSelected === selectedId) return;
    setIsTransitioning(true);
    setMode(nextMode);
    setSelectedId(normalizedSelected);
    setPanel(null);
    router.push(routeForMode(nextMode, nextNodeId), { scroll: false });
    window.setTimeout(() => setIsTransitioning(false), 240);
  };

  const focusNode = (node: LifeNode) => {
    setSelectedId(node.id);
    navigate("focus", node.id);
  };

  const startReplay = () => {
    if (!selected || selected.locked || !selected.replayAvailable) return;
    navigate("replay", selected.id);
  };

  const unwind = () => {
    if (mode === "replay") navigate("focus", selectedId ?? "pattern-01");
    else if (mode === "mirror") navigate("focus", selectedId ?? "pattern-01");
    else if (mode === "focus") navigate("lifemap", null);
    else if (mode === "lifemap") navigate("home", null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mode !== "home") {
        if (isTransitioning) return;
        const now = Date.now();
        if (now - lastEscAt < 160) return;
        setLastEscAt(now);
        event.preventDefault();
        unwind();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, isTransitioning, lastEscAt]);

  if (mode === "home") return null;

  return (
    <div className={`lm-canonical ${reducedMotion ? "reduced" : ""}`} data-mode={mode} data-testid="urai-lifemap-canonical-surface">
      <div className="nebula" />
      <div className="dust" />
      <div className="shooting shooting-a" />
      <div className="shooting shooting-b" />
      <div className="stars" data-testid="lifemap-starfield">
        {stars.map((star, index) => <i key={index} className={`layer-${star.layer}`} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, opacity: star.opacity, animationDelay: `${star.delay}s` }} />)}
      </div>

      <svg className="routes" aria-hidden="true">
        {groups.flatMap((group) => routePairs(group).map(([fromId, toId]) => {
          const from = lifeNodes.find((node) => node.id === fromId);
          const to = lifeNodes.find((node) => node.id === toId);
          if (!from || !to) return null;
          const active = group.id === activeGroupId;
          const eraActive = group.id === activeEraGroup;
          const locked = group.nodeIds.some((id) => lifeNodes.find((node) => node.id === id)?.locked);
          return <line key={`${group.id}-${fromId}-${toId}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} className={`${active ? "active" : ""} ${eraActive ? "era-active" : ""} ${mode === "replay" && active ? "replay active-edge" : ""} ${locked ? "locked" : ""}`} style={{ stroke: group.color }} />;
        }))}
      </svg>

      <section className="hud hud-left" aria-label="LifeMap status">
        <p>LifeMap</p>
        <h2>{era}</h2>
        <div><b>{visibleNodes.length}</b><span>Visible Stars</span></div>
        <div><b>{activePatterns}</b><span>Active Patterns</span></div>
        <ul>{(Object.keys(typeColors) as NodeType[]).map((type) => <li key={type}><i style={{ background: typeColors[type], boxShadow: `0 0 14px ${typeColors[type]}` }} />{type}</li>)}</ul>
      </section>

      <section className="hud hud-right" aria-label="Private status">
        <p>Private Spatial State</p>
        <span>Signals Synced</span>
        {selected?.replayAvailable ? <span>Replay Ready</span> : null}
        {reducedMotion ? <span>Reduced Motion</span> : null}
      </section>

      <div className="nodes">
        {lifeNodes.map((node) => {
          const filteredOut = filter !== "all" && node.type !== filter && node.id !== selectedId;
          const eraDimmed = node.constellationGroupId !== activeEraGroup && node.id !== selectedId;
          const focusedDimmed = selectedId && node.id !== selectedId && node.constellationGroupId !== activeGroupId;
          const nodeStyle = { left: `${node.x}%`, top: `${node.y}%`, "--aura": node.auraColor, "--pulse": `${1.7 - node.intensity * 0.8}s` } as CSSProperties;
          return <button key={node.id} type="button" data-testid={node.id === "pattern-01" ? "lifemap-node-pattern-01" : `lifemap-node-${node.id}`} className={`node life-node ${node.type} ${selectedId === node.id ? "selected" : ""} ${filteredOut ? "filtered" : ""} ${eraDimmed ? "era-dim" : ""} ${focusedDimmed ? "focus-dim" : ""} ${node.locked ? "locked" : ""}`} aria-label={`${node.type} star: ${node.title}`} aria-pressed={selectedId === node.id} style={nodeStyle} onClick={() => focusNode(node)}><span /><em>{node.locked ? "L" : node.type[0].toUpperCase()}</em></button>;
        })}
      </div>

      {selected && mode === "focus" ? <section className="focus-card" data-testid="urai-focus-card" role="dialog" aria-label={`${selected.title} focus card`}>
        <p>{selected.type.toUpperCase()} NODE / {era}</p>
        <h1>{selected.title}</h1>
        <strong>{selected.subtitle}</strong>
        <span>{selected.timestamp} - {selected.emotion} - {Math.round(selected.intensity * 100)}%</span>
        <article>{selected.description}</article>
        <blockquote>{selected.narratorLine}</blockquote>
        {selected.locked ? <b className="lock-message">This memory is still forming.</b> : null}
        <div><button type="button" disabled={selected.locked || !selected.replayAvailable} onClick={startReplay}>Replay</button><button type="button" onClick={() => navigate("mirror", selected.id)}>Mirror</button><button type="button" onClick={unwind}>Unwind</button><button type="button" onClick={() => navigate("home", null)}>Return Home</button></div>
      </section> : null}

      {selected && mode === "mirror" ? <section className="replay-overlay mirror-overlay" data-testid="urai-mirror-overlay" role="dialog" aria-label={`${selected.title} mirror`}><p>MIRROR OF BECOMING</p><h1>{selected.title}</h1><div className="phase">INTEGRATION</div><article>{selected.description}</article><blockquote>{selected.narratorLine}</blockquote><div><button type="button" onClick={() => navigate("replay", selected.id)}>Enter Replay</button><button type="button" onClick={unwind}>Unwind</button><button type="button" onClick={() => navigate("home", null)}>Return Home</button></div></section> : null}

      {selected && mode === "replay" ? <section className="replay-overlay" data-testid="urai-replay-overlay" role="dialog" aria-label={`${selected.title} replay chamber`}>
        <div className="replay-card">
          <p>REPLAY STREAM</p>
          <h1>{selected.title}</h1>
          <div className="phase-row">{replayPhases.map((phase) => <span key={phase}>{phase}</span>)}</div>
          <div className="phase">{returnHeld ? "RETURN held" : replayPhases[phaseIndex]}</div>
          <div className="progress progress-shell"><i style={{ width: `${progress}%` }} /></div>
          <div className="wave waveform" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
          <div className="node-tether" />
          <article>{selected.replayScript[phaseIndex] ?? selected.narratorLine}</article>
          <blockquote>{selected.narratorLine}</blockquote>
          <div><button type="button" onClick={() => setReplayPaused((v) => !v)}>{replayPaused ? "Resume" : "Pause"}</button><button type="button" onClick={unwind}>Collapse Replay</button><button type="button" onClick={() => navigate("home", null)}>Return Home</button></div>
        </div>
      </section> : null}

      {panel === "filter" ? <div className="popover" data-testid="lifemap-filter-panel">{filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div> : null}
      {panel === "era" ? <div className="popover era-pop" data-testid="lifemap-era-panel">{eras.map((item) => <button key={item} type="button" className={era === item ? "active" : ""} onClick={() => setEra(item)}>{item}</button>)}</div> : null}

      <nav className="command" data-testid="urai-command-ribbon" aria-label="LifeMap command ribbon">
        <button type="button" className={mode === "lifemap" ? "active" : ""} onClick={() => navigate("lifemap", null)}>Overview</button>
        {mode !== "lifemap" ? <button type="button" disabled={!selected || selected.locked || !selected.replayAvailable} onClick={() => mode === "replay" ? unwind() : startReplay()}>{mode === "replay" ? "Collapse Replay" : "Replay"}</button> : null}
        {mode !== "replay" ? <button type="button" onClick={() => setPanel(panel === "filter" ? null : "filter")}>Filter</button> : null}
        {mode !== "replay" ? <button type="button" onClick={() => setPanel(panel === "era" ? null : "era")}>Era</button> : null}
        {mode !== "lifemap" ? <button type="button" onClick={unwind}>Unwind</button> : null}
        <button type="button" onClick={() => navigate("home", null)}>Return Home</button>
      </nav>

      <style jsx>{`
        .lm-canonical{position:fixed;inset:0;z-index:90;overflow:hidden;background:#020617;color:white;font-family:Inter,ui-sans-serif,system-ui;isolation:isolate}.nebula,.dust,.stars,.routes,.nodes{position:absolute;inset:0}.nebula{background:radial-gradient(circle at 50% 36%,rgba(125,211,252,.32),transparent 27%),radial-gradient(circle at 18% 80%,rgba(192,132,252,.18),transparent 31%),radial-gradient(circle at 88% 68%,rgba(45,212,191,.14),transparent 30%),linear-gradient(135deg,#020617 0%,#07152b 52%,#020617 100%);animation:drift 18s ease-in-out infinite alternate}.dust{background-image:radial-gradient(circle,rgba(255,255,255,.18) 0 1px,transparent 1px);background-size:37px 41px;opacity:.34;animation:dust 26s linear infinite}.stars i{position:absolute;border-radius:999px;background:white;box-shadow:0 0 8px #fff,0 0 24px rgba(125,211,252,.42);animation:twinkle 2.8s ease-in-out infinite alternate}.layer-0{filter:blur(.2px)}.layer-1{filter:blur(.6px)}.layer-2{filter:blur(1px)}.shooting{position:absolute;width:130px;height:1px;background:linear-gradient(90deg,transparent,#fff,transparent);opacity:.42;transform:rotate(-22deg);animation:shoot 9s linear infinite}.shooting-a{top:18%;left:12%}.shooting-b{top:54%;left:70%;animation-delay:4s}.routes{z-index:3;pointer-events:none}.routes line{stroke-width:1.2;stroke-dasharray:5 8;opacity:.18;filter:drop-shadow(0 0 8px currentColor)}.routes line.era-active{opacity:.34}.routes line.active{stroke-width:2;opacity:.72}.routes line.replay{opacity:1;stroke-width:3;animation:routePulse 1.6s ease-in-out infinite alternate}.routes line.locked{opacity:.14}.hud{position:absolute;z-index:12;border:1px solid rgba(255,255,255,.16);background:rgba(2,6,23,.54);box-shadow:0 20px 60px rgba(0,0,0,.24);backdrop-filter:blur(18px);border-radius:22px;padding:14px}.hud-left{left:18px;top:18px;width:min(280px,calc(100vw - 36px))}.hud-right{right:18px;top:18px;display:grid;gap:7px}.hud p{margin:0 0 4px;color:#bfdbfe;font-size:11px;letter-spacing:.18em;text-transform:uppercase}.hud h2{margin:0 0 10px;font-size:20px}.hud div{display:flex;align-items:center;gap:8px}.hud b{font-size:18px}.hud span{color:rgba(226,232,240,.78);font-size:12px}.hud ul{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin:10px 0 0;padding:0;list-style:none}.hud li{display:flex;align-items:center;gap:6px;color:rgba(226,232,240,.72);font-size:11px;text-transform:capitalize}.hud li i{width:7px;height:7px;border-radius:50%}.nodes{z-index:7}.life-node{position:absolute;transform:translate(-50%,-50%);width:28px;height:28px;border:0;border-radius:999px;background:transparent;cursor:pointer;transition:opacity .25s ease,filter .25s ease,transform .25s ease}.life-node span{position:absolute;inset:6px;border-radius:999px;background:var(--aura);box-shadow:0 0 18px var(--aura),0 0 46px var(--aura);animation:pulse var(--pulse) ease-in-out infinite alternate}.life-node:before{content:"";position:absolute;inset:-14px;border-radius:999px;background:radial-gradient(circle,var(--aura),transparent 62%);opacity:.2}.life-node em{position:absolute;inset:0;display:grid;place-items:center;color:#020617;font-size:10px;font-weight:900;font-style:normal}.life-node.selected{transform:translate(-50%,-50%) scale(1.28);z-index:9}.life-node.selected:after,.life-node.locked:after{content:"";position:absolute;inset:-11px;border:1px solid rgba(255,255,255,.7);border-radius:999px;box-shadow:0 0 20px var(--aura)}.life-node.locked em{color:white}.life-node.filtered{opacity:.08;pointer-events:none}.life-node.era-dim{opacity:.42}.life-node.focus-dim{opacity:.22;filter:grayscale(.5)}.focus-card,.replay-overlay{position:absolute;z-index:20;right:22px;top:50%;transform:translateY(-50%);width:min(420px,calc(100vw - 28px));border:1px solid rgba(255,255,255,.18);border-radius:28px;background:rgba(2,6,23,.74);backdrop-filter:blur(22px);box-shadow:0 28px 90px rgba(0,0,0,.44);padding:22px}.focus-card p,.replay-overlay p{margin:0 0 8px;color:#93c5fd;font-size:11px;letter-spacing:.18em}.focus-card h1,.replay-overlay h1{margin:0 0 8px;font-size:28px}.focus-card strong{display:block;margin-bottom:8px;color:#e0f2fe}.focus-card span{display:block;color:rgba(226,232,240,.74);font-size:13px}.focus-card article,.replay-overlay article{margin:16px 0;color:rgba(241,245,249,.9);line-height:1.55}.focus-card blockquote,.replay-overlay blockquote{margin:0 0 18px;padding-left:12px;border-left:2px solid rgba(125,211,252,.7);color:#bfdbfe}.focus-card div,.replay-overlay div:last-child{display:flex;flex-wrap:wrap;gap:8px}.focus-card button,.replay-overlay button,.command button,.popover button{border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(15,23,42,.7);color:white;padding:9px 13px;cursor:pointer}.focus-card button:disabled{opacity:.4;cursor:not-allowed}.lock-message{display:block;margin-bottom:14px;color:#e9d5ff}.replay-overlay{left:50%;right:auto;top:50%;transform:translate(-50%,-50%);text-align:left}.mirror-overlay{border-color:rgba(216,180,254,.45);background:radial-gradient(circle at top,rgba(216,180,254,.14),rgba(2,6,23,.82));box-shadow:0 28px 90px rgba(139,92,246,.28)}.phase{margin:10px 0;color:#fff;font-weight:900;letter-spacing:.2em}.progress{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.progress span,.progress-shell i{display:block;height:100%;background:linear-gradient(90deg,#7dd3fc,#c4b5fd,#fff);box-shadow:0 0 22px #7dd3fc}.progress-shell i{width:0}.waveform{display:flex;align-items:center;gap:4px}.waveform i{flex:1;height:100%;background:rgba(255,255,255,.22)}.phase-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.phase-row span{padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.18);font-size:10px;letter-spacing:.12em}.node-tether{height:1px;background:linear-gradient(90deg,transparent,#7dd3fc,transparent);margin:12px 0}.replay-card{display:grid;gap:8px}.wave{height:28px;margin:16px 0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 3px,transparent 3px 12px);mask-image:linear-gradient(90deg,transparent,#000,transparent);animation:wave 1.1s linear infinite}.popover{position:absolute;z-index:30;left:50%;bottom:86px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:min(720px,calc(100vw - 24px));padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:24px;background:rgba(2,6,23,.7);backdrop-filter:blur(18px)}.popover button.active,.command button.active{background:rgba(125,211,252,.22);border-color:rgba(125,211,252,.58)}.command{position:absolute;z-index:31;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;align-items:center;justify-content:center;width:max-content;max-width:calc(100vw - 22px);overflow-x:auto;padding:10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(2,6,23,.7);backdrop-filter:blur(18px);box-shadow:0 18px 70px rgba(0,0,0,.36)}.command button{white-space:nowrap;font-weight:800;font-size:12px}@keyframes twinkle{from{transform:scale(.72);opacity:.28}to{transform:scale(1.18)}}@keyframes pulse{from{transform:scale(.88)}to{transform:scale(1.25)}}@keyframes drift{from{transform:scale(1) translate3d(0,0,0)}to{transform:scale(1.06) translate3d(-1.5%,1%,0)}}@keyframes dust{to{transform:translate3d(-37px,-41px,0)}}@keyframes shoot{0%,78%{opacity:0;transform:translate3d(0,0,0) rotate(-22deg)}84%{opacity:.6}100%{opacity:0;transform:translate3d(220px,80px,0) rotate(-22deg)}}@keyframes routePulse{to{filter:drop-shadow(0 0 14px #fff)}}@keyframes wave{to{background-position:24px 0}}@media(max-width:760px){.hud-left{left:10px;top:10px;width:220px;padding:11px}.hud-right{right:10px;top:10px;padding:10px}.hud ul{display:none}.focus-card,.replay-overlay{left:12px;right:12px;top:auto;bottom:96px;transform:none;width:auto;padding:16px}.focus-card h1,.replay-overlay h1{font-size:22px}.command{justify-content:flex-start}.life-node{width:24px;height:24px}}.reduced .nebula,.reduced .dust,.reduced .stars i,.reduced .life-node span,.reduced .shooting,.reduced .wave{animation:none!important}@media(prefers-reduced-motion:reduce){.nebula,.dust,.stars i,.life-node span,.shooting,.wave{animation:none!important}}
      `}</style>
    </div>
  );
}

export default LifeMapCanonicalSurface;
