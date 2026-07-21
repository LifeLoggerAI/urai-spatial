"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { assetCssStack, lifeMapAssets } from "@/spatial/assets/uraiAssets";
import { requestUraiWorldReturn } from "@/spatial/world/worldEvents";

const FALLBACK_MEMORIES = [
  { title: "People", detail: "Relationship constellations", left: "18%", top: "31%", size: 108, color: "#c4b5fd" },
  { title: "Places", detail: "Consent-aware place memory", left: "66%", top: "25%", size: 86, color: "#5eead4" },
  { title: "Eras", detail: "Time regions and turning points", left: "42%", top: "58%", size: 126, color: "#93c5fd" },
  { title: "Artifacts", detail: "Sources and provenance attached", left: "73%", top: "66%", size: 94, color: "#fde68a" },
] as const;

const DEMO_MODE_KEY = "urai:lifeMapDemoMode";
const USER_ID_KEY = "urai:userId";
const DEMO_MANIFEST_ID = "replay-recovery-thread";

type LifeMapAccessMode = "checking" | "signed-out" | "private" | "explicit-demo";

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'));
}

function LifeMapLoading({ label = "Opening your memory universe" }: { label?: string }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || isEditableTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestUraiWorldReturn();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return <main aria-label="Life Map authored fallback" data-testid="urai-life-map-authored-fallback" data-life-map-fallback-escape="world-return" style={{ position: "relative", minHeight: "100svh", overflow: "hidden", color: "#f8fbff", background: "radial-gradient(circle at 24% 24%, rgba(103,232,249,.2), transparent 22%), radial-gradient(circle at 72% 38%, rgba(196,181,253,.18), transparent 26%), linear-gradient(180deg,#01030a 0%,#04091a 56%,#010208 100%)" }}>
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: assetCssStack(lifeMapAssets.primary), backgroundSize: "cover", backgroundPosition: "center", opacity: .16, mixBlendMode: "screen" }} />
    <div aria-hidden="true" style={{ position: "absolute", inset: "12% 8% 16%", transform: "perspective(900px) rotateX(58deg) rotateZ(-8deg)", border: "1px solid rgba(147,197,253,.16)", borderRadius: "50%", boxShadow: "0 0 120px rgba(103,232,249,.08), inset 0 0 90px rgba(196,181,253,.08)" }} />
    {FALLBACK_MEMORIES.map((memory) => <section key={memory.title} aria-label={`${memory.title}. ${memory.detail}.`} style={{ position: "absolute", left: memory.left, top: memory.top, width: memory.size, minHeight: memory.size, transform: "translate(-50%,-50%)", display: "grid", placeItems: "center", border: `1px solid ${memory.color}66`, borderRadius: "999px", background: `radial-gradient(circle,${memory.color}35,rgba(3,7,18,.72) 62%,transparent 70%)`, boxShadow: `0 0 70px ${memory.color}32`, textAlign: "center", padding: 12 }}><strong style={{ display: "block", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>{memory.title}</strong><span style={{ display: "block", maxWidth: 94, fontSize: 9, lineHeight: 1.35, color: "rgba(235,244,255,.72)" }}>{memory.detail}</span></section>)}
    <section style={{ position: "absolute", left: "max(18px,env(safe-area-inset-left))", top: "max(18px,env(safe-area-inset-top))", width: "min(390px,calc(100% - 36px))", padding: 18, border: "1px solid rgba(165,243,252,.18)", borderRadius: 24, background: "rgba(3,7,18,.64)", backdropFilter: "blur(18px)", boxShadow: "0 24px 90px rgba(0,0,0,.36)" }}><p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: ".24em", textTransform: "uppercase", color: "#a5f3fc" }}>URAI · Life Map</p><h1 style={{ margin: "6px 0 0", fontSize: "clamp(30px,6vw,62px)", lineHeight: .9, letterSpacing: "-.065em" }}>Your life has depth.</h1><p style={{ margin: "13px 0 0", maxWidth: 330, fontSize: 13, lineHeight: 1.55, color: "rgba(235,244,255,.78)" }}>Memories, people, places, eras, and artifacts remain distinct while the full spatial field opens. Nothing private is exposed by this authored fallback.</p></section>
    <div role="status" aria-live="polite" style={{ position: "absolute", left: "50%", bottom: "max(26px,env(safe-area-inset-bottom))", transform: "translateX(-50%)", width: "min(520px,calc(100% - 32px))", padding: "12px 16px", border: "1px solid rgba(165,243,252,.18)", borderRadius: 999, background: "rgba(3,7,18,.74)", backdropFilter: "blur(18px)", textAlign: "center", fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>{label} · Escape remains available</div>
  </main>;
}

function SignedOutLifeMap({ onOpenDemo, onReturnHome }: { onOpenDemo: () => void; onReturnHome: () => void }) {
  return (
    <main
      aria-label="Signed-out Life Map threshold"
      data-testid="urai-life-map-signed-out-threshold"
      data-life-map-source="signed-out"
      data-private-memory-mounted="false"
      style={{ position: "relative", minHeight: "100svh", overflow: "hidden", color: "#f8fbff", background: "#01030a" }}
    >
      <picture aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <source media="(max-width: 700px)" srcSet={lifeMapAssets.mobile.src} />
        <img src={lifeMapAssets.primary.src} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.08) contrast(1.08) brightness(.72)" }} />
      </picture>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%,rgba(17,55,82,.12),rgba(1,3,10,.18) 34%,rgba(1,3,10,.82) 88%),linear-gradient(180deg,rgba(1,3,10,.12),rgba(1,3,10,.78))" }} />
      <section style={{ position: "absolute", left: "clamp(18px,4vw,64px)", bottom: "clamp(92px,12vh,150px)", width: "min(560px,calc(100% - 36px))", padding: "clamp(22px,4vw,38px)", border: "1px solid rgba(183,239,255,.18)", borderRadius: 30, background: "rgba(2,7,17,.72)", backdropFilter: "blur(22px)", boxShadow: "0 34px 120px rgba(0,0,0,.5)" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: ".28em", textTransform: "uppercase", color: "#b7efff" }}>URAI · Private constellation</p>
        <h1 style={{ margin: "10px 0 0", maxWidth: 470, fontSize: "clamp(38px,7vw,76px)", lineHeight: .9, letterSpacing: "-.07em" }}>Your memories stay closed until you open them.</h1>
        <p style={{ margin: "18px 0 0", maxWidth: 500, fontSize: 15, lineHeight: 1.65, color: "rgba(235,244,255,.76)" }}>No private memory data is mounted on this signed-out threshold. Enter the disclosed sample constellation, or return Home.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onOpenDemo} style={{ minHeight: 48, padding: "0 20px", border: 0, borderRadius: 999, background: "#e8fbff", color: "#06111c", fontWeight: 900, cursor: "pointer" }}>Open disclosed sample</button>
          <button type="button" onClick={onReturnHome} style={{ minHeight: 48, padding: "0 20px", border: "1px solid rgba(232,251,255,.2)", borderRadius: 999, background: "rgba(2,7,17,.62)", color: "#f8fbff", fontWeight: 900, cursor: "pointer" }}>Return Home</button>
        </div>
      </section>
      <div role="status" aria-live="polite" style={{ position: "absolute", left: "clamp(18px,4vw,64px)", top: "max(18px,env(safe-area-inset-top))", fontSize: 10, fontWeight: 900, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(220,247,255,.68)" }}>Signed out · no personal data displayed</div>
    </main>
  );
}

const LifeMapRouteBoundary = dynamic(() => import("@/components/lifemap/LifeMapRouteBoundary"), { ssr: false, loading: () => <LifeMapLoading /> });

function LifeMapAccessGate() {
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => params.toString(), [params]);
  const [mode, setMode] = useState<LifeMapAccessMode>("checking");

  useEffect(() => {
    const current = new URLSearchParams(query);
    const explicitDemo = current.get("demo") === "1";
    try {
      const storedUserId = window.localStorage.getItem(USER_ID_KEY)?.trim();
      const retainedDemo = window.localStorage.getItem(DEMO_MODE_KEY) === "true";
      const demoContinuation = retainedDemo && current.get("manifestId") === DEMO_MANIFEST_ID;
      if (explicitDemo || demoContinuation) {
        window.localStorage.setItem(DEMO_MODE_KEY, "true");
        setMode("explicit-demo");
        return;
      }
      setMode(storedUserId ? "private" : "signed-out");
    } catch {
      setMode(explicitDemo ? "explicit-demo" : "signed-out");
    }
  }, [query]);

  const openDemo = () => {
    try {
      window.localStorage.setItem(DEMO_MODE_KEY, "true");
    } catch {
      // Query identity still explicitly discloses the sample when storage is unavailable.
    }
    const next = new URLSearchParams(query);
    next.set("demo", "1");
    next.set("manifestId", DEMO_MANIFEST_ID);
    next.set("overview", "1");
    setMode("explicit-demo");
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  };

  if (mode === "checking") return <LifeMapLoading label="Checking the private threshold" />;
  if (mode === "signed-out") return <SignedOutLifeMap onOpenDemo={openDemo} onReturnHome={() => router.push("/home")} />;

  return <section data-testid="urai-r3f-canonical-lifemap" data-canonical-asset={lifeMapAssets.primary.src} data-selected-memory-owner="spatial-lens-only" data-life-map-access={mode} aria-label="URAI canonical spatial Life Map" style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: "#01030a" }}>
    <Suspense fallback={<LifeMapLoading label="Preserving your map while the spatial field opens" />}><LifeMapRouteBoundary /></Suspense>
    <picture aria-hidden="true" data-life-map-authored-universe="primary" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .78 }}>
      <source media="(max-width: 700px)" srcSet={lifeMapAssets.mobile.src} />
      <img src={lifeMapAssets.primary.src} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.12) contrast(1.06) brightness(.9)" }} />
    </picture>
  </section>;
}

export default function SpatialLifeMapCanonical() {
  return <LifeMapAccessGate />;
}
