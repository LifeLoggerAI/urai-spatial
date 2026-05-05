"use client";

import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTransitionChoreographer, type TransitionPhase } from "@/spatial/transitions/choreography";

type NodeType = "signal" | "threshold" | "recovery" | "pattern" | "memory" | "council" | "return" | "dream" | "relationship" | "mirror";
type Mode = "home" | "lifemap" | "focus" | "replay" | "mirror" | "rewind";
type LifeNode = { id: string; type: NodeType; title: string; subtitle: string; description: string; timestamp: string; emotion: string; intensity: number; auraColor: string; x: number; y: number; z: number; constellationGroupId: string; replayAvailable: boolean; replayId?: string; narratorLine: string; replayScript: string[]; visited: boolean; locked: boolean; };
type LifeEdge = { id: string; sourceId: string; targetId: string; type: "timeline" | "recovery" | "shadow" | "dream" | "mirror"; strength: number };
type FlightState = { x: number; y: number; scale: number; vx: number; vy: number; targetScale: number; dragging: boolean; lastX: number; lastY: number };

function bgStar(i: number) { return { x: (i * 37 + 13) % 100, y: (i * 61 + 7) % 100, size: 1 + ((i * 11) % 4), opacity: 0.18 + (((i * 17) % 7) / 20), depth: 0.25 + (((i * 19) % 9) / 10) }; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function routeForMode(mode: Mode, node?: string | null) { const q = node ? `?node=${node}` : ""; switch (mode) { case "lifemap": return "/life-map"; case "focus": return `/life-map${q}`; case "replay": return `/replay${q}`; case "mirror": return `/mirror${q}`; case "rewind": return `/rewind${q}`; default: return "/home"; } }

const lifeNodes: LifeNode[] = [
  { id: "season-becoming", type: "memory", title: "The Season of Becoming", subtitle: "memory / calm / clarity", description: "A calm life phase becomes visible as a constellation rather than a single event.", timestamp: "2025-12-18", emotion: "clarity", intensity: 0.72, auraColor: "#7dd3fc", x: 16, y: 46, z: 2, constellationGroupId: "timeline", replayAvailable: true, narratorLine: "This is where the arc starts to glow.", replayScript: ["Clouds open above the home world.", "The first star brightens into memory."], visited: true, locked: false },
  { id: "threshold", type: "threshold", title: "The Threshold", subtitle: "conflict / shadow / pain", description: "A heavier chapter is held in the map without swallowing the rest of the story.", timestamp: "2026-01-05", emotion: "shadow", intensity: 0.84, auraColor: "#fb7185", x: 44, y: 34, z: 4, constellationGroupId: "shadow", replayAvailable: true, narratorLine: "This was not the end. It was a crossing.", replayScript: ["The sky contracts.", "A red thread marks the threshold."], visited: true, locked: false },
  { id: "recovery-arc", type: "recovery", title: "The Recovery Arc", subtitle: "recovery / growth / purpose", description: "Recovery signals connect into a green path forward instead of isolated rebounds.", timestamp: "2026-02-14", emotion: "healing", intensity: 0.88, auraColor: "#34d399", x: 66, y: 52, z: 5, constellationGroupId: "recovery", replayAvailable: true, narratorLine: "Growth returned through repetition.", replayScript: ["A green path forms between stars.", "The camera drifts from pain into growth."], visited: true, locked: false },
  { id: "purple-dream", type: "dream", title: "The Purple Dream Field", subtitle: "dream / mystery / milestone", description: "Dream, mystery, and memory overlap into a soft violet field.", timestamp: "2026-03-01", emotion: "dream", intensity: 0.7, auraColor: "#a78bfa", x: 78, y: 38, z: 3, constellationGroupId: "dream", replayAvailable: true, narratorLine: "The unconscious started leaving breadcrumbs.", replayScript: ["Violet fog enters the map.", "Dream stars pulse behind the timeline."], visited: false, locked: false },
  { id: "mirror-becoming", type: "mirror", title: "Mirror of Becoming", subtitle: "rebirth / clarity / purpose", description: "Life phases, repeated patterns, recovery cycles, relationship lessons, and purpose threads connect in one zoom-out.", timestamp: "2026-04-18", emotion: "purpose", intensity: 0.95, auraColor: "#fde047", x: 90, y: 55, z: 6, constellationGroupId: "mirror", replayAvailable: true, narratorLine: "The full arc is visible now.", replayScript: ["All threads brighten at once.", "The map breathes as one living system."], visited: true, locked: false },
];

const lifeEdges: LifeEdge[] = [
  { id: "e1", sourceId: "season-becoming", targetId: "threshold", type: "shadow", strength: 0.72 },
  { id: "e2", sourceId: "threshold", targetId: "recovery-arc", type: "recovery", strength: 0.88 },
  { id: "e3", sourceId: "recovery-arc", targetId: "purple-dream", type: "dream", strength: 0.54 },
  { id: "e4", sourceId: "purple-dream", targetId: "mirror-becoming", type: "mirror", strength: 0.82 },
  { id: "e5", sourceId: "season-becoming", targetId: "mirror-becoming", type: "timeline", strength: 0.42 },
];

function edgeColor(type: LifeEdge["type"]) { if (type === "recovery") return "rgba(52,211,153,.62)"; if (type === "shadow") return "rgba(251,113,133,.5)"; if (type === "dream") return "rgba(167,139,250,.55)"; if (type === "mirror") return "rgba(253,224,71,.58)"; return "rgba(180,200,255,.34)"; }

export default function LifeMapCanonicalSurface() {
  const router = useRouter();
  const search = useSearchParams();
  const routeNode = search.get("node");
  const flightRef = useRef<FlightState>({ x: 0, y: 0, scale: 1, vx: 0, vy: 0, targetScale: 1, dragging: false, lastX: 0, lastY: 0 });
  const rafRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>(routeNode ? "focus" : "lifemap");
  const [selectedId, setSelectedId] = useState<string | null>(routeNode);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<TransitionPhase>("lifemap");
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [flight, setFlight] = useState({ x: 0, y: 0, scale: 1, speed: 0 });

  const selected = lifeNodes.find((n) => n.id === selectedId) || null;
  const stars = useMemo(() => Array.from({ length: 260 }, (_, i) => bgStar(i)), []);
  const nodeMap = useMemo(() => Object.fromEntries(lifeNodes.map((n) => [n.id, n])), []);

  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const sync = () => setReducedMotion(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  useEffect(() => { if (mode !== "replay" || paused) return; const id = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 1.5)), 80); return () => clearInterval(id); }, [mode, paused]);
  useEffect(() => { if (routeNode) { setSelectedId(routeNode); setMode("focus"); } }, [routeNode]);

  useEffect(() => {
    const tick = () => {
      const f = flightRef.current;
      if (!f.dragging) { f.x += f.vx; f.y += f.vy; f.vx *= 0.91; f.vy *= 0.91; }
      f.scale += (f.targetScale - f.scale) * 0.14;
      f.x = clamp(f.x, -52, 52); f.y = clamp(f.y, -42, 42);
      const speed = Math.min(1, Math.hypot(f.vx, f.vy) / 2.2);
      setFlight({ x: f.x, y: f.y, scale: f.scale, speed });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  function runChoreo(nextPhase: TransitionPhase, complete: () => void) { return createTransitionChoreographer({ from: transitionProgress, to: nextPhase === "home" ? 0 : 1, reducedMotion, onUpdate: (value) => { setTransitionProgress(value); setPhase(nextPhase); }, onComplete: complete }); }
  function navigate(next: Mode, node?: string | null) { if (next === "home") { runChoreo("returning-home", () => { setMode("home"); setSelectedId(null); setPhase("home"); router.push("/home", { scroll: false }); }); return; } runChoreo("lifemap", () => { setMode(next); setSelectedId(node ?? null); setPhase("lifemap"); if (next === "replay") setProgress(0); router.push(routeForMode(next, node), { scroll: false }); }); }
  function focusNode(node: LifeNode) { setSelectedId(node.id); setMode("focus"); const f = flightRef.current; f.x = 50 - node.x; f.y = 48 - node.y; f.targetScale = 1.72; f.vx = 0; f.vy = 0; router.replace(routeForMode("focus", node.id), { scroll: false }); }
  function resetFlight() { const f = flightRef.current; f.x = 0; f.y = 0; f.vx = 0; f.vy = 0; f.targetScale = 1; setSelectedId(null); setMode("lifemap"); router.replace("/life-map", { scroll: false }); }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) { if (event.button !== 0) return; const f = flightRef.current; f.dragging = true; f.lastX = event.clientX; f.lastY = event.clientY; (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId); }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) { const f = flightRef.current; if (!f.dragging) return; const dx = event.clientX - f.lastX; const dy = event.clientY - f.lastY; f.lastX = event.clientX; f.lastY = event.clientY; f.x += dx / 16; f.y += dy / 16; f.vx = dx / 22; f.vy = dy / 22; }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) { const f = flightRef.current; f.dragging = false; (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId); }
  function onWheel(event: WheelEvent<HTMLDivElement>) { event.preventDefault(); const f = flightRef.current; f.targetScale = clamp(f.targetScale - event.deltaY * 0.0014, 0.72, 2.55); }

  useEffect(() => { const onEsc = (event: KeyboardEvent) => { if (event.key !== "Escape") return; event.preventDefault(); if (mode === "focus" || mode === "replay") resetFlight(); else navigate("home"); }; window.addEventListener("keydown", onEsc); return () => window.removeEventListener("keydown", onEsc); });

  if (mode === "home") return null;

  const orbIntensity = 0.35 + transitionProgress * 0.65;
  const haloRadius = mode === "focus" && selected ? 240 : 150;
  const skyHaze = 0.2 + transitionProgress * 0.58;
  const starReveal = transitionProgress;
  const finalX = selected && mode !== "lifemap" ? 50 - selected.x : flight.x;
  const finalY = selected && mode !== "lifemap" ? 48 - selected.y : flight.y;
  const finalScale = selected && mode !== "lifemap" ? Math.max(1.72, flight.scale) : flight.scale;
  const cameraStyle = { transform: `translate(${finalX}%, ${finalY}%) scale(${finalScale})` };

  return <div className="lm-root" style={{ ["--orb-intensity" as string]: String(orbIntensity), ["--halo-radius" as string]: `${haloRadius}px`, ["--sky-haze" as string]: String(skyHaze), ["--star-reveal" as string]: String(starReveal), ["--focus-aura" as string]: selected?.auraColor ?? "#7dd3fc", ["--flight-x" as string]: `${flight.x}px`, ["--flight-y" as string]: `${flight.y}px`, ["--flight-speed" as string]: String(flight.speed) }} data-phase={phase} data-mode={mode}>
    <div className="sky" />
    <div className="warp" />
    <div className="nebula nebula-a" /><div className="nebula nebula-b" /><div className="nebula nebula-c" />
    <div className="stars stars-far">{stars.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity, transform: `translate(${flight.x * s.depth * .18}px, ${flight.y * s.depth * .18}px)` }} />)}</div>
    <div className="flight-layer" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      <div className="camera" style={cameraStyle}>
        <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{lifeEdges.map((e) => { const a = nodeMap[e.sourceId]; const b = nodeMap[e.targetId]; if (!a || !b) return null; return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edgeColor(e.type)} strokeWidth={0.12 + e.strength * 0.16} strokeDasharray={e.type === "shadow" ? "1.2 1" : e.type === "dream" ? "0.5 0.8" : undefined} />; })}</svg>
        <div className="nodes">{lifeNodes.map((n) => { const active = selectedId === n.id; const dim = selectedId && !active && mode !== "lifemap"; return <button key={n.id} className={`node ${active ? "active" : ""} ${dim ? "dim" : ""}`} style={{ left: `${n.x}%`, top: `${n.y}%`, "--aura": n.auraColor, "--size": `${18 + n.intensity * 30}px` } as CSSProperties} onClick={(e) => { e.stopPropagation(); focusNode(n); }} aria-label={`Focus ${n.title}`}><span className="pulse" /><span className="core" /><strong>{n.title.split(" ").map((w) => w[0]).join("").slice(0, 3)}</strong></button>; })}</div>
      </div>
    </div>
    <section className="hero-card"><p>MIRROR OF BECOMING</p><h1>{selected && mode !== "lifemap" ? selected.title : "The full arc is visible now."}</h1><span>{selected && mode !== "lifemap" ? selected.narratorLine : "Drag to fly. Wheel or pinch to drift deeper. Life phases, repeated patterns, recovery cycles, relationship lessons, and purpose threads are connected in one zoom-out."}</span></section>
    {selected && mode === "focus" && <aside className="panel focus-panel"><p className="eyebrow">FOCUS STAR</p><h2>{selected.title}</h2><small>{selected.subtitle} · {new Date(selected.timestamp).toDateString()}</small><p>{selected.description}</p><blockquote>{selected.narratorLine}</blockquote><div className="actions"><button onClick={() => navigate("replay", selected.id)}>Replay memory</button><button onClick={() => navigate("mirror", selected.id)}>Mirror</button><button onClick={resetFlight}>Back to map</button></div></aside>}
    {selected && mode === "replay" && <aside className="panel replay-panel"><p className="eyebrow">CINEMATIC REPLAY</p><h2>{selected.title}</h2><div className="bar"><i style={{ width: `${progress}%` }} /></div><p>{selected.replayScript[Math.min(selected.replayScript.length - 1, Math.floor(progress / 50))]}</p><div className="actions"><button onClick={() => setPaused((v) => !v)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => navigate("focus", selected.id)}>Exit replay</button></div></aside>}
    <div className="flight-hud"><span>FLIGHT MODE</span><b>{Math.round(flight.scale * 100)}%</b><small>drag · wheel · star focus</small></div>
    <div className="companion"><b>Companion</b><span>{selected ? selected.narratorLine : flight.speed > .15 ? "You are flying through the life field." : "A pattern is lighting up."}</span></div>
    <nav className="nav"><button onClick={resetFlight}>Life Map</button><button onClick={() => navigate("mirror", selectedId)}>Mirror</button><button onClick={() => navigate("home")}>Home</button></nav>
    <style jsx>{`.lm-root{position:fixed;inset:0;background:#020617;color:white;overflow:hidden;font-family:Inter,system-ui,sans-serif;touch-action:none}.sky{position:absolute;inset:0;opacity:var(--sky-haze);background:radial-gradient(circle at 50% 40%,rgba(125,211,252,.32),transparent 28%),radial-gradient(circle at 12% 78%,rgba(167,139,250,.22),transparent 32%),linear-gradient(180deg,#020617,#071a38 55%,#020617)}.warp{position:absolute;inset:-10%;opacity:calc(var(--flight-speed) * .45);background:repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,.22) 0 1px,transparent 1px 22px);filter:blur(1px);transform:scale(1.25);animation:warp 1.2s linear infinite}.nebula{position:absolute;border-radius:999px;filter:blur(38px);opacity:.42;transform:translate(calc(var(--flight-x) * .12),calc(var(--flight-y) * .12))}.nebula-a{left:8%;top:35%;width:34vw;height:34vw;background:rgba(56,189,248,.28)}.nebula-b{right:8%;top:28%;width:30vw;height:30vw;background:rgba(251,191,36,.22)}.nebula-c{left:42%;bottom:2%;width:34vw;height:28vw;background:rgba(52,211,153,.2)}.stars i{position:absolute;background:white;border-radius:50%;opacity:calc(var(--star-reveal) * 1);box-shadow:0 0 8px white;will-change:transform}.flight-layer{position:absolute;inset:0;cursor:grab}.flight-layer:active{cursor:grabbing}.camera{position:absolute;inset:0;transform-origin:center;transition:transform 120ms linear;will-change:transform}.edges{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(147,197,253,.35))}.nodes{position:absolute;inset:0}.node{position:absolute;transform:translate(-50%,-50%);width:var(--size);height:var(--size);border-radius:999px;border:1px solid rgba(255,255,255,.34);background:transparent;color:white;cursor:pointer;transition:transform 480ms ease,opacity 480ms ease,filter 480ms ease}.node .core{position:absolute;inset:28%;border-radius:999px;background:var(--aura);box-shadow:0 0 28px var(--aura),0 0 64px var(--aura)}.node .pulse{position:absolute;inset:-45%;border-radius:999px;background:radial-gradient(circle,var(--aura),transparent 58%);opacity:.28;animation:pulse 3.8s infinite}.node strong{position:absolute;left:50%;top:105%;transform:translateX(-50%);font-size:10px;letter-spacing:.18em;color:rgba(255,255,255,.75)}.node.active{transform:translate(-50%,-50%) scale(1.35);z-index:5;filter:saturate(1.4)}.node.dim{opacity:.25}.hero-card{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:min(560px,calc(100% - 32px));padding:20px 24px;border:1px solid rgba(148,163,184,.28);border-radius:24px;background:rgba(2,6,23,.58);backdrop-filter:blur(18px);box-shadow:0 24px 80px rgba(0,0,0,.28);pointer-events:none}.hero-card p,.eyebrow{margin:0 0 8px;font-size:11px;letter-spacing:.24em;color:#94a3b8;font-weight:800}.hero-card h1{margin:0;font-size:26px}.hero-card span{display:block;margin-top:8px;color:rgba(226,232,240,.86);line-height:1.45}.panel{position:absolute;right:22px;top:50%;transform:translateY(-50%);width:min(380px,calc(100% - 44px));padding:20px;border-radius:24px;border:1px solid color-mix(in srgb,var(--focus-aura),white 30%);background:rgba(2,6,23,.74);backdrop-filter:blur(20px);box-shadow:0 0 80px color-mix(in srgb,var(--focus-aura),transparent 68%)}.panel h2{margin:0 0 8px;font-size:26px}.panel small{color:#cbd5e1}.panel p{color:#e2e8f0;line-height:1.55}.panel blockquote{margin:14px 0;padding-left:14px;border-left:2px solid var(--focus-aura);color:#dbeafe}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.bar{height:8px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.bar i{display:block;height:100%;background:var(--focus-aura);box-shadow:0 0 18px var(--focus-aura)}.flight-hud{position:absolute;right:22px;bottom:86px;display:grid;gap:2px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(2,6,23,.48);padding:10px 12px;backdrop-filter:blur(12px)}.flight-hud span{font-size:10px;letter-spacing:.2em;color:#93c5fd}.flight-hud b{font-size:18px}.flight-hud small{color:#cbd5e1}.companion{position:absolute;left:22px;bottom:86px;max-width:320px;border:1px solid rgba(255,255,255,.15);border-radius:18px;background:rgba(15,23,42,.55);padding:12px 14px;backdrop-filter:blur(14px)}.companion b{display:block;font-size:12px;color:#bfdbfe}.companion span{display:block;margin-top:4px;font-size:13px;color:#e2e8f0}.nav{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(2,6,23,.58);backdrop-filter:blur(14px)}button{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);padding:8px 12px;border-radius:999px;color:white;cursor:pointer}button:hover{background:rgba(255,255,255,.18)}@keyframes pulse{0%,100%{transform:scale(.92);opacity:.18}50%{transform:scale(1.2);opacity:.4}}@keyframes warp{from{transform:scale(1.15) rotate(0deg)}to{transform:scale(1.28) rotate(12deg)}}@media(max-width:720px){.panel{left:14px;right:14px;bottom:82px;top:auto;transform:none;width:auto}.hero-card{top:14px}.companion,.flight-hud{display:none}}`}</style>
  </div>;
}
