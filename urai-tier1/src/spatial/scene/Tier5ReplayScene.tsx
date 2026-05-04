"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  edgeNodes,
  filteredNodes,
  lifeChapters,
  lifeMapEdges,
  lifeMapModes,
  lifeMapNodes,
  mirrorReplayPath,
  type LifeMapMode,
  type LifeMapNode,
  type LifeMapPhase,
} from "./lifeMapModel";

type ScenePhase = LifeMapPhase | "ascent";
type ReplayPhase = "MEMORY" | "EMOTION" | "PATTERN / INSIGHT" | "RETURN";
type Snapshot = { phase: LifeMapPhase; nodeId: string | null; mode: LifeMapMode; zoom: number };
type ReplayNode = LifeMapNode & {
  replayAvailable?: boolean;
  locked?: boolean;
  replayId?: string;
  constellationGroupId?: string;
  visited?: boolean;
  intensity?: number;
};

const ALIASES: Record<string, string> = {
  signal: "node-01",
  recovery: "node-07",
  "pattern-01": "node-07",
  threshold: "node-06",
  mirror: "node-18",
};

const ROUTES: Record<LifeMapPhase, string> = {
  home: "/home",
  lifemap: "/life-map",
  focus: "/focus",
  replay: "/replay",
  mirror: "/mirror",
};

const PHASES: Array<{ id: ReplayPhase; start: number; copy: string }> = [
  { id: "MEMORY", start: 0, copy: "This is where the event first formed." },
  { id: "EMOTION", start: 25, copy: "This is what the body carried." },
  { id: "PATTERN / INSIGHT", start: 55, copy: "This moment belongs to a larger pattern." },
  { id: "RETURN", start: 84, copy: "You can return without losing what was learned." },
];

function phaseFromLocation(queryPhase: string | null, pathname: string | null): LifeMapPhase {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();
  if (source.includes("mirror")) return "mirror";
  if (source.includes("replay")) return "replay";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  return "home";
}

function normalizeNodeId(value: string | null): string | null {
  if (!value) return null;
  const normalized = ALIASES[value] ?? value;
  return lifeMapNodes.some((node) => node.id === normalized) ? normalized : null;
}

function backgroundStar(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.55,
    opacity: 0.22 + (((index * 13) % 65) / 100),
    delay: ((index * 17) % 9) / 10,
  };
}

function weatherClass(mode: LifeMapMode) {
  if (mode === "shadow") return "weather-shadow";
  if (mode === "dream") return "weather-dream";
  if (mode === "recovery") return "weather-recovery";
  if (mode === "relationship") return "weather-relationship";
  if (mode === "mirror") return "weather-mirror";
  return "weather-cosmos";
}

function displayNodeType(node: LifeMapNode) {
  if (node.id === "node-07") return "PATTERN NODE";
  return `${node.nodeType.replace(/([A-Z])/g, " $1").toUpperCase()} NODE`;
}

function intensityOf(node: ReplayNode) {
  return Math.round(((node.intensity ?? node.emotionalIntensity) || 0.55) * 100);
}

function canReplay(node: ReplayNode | null) {
  if (!node) return false;
  if (node.locked) return false;
  if (node.replayAvailable === false) return false;
  return true;
}

function activeReplayPhase(progress: number): ReplayPhase {
  return [...PHASES].reverse().find((item) => progress >= item.start)?.id ?? "MEMORY";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function phaseText(node: ReplayNode | null, progress: number) {
  const replayPhase = activeReplayPhase(progress);
  const script = node?.replayScript ?? [];
  if (replayPhase === "MEMORY") return script[0] ?? node?.description ?? PHASES[0].copy;
  if (replayPhase === "EMOTION") return script[1] ?? `${node?.emotionalTone ?? "memory"} moved through this moment.`;
  if (replayPhase === "PATTERN / INSIGHT") return script[2] ?? node?.narratorLine ?? PHASES[2].copy;
  return "The replay stabilizes. Keep the insight, leave the pressure.";
}

function HomeScene({ entering, onEnter, disabled, stars }: { entering: boolean; onEnter: () => void; disabled: boolean; stars: ReturnType<typeof backgroundStar>[] }) {
  return (
    <section className={`home ${entering ? "home-exiting" : ""}`} data-testid="urai-home-scene" aria-label="URAI home sky entry">
      <div className="home-sky" />
      <div className="home-stars">{stars.slice(0, 70).map((s, index) => <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.opacity }} />)}</div>
      <div className="home-hill hill-a" /><div className="home-hill hill-b" /><div className="home-hill hill-c" />
      <button type="button" className="enter-label" onClick={onEnter} disabled={disabled}>ENTER THE SKY</button>
      <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter Life Map" onClick={onEnter} disabled={disabled} />
      <div className="body" data-testid="urai-home-body" />
      <p className="home-copy">A living emotional galaxy of memory, pattern, recovery, dream, and becoming.</p>
    </section>
  );
}

function DetailCard({ node, onReplay, onClose }: { node: ReplayNode; onReplay: () => void; onClose: () => void }) {
  const replayReady = canReplay(node);
  return (
    <section className="detail-card" data-testid="urai-focus-card" role="dialog" aria-label={`${node.title} focus`}>
      <button type="button" className="close" onClick={onClose} aria-label="Close memory card">×</button>
      <p>{displayNodeType(node)} · {node.season.toUpperCase()} · ARC {node.chapterId.replace("chapter-", "").toUpperCase()}</p>
      <h1>{node.title}</h1>
      <strong>{node.subtitle}</strong>
      <span>{formatDate(node.timestamp)}</span>
      <div className="aura-row"><i style={{ background: node.auraColor, boxShadow: `0 0 32px ${node.auraColor}` }} /><b>{node.emotionalTone} aura</b><em>{intensityOf(node)}%</em></div>
      <article>{node.description}</article>
      <blockquote>{node.narratorLine}</blockquote>
      <dl>
        <div><dt>Chapter</dt><dd>{lifeChapters.find((chapter) => chapter.id === node.chapterId)?.title ?? "Unchaptered"}</dd></div>
        <div><dt>Signals</dt><dd>{node.sourceSignals.join(", ")}</dd></div>
        <div><dt>Replay</dt><dd>{replayReady ? "Ready" : "Locked"}</dd></div>
      </dl>
      <div className="card-actions">
        <button type="button" onClick={onReplay} disabled={!replayReady}>Replay</button>
        <button type="button">Add ritual</button>
        <button type="button">Export card</button>
      </div>
    </section>
  );
}

function ReplayOverlay({ node, mirror, progress, paused, onTogglePause, onCollapse, onUnwind }: { node: ReplayNode | null; mirror: boolean; progress: number; paused: boolean; onTogglePause: () => void; onCollapse: () => void; onUnwind: () => void }) {
  const currentPhase = activeReplayPhase(progress);
  const aura = node?.auraColor ?? "#dbeafe";
  const frames = mirror ? mirrorReplayPath : [];
  const title = node?.id === "node-01" ? "Signal Replay" : node ? node.title : "Mirror of Becoming";
  return (
    <section className="replay-overlay" data-testid="urai-replay-overlay" role="dialog" aria-label={node ? `${node.title} replay chamber` : "Mirror of Becoming replay chamber"} style={{ "--aura": aura, "--progress": `${progress}%` } as CSSProperties}>
      <div className="replay-chamber" /><div className="memory-shimmer" /><div className="replay-camera" />
      <div className="replay-card">
        <p>REPLAY STREAM · {(node?.clusterId ?? "MIRROR ARC").replace("cluster-", "").toUpperCase()}</p>
        <h1>{title}</h1>
        <strong>{node?.subtitle ?? "The life arc zooms out."}</strong>
        <div className="phase-row" aria-label="Replay phases">{PHASES.map((phase) => <span key={phase.id} data-active={phase.id === currentPhase}>{phase.id}</span>)}</div>
        <div className="progress-shell" aria-label={`Replay progress ${progress}%`}><i /></div>
        <div className="waveform" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 0.045}s`, height: `${16 + ((index * 11) % 32)}px` }} />)}</div>
        <article>
          <b>{currentPhase}</b>
          <span>{node ? phaseText(node, progress) : frames[Math.min(frames.length - 1, Math.floor(progress / 25))]?.narrator ?? "The full symbolic arc is becoming visible."}</span>
        </article>
        <dl>
          <div><dt>Era</dt><dd>{node ? formatDate(node.timestamp) : "Full arc"}</dd></div>
          <div><dt>Emotion</dt><dd>{node?.emotionalTone ?? "purpose"}</dd></div>
          <div><dt>Intensity</dt><dd>{node ? `${intensityOf(node)}%` : "100%"}</dd></div>
          <div><dt>Status</dt><dd>{progress >= 100 ? "RETURN held" : paused ? "Paused" : "Playing"}</dd></div>
        </dl>
        <blockquote>{node?.narratorLine ?? "You were becoming someone new before you had language for it."}</blockquote>
        {mirror ? <ol>{frames.map((frame) => <li key={frame.nodeId}><b>{frame.cameraLabel}</b><span>{frame.narrator}</span></li>)}</ol> : null}
        <div className="replay-actions">
          <button type="button" onClick={onTogglePause}>{paused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={onCollapse}>Collapse Replay</button>
          <button type="button" onClick={onUnwind}>Unwind</button>
        </div>
      </div>
    </section>
  );
}

function CommandRibbon({ phase, mode, hasNode, replayReady, onMode, onOverview, onReplay, onCollapse, onUnwind, onHome }: { phase: ScenePhase; mode: LifeMapMode; hasNode: boolean; replayReady: boolean; onMode: (mode: LifeMapMode) => void; onOverview: () => void; onReplay: () => void; onCollapse: () => void; onUnwind: () => void; onHome: () => void }) {
  const isReplay = phase === "replay" || phase === "mirror";
  return (
    <nav className="command-ribbon" data-testid="urai-command-ribbon" aria-label="Spatial controls" onClick={(event) => event.stopPropagation()}>
      <button type="button" className={phase === "lifemap" ? "active" : ""} onClick={onOverview}>Overview</button>
      {isReplay ? <button type="button" onClick={onCollapse}>Collapse Replay</button> : <button type="button" onClick={onReplay} disabled={!hasNode || !replayReady}>Replay</button>}
      <button type="button">Filter</button>
      <button type="button">Era</button>
      <select aria-label="LifeMap mode" value={mode} onChange={(event) => onMode(event.target.value as LifeMapMode)}>{lifeMapModes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      {phase !== "home" ? <button type="button" onClick={onUnwind}>Unwind</button> : null}
      <button type="button" onClick={onHome}>Return Home</button>
    </nav>
  );
}

export default function Tier5ReplayScene() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routePhase = phaseFromLocation(searchParams.get("phase"), pathname);
  const routeNodeId = normalizeNodeId(searchParams.get("node"));
  const [phase, setPhase] = useState<ScenePhase>(routePhase);
  const [mode, setMode] = useState<LifeMapMode>(routePhase === "mirror" ? "mirror" : "timeline");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>((routePhase === "focus" || routePhase === "replay") ? routeNodeId ?? ALIASES.signal : null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(routePhase === "replay" ? 1 : 0);
  const [paused, setPaused] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stars = useMemo(() => Array.from({ length: 280 }, (_, index) => backgroundStar(index)), []);
  const selectedNode = (lifeMapNodes.find((node) => node.id === selectedNodeId) ?? null) as ReplayNode | null;
  const visibleNodes = useMemo(() => filteredNodes(mode), [mode]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const activeNodeIds = useMemo(() => new Set(selectedNodeId ? [selectedNodeId, ...lifeMapEdges.filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId).flatMap((edge) => [edge.from, edge.to])] : []), [selectedNodeId]);
  const visibleEdges = useMemo(() => lifeMapEdges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)), [visibleNodeIds]);

  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  const writeUrl = useCallback((next: LifeMapPhase, nodeId: string | null = selectedNodeId) => {
    const base = ROUTES[next];
    if (next === "home") router.push(base, { scroll: false });
    else if (nodeId && (next === "focus" || next === "replay")) router.push(`${base}?node=${encodeURIComponent(nodeId)}`, { scroll: false });
    else router.push(base, { scroll: false });
  }, [router, selectedNodeId]);
  const pushSnapshot = useCallback(() => { if (phase !== "ascent") setHistory((current) => [...current, { phase: phase as LifeMapPhase, nodeId: selectedNodeId, mode, zoom }]); }, [mode, phase, selectedNodeId, zoom]);
  const goHome = useCallback(() => { clearTimers(); setHistory([]); setPhase("home"); setMode("timeline"); setSelectedNodeId(null); setZoom(1); setProgress(0); setPaused(false); setIsTransitioning(false); writeUrl("home", null); }, [clearTimers, writeUrl]);
  const goto = useCallback((next: LifeMapPhase, nodeId: string | null = selectedNodeId) => { setPhase(next); if (next !== "replay") setProgress(0); writeUrl(next, nodeId); }, [selectedNodeId, writeUrl]);
  const enterLifeMap = useCallback(() => { if (isTransitioning || phase !== "home") return; clearTimers(); pushSnapshot(); setIsTransitioning(true); setPhase("ascent"); timers.current.push(setTimeout(() => { setPhase("lifemap"); setIsTransitioning(false); writeUrl("lifemap", null); }, 720)); }, [clearTimers, isTransitioning, phase, pushSnapshot, writeUrl]);
  const focusNode = useCallback((node: ReplayNode) => { if (isTransitioning) return; pushSnapshot(); setSelectedNodeId(node.id); setProgress(0); setPaused(false); setPhase("focus"); writeUrl("focus", node.id); }, [isTransitioning, pushSnapshot, writeUrl]);
  const startReplay = useCallback((node: ReplayNode | null = selectedNode) => { if (isTransitioning || !canReplay(node)) return; pushSnapshot(); setSelectedNodeId(node.id); setProgress(1); setPaused(false); setPhase("replay"); writeUrl("replay", node.id); }, [isTransitioning, pushSnapshot, selectedNode, writeUrl]);
  const collapseReplay = useCallback(() => { setPaused(false); setProgress(0); setPhase(selectedNode ? "focus" : "lifemap"); writeUrl(selectedNode ? "focus" : "lifemap", selectedNodeId); }, [selectedNode, selectedNodeId, writeUrl]);
  const unwind = useCallback(() => {
    if (isTransitioning) return;
    const previous = history[history.length - 1];
    if (previous) { setHistory((current) => current.slice(0, -1)); setPhase(previous.phase); setSelectedNodeId(previous.nodeId); setMode(previous.mode); setZoom(previous.zoom); setProgress(0); setPaused(false); writeUrl(previous.phase, previous.nodeId); return; }
    if (phase === "replay") { collapseReplay(); return; }
    if (phase === "focus") { setSelectedNodeId(null); goto("lifemap", null); return; }
    if (phase === "lifemap" || phase === "mirror") { goHome(); return; }
  }, [collapseReplay, goHome, goto, history, isTransitioning, phase, writeUrl]);

  useEffect(() => () => clearTimers(), [clearTimers]);
  useEffect(() => {
    if (isTransitioning || phase === "ascent") return;
    const nextPhase = phaseFromLocation(searchParams.get("phase"), pathname);
    const nextNodeId = normalizeNodeId(searchParams.get("node"));
    setPhase(nextPhase);
    if (nextPhase === "home") { setSelectedNodeId(null); setMode("timeline"); setProgress(0); return; }
    if (nextPhase === "mirror") { setSelectedNodeId(null); setMode("mirror"); setProgress(1); return; }
    if (nextPhase === "focus" || nextPhase === "replay") { setSelectedNodeId(nextNodeId ?? ALIASES.signal); setProgress(nextPhase === "replay" ? 1 : 0); return; }
    setProgress(0);
  }, [isTransitioning, pathname, searchParams]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); unwind(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [unwind]);
  useEffect(() => { if (phase !== "replay" && phase !== "mirror") return; if (paused || progress >= 100) return; const timer = window.setInterval(() => setProgress((current) => Math.min(100, current + 2)), 120); return () => window.clearInterval(timer); }, [paused, phase, progress]);

  const showHome = phase === "home" || phase === "ascent";
  const showLifeMap = phase === "ascent" || phase === "lifemap" || phase === "focus" || phase === "replay" || phase === "mirror";
  const replayActive = phase === "replay" || phase === "mirror";
  const aura = selectedNode?.auraColor ?? "#9bdcff";

  return (
    <main className="stage" data-mode={phase} data-lifemap-mode={mode} data-testid="urai-spatial-stage" aria-live="polite" style={{ "--active-aura": aura } as CSSProperties}>
      {showHome ? <HomeScene entering={phase === "ascent"} onEnter={enterLifeMap} disabled={isTransitioning} stars={stars} /> : null}
      {showLifeMap ? (
        <section className={`lifemap ${weatherClass(mode)} ${phase === "ascent" ? "lifemap-entering" : ""} ${replayActive ? "replay-active" : ""}`} data-testid="urai-lifemap-scene" aria-label="URAI Life Map starfield" onWheel={(event) => setZoom((current) => Math.max(0.7, Math.min(1.8, current + (event.deltaY < 0 ? 0.05 : -0.05))))}>
          <div className="map-bg" /><div className="fog-layer" /><div className="particle-layer" /><div className="replay-wash" />
          <div className="map-stars" data-testid="lifemap-starfield" style={{ transform: `scale(${zoom})` }}>{stars.map((s, index) => <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: replayActive ? s.opacity * 0.62 : s.opacity, animationDelay: `${s.delay}s` }} />)}</div>
          <svg className="lines" aria-hidden="true" style={{ transform: `scale(${zoom})` }}>{visibleEdges.map((edge) => { const { from, to } = edgeNodes(edge); if (!from || !to) return null; const active = Boolean(selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId)); return <line key={edge.id} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} className={`${active ? "active-edge" : ""} edge-${edge.edgeType}`} style={{ strokeWidth: Math.max(1, edge.strength * (active ? 8 : 5)) }} />; })}</svg>
          <div className="node-layer" style={{ transform: `scale(${zoom})` }}>{visibleNodes.map((node) => { const replayNode = node as ReplayNode; const selected = selectedNodeId === node.id; const active = activeNodeIds.has(node.id); const size = 26 + node.importanceScore * 0.42; const testId = node.id === "node-07" ? "lifemap-node-pattern-01" : `lifemap-node-${node.id}`; return <button key={node.id} type="button" className={`node ${node.visualState} ${selected ? "selected" : ""} ${active ? "route-active" : ""} ${replayActive && !active ? "dimmed" : ""}`} data-testid={testId} aria-label={`${node.title} ${displayNodeType(node)} star`} aria-pressed={selected} style={{ left: `${node.x}%`, top: `${node.y}%`, width: size, height: size, "--aura": node.auraColor, "--pulse": `${1.6 - node.emotionalIntensity * 0.7}s` } as CSSProperties} onClick={(event) => { event.preventDefault(); event.stopPropagation(); focusNode(replayNode); }} onContextMenu={(event) => { event.preventDefault(); setSelectedNodeId(node.id); startReplay(replayNode); }}><span /><em>{node.glyphType.slice(0, 1).toUpperCase()}</em></button>; })}</div>
          {selectedNode && replayActive ? <div className="node-tether" style={{ left: `${selectedNode.x}%`, top: `${selectedNode.y}%` }} /> : null}
          <div className="chapter-portals">{lifeChapters.map((chapter, index) => <article key={chapter.id} style={{ left: `${14 + index * 18}%`, background: chapter.coverGradient }}><b>{chapter.title}</b><span>{chapter.dominantEmotions.join(" / ")}</span></article>)}</div>
          <aside className="companion"><div className="companion-orb" /><p>Companion</p><span>{selectedNode?.narratorLine ?? "Tap a star when one starts glowing. I will translate the pattern."}</span></aside>
          <aside className="export-panel"><p>EXPORT</p><button type="button">Snapshot</button><button type="button">Memory scroll</button><button type="button">Share card</button></aside>
          {selectedNode && phase === "focus" ? <DetailCard node={selectedNode} onReplay={() => startReplay(selectedNode)} onClose={() => { setSelectedNodeId(null); goto("lifemap", null); }} /> : null}
          {replayActive ? <ReplayOverlay node={phase === "mirror" ? null : selectedNode} mirror={phase === "mirror"} progress={progress} paused={paused} onTogglePause={() => setPaused((value) => !value)} onCollapse={collapseReplay} onUnwind={unwind} /> : null}
          <p className="map-hint">Pinch or wheel to zoom. Tap a star for memory detail. Long press or right-click for replay.</p>
        </section>
      ) : null}
      {phase === "ascent" ? <div className="ascent-cover" data-testid="urai-ascent-cover"><span>ASCENDING INTO LIFEMAP</span></div> : null}
      <CommandRibbon phase={phase} mode={mode} hasNode={Boolean(selectedNode)} replayReady={canReplay(selectedNode)} onMode={(next) => { pushSnapshot(); setMode(next); setSelectedNodeId(null); setProgress(next === "mirror" ? 1 : 0); goto(next === "mirror" ? "mirror" : "lifemap", null); }} onOverview={() => goto("lifemap", null)} onReplay={() => startReplay(selectedNode)} onCollapse={collapseReplay} onUnwind={unwind} onHome={goHome} />
      <style jsx>{`
        .stage{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:#020612;color:white;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:none;--active-aura:#9bdcff}button,select{font:inherit}button:disabled{opacity:.55;cursor:not-allowed}.home,.lifemap,.home-sky,.map-bg,.map-stars,.lines,.fog-layer,.particle-layer,.home-stars,.node-layer{position:absolute;inset:0}.home{z-index:3;transition:opacity 720ms cubic-bezier(.16,1,.3,1),transform 720ms cubic-bezier(.16,1,.3,1),filter 720ms cubic-bezier(.16,1,.3,1)}.home-exiting{opacity:0;transform:translateY(20vh) scale(1.08);filter:blur(20px);pointer-events:none}.home-sky{background:radial-gradient(circle at 50% 28%,rgba(139,203,255,.36),transparent 28%),radial-gradient(circle at 70% 18%,rgba(196,181,253,.18),transparent 20%),linear-gradient(180deg,#050813 0%,#142e4b 52%,#06111f 100%);animation:sky-breathe 8s ease-in-out infinite alternate}.home-stars i,.map-stars i{position:absolute;display:block;border-radius:999px;background:white;box-shadow:0 0 10px rgba(255,255,255,.82),0 0 24px rgba(151,202,255,.32);animation:star-pulse 2.4s ease-in-out infinite alternate}.home-stars i{width:2px;height:2px}.home-hill{position:absolute;left:50%;width:120vw;transform:translateX(-50%);border-radius:50% 50% 0 0;background:rgba(21,48,82,.78)}.hill-a{bottom:34vh;height:24vh;opacity:.42}.hill-b{bottom:20vh;height:23vh;opacity:.62}.hill-c{bottom:-4vh;height:35vh;opacity:.88}.enter-label{position:absolute;left:50%;top:43%;z-index:4;transform:translate(-50%,-160px);border:0;border-radius:999px;padding:8px 14px;background:rgba(7,14,28,.38);color:rgba(235,247,255,.72);cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.16em}.orb{position:absolute;left:50%;top:43%;z-index:5;width:clamp(76px,14vw,150px);height:clamp(76px,14vw,150px);transform:translate(-50%,-50%);border:1px solid rgba(230,248,255,.5);border-radius:999px;cursor:pointer;background:radial-gradient(circle at 34% 24%,#f8fcff 0 14%,#9ddcff 22%,#3175bd 58%,#102d60 100%);box-shadow:0 0 18px rgba(179,226,255,.95),0 0 58px rgba(83,175,255,.54);animation:orb-float 3.8s ease-in-out infinite alternate}.body{position:absolute;left:50%;top:calc(43% + 42px);width:clamp(74px,10vw,112px);height:clamp(116px,18vw,190px);transform:translateX(-50%);border-radius:48% 48% 42% 42%;background:linear-gradient(180deg,rgba(12,32,58,.96),rgba(3,13,26,.92));box-shadow:inset 0 0 30px rgba(140,216,255,.18)}.home-copy{position:absolute;left:50%;bottom:110px;width:min(420px,calc(100vw - 40px));transform:translateX(-50%);margin:0;color:rgba(232,247,255,.72);text-align:center;font-size:14px;line-height:1.5}.lifemap{z-index:1;background:#020612;transition:opacity 720ms cubic-bezier(.16,1,.3,1),transform 720ms cubic-bezier(.16,1,.3,1)}.lifemap-entering{opacity:.72;transform:scale(1.06)}.map-bg{pointer-events:none;background:radial-gradient(circle at 50% 36%,rgba(123,195,255,.34),transparent 30%),radial-gradient(circle at 18% 82%,rgba(244,114,182,.13),transparent 28%),radial-gradient(circle at 82% 78%,rgba(134,239,172,.12),transparent 25%),linear-gradient(180deg,#020612,#0b213a 50%,#03101b)}.fog-layer{pointer-events:none;background:radial-gradient(circle at 30% 70%,rgba(196,181,253,.13),transparent 26%),radial-gradient(circle at 72% 28%,rgba(125,211,252,.12),transparent 24%);filter:blur(8px);animation:fog-drift 14s ease-in-out infinite alternate}.particle-layer{pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.18) 0 1px,transparent 2px);background-size:92px 72px;animation:particle-drift 18s linear infinite}.replay-wash{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--active-aura) 28%,transparent),transparent 40%),radial-gradient(circle at 50% 50%,transparent 0 48%,rgba(0,0,0,.58));transition:opacity 420ms ease}.replay-active .replay-wash{opacity:1}.map-stars{z-index:3;transform-origin:50% 50%;transition:transform 280ms ease}.lines{z-index:4;width:100%;height:100%;pointer-events:none;transform-origin:50% 50%}.lines line{stroke:rgba(210,234,255,.24);stroke-dasharray:5 8;transition:stroke 300ms ease,opacity 300ms ease}.lines .active-edge{stroke:var(--active-aura);filter:drop-shadow(0 0 10px var(--active-aura));stroke-dasharray:8 10;animation:route-flow 1.1s linear infinite}.node-layer{z-index:5;transform-origin:50% 50%}.node{position:absolute;display:grid;place-items:center;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.38);border-radius:999px;background:radial-gradient(circle,#fff 0 14%,var(--aura) 22%,rgba(7,15,28,.2) 60%);box-shadow:0 0 22px var(--aura),0 0 64px color-mix(in srgb,var(--aura) 42%,transparent);cursor:pointer;animation:node-pulse var(--pulse,1.4s) ease-in-out infinite alternate;transition:opacity 240ms ease,transform 240ms ease,filter 240ms ease}.node span{position:absolute;inset:-16px;border-radius:999px;border:1px solid color-mix(in srgb,var(--aura) 30%,transparent);opacity:.5}.node em{position:relative;font-size:11px;font-style:normal;font-weight:900;color:rgba(4,10,20,.75)}.node.selected{transform:translate(-50%,-50%) scale(1.18);z-index:9;filter:saturate(1.4) brightness(1.18)}.node.selected span{inset:-24px;border-color:var(--aura);animation:ring-scan 1.8s ease-in-out infinite}.node.route-active{filter:brightness(1.2) saturate(1.25)}.node.dimmed{opacity:.28;filter:grayscale(.55)}.node-tether{position:absolute;z-index:6;width:2px;height:35vh;transform:translate(-50%,-4px) rotate(73deg);transform-origin:top;background:linear-gradient(var(--active-aura),rgba(255,255,255,.05),transparent);filter:drop-shadow(0 0 12px var(--active-aura));pointer-events:none;animation:tether 1.4s ease-in-out infinite alternate}.chapter-portals{position:absolute;left:0;right:0;bottom:88px;z-index:6;pointer-events:none}.chapter-portals article{position:absolute;bottom:0;width:160px;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:10px;background:rgba(8,17,33,.5);box-shadow:0 18px 45px rgba(0,0,0,.28);opacity:.55}.chapter-portals b,.chapter-portals span{display:block}.chapter-portals b{font-size:12px}.chapter-portals span{font-size:10px;color:rgba(236,248,255,.7)}.companion,.export-panel{position:absolute;z-index:20;border:1px solid rgba(214,238,255,.15);border-radius:22px;background:rgba(5,12,24,.58);backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.28)}.companion{left:24px;top:24px;width:min(260px,calc(100vw - 48px));padding:14px}.companion-orb{width:34px;height:34px;border-radius:999px;background:radial-gradient(circle,#fff,#9bdcff 45%,transparent 72%);box-shadow:0 0 28px #9bdcff}.companion p,.export-panel p,.detail-card p,.replay-card p{margin:0 0 8px;color:rgba(212,233,255,.67);font-size:11px;font-weight:900;letter-spacing:.17em}.companion span{display:block;color:rgba(232,247,255,.78);font-size:13px;line-height:1.45}.export-panel{right:24px;top:24px;display:grid;gap:8px;padding:12px}.export-panel button,.card-actions button,.replay-actions button,.command-ribbon button,.command-ribbon select{border:1px solid rgba(214,238,255,.24);border-radius:999px;background:rgba(255,255,255,.1);color:white;cursor:pointer;font-weight:800;padding:9px 12px;font-size:12px}.detail-card{position:absolute;left:50%;top:50%;z-index:40;width:min(480px,calc(100vw - 32px));transform:translate(-50%,-50%);border:1px solid rgba(214,238,255,.2);border-radius:26px;padding:24px;background:linear-gradient(180deg,rgba(10,23,43,.86),rgba(5,12,24,.76));backdrop-filter:blur(22px);box-shadow:0 28px 90px rgba(0,0,0,.42)}.detail-card .close{position:absolute;right:14px;top:14px;width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:white}.detail-card h1,.replay-card h1{margin:0 0 8px;font-size:clamp(30px,5vw,46px);line-height:1}.detail-card strong,.replay-card strong{display:block;color:rgba(234,246,255,.8);font-size:14px;margin-bottom:14px}.detail-card > span{color:rgba(214,238,255,.6);font-size:12px}.aura-row{display:flex;align-items:center;gap:10px;margin:16px 0}.aura-row i{width:13px;height:13px;border-radius:999px}.aura-row b{text-transform:capitalize}.aura-row em{margin-left:auto;color:rgba(236,248,255,.65);font-style:normal}.detail-card article{color:rgba(236,248,255,.82);line-height:1.55}.detail-card blockquote,.replay-card blockquote{margin:16px 0 0;padding-left:14px;border-left:2px solid var(--active-aura);color:rgba(232,247,255,.76)}.detail-card dl,.replay-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.detail-card dt,.replay-card dt{font-size:10px;color:rgba(212,233,255,.48);text-transform:uppercase;letter-spacing:.15em}.detail-card dd,.replay-card dd{margin:3px 0 0;color:rgba(245,250,255,.82);font-size:12px}.card-actions,.replay-actions{display:flex;gap:8px;flex-wrap:wrap}.replay-overlay{position:absolute;inset:0;z-index:50;display:grid;place-items:center;padding:24px;--aura:#dbeafe;--progress:0%;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--aura) 18%,transparent),transparent 32%),radial-gradient(circle at 50% 50%,transparent,rgba(0,0,0,.58));backdrop-filter:blur(2px)}.replay-chamber{position:absolute;inset:8%;border-radius:999px;background:radial-gradient(circle,color-mix(in srgb,var(--aura) 18%,transparent),transparent 55%);filter:blur(18px);animation:chamber 3s ease-in-out infinite alternate}.memory-shimmer{position:absolute;inset:0;background-image:radial-gradient(circle,color-mix(in srgb,var(--aura) 44%,transparent) 0 1px,transparent 2px);background-size:56px 42px;opacity:.3;animation:particle-drift 9s linear infinite}.replay-camera{position:absolute;width:min(70vw,720px);height:min(70vw,720px);border-radius:999px;border:1px solid color-mix(in srgb,var(--aura) 35%,transparent);box-shadow:inset 0 0 90px color-mix(in srgb,var(--aura) 20%,transparent),0 0 140px color-mix(in srgb,var(--aura) 20%,transparent);animation:camera-push 2.8s ease-in-out infinite alternate}.replay-card{position:relative;z-index:2;width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 120px);overflow:auto;border:1px solid rgba(224,244,255,.22);border-radius:28px;padding:24px;background:linear-gradient(180deg,rgba(10,23,43,.88),rgba(4,10,20,.78));box-shadow:0 36px 120px rgba(0,0,0,.48);backdrop-filter:blur(24px)}.phase-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:18px 0}.phase-row span{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:7px 6px;text-align:center;color:rgba(232,247,255,.48);font-size:10px;font-weight:900;letter-spacing:.08em}.phase-row span[data-active="true"]{border-color:var(--aura);color:white;background:color-mix(in srgb,var(--aura) 16%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--aura) 28%,transparent)}.progress-shell{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.progress-shell i{display:block;width:var(--progress);height:100%;border-radius:999px;background:linear-gradient(90deg,#fff,var(--aura));box-shadow:0 0 18px var(--aura);transition:width 120ms linear}.waveform{display:flex;align-items:center;height:46px;gap:4px;margin:14px 0}.waveform i{width:5px;border-radius:999px;background:linear-gradient(180deg,#fff,var(--aura));animation:wave 720ms ease-in-out infinite alternate}.replay-card article{border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:14px;background:rgba(255,255,255,.06)}.replay-card article b,.replay-card article span{display:block}.replay-card article b{font-size:12px;color:var(--aura);letter-spacing:.14em}.replay-card article span{margin-top:7px;line-height:1.5;color:rgba(240,248,255,.86)}.replay-card ol{margin:14px 0 0;padding-left:18px;color:rgba(236,248,255,.75)}.replay-card li{margin:6px 0}.replay-card li span{display:block;font-size:12px}.map-hint{position:absolute;left:50%;bottom:24px;z-index:12;transform:translateX(-50%);margin:0;color:rgba(232,247,255,.54);font-size:12px;text-align:center}.ascent-cover{position:absolute;inset:0;z-index:90;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle,rgba(157,220,255,.18),transparent 38%)}.ascent-cover span{font-size:11px;font-weight:900;letter-spacing:.22em;color:rgba(234,246,255,.78)}.command-ribbon{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));z-index:100;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);overflow-x:auto;transform:translateX(-50%);border:1px solid rgba(210,235,255,.18);border-radius:999px;padding:7px;background:rgba(0,0,0,.44);backdrop-filter:blur(18px);box-shadow:0 18px 60px rgba(0,0,0,.3)}.command-ribbon .active{background:rgba(255,255,255,.18);box-shadow:0 0 20px rgba(157,220,255,.16)}@keyframes sky-breathe{from{filter:brightness(.92)}to{filter:brightness(1.12)}}@keyframes star-pulse{from{transform:scale(.75)}to{transform:scale(1.35)}}@keyframes orb-float{from{transform:translate(-50%,-54%) scale(.98)}to{transform:translate(-50%,-46%) scale(1.025)}}@keyframes fog-drift{from{transform:translateX(-2%)}to{transform:translateX(2%)}}@keyframes particle-drift{from{background-position:0 0}to{background-position:120px 84px}}@keyframes node-pulse{from{filter:brightness(.9)}to{filter:brightness(1.22)}}@keyframes ring-scan{from{transform:scale(.9);opacity:.38}to{transform:scale(1.24);opacity:.05}}@keyframes route-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-36}}@keyframes tether{from{opacity:.35;filter:blur(1px) drop-shadow(0 0 8px var(--active-aura))}to{opacity:.8;filter:blur(0) drop-shadow(0 0 20px var(--active-aura))}}@keyframes chamber{from{transform:scale(.96);opacity:.58}to{transform:scale(1.06);opacity:.9}}@keyframes camera-push{from{transform:scale(.96)}to{transform:scale(1.04)}}@keyframes wave{from{transform:scaleY(.48);opacity:.55}to{transform:scaleY(1);opacity:1}}@media(max-width:760px){.companion,.export-panel,.chapter-portals{display:none}.detail-card,.replay-card{padding:18px}.replay-card{max-height:calc(100dvh - 110px)}.detail-card dl,.replay-card dl{grid-template-columns:1fr}.phase-row{grid-template-columns:repeat(2,1fr)}.map-hint{display:none}.command-ribbon{bottom:8px}.command-ribbon button,.command-ribbon select{min-width:max-content}.home-copy{bottom:92px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.replay-active .replay-wash{opacity:.8}}
      `}</style>
    </main>
  );
}
