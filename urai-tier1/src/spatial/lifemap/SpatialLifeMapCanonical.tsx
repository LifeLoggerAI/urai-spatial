"use client";

import dynamic from "next/dynamic";
import { Suspense, type CSSProperties } from "react";
import { assetCssStack, lifeMapAssets } from "@/spatial/assets/uraiAssets";
import LifeMapDeepLinkControls from "./LifeMapDeepLinkControls";

const FALLBACK_MEMORIES = [
  { title: "People", detail: "Relationship constellations", left: "18%", top: "31%", size: 108, color: "#c4b5fd" },
  { title: "Places", detail: "Consent-aware place memory", left: "66%", top: "25%", size: 86, color: "#5eead4" },
  { title: "Eras", detail: "Time regions and turning points", left: "42%", top: "58%", size: 126, color: "#93c5fd" },
  { title: "Artifacts", detail: "Sources and provenance attached", left: "73%", top: "66%", size: 94, color: "#fde68a" },
] as const;

const VISUAL_MEMORIES = [
  { id: "relationship", label: "Relationship", left: "17%", top: "32%", width: 176, ratio: "1.34", rotate: "-10deg", tilt: "15deg", color: "#c4b5fd", depth: "far", delay: "-4.5s" },
  { id: "place", label: "Place", left: "73%", top: "28%", width: 138, ratio: "1.18", rotate: "7deg", tilt: "-18deg", color: "#5eead4", depth: "far", delay: "-7.2s" },
  { id: "turning-point", label: "Turning point", left: "39%", top: "42%", width: 232, ratio: "1.46", rotate: "-4deg", tilt: "8deg", color: "#93c5fd", depth: "middle", delay: "-2.1s" },
  { id: "ritual", label: "Ritual", left: "63%", top: "61%", width: 188, ratio: "1.38", rotate: "9deg", tilt: "-12deg", color: "#a980ff", depth: "middle", delay: "-5.8s" },
  { id: "recovery", label: "Recovery", left: "24%", top: "70%", width: 214, ratio: "1.52", rotate: "5deg", tilt: "-9deg", color: "#7ddcff", depth: "near", delay: "-8.4s" },
  { id: "legacy", label: "Deep time", left: "82%", top: "73%", width: 152, ratio: "1.24", rotate: "-8deg", tilt: "18deg", color: "#fde68a", depth: "near", delay: "-3.4s" },
] as const;

function LifeMapVisualSpine() {
  return (
    <div className="life-map-visual-spine" aria-hidden="true" data-life-map-visual-owner="authored-deep-field">
      <div className="life-map-visual-spine__nebula life-map-visual-spine__nebula--cyan" />
      <div className="life-map-visual-spine__nebula life-map-visual-spine__nebula--violet" />
      <div className="life-map-visual-spine__river">
        <i />
        <i />
        <i />
      </div>
      <div className="life-map-visual-spine__era life-map-visual-spine__era--past"><span>Origins</span></div>
      <div className="life-map-visual-spine__era life-map-visual-spine__era--present"><span>Becoming</span></div>
      <div className="life-map-visual-spine__era life-map-visual-spine__era--future"><span>Possible futures</span></div>
      {VISUAL_MEMORIES.map((memory) => (
        <div
          key={memory.id}
          className={`life-map-memory-window life-map-memory-window--${memory.depth}`}
          style={{
            "--memory-left": memory.left,
            "--memory-top": memory.top,
            "--memory-width": `${memory.width}px`,
            "--memory-ratio": memory.ratio,
            "--memory-rotate": memory.rotate,
            "--memory-tilt": memory.tilt,
            "--memory-color": memory.color,
            "--memory-delay": memory.delay,
          } as CSSProperties}
        >
          <div className="life-map-memory-window__image" />
          <div className="life-map-memory-window__meta"><span>{memory.label}</span><i>Private memory surface</i></div>
        </div>
      ))}
      <div className="life-map-visual-spine__foreground life-map-visual-spine__foreground--left" />
      <div className="life-map-visual-spine__foreground life-map-visual-spine__foreground--right" />
    </div>
  );
}

function LifeMapLoading({ label = "Opening your memory universe" }: { label?: string }) {
  return <main aria-label="Life Map authored fallback" data-testid="urai-life-map-authored-fallback" style={{ position: "relative", minHeight: "100svh", overflow: "hidden", color: "#f8fbff", background: "radial-gradient(circle at 24% 24%, rgba(103,232,249,.2), transparent 22%), radial-gradient(circle at 72% 38%, rgba(196,181,253,.18), transparent 26%), linear-gradient(180deg,#01030a 0%,#04091a 56%,#010208 100%)" }}>
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: assetCssStack(lifeMapAssets.primary), backgroundSize: "cover", backgroundPosition: "center", opacity: .34, mixBlendMode: "screen" }} />
    <div aria-hidden="true" style={{ position: "absolute", inset: "12% 8% 16%", transform: "perspective(900px) rotateX(58deg) rotateZ(-8deg)", border: "1px solid rgba(147,197,253,.16)", borderRadius: "50%", boxShadow: "0 0 120px rgba(103,232,249,.08), inset 0 0 90px rgba(196,181,253,.08)" }} />
    {FALLBACK_MEMORIES.map((memory) => <section key={memory.title} aria-label={`${memory.title}. ${memory.detail}.`} style={{ position: "absolute", left: memory.left, top: memory.top, width: memory.size, minHeight: memory.size, transform: "translate(-50%,-50%)", display: "grid", placeItems: "center", border: `1px solid ${memory.color}66`, borderRadius: "999px", background: `radial-gradient(circle,${memory.color}35,rgba(3,7,18,.72) 62%,transparent 70%)`, boxShadow: `0 0 70px ${memory.color}32`, textAlign: "center", padding: 12 }}><strong style={{ display: "block", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>{memory.title}</strong><span style={{ display: "block", maxWidth: 94, fontSize: 9, lineHeight: 1.35, color: "rgba(235,244,255,.72)" }}>{memory.detail}</span></section>)}
    <section style={{ position: "absolute", left: "max(18px,env(safe-area-inset-left))", top: "max(18px,env(safe-area-inset-top))", width: "min(390px,calc(100% - 36px))", padding: 18, border: "1px solid rgba(165,243,252,.18)", borderRadius: 24, background: "rgba(3,7,18,.64)", backdropFilter: "blur(18px)", boxShadow: "0 24px 90px rgba(0,0,0,.36)" }}><p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: ".24em", textTransform: "uppercase", color: "#a5f3fc" }}>URAI · Life Map</p><h1 style={{ margin: "6px 0 0", fontSize: "clamp(30px,6vw,62px)", lineHeight: .9, letterSpacing: "-.065em" }}>Your life has depth.</h1><p style={{ margin: "13px 0 0", maxWidth: 330, fontSize: 13, lineHeight: 1.55, color: "rgba(235,244,255,.78)" }}>Memories, people, places, eras, and artifacts remain distinct while the full spatial field opens. Nothing private is exposed by this authored fallback.</p></section>
    <div role="status" aria-live="polite" style={{ position: "absolute", left: "50%", bottom: "max(26px,env(safe-area-inset-bottom))", transform: "translateX(-50%)", width: "min(520px,calc(100% - 32px))", padding: "12px 16px", border: "1px solid rgba(165,243,252,.18)", borderRadius: 999, background: "rgba(3,7,18,.74)", backdropFilter: "blur(18px)", textAlign: "center", fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>{label} · semantic navigation remains available</div>
  </main>;
}

const LifeMapRouteBoundary = dynamic(() => import("@/components/lifemap/LifeMapRouteBoundary"), { ssr: false, loading: () => <LifeMapLoading /> });

export default function SpatialLifeMapCanonical() {
  const artStyle = { "--life-map-authored-world": assetCssStack(lifeMapAssets.primary) } as CSSProperties;
  return <section
    data-testid="urai-r3f-canonical-lifemap"
    data-canonical-asset={lifeMapAssets.primary.src}
    data-life-map-active-visual="authored-memory-universe"
    aria-label="URAI canonical spatial Life Map"
    style={{ ...artStyle, position: "relative", minHeight: "100svh", overflow: "hidden", background: "#01030a" }}
  >
    <LifeMapVisualSpine />
    <Suspense fallback={<LifeMapLoading label="Preserving your map while the spatial field opens" />}><LifeMapRouteBoundary /><LifeMapDeepLinkControls /></Suspense>
    <style jsx>{`
      .life-map-visual-spine{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background-image:linear-gradient(180deg,rgba(1,4,12,.12),rgba(1,5,16,.28) 56%,rgba(0,2,8,.78)),radial-gradient(circle at 48% 42%,rgba(105,235,255,.08),transparent 30%),var(--life-map-authored-world);background-size:cover;background-position:center 48%;background-repeat:no-repeat;filter:saturate(1.18) contrast(1.08) brightness(.84);transform:scale(1.018)}
      .life-map-visual-spine::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 0 30%,rgba(0,2,9,.16) 58%,rgba(0,2,9,.72) 100%),linear-gradient(90deg,rgba(0,2,8,.38),transparent 25%,transparent 75%,rgba(0,2,8,.38))}
      .life-map-visual-spine__nebula{position:absolute;border-radius:50%;filter:blur(70px);mix-blend-mode:screen;opacity:.42}.life-map-visual-spine__nebula--cyan{left:8%;top:12%;width:46vw;height:48vh;background:rgba(50,212,255,.18);transform:rotate(-14deg)}.life-map-visual-spine__nebula--violet{right:7%;top:28%;width:44vw;height:48vh;background:rgba(151,87,255,.16);transform:rotate(18deg)}
      .life-map-visual-spine__river{position:absolute;left:7%;right:7%;top:18%;height:70%;transform:perspective(1100px) rotateX(64deg) rotateZ(-8deg);transform-origin:center;border:1px solid rgba(151,226,255,.1);border-radius:50%;box-shadow:0 0 130px rgba(78,216,255,.08),inset 0 0 100px rgba(159,92,255,.06)}
      .life-map-visual-spine__river i{position:absolute;inset:12% 6%;border:1px solid rgba(164,237,255,.09);border-radius:50%;transform:rotate(var(--river-rotation,0deg))}.life-map-visual-spine__river i:nth-child(2){inset:24% 14%;--river-rotation:9deg;border-color:rgba(195,164,255,.1)}.life-map-visual-spine__river i:nth-child(3){inset:36% 24%;--river-rotation:-12deg;border-color:rgba(255,236,174,.08)}
      .life-map-visual-spine__era{position:absolute;z-index:1;width:190px;height:74px;border-top:1px solid rgba(189,239,255,.12);transform:perspective(900px) rotateY(var(--era-tilt));opacity:.7}.life-map-visual-spine__era span{position:absolute;top:8px;font:800 8px/1 ui-sans-serif,system-ui;letter-spacing:.24em;text-transform:uppercase;color:rgba(215,246,255,.5)}.life-map-visual-spine__era--past{left:6%;top:20%;--era-tilt:24deg}.life-map-visual-spine__era--present{left:44%;top:15%;--era-tilt:-5deg}.life-map-visual-spine__era--future{right:4%;top:23%;--era-tilt:-24deg}
      .life-map-memory-window{position:absolute;z-index:2;left:var(--memory-left);top:var(--memory-top);width:var(--memory-width);aspect-ratio:var(--memory-ratio);transform:translate(-50%,-50%) perspective(1000px) rotateY(var(--memory-tilt)) rotateZ(var(--memory-rotate));border:1px solid color-mix(in srgb,var(--memory-color) 48%,transparent);border-radius:18px;background:rgba(1,7,20,.78);box-shadow:0 24px 90px rgba(0,0,0,.48),0 0 56px color-mix(in srgb,var(--memory-color) 16%,transparent),inset 0 1px 0 rgba(255,255,255,.12);overflow:hidden;animation:life-map-window-breathe 9s ease-in-out infinite;animation-delay:var(--memory-delay)}
      .life-map-memory-window--far{opacity:.48;filter:blur(.25px) saturate(.82)}.life-map-memory-window--middle{opacity:.72}.life-map-memory-window--near{opacity:.84}
      .life-map-memory-window__image{position:absolute;inset:0;background-image:linear-gradient(180deg,rgba(255,255,255,.07),transparent 24%,rgba(0,3,12,.82)),radial-gradient(circle at 42% 32%,color-mix(in srgb,var(--memory-color) 58%,white) 0 2%,color-mix(in srgb,var(--memory-color) 30%,transparent) 3% 18%,transparent 45%),linear-gradient(132deg,color-mix(in srgb,var(--memory-color) 18%,#071426),#02050d 56%,color-mix(in srgb,var(--memory-color) 10%,#02050d));}
      .life-map-memory-window__image::before{content:"";position:absolute;inset:13% 11% 28%;border:1px solid color-mix(in srgb,var(--memory-color) 28%,transparent);clip-path:polygon(5% 72%,25% 39%,46% 58%,70% 22%,94% 48%,94% 100%,5% 100%);background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--memory-color) 20%,transparent))}
      .life-map-memory-window__meta{position:absolute;left:13px;right:13px;bottom:11px;display:grid;gap:3px;text-shadow:0 4px 18px rgba(0,0,0,.9)}.life-map-memory-window__meta span{font:900 8px/1 ui-sans-serif,system-ui;letter-spacing:.2em;text-transform:uppercase;color:color-mix(in srgb,var(--memory-color) 78%,white)}.life-map-memory-window__meta i{font:650 8px/1.2 ui-sans-serif,system-ui;font-style:normal;color:rgba(229,246,255,.55)}
      .life-map-visual-spine__foreground{position:absolute;z-index:3;bottom:-14%;width:18vw;height:66vh;background:linear-gradient(180deg,rgba(11,24,39,.08),rgba(0,2,8,.86));border:1px solid rgba(165,235,255,.05);filter:blur(.2px)}.life-map-visual-spine__foreground--left{left:-7%;transform:rotate(13deg)}.life-map-visual-spine__foreground--right{right:-8%;transform:rotate(-11deg)}
      :global([data-testid="urai-true-3d-life-map"]){z-index:4!important;background:transparent!important}
      :global([data-testid="urai-true-3d-life-map"] .life-map-cosmic-wash){background:radial-gradient(circle at 22% 28%,rgba(72,214,255,.06),transparent 27%),radial-gradient(circle at 76% 42%,rgba(159,92,255,.06),transparent 31%),linear-gradient(180deg,rgba(1,3,10,.08),rgba(3,8,21,.15) 54%,rgba(1,2,8,.36))!important}
      :global([data-testid="urai-true-3d-life-map"] .life-map-depth-vignette){opacity:.54}
      :global([data-testid="urai-true-3d-life-map"] > div:has(> canvas)){z-index:3!important;mix-blend-mode:screen}
      :global([data-testid="urai-true-3d-life-map"] canvas){mix-blend-mode:screen;filter:brightness(1.34) saturate(1.28) contrast(1.08)}
      :global(.urai-lifemap-selected-visual){position:absolute;z-index:16;left:48%;top:48%;width:min(48vw,660px);aspect-ratio:16/10;transform:translate(-58%,-50%) perspective(1200px) rotateY(7deg) rotateZ(-1.4deg);pointer-events:none;filter:drop-shadow(0 34px 80px rgba(0,0,0,.7))}
      :global(.urai-lifemap-selected-visual__halo){position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(circle,rgba(94,231,255,.16),rgba(132,90,255,.08) 38%,transparent 70%);filter:blur(30px)}
      :global(.urai-lifemap-selected-visual__frame){position:absolute;inset:0;overflow:hidden;border:1px solid rgba(198,247,255,.46);border-radius:28px;background-image:linear-gradient(180deg,rgba(255,255,255,.08),transparent 28%,rgba(1,4,14,.88)),radial-gradient(circle at 48% 34%,rgba(129,239,255,.34),transparent 28%),var(--life-map-authored-world);background-size:cover;background-position:center;box-shadow:0 30px 110px rgba(0,0,0,.64),0 0 90px rgba(85,220,255,.14),inset 0 1px 0 rgba(255,255,255,.18)}
      :global(.urai-lifemap-selected-visual__frame::before){content:"";position:absolute;inset:9%;border:1px solid rgba(203,247,255,.15);clip-path:polygon(0 64%,18% 41%,38% 58%,57% 20%,76% 47%,100% 26%,100% 100%,0 100%);background:linear-gradient(180deg,transparent,rgba(62,196,230,.14))}
      :global(.urai-lifemap-selected-visual__copy){position:absolute;left:clamp(18px,3vw,34px);right:clamp(18px,3vw,34px);bottom:clamp(18px,3vw,30px);display:grid;gap:6px;text-shadow:0 8px 30px rgba(0,0,0,.94)}
      :global(.urai-lifemap-selected-visual__copy span){font:900 9px/1 ui-sans-serif,system-ui;letter-spacing:.24em;text-transform:uppercase;color:rgba(176,245,255,.88)}
      :global(.urai-lifemap-selected-visual__copy strong){font:850 clamp(25px,4vw,52px)/.95 ui-sans-serif,system-ui;letter-spacing:-.055em;color:#f7fdff}
      :global(.urai-lifemap-selected-visual__copy i){font:650 10px/1.3 ui-sans-serif,system-ui;font-style:normal;color:rgba(224,244,255,.64)}
      :global(.urai-lifemap-deep-link-controls){top:auto!important;right:max(18px,env(safe-area-inset-right))!important;bottom:max(20px,env(safe-area-inset-bottom))!important;width:min(300px,calc(100vw - 36px))!important;padding:14px!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(2,10,24,.82),rgba(15,7,34,.72))!important;box-shadow:0 24px 80px rgba(0,0,0,.5),0 0 54px rgba(87,224,255,.1)!important}
      :global(.urai-lifemap-deep-link-controls__title){font-size:clamp(20px,2.2vw,28px)!important}
      :global(.urai-lifemap-deep-link-controls__detail){font-size:11px!important}
      @keyframes life-map-window-breathe{0%,100%{translate:0 0}50%{translate:0 -8px}}
      @media(max-width:760px){.life-map-visual-spine{background-position:center 42%;transform:scale(1.03)}.life-map-visual-spine__nebula{filter:blur(48px)}.life-map-visual-spine__river{left:-18%;right:-18%;top:22%;height:62%;transform:perspective(850px) rotateX(68deg) rotateZ(-12deg)}.life-map-memory-window{width:calc(var(--memory-width) * .68);border-radius:14px}.life-map-memory-window:nth-of-type(even){opacity:.42}.life-map-visual-spine__era{display:none}.life-map-visual-spine__foreground{width:30vw}.life-map-memory-window__meta i{display:none}:global(.urai-lifemap-selected-visual){left:50%;top:43%;width:min(88vw,520px);transform:translate(-50%,-50%) perspective(900px) rotateY(0deg) rotateZ(-1deg)}:global(.urai-lifemap-selected-visual__frame){border-radius:22px}:global(.urai-lifemap-selected-visual__copy strong){font-size:clamp(25px,8vw,40px)}:global(.urai-lifemap-deep-link-controls){left:max(12px,env(safe-area-inset-left))!important;right:max(12px,env(safe-area-inset-right))!important;bottom:max(12px,env(safe-area-inset-bottom))!important;width:auto!important;padding:12px!important}:global(.urai-lifemap-deep-link-controls__detail){display:none}:global(.urai-lifemap-deep-link-controls__actions){margin-top:0!important}:global([data-testid="urai-true-3d-life-map"] .life-map-whisper){bottom:max(118px,calc(env(safe-area-inset-bottom) + 106px))!important;width:min(300px,calc(100vw - 24px))!important}}
      @media(prefers-reduced-motion:reduce){.life-map-visual-spine,.life-map-memory-window{transform:none;animation:none}.life-map-memory-window{transform:translate(-50%,-50%) rotateZ(var(--memory-rotate))}:global(.urai-lifemap-selected-visual){transform:translate(-58%,-50%)} }
    `}</style>
  </section>;
}
