"use client";

import { useCallback, useEffect, useMemo, useState, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { LifeMapHud, type LifeMapMode } from "./LifeMapHud";
import { LifeMapMirrorPanel } from "./LifeMapMirrorPanel";
import { LifeMapNodeCard } from "./LifeMapNodeCard";
import { LifeMapReplayOverlay } from "./LifeMapReplayOverlay";
import { useLifeMapEvents } from "./useLifeMapEvents";
import { buildLifeMapReplaySequence, generateMirrorOfBecoming, replayCameraTarget, type LifeMapReplaySequence } from "./lifeMapReplay";
import {
  lifeMapFilters,
  lifeMapTimeScopeLabels,
  lifeMapTypeLabels,
  narrationForNode,
  type LifeMapEra,
  type LifeMapNode,
  type LifeMapNodeType,
  type LifeMapTimeScope,
} from "./lifeMapData";

function isNodeInTimeScope(node: LifeMapNode, timeScope: LifeMapTimeScope, selectedEra: LifeMapEra | null) {
  if (timeScope === "all") return true;
  if (timeScope === "era") return selectedEra ? selectedEra.nodeIds.includes(node.id) || node.eraId === selectedEra.id : true;
  if (!node.occurredAt) return true;

  const occurredAt = new Date(node.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return true;

  const ageMs = Date.now() - occurredAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (timeScope === "week") return ageMs <= 7 * dayMs;
  if (timeScope === "month") return ageMs <= 31 * dayMs;
  if (timeScope === "season") return ageMs <= 120 * dayMs;
  if (timeScope === "year") return ageMs <= 366 * dayMs;
  return true;
}

function LifeMapStaticGalaxy({
  nodes,
  selectedNode,
  replaySequence,
  mode,
  onSelectNode,
}: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  replaySequence: LifeMapReplaySequence | null;
  mode: LifeMapMode;
  onSelectNode: (node: LifeMapNode) => void;
}) {
  const selectedLinks = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const linked = new Set<string>([selectedNode.id, ...selectedNode.connectedTo]);
    nodes.forEach((node) => {
      if (node.connectedTo.includes(selectedNode.id)) linked.add(node.id);
    });
    return linked;
  }, [nodes, selectedNode]);

  const replayTarget = useMemo(() => (replaySequence ? replayCameraTarget(replaySequence, nodes) : null), [nodes, replaySequence]);

  return (
    <section className="absolute inset-0 flex items-center justify-center px-6" aria-label="Life Map galaxy preview">
      <div className={`relative h-[min(72vw,620px)] w-[min(72vw,620px)] rounded-full border border-cyan-100/10 bg-cyan-100/[0.02] shadow-[0_0_120px_rgba(34,211,238,0.12)] transition ${mode === "mirror" ? "scale-90 border-fuchsia-100/20 shadow-[0_0_160px_rgba(217,70,239,0.18)]" : ""}`}>
        <div className="absolute inset-[18%] rounded-full border border-fuchsia-200/10" />
        <div className="absolute inset-[30%] rounded-full border border-cyan-200/10" />
        {mode === "mirror" ? <div className="absolute inset-[38%] rounded-full border border-fuchsia-100/25 bg-fuchsia-100/10 blur-[1px]" /> : null}
        {nodes.map((node) => {
          const [x, y] = node.position;
          const selected = selectedNode?.id === node.id;
          const dimmed = mode !== "lifemap" && mode !== "mirror" && selectedNode ? !selectedLinks.has(node.id) : false;
          const replayActive = Boolean(replaySequence?.nodeSequence.includes(node.id));
          const isReplayTarget = replayTarget ? replayTarget[0] === node.position[0] && replayTarget[1] === node.position[1] && replayTarget[2] === node.position[2] : false;
          const left = `${50 + x * 9}%`;
          const top = `${50 - y * 12}%`;

          return (
            <button
              key={node.id}
              type="button"
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-left transition ${
                selected || isReplayTarget
                  ? "h-16 w-16 border-cyan-100/80 bg-cyan-200/25 shadow-[0_0_42px_rgba(125,220,255,0.55)]"
                  : dimmed
                    ? "h-8 w-8 border-white/10 bg-white/5 opacity-30"
                    : replayActive
                      ? "h-12 w-12 border-fuchsia-100/60 bg-fuchsia-200/15 shadow-[0_0_34px_rgba(244,114,182,0.35)]"
                      : "h-11 w-11 border-cyan-100/30 bg-cyan-200/10 shadow-[0_0_28px_rgba(125,220,255,0.25)] hover:border-cyan-100/70"
              }`}
              style={{ left, top }}
              onClick={() => onSelectNode(node)}
              aria-label={`Focus ${node.title}: ${lifeMapTypeLabels[node.type]}`}
            >
              <span className="sr-only">{node.title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const { nodes, eras, loading, error, usingSeedData } = useLifeMapEvents();
  const [mode, setMode] = useState<LifeMapMode>("lifemap");
  const [selectedNode, setSelectedNode] = useState<LifeMapNode | null>(null);
  const [activeFilters, setActiveFilters] = useState<LifeMapNodeType[]>(lifeMapFilters);
  const [timeScope, setTimeScope] = useState<LifeMapTimeScope>("all");
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [narratorText, setNarratorText] = useState("Your Life Map is open. Choose a star, an era, or the Mirror to move through the inner universe.");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [replaySequence, setReplaySequence] = useState<LifeMapReplaySequence | null>(null);

  const selectedEra = useMemo(() => eras.find((era) => era.id === selectedEraId) ?? null, [eras, selectedEraId]);
  const visibleNodes = useMemo(
    () => nodes.filter((node) => activeFilters.includes(node.type) && isNodeInTimeScope(node, timeScope, selectedEra)),
    [activeFilters, nodes, selectedEra, timeScope],
  );
  const generatedMirror = useMemo(() => generateMirrorOfBecoming(visibleNodes.length ? visibleNodes : nodes, eras), [eras, nodes, visibleNodes]);

  const speak = useCallback((text: string) => {
    setNarratorText(text);
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const selectNode = useCallback((node: LifeMapNode) => {
    setReplaySequence(null);
    setSelectedNode(node);
    setMode("focus");
    speak(narrationForNode(node).text);
  }, [speak]);

  const recenter = useCallback(() => {
    setReplaySequence(null);
    setSelectedNode(null);
    setMode("lifemap");
    speak("The galaxy has returned to overview. You can move by time, type, or memory cluster.");
  }, [speak]);

  const returnHome = useCallback(() => {
    speak("Returning from the Life Map.");
    router.push("/home");
  }, [router, speak]);

  const beginReplay = useCallback(() => {
    if (!selectedNode || !selectedNode.replayAvailable || selectedNode.locked) return;
    const sequence = buildLifeMapReplaySequence(selectedNode, nodes, 0.58);
    setReplaySequence(sequence);
    setMode("replay");
    speak(`${sequence.caption}. ${selectedNode.narratorHint ?? "URAI is threading this memory as symbolic atmosphere."}`);
  }, [nodes, selectedNode, speak]);

  const openMirror = useCallback(() => {
    setReplaySequence(null);
    setSelectedNode(null);
    setMode("mirror");
    speak(generatedMirror.becomingStatement);
  }, [generatedMirror.becomingStatement, speak]);

  const unwind = useCallback(() => {
    if (mode === "replay") {
      setReplaySequence(null);
      setMode("focus");
      speak("Replay closed. You are back at the focused memory star.");
      return;
    }
    if (mode === "focus") {
      setSelectedNode(null);
      setMode("lifemap");
      speak("Focus closed. The wider Life Map is visible again.");
      return;
    }
    if (mode === "mirror") {
      setMode("lifemap");
      speak("Mirror closed. You are back in the Life Map overview.");
      return;
    }
    returnHome();
  }, [mode, returnHome, speak]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") unwind();
      if (event.key.toLowerCase() === "r") recenter();
      if (event.key.toLowerCase() === "m") openMirror();
      if ((event.key === "Enter" || event.key === " ") && mode === "focus" && selectedNode?.replayAvailable && !selectedNode.locked) {
        event.preventDefault();
        beginReplay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginReplay, mode, openMirror, recenter, selectedNode, unwind]);

  const toggleFilter = useCallback((type: LifeMapNodeType) => {
    setActiveFilters((current) => {
      if (current.includes(type)) {
        const next = current.filter((item) => item !== type);
        return next.length ? next : current;
      }
      return [...current, type];
    });
  }, []);

  const selectTimeScope = useCallback((scope: LifeMapTimeScope) => {
    setTimeScope(scope);
    if (scope !== "era") setSelectedEraId(null);
    speak(`Time view set to ${lifeMapTimeScopeLabels[scope]}.`);
  }, [speak]);

  const selectEra = useCallback((eraId: string | null) => {
    setSelectedEraId(eraId);
    setTimeScope("era");
    const era = eras.find((item) => item.id === eraId) ?? null;
    speak(era ? `${era.title}. ${era.summary}` : "All eras are visible again.");
  }, [eras, speak]);

  const toggleTts = useCallback(() => {
    setTtsEnabled((value) => !value);
  }, []);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const onTouchEnd = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!touchStart || !selectedNode || mode !== "focus") return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchStart(null);

    if (Math.abs(deltaX) <= 80 || Math.abs(deltaY) >= 80) return;

    const linkedId = deltaX < 0 ? selectedNode.connectedTo[0] : nodes.find((node) => node.connectedTo.includes(selectedNode.id))?.id;
    const nextNode = linkedId ? nodes.find((node) => node.id === linkedId) : null;
    if (nextNode) selectNode(nextNode);
  }, [mode, nodes, selectNode, selectedNode, touchStart]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020815] text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(87,63,190,0.24),transparent_34%),radial-gradient(circle_at_65%_50%,rgba(255,75,188,0.16),transparent_34%),radial-gradient(circle_at_50%_45%,rgba(62,189,222,0.18),transparent_26%)]" />
      <div className="absolute inset-x-6 top-8 bottom-8 rounded-[2.5rem] border border-cyan-100/5 bg-slate-950/10 shadow-[inset_0_0_80px_rgba(125,220,255,0.04)]" />

      <LifeMapStaticGalaxy nodes={visibleNodes} selectedNode={selectedNode} replaySequence={replaySequence} mode={mode} onSelectNode={selectNode} />

      <LifeMapHud
        mode={mode}
        activeFilters={activeFilters}
        timeScope={timeScope}
        eras={eras}
        selectedEraId={selectedEraId}
        narratorText={narratorText}
        ttsEnabled={ttsEnabled}
        loading={loading}
        usingSeedData={usingSeedData}
        error={error}
        onToggleFilter={toggleFilter}
        onSelectTimeScope={selectTimeScope}
        onSelectEra={selectEra}
        onToggleTts={toggleTts}
        onOpenMirror={openMirror}
        onRecenter={recenter}
        onReturnHome={returnHome}
      />

      <LifeMapNodeCard node={mode === "mirror" ? null : selectedNode} onReplay={beginReplay} onClose={unwind} />
      <LifeMapReplayOverlay node={selectedNode} active={mode === "replay"} onClose={unwind} />
      <LifeMapMirrorPanel mirror={generatedMirror} active={mode === "mirror"} onClose={unwind} />

      <section className="sr-only" aria-label="Keyboard controls">
        Press Escape to unwind. Press R to recenter. Press M to open the Mirror of Becoming. Press Enter on a focused replay node to begin replay.
      </section>
    </main>
  );
}
