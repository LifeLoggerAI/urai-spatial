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
type StarState = "idle" | "glowing" | "active" | "resolved";

type Snapshot = {
  phase: LifeMapPhase;
  nodeId: string | null;
  mode: LifeMapMode;
  showReplay: boolean;
  zoom: number;
};

const DEFAULT_NODE_ID = lifeMapNodes[0]?.id ?? null;

const PHASE_ROUTES: Record<LifeMapPhase, string> = {
  home: "/home",
  lifemap: "/life-map",
  focus: "/focus",
  replay: "/replay",
  mirror: "/mirror",
};

function phaseFromLocation(
  queryPhase: string | null,
  pathname: string | null
): LifeMapPhase {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();

  if (source.includes("mirror")) return "mirror";
  if (source.includes("replay")) return "replay";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";

  return "home";
}

function normalizeNodeId(value: string | null): string | null {
  if (!value) return DEFAULT_NODE_ID;
  return lifeMapNodes.some((node) => node.id === value) ? value : DEFAULT_NODE_ID;
}

function backgroundStar(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.6,
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

function scoreLabel(score: number) {
  if (score > 86) return "Major star";
  if (score > 70) return "High signal";
  if (score > 55) return "Pattern point";
  return "Quiet memory";
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="empty-state" data-testid="lifemap-empty-state">
      <p>YOUR SKY IS QUIET</p>
      <h1>Your Life Map grows passively over time.</h1>
      <span>
        As URAI notices memories, moods, places, voices, rituals, and patterns,
        this sky will begin to bloom.
      </span>
      <div>
        <button type="button" onClick={onDemo}>
          Preview demo map
        </button>
        <button type="button">Connect data</button>
      </div>
      <small>Private by default. Share cards only when you choose.</small>
    </section>
  );
}

function DetailCard({
  node,
  onReplay,
  onClose,
  onResolve,
}: {
  node: LifeMapNode;
  onReplay: () => void;
  onClose: () => void;
  onResolve: () => void;
}) {
  return (
    <section
      className="detail-card"
      data-testid="urai-focus-card"
      role="dialog"
      aria-label={`${node.title} focus`}
    >
      <button
        type="button"
        className="close"
        onClick={onClose}
        aria-label="Close memory card"
      >
        ×
      </button>

      <p>
        {node.nodeType.toUpperCase()} / {node.season.toUpperCase()}
      </p>
      <h1>{node.title}</h1>
      <strong>{node.subtitle}</strong>

      <span>
        {new Date(node.timestamp).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </span>

      <div className="aura-row">
        <i
          style={{
            background: node.auraColor,
            boxShadow: `0 0 28px ${node.auraColor}`,
          }}
        />
        <b>{node.emotionalTone} aura</b>
        <em>{scoreLabel(node.importanceScore)}</em>
      </div>

      <article>{node.description}</article>
      <blockquote>{node.narratorLine}</blockquote>

      <dl>
        <div>
          <dt>Chapter</dt>
          <dd>
            {lifeChapters.find((chapter) => chapter.id === node.chapterId)
              ?.title ?? "Unchaptered"}
          </dd>
        </div>
        <div>
          <dt>Signals</dt>
          <dd>{node.sourceSignals.join(", ")}</dd>
        </div>
        <div>
          <dt>Privacy</dt>
          <dd>{node.privacyLevel}</dd>
        </div>
      </dl>

      <div className="card-actions">
        <button type="button" onClick={onReplay}>
          Replay
        </button>
        <button type="button">Reflect</button>
        <button type="button" onClick={onResolve}>Mark resolved</button>
      </div>
    </section>
  );
}

function CompanionGuide({
  mode,
  selectedNode,
}: {
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
}) {
  const message = selectedNode
    ? selectedNode.narratorLine
    : mode === "shadow"
      ? "I will keep the language gentle here. This is pattern visibility, not judgment."
      : mode === "recovery"
        ? "Look for the stars that brighten after pressure. Those are recovery blooms."
        : mode === "mirror"
          ? "Zoom out. The life arc is larger than any single difficult day."
          : "Tap a star when one starts glowing. I will translate the pattern.";

  return (
    <aside className="companion" data-testid="lifemap-companion-guide">
      <div className="companion-orb" />
      <p>Companion</p>
      <span>{message}</span>
    </aside>
  );
}

function ReplayOverlay({
  active,
  onClose,
}: {
  active: LifeMapNode | null;
  onClose: () => void;
}) {
  const path = active
    ? [
        {
          nodeId: active.id,
          cameraLabel: active.title,
          narrator: active.narratorLine,
          weather: active.isRecovery
            ? "recovery"
            : active.isDream
              ? "dream"
              : active.isShadow
                ? "shadow"
                : ("timeline" as LifeMapMode),
        },
      ]
    : mirrorReplayPath;

  return (
    <section
      className="replay-overlay"
      data-testid="urai-replay-overlay"
      role="dialog"
      aria-label={active ? `${active.title} replay` : "Mirror of Becoming replay"}
    >
      <div className="replay-camera" />
      <p>REPLAY STREAM</p>
      <h1>{active ? active.title : "Mirror of Becoming"}</h1>

      <ol>
        {path.map((frame) => (
          <li key={`${frame.nodeId}-${frame.cameraLabel}`}>
            <b>{frame.cameraLabel}</b>
            <span>{frame.narrator}</span>
          </li>
        ))}
      </ol>

      <div>
        <button type="button">Enable TTS hook</button>
        <button type="button" onClick={onClose}>
          Unwind
        </button>
      </div>
    </section>
  );
}

function ExportPanel() {
  return (
    <aside className="export-panel" data-testid="lifemap-export-panel">
      <p>EXPORT</p>
      <button type="button">Snapshot</button>
      <button type="button">Memory scroll</button>
      <button type="button">Share card</button>
    </aside>
  );
}

export default function SpatialScene() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routePhase = phaseFromLocation(searchParams.get("phase"), pathname);
  const routeNodeId = normalizeNodeId(searchParams.get("node"));

  const [phase, setPhase] = useState<ScenePhase>(routePhase);
  const [mode, setMode] = useState<LifeMapMode>(
    routePhase === "mirror" ? "mirror" : "timeline"
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    routePhase === "focus" || routePhase === "replay" ? routeNodeId : null
  );
  const [showReplay, setShowReplay] = useState(
    routePhase === "replay" || routePhase === "mirror"
  );
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [companionOverride, setCompanionOverride] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [starStates, setStarStates] = useState<Record<string, StarState>>({});
  const [lastActivatedAt, setLastActivatedAt] = useState<Record<string, number | null>>({});

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stars = useMemo(
    () => Array.from({ length: 260 }, (_, index) => backgroundStar(index)),
    []
  );

  const selectedNode =
    lifeMapNodes.find((node) => node.id === selectedNodeId) ?? null;

  const selectedNodeWithOverride = selectedNode
    ? { ...selectedNode, narratorLine: companionOverride ?? selectedNode.narratorLine }
    : null;

  const visibleNodes = useMemo(
    () => (demoEnabled ? filteredNodes(mode) : []),
    [demoEnabled, mode]
  );

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () =>
      lifeMapEdges.filter(
        (edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)
      ),
    [visibleNodeIds]
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const queueTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);



  const emitNarrator = useCallback((detail: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent("urai:narrator", {
        detail: { ...detail, timestamp: Date.now() },
      })
    );
  }, []);

  const emitTimelineSync = useCallback((detail: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent("urai:timeline-sync", {
        detail: { mode: "lifemap", ...detail, timestamp: Date.now() },
      })
    );
  }, []);

  const activateNode = useCallback((node: LifeMapNode) => {
    setSelectedNodeId(node.id);
    setStarStates((current) => ({ ...current, [node.id]: "active" }));
    setLastActivatedAt((current) => ({ ...current, [node.id]: Date.now() }));
    setCompanionOverride(node.narratorLine);
  }, []);

  const writeUrl = useCallback(
    (next: LifeMapPhase, nodeId: string | null = selectedNodeId) => {
      const base = PHASE_ROUTES[next];

      if (next === "home" || !nodeId) {
        router.push(base, { scroll: false });
        return;
      }

      router.push(`${base}?node=${encodeURIComponent(nodeId)}`, {
        scroll: false,
      });
    },
    [router, selectedNodeId]
  );

  const pushSnapshot = useCallback(() => {
    if (phase === "ascent") return;

    setHistory((current) => [
      ...current,
      {
        phase,
        nodeId: selectedNodeId,
        mode,
        showReplay,
        zoom,
      },
    ]);
  }, [mode, phase, selectedNodeId, showReplay, zoom]);

  const goto = useCallback(
    (next: LifeMapPhase, nodeId: string | null = selectedNodeId) => {
      setPhase(next);
      writeUrl(next, nodeId);
    },
    [selectedNodeId, writeUrl]
  );

  const goHome = useCallback(() => {
    clearTimers();
    setHistory([]);
    setShowReplay(false);
    setSelectedNodeId(null);
    setMode("timeline");
    setZoom(1);
    setIsTransitioning(false);
    setPhase("home");
    writeUrl("home", null);
  }, [clearTimers, writeUrl]);

  const enterLifeMap = useCallback(() => {
    if (isTransitioning || phase !== "home") return;

    clearTimers();
    pushSnapshot();
    setDemoEnabled(true);
    setMode("timeline");
    setShowReplay(false);
    setIsTransitioning(true);
    setPhase("ascent");

    queueTimer(() => {
      setPhase("lifemap");
      setIsTransitioning(false);
      writeUrl("lifemap", selectedNodeId);
    }, 720);
  }, [
    clearTimers,
    isTransitioning,
    phase,
    pushSnapshot,
    queueTimer,
    selectedNodeId,
    writeUrl,
  ]);

  const focusNode = useCallback(
    (node: LifeMapNode) => {
      if (isTransitioning) return;

      pushSnapshot();
      activateNode(node);
      emitNarrator({
        event: "lifemap.star.focus",
        starId: node.id,
        chapterId: node.chapterId,
        emotion: node.emotionalTone,
      });
      emitTimelineSync({
        phase: "focus",
        activeStarId: node.id,
        activeChapterId: node.chapterId,
      });
      setShowReplay(false);
      setPhase("focus");
      writeUrl("focus", node.id);
    },
    [activateNode, emitNarrator, emitTimelineSync, isTransitioning, pushSnapshot, writeUrl]
  );

  const startReplay = useCallback(
    (node: LifeMapNode | null = selectedNode) => {
      if (isTransitioning) return;

      pushSnapshot();

      if (node) {
        activateNode(node);
      emitNarrator({
        event: "lifemap.star.focus",
        starId: node.id,
        chapterId: node.chapterId,
        emotion: node.emotionalTone,
      });
      emitTimelineSync({
        phase: "focus",
        activeStarId: node.id,
        activeChapterId: node.chapterId,
      });
      }

      setShowReplay(true);
      setPhase("replay");
      writeUrl("replay", node?.id ?? selectedNodeId);
    },
    [activateNode, emitNarrator, emitTimelineSync, isTransitioning, pushSnapshot, selectedNode, selectedNodeId, writeUrl]
  );

  const unwind = useCallback(() => {
    if (isTransitioning) return;

    const previous = history[history.length - 1];

    if (!previous) {
      if (phase !== "home") goHome();
      return;
    }

    setHistory((current) => current.slice(0, -1));
    setPhase(previous.phase);
    setSelectedNodeId(previous.nodeId);
    setMode(previous.mode);
    setShowReplay(previous.showReplay);
    setZoom(previous.zoom);
    writeUrl(previous.phase, previous.nodeId);
  }, [goHome, history, isTransitioning, phase, writeUrl]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const initStates: Record<string, StarState> = {};
    const initTimes: Record<string, number | null> = {};
    for (const node of lifeMapNodes) {
      initStates[node.id] = "idle";
      initTimes[node.id] = null;
    }
    setStarStates(initStates);
    setLastActivatedAt(initTimes);
  }, []);

  useEffect(() => {
    if (phase === "home" || phase === "ascent" || reducedMotion || !visibleNodes.length) return;
    const messages = [
      "Something is asking to be seen.",
      "This memory is carrying weight.",
      "A pattern is lighting up.",
      "This moment connects to something older.",
    ];
    const roll = () => {
      const unresolved = visibleNodes.filter((node) => starStates[node.id] !== "resolved");
      const sorted = [...unresolved].sort((a,b) => {
        const wa = (a.isRecovery ? 2 : 1) + (a.nodeType === "threshold" || a.isShadow ? 2 : 0) + (a.importanceScore / 100) + ((Date.now() - (lastActivatedAt[a.id] ?? 0)) / 120000);
        const wb = (b.isRecovery ? 2 : 1) + (b.nodeType === "threshold" || b.isShadow ? 2 : 0) + (b.importanceScore / 100) + ((Date.now() - (lastActivatedAt[b.id] ?? 0)) / 120000);
        return wb - wa;
      });
      const count = Math.max(1, Math.min(3, 1 + Math.floor(Math.random() * 3)));
      const glowing = sorted.slice(0, count).map((n) => n.id);
      setStarStates((current) => {
        const next = { ...current };
        for (const node of visibleNodes) {
          if (current[node.id] === "active" || current[node.id] === "resolved") continue;
          next[node.id] = glowing.includes(node.id) ? "glowing" : "idle";
        }
        return next;
      });
      const g = lifeMapNodes.find((n) => n.id === glowing[0]);
      if (g) {
        setCompanionOverride(messages[Math.floor(Math.random()*messages.length)]);
        emitNarrator({
          event: "lifemap.star.glow",
          starId: g.id,
          chapterId: g.chapterId,
          emotion: g.emotionalTone,
        });
        emitTimelineSync({
          phase: "living",
          activeStarId: g.id,
          activeChapterId: g.chapterId,
        });
      }
    };
    const id = window.setInterval(roll, 8000 + Math.floor(Math.random() * 6000));
    roll();
    return () => clearInterval(id);
  }, [emitNarrator, emitTimelineSync, lastActivatedAt, phase, reducedMotion, starStates, visibleNodes]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (isTransitioning || phase === "ascent") return;

    const nextPhase = phaseFromLocation(searchParams.get("phase"), pathname);
    const nextNodeId = normalizeNodeId(searchParams.get("node"));

    setPhase(nextPhase);

    if (nextPhase === "home") {
      setSelectedNodeId(null);
      setShowReplay(false);
      setMode("timeline");
      return;
    }

    if (nextPhase === "mirror") {
      setSelectedNodeId(null);
      setMode("mirror");
      setShowReplay(true);
      return;
    }

    if (nextPhase === "focus" || nextPhase === "replay") {
      setSelectedNodeId(nextNodeId);
      setShowReplay(nextPhase === "replay");
      return;
    }

    setShowReplay(false);
  }, [isTransitioning, pathname, phase, searchParams]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      unwind();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unwind]);

  const showHome = phase === "home" || phase === "ascent";
  const showLifeMap =
    phase === "ascent" ||
    phase === "lifemap" ||
    phase === "focus" ||
    phase === "replay" ||
    phase === "mirror";

  return (
    <main
      className="stage"
      data-mode={phase}
      data-lifemap-mode={mode}
      data-testid="urai-spatial-stage"
      aria-live="polite"
    >
      {showHome ? (
        <section
          className={`home ${phase === "ascent" ? "home-exiting" : ""}`}
          data-testid="urai-home-scene"
          aria-label="URAI home sky entry"
        >
          <div className="home-sky" />

          <div className="home-stars">
            {stars.slice(0, 56).map((s, index) => (
              <i
                key={index}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  opacity: s.opacity,
                }}
              />
            ))}
          </div>

          <div className="home-hill hill-a" />
          <div className="home-hill hill-b" />
          <div className="home-hill hill-c" />

          <button
            type="button"
            className="enter-label"
            onClick={enterLifeMap}
            disabled={isTransitioning}
          >
            ENTER THE SKY
          </button>

          <button
            type="button"
            className="orb"
            data-testid="urai-orb-button"
            aria-label="Enter Life Map"
            onClick={enterLifeMap}
            disabled={isTransitioning}
          />

          <div className="body" data-testid="urai-home-body" />

          <p className="home-copy">
            A living emotional galaxy of memory, pattern, recovery, dream, and
            becoming.
          </p>
        </section>
      ) : null}

      {showLifeMap ? (
        <section
          className={`lifemap ${weatherClass(mode)} ${
            phase === "ascent" ? "lifemap-entering" : ""
          }`}
          data-testid="urai-lifemap-scene"
          aria-label="URAI Life Map starfield"
          onWheel={(event) => {
            setZoom((current) =>
              Math.max(
                0.7,
                Math.min(1.8, current + (event.deltaY < 0 ? 0.05 : -0.05))
              )
            );
          }}
        >
          <div className="map-bg" />
          <div className="fog-layer" />
          <div className="particle-layer" />

          <div
            className="map-stars"
            data-testid="lifemap-starfield"
            style={{ transform: `scale(${zoom})` }}
          >
            {stars.map((s, index) => (
              <i
                key={index}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.size,
                  height: s.size,
                  opacity: s.opacity,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          {demoEnabled ? (
            <svg
              className="lines"
              aria-hidden="true"
              style={{ transform: `scale(${zoom})` }}
            >
              {visibleEdges.map((edge) => {
                const { from, to } = edgeNodes(edge);
                if (!from || !to) return null;

                return (
                  <line
                    key={edge.id}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    className={`edge-${edge.edgeType}`}
                    style={{ strokeWidth: Math.max(1, edge.strength * 5) }}
                  />
                );
              })}
            </svg>
          ) : null}

          {demoEnabled ? (
            <div className="node-layer" style={{ transform: `scale(${zoom})` }}>
              {visibleNodes.map((node) => {
                const size = 26 + node.importanceScore * 0.42;
                const style = {
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: size,
                  height: size,
                  "--aura": node.auraColor,
                  "--pulse": `${1.6 - node.emotionalIntensity * 0.7}s`,
                } as CSSProperties;

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`node ${starStates[node.id] ?? "idle"} ${node.visualState} ${selectedNodeId === node.id ? "selected" : ""}`}
                    data-testid={`lifemap-node-${node.id}`}
                    aria-label={`${node.title} ${node.nodeType} star`}
                    aria-pressed={selectedNodeId === node.id}
                    style={style}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      focusNode(node);
                    }}
                    onDoubleClick={() => setZoom(1.35)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      activateNode(node);
      emitNarrator({
        event: "lifemap.star.focus",
        starId: node.id,
        chapterId: node.chapterId,
        emotion: node.emotionalTone,
      });
      emitTimelineSync({
        phase: "focus",
        activeStarId: node.id,
        activeChapterId: node.chapterId,
      });
                      startReplay(node);
                    }}
                  >
                    <span />
                    <em>{node.glyphType.slice(0, 1).toUpperCase()}</em>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState onDemo={() => setDemoEnabled(true)} />
          )}

          <div className="chapter-portals" data-testid="lifemap-chapter-layer">
            {lifeChapters.map((chapter, index) => (
              <button
                key={chapter.id}
                type="button"
                style={{
                  left: `${14 + index * 18}%`,
                  background: chapter.coverGradient,
                }}
                onClick={() => {
                  const first = visibleNodes.find((node) => node.chapterId === chapter.id) ?? null;
                  if (first) {
                    setSelectedNodeId(first.id);
                    setZoom(1.32);
                    emitNarrator({
                      event: "lifemap.cluster.focus",
                      starId: first.id,
                      chapterId: chapter.id,
                      emotion: first.emotionalTone,
                    });
                    emitTimelineSync({
                      phase: "cluster",
                      activeStarId: first.id,
                      activeChapterId: chapter.id,
                    });
                  }
                }}
              >
                <b>{chapter.title}</b>
                <span>{chapter.dominantEmotions.join(" / ")}</span>
              </button>
            ))}
          </div>

          <section
            className="mirror-panel"
            data-visible={mode === "mirror" || phase === "mirror"}
          >
            <p>MIRROR OF BECOMING</p>
            <h2>The full arc is visible now.</h2>
            <span>
              Life phases, repeated patterns, recovery cycles, relationship
              lessons, and purpose threads are connected in one zoom-out.
            </span>
          </section>

          <CompanionGuide mode={mode} selectedNode={selectedNodeWithOverride} />
          <ExportPanel />

          {selectedNode && !showReplay && phase === "focus" ? (
            <DetailCard
              node={selectedNode}
              onReplay={() => startReplay(selectedNode)}
              onResolve={() => {
                setCompanionOverride("This one has softened.");
                setStarStates((current) => ({ ...current, [selectedNode.id]: "resolved" }));
                emitNarrator({
                  event: "lifemap.star.resolved",
                  starId: selectedNode.id,
                  chapterId: selectedNode.chapterId,
                  emotion: selectedNode.emotionalTone,
                });
              }}
              onClose={() => {
                setSelectedNodeId(null);
                setShowReplay(false);
                goto("lifemap", null);
              }}
            />
          ) : null}

          {showReplay ? (
            <ReplayOverlay
              active={phase === "mirror" ? null : selectedNode}
              onClose={() => {
                setShowReplay(false);
                goto("lifemap", selectedNodeId);
              }}
            />
          ) : null}

          <p className="map-hint">
            Pinch or wheel to zoom. Tap a star for memory detail. Long press or
            right-click for replay.
          </p>
        </section>
      ) : null}

      {phase === "ascent" ? (
        <div className="ascent-cover" data-testid="urai-ascent-cover">
          <span>ASCENDING INTO LIFEMAP</span>
        </div>
      ) : null}

      <nav
        className="mode-ribbon"
        data-testid="urai-command-ribbon"
        aria-label="Spatial controls"
        onClick={(event) => event.stopPropagation()}
      >
        {lifeMapModes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={mode === item.id ? "active" : ""}
            title={item.helper}
            onClick={() => {
              pushSnapshot();
              setMode(item.id);
              setSelectedNodeId(null);
              setShowReplay(item.id === "mirror");
              goto(item.id === "mirror" ? "mirror" : "lifemap", null);
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setDemoEnabled((enabled) => !enabled)}
        >
          {demoEnabled ? "Empty" : "Demo"}
        </button>

        {phase === "home" ? (
          <button type="button" onClick={enterLifeMap}>
            LifeMap
          </button>
        ) : (
          <button type="button" onClick={unwind}>
            Unwind
          </button>
        )}

        {phase !== "home" ? (
          <button type="button" onClick={goHome}>
            Home
          </button>
        ) : null}
      </nav>

      <style jsx>{`
        .stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: #020612;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          touch-action: none;
        }

        button {
          font: inherit;
        }

        button:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .home,
        .lifemap,
        .home-sky,
        .map-bg,
        .map-stars,
        .lines,
        .fog-layer,
        .particle-layer,
        .home-stars,
        .node-layer {
          position: absolute;
          inset: 0;
        }

        .home {
          z-index: 3;
          transition:
            opacity 720ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 720ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 720ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .home-exiting {
          opacity: 0;
          transform: translateY(20vh) scale(1.08);
          filter: blur(20px);
          pointer-events: auto;
        }

        .home-sky {
          background:
            radial-gradient(
              circle at 50% 28%,
              rgba(139, 203, 255, 0.36),
              transparent 28%
            ),
            radial-gradient(
              circle at 70% 18%,
              rgba(196, 181, 253, 0.18),
              transparent 20%
            ),
            linear-gradient(180deg, #050813 0%, #142e4b 52%, #06111f 100%);
          animation: sky-breathe 8s ease-in-out infinite alternate;
        }

        .home-stars i,
        .map-stars i {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: white;
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.82),
            0 0 24px rgba(151, 202, 255, 0.32);
          animation: star-pulse 2.4s ease-in-out infinite alternate;
        }

        .home-stars i {
          width: 2px;
          height: 2px;
        }

        .home-hill {
          position: absolute;
          left: 50%;
          width: 120vw;
          transform: translateX(-50%);
          border-radius: 50% 50% 0 0;
          background: rgba(21, 48, 82, 0.78);
        }

        .hill-a {
          bottom: 34vh;
          height: 24vh;
          opacity: 0.62;
          cursor: pointer;
          text-align: left;
        }

        .hill-b {
          bottom: 20vh;
          height: 23vh;
          opacity: 0.62;
        }

        .hill-c {
          bottom: -4vh;
          height: 35vh;
          opacity: 0.88;
        }

        .enter-label {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 4;
          transform: translate(-50%, -160px);
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          background: rgba(7, 14, 28, 0.38);
          color: rgba(235, 247, 255, 0.72);
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .orb {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 5;
          width: clamp(76px, 14vw, 150px);
          height: clamp(76px, 14vw, 150px);
          transform: translate(-50%, -50%);
          border: 1px solid rgba(230, 248, 255, 0.5);
          border-radius: 999px;
          cursor: pointer;
          background: radial-gradient(
            circle at 34% 24%,
            #f8fcff 0 14%,
            #9ddcff 22%,
            #3175bd 58%,
            #102d60 100%
          );
          box-shadow:
            0 0 18px rgba(179, 226, 255, 0.95),
            0 0 58px rgba(83, 175, 255, 0.54);
          animation: orb-float 3.8s ease-in-out infinite alternate;
        }

        .body {
          position: absolute;
          left: 50%;
          top: calc(43% + 42px);
          width: clamp(74px, 10vw, 112px);
          height: clamp(116px, 18vw, 190px);
          transform: translateX(-50%);
          border-radius: 48% 48% 42% 42%;
          background: linear-gradient(
            180deg,
            rgba(12, 32, 58, 0.96),
            rgba(3, 13, 26, 0.92)
          );
          box-shadow: inset 0 0 30px rgba(140, 216, 255, 0.18);
        }

        .home-copy {
          position: absolute;
          left: 50%;
          bottom: 110px;
          width: min(420px, calc(100vw - 40px));
          transform: translateX(-50%);
          margin: 0;
          color: rgba(232, 247, 255, 0.72);
          text-align: center;
          font-size: 14px;
          line-height: 1.5;
        }

        .lifemap {
          z-index: 1;
          background: #020612;
          opacity: 1;
          transition:
            opacity 720ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 720ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lifemap-entering {
          opacity: 0.72;
          transform: scale(1.06);
        }

        .map-bg {
          pointer-events: auto;
          background:
            radial-gradient(
              circle at 50% 36%,
              rgba(123, 195, 255, 0.34),
              transparent 30%
            ),
            radial-gradient(
              circle at 18% 82%,
              rgba(244, 114, 182, 0.13),
              transparent 28%
            ),
            radial-gradient(
              circle at 82% 78%,
              rgba(134, 239, 172, 0.1),
              transparent 26%
            ),
            linear-gradient(180deg, #030715 0%, #0d2746 48%, #030817 100%);
          transition:
            filter 700ms ease,
            opacity 700ms ease;
        }

        .weather-shadow .map-bg {
          filter: hue-rotate(35deg) saturate(0.7) brightness(0.62);
        }

        .weather-dream .map-bg {
          filter: hue-rotate(58deg) saturate(1.35);
        }

        .weather-recovery .map-bg {
          filter: hue-rotate(105deg) saturate(1.1) brightness(1.08);
        }

        .weather-relationship .map-bg {
          filter: hue-rotate(310deg) saturate(1.18);
        }

        .weather-mirror .map-bg {
          filter: saturate(0.2) brightness(1.28);
        }

        .fog-layer {
          pointer-events: auto;
          background:
            radial-gradient(
              circle at 18% 60%,
              rgba(255, 255, 255, 0.08),
              transparent 28%
            ),
            radial-gradient(
              circle at 72% 42%,
              rgba(196, 181, 253, 0.12),
              transparent 24%
            );
          mix-blend-mode: screen;
          opacity: 0.76;
          animation: fog-drift 12s ease-in-out infinite alternate;
        }

        .weather-shadow .fog-layer {
          background:
            radial-gradient(
              circle at 50% 50%,
              rgba(23, 8, 45, 0.72),
              transparent 45%
            ),
            radial-gradient(
              circle at 68% 65%,
              rgba(244, 63, 94, 0.16),
              transparent 28%
            );
          opacity: 1;
        }

        .particle-layer {
          pointer-events: auto;
          background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.16) 0 1px,
            transparent 1.5px
          );
          background-size: 34px 34px;
          opacity: 0.12;
          animation: particle-flow 18s linear infinite;
        }

        .map-stars,
        .node-layer,
        .lines {
          transform-origin: center;
          transition: transform 280ms ease;
        }

        .lines {
          pointer-events: auto;
          width: 100%;
          height: 100%;
        }

        .lines line {
          stroke: rgba(232, 247, 255, 0.26);
          stroke-dasharray: 5 9;
          animation: line-draw 5s ease-in-out infinite alternate;
        }

        .lines .edge-shadow {
          stroke: rgba(248, 113, 113, 0.46);
        }

        .lines .edge-recovery {
          stroke: rgba(134, 239, 172, 0.62);
        }

        .lines .edge-dream {
          stroke: rgba(196, 181, 253, 0.58);
        }

        .lines .edge-relationship {
          stroke: rgba(251, 191, 36, 0.48);
        }

        .lines .edge-mirror {
          stroke: rgba(255, 255, 255, 0.72);
        }

        .node {
          position: absolute;
          z-index: 8;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          background: color-mix(in srgb, var(--aura), transparent 72%);
          box-shadow:
            0 0 38px var(--aura),
            0 0 88px color-mix(in srgb, var(--aura), transparent 70%);
          cursor: pointer;
          animation: node-pulse var(--pulse) ease-in-out infinite alternate;
        }

        .node span {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 14px;
          height: 14px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 20px var(--aura);
        }

        .node em {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, 18px);
          color: rgba(255, 255, 255, 0.65);
          font-size: 10px;
          font-style: normal;
          font-weight: 900;
          pointer-events: auto;
        }

        .node.fogged {
          filter: saturate(0.75) brightness(0.72);
        }

        .node.blooming {
          box-shadow:
            0 0 54px var(--aura),
            0 0 120px rgba(134, 239, 172, 0.58);
        }

        .node.orbiting::after {
          content: "";
          position: absolute;
          inset: -14px;
          border: 1px dashed color-mix(in srgb, var(--aura), transparent 45%);
          border-radius: 999px;
          animation: orbit 6s linear infinite;
        }

        .node.selected,
        .node:hover,
        .node:focus-visible {
          outline: 3px solid rgba(255, 255, 255, 0.7);
          outline-offset: 8px;
        }

        .chapter-portals {
          position: absolute;
          inset: auto 0 104px 0;
          z-index: 7;
          pointer-events: auto;
          white-space: nowrap;
        }

        .chapter-portals button {
          position: absolute;
          bottom: 0;
          width: 118px;
          min-height: 44px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 18px;
          padding: 10px;
          box-shadow: 0 10px 44px rgba(0, 0, 0, 0.32);
          opacity: 0.62;
          cursor: pointer;
          text-align: left;
        }

        .chapter-portals b,
        .chapter-portals span {
          display: block;
          font-size: 10px;
        }

        .chapter-portals span {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.7);
        }

        .ascent-cover {
          position: absolute;
          inset: 0;
          z-index: 18;
          display: grid;
          place-items: center;
          pointer-events: auto;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(125, 211, 252, 0.38),
              transparent 32%
            ),
            linear-gradient(
              180deg,
              rgba(2, 6, 18, 0.08),
              rgba(2, 6, 18, 0.76)
            );
          animation: ascent 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .ascent-cover span {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.22);
          color: rgba(235, 247, 255, 0.68);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .companion,
        .export-panel,
        .detail-card,
        .replay-overlay,
        .empty-state,
        .mirror-panel {
          position: absolute;
          z-index: 22;
          border: 1px solid rgba(219, 241, 255, 0.2);
          background: rgba(4, 13, 29, 0.68);
          box-shadow:
            0 24px 90px rgba(0, 0, 0, 0.45),
            inset 0 0 44px rgba(158, 218, 255, 0.08);
          backdrop-filter: blur(20px);
          animation: cardIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .companion {
          right: max(16px, env(safe-area-inset-right));
          top: max(18px, env(safe-area-inset-top));
          width: min(300px, calc(100vw - 32px));
          border-radius: 24px;
          padding: 14px 16px 14px 54px;
        }

        .companion-orb {
          position: absolute;
          left: 16px;
          top: 18px;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: radial-gradient(circle, #fff, #9bdcff 45%, #7c3aed);
          box-shadow: 0 0 28px rgba(155, 220, 255, 0.82);
        }

        .companion p,
        .export-panel p,
        .detail-card p,
        .replay-overlay p,
        .empty-state p,
        .mirror-panel p {
          margin: 0;
          color: rgba(210, 236, 255, 0.65);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.22em;
        }

        .companion span {
          display: block;
          margin-top: 7px;
          color: rgba(238, 248, 255, 0.78);
          font-size: 13px;
          line-height: 1.45;
        }

        .export-panel {
          left: max(16px, env(safe-area-inset-left));
          top: max(18px, env(safe-area-inset-top));
          display: grid;
          gap: 8px;
          border-radius: 22px;
          padding: 12px;
        }

        .export-panel button,
        .card-actions button,
        .replay-overlay button,
        .empty-state button,
        .mode-ribbon button {
          border: 1px solid rgba(214, 238, 255, 0.24);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          font-weight: 750;
        }

        .export-panel button {
          padding: 8px 10px;
          font-size: 12px;
        }

        .detail-card,
        .replay-overlay,
        .empty-state {
          left: 50%;
          top: 50%;
          width: min(520px, calc(100vw - 32px));
          transform: translate(-50%, -50%);
          border-radius: 30px;
          padding: 24px;
        }

        .close {
          position: absolute;
          right: 16px;
          top: 14px;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
        }

        .detail-card h1,
        .replay-overlay h1,
        .empty-state h1,
        .mirror-panel h2 {
          margin: 10px 0 0;
          font-size: clamp(28px, 8vw, 44px);
          line-height: 1.02;
        }

        .detail-card strong,
        .detail-card > span,
        .empty-state > span,
        .mirror-panel span {
          display: block;
          margin-top: 10px;
          color: rgba(238, 248, 255, 0.75);
          line-height: 1.5;
        }

        .aura-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          color: rgba(238, 248, 255, 0.8);
        }

        .aura-row i {
          width: 16px;
          height: 16px;
          border-radius: 999px;
        }

        .aura-row em {
          margin-left: auto;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          font-style: normal;
        }

        .detail-card article {
          margin-top: 18px;
          color: rgba(238, 248, 255, 0.82);
          line-height: 1.6;
        }

        .detail-card blockquote {
          margin: 18px 0 0;
          padding-left: 14px;
          border-left: 2px solid rgba(155, 220, 255, 0.5);
          color: rgba(222, 242, 255, 0.78);
        }

        .detail-card dl {
          display: grid;
          gap: 10px;
          margin: 18px 0 0;
        }

        .detail-card dl div {
          display: grid;
          grid-template-columns: 82px 1fr;
          gap: 12px;
        }

        .detail-card dt {
          color: rgba(210, 236, 255, 0.55);
          font-size: 12px;
          text-transform: uppercase;
        }

        .detail-card dd {
          margin: 0;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
        }

        .card-actions,
        .replay-overlay div,
        .empty-state div {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .card-actions button,
        .replay-overlay button,
        .empty-state button {
          padding: 10px 14px;
        }

        .replay-camera {
          position: absolute;
          inset: -40%;
          z-index: -1;
          background: conic-gradient(
            from 90deg,
            transparent,
            rgba(155, 220, 255, 0.22),
            transparent,
            rgba(196, 181, 253, 0.18),
            transparent
          );
          animation: orbit 9s linear infinite;
        }

        .replay-overlay ol {
          margin: 20px 0 0;
          padding-left: 20px;
          color: rgba(238, 248, 255, 0.78);
        }

        .replay-overlay li {
          margin-top: 10px;
        }

        .replay-overlay li span {
          display: block;
          margin-top: 3px;
          color: rgba(238, 248, 255, 0.66);
        }

        .empty-state {
          text-align: center;
        }

        .empty-state small {
          display: block;
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.52);
        }

        .mirror-panel {
          left: 50%;
          top: 88px;
          width: min(520px, calc(100vw - 32px));
          transform: translateX(-50%) translateY(-14px);
          border-radius: 26px;
          padding: 18px;
          opacity: 0;
          pointer-events: auto;
          transition:
            opacity 320ms ease,
            transform 320ms ease;
        }

        .mirror-panel[data-visible="true"] {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .mirror-panel h2 {
          font-size: 24px;
        }

        .map-hint {
          position: absolute;
          left: 50%;
          bottom: 92px;
          z-index: 18;
          transform: translateX(-50%);
          width: min(520px, calc(100vw - 32px));
          margin: 0;
          border-radius: 999px;
          padding: 8px 13px;
          background: rgba(3, 10, 24, 0.48);
          color: rgba(232, 246, 255, 0.58);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-align: center;
          text-transform: uppercase;
          pointer-events: auto;
        }

        .mode-ribbon {
          position: absolute;
          left: 50%;
          bottom: max(20px, env(safe-area-inset-bottom));
          z-index: 40;
          display: flex;
          max-width: min(980px, calc(100vw - 24px));
          gap: 8px;
          overflow-x: auto;
          transform: translateX(-50%);
          border: 1px solid rgba(210, 235, 255, 0.16);
          border-radius: 999px;
          padding: 7px;
          background: rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px);
          scrollbar-width: none;
        }

        .mode-ribbon button {
          min-width: max-content;
          padding: 9px 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.76);
        }

        .mode-ribbon button.active {
          background: rgba(155, 220, 255, 0.22);
          color: white;
        }

        @keyframes sky-breathe {
          from {
            filter: brightness(0.92);
          }
          to {
            filter: brightness(1.12);
          }
        }

        @keyframes orb-float {
          from {
            transform: translate(-50%, -53%);
          }
          to {
            transform: translate(-50%, -47%);
          }
        }

        @keyframes star-pulse {
          from {
            transform: scale(0.8);
          }
          to {
            transform: scale(1.45);
          }
        }

        @keyframes fog-drift {
          from {
            transform: translateX(-2%);
          }
          to {
            transform: translateX(2%);
          }
        }

        @keyframes particle-flow {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 120px 240px;
          }
        }

        @keyframes node-pulse {
          from {
            filter: brightness(0.84);
          }
          to {
            filter: brightness(1.22);
          }
        }

        @keyframes orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes line-draw {
          from {
            stroke-dashoffset: 28;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes ascent {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }
          55% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: scale(1.06);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 18px)) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @media (max-width: 760px) {
          .companion {
            top: 12px;
            right: 12px;
            left: 12px;
            width: auto;
          }

          .export-panel {
            display: none;
          }

          .chapter-portals {
            display: none;
          }

          .map-hint {
            bottom: 84px;
            font-size: 9px;
          }

          .detail-card,
          .replay-overlay,
          .empty-state {
            max-height: calc(100vh - 150px);
            overflow: auto;
            padding: 20px;
          }
        }

        @media (max-width: 520px) {
          .enter-label {
            top: 39%;
            transform: translate(-50%, -132px);
          }

          .orb {
            top: 39%;
          }

          .body {
            top: calc(39% + 42px);
          }

          .mode-ribbon {
            width: calc(100vw - 24px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 1ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
