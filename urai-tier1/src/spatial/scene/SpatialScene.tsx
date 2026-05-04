"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
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

function phaseFromLocation(queryPhase: string | null, pathname: string | null): LifeMapPhase {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();
  if (source.includes("mirror")) return "mirror";
  if (source.includes("replay")) return "replay";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  return "home";
}

function backgroundStar(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.6,
    opacity: 0.22 + (((index * 13) % 65) / 100),
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

function DetailCard({ node, onReplay, onClose }: { node: LifeMapNode; onReplay: () => void; onClose: () => void }) {
  return (
    <section className="card detail-card" data-testid="urai-focus-card" role="dialog" aria-label={`${node.title} memory detail`}>
      <button type="button" className="close" onClick={onClose} aria-label="Close memory detail">x</button>
      <p>{node.nodeType.toUpperCase()} / {node.season.toUpperCase()}</p>
      <h1>{node.title}</h1>
      <strong>{node.subtitle}</strong>
      <span>{new Date(node.timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
      <article>{node.description}</article>
      <blockquote>{node.narratorLine}</blockquote>
      <dl>
        <div><dt>Chapter</dt><dd>{lifeChapters.find((chapter) => chapter.id === node.chapterId)?.title ?? "Unchaptered"}</dd></div>
        <div><dt>Aura</dt><dd>{node.emotionalTone} / {node.importanceScore}</dd></div>
        <div><dt>Privacy</dt><dd>{node.privacyLevel}</dd></div>
      </dl>
      <div className="card-actions">
        <button type="button" onClick={onReplay}>Replay</button>
        <button type="button">Add ritual</button>
        <button type="button">Export card</button>
      </div>
    </section>
  );
}

function CompanionGuide({ mode, selectedNode }: { mode: LifeMapMode; selectedNode: LifeMapNode | null }) {
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

function ReplayOverlay({ active, onClose }: { active: LifeMapNode | null; onClose: () => void }) {
  const path = active
    ? [{ nodeId: active.id, cameraLabel: active.title, narrator: active.narratorLine }]
    : mirrorReplayPath;

  return (
    <section className="card replay-card" data-testid="urai-replay-overlay" role="dialog" aria-label="Life Map replay">
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
      <div className="card-actions">
        <button type="button">Enable TTS hook</button>
        <button type="button" onClick={onClose}>Unwind</button>
      </div>
    </section>
  );
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="card empty-card" data-testid="lifemap-empty-state">
      <p>YOUR SKY IS QUIET</p>
      <h1>Your Life Map grows passively over time.</h1>
      <span>As URAI notices memories, moods, places, voices, rituals, and patterns, this sky will begin to bloom.</span>
      <div className="card-actions">
        <button type="button" onClick={onDemo}>Preview demo map</button>
        <button type="button">Connect data</button>
      </div>
      <small>Private by default. Share cards only when you choose.</small>
    </section>
  );
}

export default function SpatialScene() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const phase = phaseFromLocation(searchParams.get("phase"), pathname);
  const [mode, setMode] = useState<LifeMapMode>(phase === "mirror" ? "mirror" : "timeline");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(phase === "focus" ? lifeMapNodes[0].id : null);
  const [showReplay, setShowReplay] = useState(phase === "replay" || phase === "mirror");
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const stars = useMemo(() => Array.from({ length: 260 }, (_, index) => backgroundStar(index)), []);
  const selectedNode = lifeMapNodes.find((node) => node.id === selectedNodeId) ?? null;
  const visibleNodes = useMemo(() => (demoEnabled ? filteredNodes(mode) : []), [demoEnabled, mode]);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = lifeMapEdges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
  const goto = (next: LifeMapPhase) => router.push(next === "lifemap" ? "/life-map" : `/${next}`, { scroll: false });

  const enterLifeMap = () => {
    setDemoEnabled(true);
    setMode("timeline");
    setShowReplay(false);
    goto("lifemap");
  };

  const focusNode = (node: LifeMapNode) => {
    setSelectedNodeId(node.id);
    setShowReplay(false);
    goto("focus");
  };

  return (
    <main className="stage" data-mode={phase} data-lifemap-mode={mode} data-testid="urai-spatial-stage">
      {phase === "home" ? (
        <section className="home" data-testid="urai-home-scene" aria-label="URAI home sky entry">
          <div className="home-sky" />
          <div className="home-stars">
            {stars.slice(0, 56).map((s, index) => <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.opacity }} />)}
          </div>
          <div className="home-hill hill-a" />
          <div className="home-hill hill-b" />
          <div className="home-hill hill-c" />
          <button type="button" className="enter-label" onClick={enterLifeMap}>ENTER THE SKY</button>
          <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter Life Map" onClick={enterLifeMap} />
          <div className="body" data-testid="urai-home-body" />
          <p className="home-copy">A living emotional galaxy of memory, pattern, recovery, dream, and becoming.</p>
        </section>
      ) : (
        <section
          className={`lifemap ${weatherClass(mode)}`}
          data-testid="urai-lifemap-scene"
          aria-label="URAI Life Map starfield"
          onWheel={(event) => setZoom((current) => Math.max(0.7, Math.min(1.8, current + (event.deltaY < 0 ? 0.05 : -0.05))))}
        >
          <div className="map-bg" />
          <div className="fog-layer" />
          <div className="particle-layer" />
          <div className="map-stars" data-testid="lifemap-starfield" style={{ transform: `scale(${zoom})` }}>
            {stars.map((s, index) => <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }} />)}
          </div>

          {demoEnabled ? (
            <svg className="lines" aria-hidden="true" style={{ transform: `scale(${zoom})` }}>
              {visibleEdges.map((edge) => {
                const { from, to } = edgeNodes(edge);
                if (!from || !to) return null;
                return <line key={edge.id} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} className={`edge-${edge.edgeType}`} style={{ strokeWidth: Math.max(1, edge.strength * 5) }} />;
              })}
            </svg>
          ) : null}

          {demoEnabled ? (
            <div className="node-layer" style={{ transform: `scale(${zoom})` }}>
              {visibleNodes.map((node) => {
                const size = 26 + node.importanceScore * 0.42;
                const style = {
                  left: `${node.x}%`, top: `${node.y}%`, width: size, height: size,
                  "--aura": node.auraColor, "--pulse": `${1.6 - node.emotionalIntensity * 0.7}s`,
                } as CSSProperties;
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`node ${node.visualState} ${selectedNodeId === node.id ? "selected" : ""}`}
                    data-testid={`lifemap-node-${node.id}`}
                    aria-label={`${node.title} ${node.nodeType} star`}
                    style={style}
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); focusNode(node); }}
                    onDoubleClick={() => setZoom(1.35)}
                    onContextMenu={(event) => { event.preventDefault(); setSelectedNodeId(node.id); setShowReplay(true); goto("replay"); }}
                  >
                    <span />
                    <em>{node.glyphType.slice(0, 1).toUpperCase()}</em>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState onDemo={() => setDemoEnabled(true)} />}

          <div className="chapter-portals" data-testid="lifemap-chapter-layer">
            {lifeChapters.map((chapter, index) => (
              <article key={chapter.id} style={{ left: `${14 + index * 18}%`, background: chapter.coverGradient }}>
                <b>{chapter.title}</b><span>{chapter.dominantEmotions.join(" / ")}</span>
              </article>
            ))}
          </div>

          <section className="mirror-panel" data-visible={mode === "mirror" || phase === "mirror"}>
            <p>MIRROR OF BECOMING</p>
            <h2>The full arc is visible now.</h2>
            <span>Life phases, repeating patterns, recovery cycles, relationship lessons, and purpose threads connect in one zoom-out.</span>
          </section>

          <aside className="export-panel" data-testid="lifemap-export-panel"><p>EXPORT</p><button type="button">Snapshot</button><button type="button">Memory scroll</button><button type="button">Share card</button></aside>
          <CompanionGuide mode={mode} selectedNode={selectedNode} />
          {selectedNode && !showReplay ? <DetailCard node={selectedNode} onReplay={() => { setShowReplay(true); goto("replay"); }} onClose={() => { setSelectedNodeId(null); goto("lifemap"); }} /> : null}
          {showReplay ? <ReplayOverlay active={phase === "mirror" ? null : selectedNode} onClose={() => { setShowReplay(false); goto("lifemap"); }} /> : null}
          <p className="map-hint">Pinch or wheel to zoom. Tap a star for memory detail. Right-click or long press for replay.</p>
        </section>
      )}

      <nav className="mode-ribbon" data-testid="urai-command-ribbon" aria-label="Life Map controls">
        {lifeMapModes.map((item) => (
          <button key={item.id} type="button" className={mode === item.id ? "active" : ""} title={item.helper} onClick={() => { setMode(item.id); setSelectedNodeId(null); setShowReplay(item.id === "mirror"); goto(item.id === "mirror" ? "mirror" : "lifemap"); }}>{item.label}</button>
        ))}
        <button type="button" onClick={() => setDemoEnabled((enabled) => !enabled)}>{demoEnabled ? "Empty" : "Demo"}</button>
        <button type="button" onClick={() => goto("home")}>Unwind</button>
      </nav>

      <style jsx>{`
        .stage{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:#020612;color:white;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:none}button{font:inherit}.home,.lifemap,.home-sky,.map-bg,.map-stars,.lines,.fog-layer,.particle-layer,.home-stars,.node-layer{position:absolute;inset:0}.home-sky{background:radial-gradient(circle at 50% 28%,rgba(139,203,255,.36),transparent 28%),radial-gradient(circle at 70% 18%,rgba(196,181,253,.18),transparent 20%),linear-gradient(180deg,#050813 0%,#142e4b 52%,#06111f 100%);animation:sky-breathe 8s ease-in-out infinite alternate}.home-stars i,.map-stars i{position:absolute;display:block;border-radius:999px;background:white;box-shadow:0 0 10px rgba(255,255,255,.82),0 0 24px rgba(151,202,255,.32);animation:star-pulse 2.4s ease-in-out infinite alternate}.home-stars i{width:2px;height:2px}.home-hill{position:absolute;left:50%;width:120vw;transform:translateX(-50%);border-radius:50% 50% 0 0;background:rgba(21,48,82,.78)}.hill-a{bottom:34vh;height:24vh;opacity:.42}.hill-b{bottom:20vh;height:23vh;opacity:.62}.hill-c{bottom:-4vh;height:35vh;opacity:.88}.enter-label{position:absolute;left:50%;top:43%;transform:translate(-50%,-160px);z-index:4;border:0;border-radius:999px;padding:8px 14px;background:rgba(7,14,28,.38);color:rgba(235,247,255,.72);cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.08em}.orb{position:absolute;left:50%;top:43%;z-index:5;width:78px;height:78px;transform:translate(-50%,-50%);border:1px solid rgba(230,248,255,.5);border-radius:999px;cursor:pointer;background:radial-gradient(circle at 34% 24%,#f8fcff 0 14%,#9ddcff 22%,#3175bd 58%,#102d60 100%);box-shadow:0 0 18px rgba(179,226,255,.95),0 0 58px rgba(83,175,255,.54);animation:orb-float 3.8s ease-in-out infinite alternate}.body{position:absolute;left:50%;top:calc(43% + 42px);width:80px;height:118px;transform:translateX(-50%);border-radius:48% 48% 42% 42%;background:linear-gradient(180deg,rgba(12,32,58,.96),rgba(3,13,26,.92));box-shadow:inset 0 0 30px rgba(140,216,255,.18)}.home-copy{position:absolute;left:50%;bottom:110px;width:min(420px,calc(100vw - 40px));transform:translateX(-50%);margin:0;color:rgba(232,247,255,.72);text-align:center;font-size:14px;line-height:1.5}.lifemap{cursor:crosshair;background:#020612}.map-bg{pointer-events:none;background:radial-gradient(circle at 50% 36%,rgba(123,195,255,.34),transparent 30%),radial-gradient(circle at 18% 82%,rgba(244,114,182,.13),transparent 28%),radial-gradient(circle at 82% 78%,rgba(134,239,172,.1),transparent 26%),linear-gradient(180deg,#030715 0%,#0d2746 48%,#030817 100%);transition:filter .7s ease}.weather-shadow .map-bg{filter:hue-rotate(35deg) saturate(.7) brightness(.62)}.weather-dream .map-bg{filter:hue-rotate(58deg) saturate(1.35)}.weather-recovery .map-bg{filter:hue-rotate(105deg) saturate(1.1) brightness(1.08)}.weather-relationship .map-bg{filter:hue-rotate(310deg) saturate(1.18)}.weather-mirror .map-bg{filter:saturate(.2) brightness(1.28)}.fog-layer{pointer-events:none;background:radial-gradient(circle at 18% 60%,rgba(255,255,255,.08),transparent 28%),radial-gradient(circle at 72% 42%,rgba(196,181,253,.12),transparent 24%);mix-blend-mode:screen;opacity:.76;animation:fog-drift 12s ease-in-out infinite alternate}.weather-shadow .fog-layer{background:radial-gradient(circle at 50% 50%,rgba(23,8,45,.72),transparent 45%),radial-gradient(circle at 68% 65%,rgba(244,63,94,.16),transparent 28%);opacity:1}.particle-layer{pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.16) 0 1px,transparent 1.5px);background-size:34px 34px;opacity:.12;animation:particle-flow 18s linear infinite}.map-stars,.node-layer,.lines{transform-origin:center;transition:transform .28s ease}.lines{pointer-events:none;width:100%;height:100%}.lines line{stroke:rgba(232,247,255,.26);stroke-dasharray:5 9;animation:line-draw 5s ease-in-out infinite alternate}.edge-shadow{stroke:rgba(248,113,113,.46)!important}.edge-recovery{stroke:rgba(134,239,172,.62)!important}.edge-dream{stroke:rgba(196,181,253,.58)!important}.edge-relationship{stroke:rgba(251,191,36,.48)!important}.edge-mirror{stroke:rgba(255,255,255,.72)!important}.node{position:absolute;z-index:8;transform:translate(-50%,-50%);border:0;border-radius:999px;background:color-mix(in srgb,var(--aura),transparent 72%);box-shadow:0 0 38px var(--aura),0 0 88px color-mix(in srgb,var(--aura),transparent 70%);cursor:pointer;animation:node-pulse var(--pulse) ease-in-out infinite alternate}.node span{position:absolute;left:50%;top:50%;width:14px;height:14px;transform:translate(-50%,-50%);border-radius:999px;background:white;box-shadow:0 0 20px var(--aura)}.node em{position:absolute;left:50%;top:50%;transform:translate(-50%,18px);color:rgba(255,255,255,.65);font-size:10px;font-style:normal;font-weight:900;pointer-events:none}.node.fogged{filter:saturate(.75) brightness(.72)}.node.blooming{box-shadow:0 0 54px var(--aura),0 0 120px rgba(134,239,172,.58)}.node.orbiting:after{content:"";position:absolute;inset:-14px;border:1px dashed color-mix(in srgb,var(--aura),transparent 45%);border-radius:999px;animation:orbit 6s linear infinite}.node.selected,.node:hover,.node:focus-visible{outline:3px solid rgba(255,255,255,.7);outline-offset:8px}.chapter-portals{position:absolute;inset:auto 0 104px 0;z-index:7;pointer-events:none}.chapter-portals article{position:absolute;bottom:0;width:118px;min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:10px;box-shadow:0 10px 44px rgba(0,0,0,.32);opacity:.42}.chapter-portals b,.chapter-portals span{display:block;font-size:10px}.chapter-portals span{margin-top:4px;color:rgba(255,255,255,.7)}.companion,.export-panel,.card,.mirror-panel{position:absolute;z-index:22;border:1px solid rgba(219,241,255,.2);background:rgba(4,13,29,.68);box-shadow:0 24px 90px rgba(0,0,0,.45),inset 0 0 44px rgba(158,218,255,.08);backdrop-filter:blur(20px)}.companion{right:max(16px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));width:min(300px,calc(100vw - 32px));border-radius:24px;padding:14px 16px 14px 54px}.companion-orb{position:absolute;left:16px;top:18px;width:26px;height:26px;border-radius:999px;background:radial-gradient(circle,#fff,#9bdcff 45%,#7c3aed);box-shadow:0 0 28px rgba(155,220,255,.82)}.companion p,.export-panel p,.card p,.mirror-panel p{margin:0;color:rgba(210,236,255,.65);font-size:11px;font-weight:850;letter-spacing:.22em}.companion span{display:block;margin-top:7px;color:rgba(238,248,255,.78);font-size:13px;line-height:1.45}.export-panel{left:max(16px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));display:grid;gap:8px;border-radius:22px;padding:12px}.export-panel button,.card-actions button,.mode-ribbon button{border:1px solid rgba(214,238,255,.24);border-radius:999px;background:rgba(255,255,255,.1);color:white;cursor:pointer;font-weight:750}.export-panel button{padding:8px 10px;font-size:12px}.card{left:50%;top:50%;width:min(520px,calc(100vw - 32px));transform:translate(-50%,-50%);border-radius:30px;padding:24px}.close{position:absolute;right:16px;top:14px;width:32px;height:32px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(255,255,255,.1);color:white;cursor:pointer}.card h1,.mirror-panel h2{margin:10px 0 0;font-size:clamp(28px,8vw,44px);line-height:1.02}.card strong,.card>span,.mirror-panel span{display:block;margin-top:10px;color:rgba(238,248,255,.75);line-height:1.5}.card article{margin-top:18px;color:rgba(238,248,255,.82);line-height:1.6}.card blockquote{margin:18px 0 0;padding-left:14px;border-left:2px solid rgba(155,220,255,.5);color:rgba(222,242,255,.78)}.card dl{display:grid;gap:10px;margin:18px 0 0}.card dl div{display:grid;grid-template-columns:82px 1fr;gap:12px}.card dt{color:rgba(210,236,255,.55);font-size:12px;text-transform:uppercase}.card dd{margin:0;color:rgba(255,255,255,.75);font-size:13px}.card-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.card-actions button{padding:10px 14px}.replay-card ol{margin:20px 0 0;padding-left:20px;color:rgba(238,248,255,.78)}.replay-card li{margin-top:10px}.replay-card li span{display:block;margin-top:3px;color:rgba(238,248,255,.66)}.empty-card{text-align:center}.empty-card small{display:block;margin-top:14px;color:rgba(255,255,255,.52)}.mirror-panel{left:50%;top:88px;width:min(520px,calc(100vw - 32px));transform:translateX(-50%) translateY(-14px);border-radius:26px;padding:18px;opacity:0;pointer-events:none;transition:opacity .32s ease,transform .32s ease}.mirror-panel[data-visible="true"]{opacity:1;transform:translateX(-50%) translateY(0)}.mirror-panel h2{font-size:24px}.map-hint{position:absolute;left:50%;bottom:92px;z-index:18;transform:translateX(-50%);width:min(620px,calc(100vw - 32px));margin:0;border-radius:999px;padding:8px 13px;background:rgba(3,10,24,.48);color:rgba(232,246,255,.58);font-size:11px;font-weight:800;letter-spacing:.06em;text-align:center;text-transform:uppercase;pointer-events:none}.mode-ribbon{position:absolute;left:50%;bottom:max(20px,env(safe-area-inset-bottom));z-index:40;display:flex;max-width:min(980px,calc(100vw - 24px));gap:8px;overflow-x:auto;transform:translateX(-50%);border:1px solid rgba(210,235,255,.16);border-radius:999px;padding:7px;background:rgba(0,0,0,.42);backdrop-filter:blur(16px);scrollbar-width:none}.mode-ribbon button{min-width:max-content;padding:9px 12px;font-size:12px;color:rgba(255,255,255,.76)}.mode-ribbon button.active{background:rgba(155,220,255,.22);color:white}@keyframes sky-breathe{from{filter:brightness(.92)}to{filter:brightness(1.12)}}@keyframes orb-float{from{transform:translate(-50%,-53%)}to{transform:translate(-50%,-47%)}}@keyframes star-pulse{from{transform:scale(.8)}to{transform:scale(1.45)}}@keyframes fog-drift{from{transform:translateX(-2%)}to{transform:translateX(2%)}}@keyframes particle-flow{from{background-position:0 0}to{background-position:120px 240px}}@keyframes node-pulse{from{filter:brightness(.84)}to{filter:brightness(1.22)}}@keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes line-draw{from{stroke-dashoffset:28}to{stroke-dashoffset:0}}@media(max-width:760px){.companion{top:12px;right:12px;left:12px;width:auto}.export-panel{display:none}.chapter-portals{display:none}.map-hint{bottom:84px;font-size:9px}.card{padding:20px;max-height:calc(100vh - 150px);overflow:auto}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
      `}</style>
    </main>
  );
}
