"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTransitionChoreographer, type TransitionPhase } from "@/spatial/transitions/choreography";

type NodeType = "signal" | "threshold" | "recovery" | "pattern" | "memory" | "council" | "return";
type Mode = "home" | "lifemap" | "focus" | "replay" | "mirror" | "rewind";
type LifeNode = { id: string; type: NodeType; title: string; subtitle: string; description: string; timestamp: string; emotion: string; intensity: number; auraColor: string; x: number; y: number; z: number; constellationGroupId: string; replayAvailable: boolean; replayId?: string; narratorLine: string; replayScript: string[]; visited: boolean; locked: boolean; };

function bgStar(i: number) { return { x: (i * 37 + 13) % 100, y: (i * 61 + 7) % 100, size: 1 + ((i * 11) % 4), opacity: 0.2 }; }
function routeForMode(mode: Mode, node?: string | null) { const q = node ? `?node=${node}` : ""; switch (mode) { case "lifemap": return "/life-map"; case "focus": return `/focus${q}`; case "replay": return `/replay${q}`; case "mirror": return `/mirror${q}`; case "rewind": return `/rewind${q}`; default: return "/home"; } }

const lifeNodes: LifeNode[] = [{ id: "pattern-01", type: "pattern", title: "Pattern Recognition", subtitle: "Loop became visible", description: "Signals resolved into pattern", timestamp: "2026-01-08", emotion: "clarity", intensity: 0.9, auraColor: "#7dd3fc", x: 50, y: 40, z: 2, constellationGroupId: "core", replayAvailable: true, narratorLine: "This belongs to a larger pattern.", replayScript: ["Pattern emerges", "Insight forms"], visited: true, locked: false }];

export default function LifeMapCanonicalSurface() {
  const router = useRouter();
  const search = useSearchParams();
  const routeNode = search.get("node");

  const [mode, setMode] = useState<Mode>("lifemap");
  const [selectedId, setSelectedId] = useState<string | null>(routeNode);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<TransitionPhase>("lifemap");
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const selected = lifeNodes.find((n) => n.id === selectedId) || null;
  const stars = useMemo(() => Array.from({ length: 150 }, (_, i) => bgStar(i)), []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mode !== "replay" || paused) return;
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 2)), 80);
    return () => clearInterval(id);
  }, [mode, paused]);

  function runChoreo(nextPhase: TransitionPhase, complete: () => void) {
    return createTransitionChoreographer({
      from: transitionProgress,
      to: nextPhase === "home" ? 0 : 1,
      reducedMotion,
      onUpdate: (value) => {
        setTransitionProgress(value);
        setPhase(nextPhase);
      },
      onComplete: complete,
    });
  }

  function navigate(next: Mode, node?: string | null) {
    if (next === "home") {
      runChoreo("returning-home", () => {
        setMode("home");
        setSelectedId(null);
        setPhase("home");
        router.push("/home", { scroll: false });
      });
      return;
    }
    runChoreo("lifemap", () => {
      setMode(next);
      setSelectedId(node ?? null);
      setPhase("lifemap");
      router.push(routeForMode(next, node), { scroll: false });
    });
  }

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      navigate("home");
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  });

  if (mode === "home") return null;

  const orbIntensity = 0.35 + transitionProgress * 0.65;
  const haloRadius = 40 + transitionProgress * 120;
  const skyHaze = 0.15 + transitionProgress * 0.55;
  const starReveal = transitionProgress;

  return <div className="lm-root" style={{ ["--orb-intensity" as string]: String(orbIntensity), ["--halo-radius" as string]: `${haloRadius}px`, ["--sky-haze" as string]: String(skyHaze), ["--star-reveal" as string]: String(starReveal) }} data-phase={phase}>
      <div className="sky" />
      <div className="orb" />
      <div className="stars">{stars.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }} />)}</div>
      <div className="nodes">{lifeNodes.map((n) => <button key={n.id} className={`node ${selectedId === n.id ? "active" : ""}`} style={{ left: `${n.x}%`, top: `${n.y}%`, "--aura": n.auraColor } as CSSProperties} onClick={() => navigate("focus", n.id)}><span /></button>)}</div>
      {selected && mode === "focus" && <div className="panel"><h1>{selected.title}</h1><p>{selected.description}</p><button onClick={() => navigate("replay", selected.id)}>Replay</button><button onClick={() => navigate("lifemap")}>Back</button></div>}
      {selected && mode === "replay" && <div className="panel"><h1>{selected.title}</h1><div className="bar"><i style={{ width: `${progress}%` }} /></div><p>{selected.replayScript[0]}</p><button onClick={() => setPaused((v) => !v)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => navigate("focus", selected.id)}>Exit</button></div>}
      <div className="nav"><button onClick={() => navigate("lifemap")}>Map</button><button onClick={() => navigate("home")}>Home</button></div>
      <style jsx>{`.lm-root{position:fixed;inset:0;background:#020617;color:white;overflow:hidden}.sky{position:absolute;inset:0;opacity:var(--sky-haze);background:radial-gradient(circle at 50% 36%,rgba(125,211,252,.32),transparent 45%)}.orb{position:absolute;left:50%;top:40%;width:var(--halo-radius);height:var(--halo-radius);transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(125,211,252,calc(var(--orb-intensity))) 0%,rgba(125,211,252,.06) 64%,transparent 75%)}.stars i{position:absolute;background:white;border-radius:50%;opacity:calc(var(--star-reveal) * 1)}.nodes{position:absolute;inset:0}.node{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;border:none;cursor:pointer}.node span{position:absolute;inset:0;background:var(--aura);border-radius:50%;box-shadow:0 0 20px var(--aura)}.node.active{transform:translate(-50%,-50%) scale(1.3)}.panel{position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.6);padding:20px;border-radius:20px}.bar{height:6px;background:rgba(255,255,255,.1);margin:10px 0}.bar i{display:block;height:100%;background:#7dd3fc}.nav{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px}button{background:rgba(255,255,255,.1);border:none;padding:8px 12px;border-radius:999px;color:white;cursor:pointer}`}</style>
    </div>;
}
