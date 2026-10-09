"use client";

import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { assetCssStack, lifeMapAssets } from "@/spatial/assets/uraiAssets";
import { requestUraiWorldReturn } from "@/spatial/world/worldEvents";
import LifeMapRouteBoundary from "@/components/lifemap/LifeMapRouteBoundary";
import LifeMapSemanticNavigator from "@/components/lifemap/LifeMapSemanticNavigator";
import { app, firebasePublicEnvReady } from "@/lib/firebase/client";

const DEMO_MANIFEST_ID = "replay-recovery-thread";
type LifeMapAccessMode = "checking" | "signed-out" | "private" | "explicit-demo";

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.closest('[data-urai-adam-presence]') || target.isContentEditable || target.matches('input,textarea,select,[role="textbox"]'));
}

function LifeMapLoading({ label = "Opening your memory universe" }: { label?: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || isEditableTarget(event.target)) return;
      event.preventDefault();
      requestUraiWorldReturn();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
  return <main aria-label="Life Map authored fallback" data-testid="urai-life-map-authored-fallback" data-life-map-fallback="authored-semantic" style={{ position:"relative", minHeight:"100svh", overflow:"hidden", color:"#f8fbff", background:"radial-gradient(circle at 30% 30%,rgba(103,232,249,.16),transparent 26%),radial-gradient(circle at 72% 54%,rgba(196,181,253,.14),transparent 28%),#01030a" }}>
    <div aria-hidden="true" style={{ position:"absolute", inset:0, backgroundImage:assetCssStack(lifeMapAssets.primary), backgroundSize:"cover", backgroundPosition:"center", opacity:.12 }} />
    <section style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:"min(560px,calc(100% - 36px))", padding:28, border:"1px solid rgba(180,239,255,.2)", borderRadius:28, background:"rgba(2,7,18,.74)", backdropFilter:"blur(22px)", textAlign:"center" }}>
      <p style={{ margin:0, fontSize:10, fontWeight:900, letterSpacing:".24em", textTransform:"uppercase", color:"#a5f3fc" }}>URAI · LIFE MAP</p>
      <h1 style={{ margin:"10px 0 0", fontSize:"clamp(34px,7vw,74px)", lineHeight:.9, letterSpacing:"-.06em" }}>Your life has depth.</h1>
      <p role="status" aria-live="polite" style={{ margin:"18px 0 0", color:"rgba(235,244,255,.75)" }}>{label} · Escape remains available</p>
      <button type="button" onClick={() => router.push("/home")} style={{ minHeight:48, marginTop:20, padding:"0 20px", border:"1px solid rgba(232,251,255,.22)", borderRadius:999, background:"rgba(8,24,38,.82)", color:"#fff", fontWeight:900, cursor:"pointer" }}>Return Home</button>
      <AdamLauncherSlot name="life-map-fallback" as="div" />
    </section>
  </main>;
}

function SignedOutLifeMap({ onOpenDemo, onReturnHome }: { onOpenDemo: () => void; onReturnHome: () => void }) {
  return <main aria-label="Signed-out Life Map threshold" data-testid="urai-life-map-signed-out-threshold" data-life-map-source="signed-out" data-private-memory-mounted="false" style={{ position:"relative", minHeight:"100svh", overflow:"hidden", color:"#f8fbff", background:"#01030a" }}>
    <picture aria-hidden="true" style={{ position:"absolute", inset:0 }}><source media="(max-width:700px)" srcSet={lifeMapAssets.mobile.src} /><img src={lifeMapAssets.primary.src} alt="" draggable={false} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"saturate(1.05) contrast(1.08) brightness(.62)" }} /></picture>
    <div aria-hidden="true" style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 50% 42%,rgba(16,48,73,.04),rgba(1,3,10,.76) 88%)" }} />
    <section style={{ position:"absolute", left:"max(16px,env(safe-area-inset-left))", bottom:"max(18px,env(safe-area-inset-bottom))", width:"min(420px,calc(100% - 32px))", padding:18, border:"1px solid rgba(183,239,255,.2)", borderRadius:22, background:"rgba(2,7,17,.8)", backdropFilter:"blur(20px)" }}>
      <p style={{ margin:0, fontSize:10, fontWeight:900, letterSpacing:".22em", textTransform:"uppercase", color:"#b7efff" }}>DISCLOSED SAMPLE · NOT YOUR MEMORIES</p>
      <h1 style={{ margin:"8px 0 0", fontSize:"clamp(24px,4vw,40px)", lineHeight:.95, letterSpacing:"-.05em" }}>Entering an interactive sample universe.</h1>
      <p style={{ margin:"12px 0 0", fontSize:13, lineHeight:1.5, color:"rgba(235,244,255,.76)" }}>No private memory data is mounted. You can travel, search, select, inspect, and return safely.</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14 }}><button type="button" onClick={onOpenDemo} style={{ minHeight:48, padding:"0 18px", border:0, borderRadius:999, fontWeight:900, cursor:"pointer" }}>Open disclosed sample</button><button type="button" onClick={onReturnHome} style={{ minHeight:48, padding:"0 18px", border:"1px solid rgba(232,251,255,.2)", borderRadius:999, background:"rgba(2,7,17,.62)", color:"#fff", fontWeight:900, cursor:"pointer" }}>Return Home</button></div><AdamLauncherSlot name="life-map-signed-out" as="div" />
    </section>
    <div role="status" aria-live="polite" style={{ position:"absolute", left:"max(16px,env(safe-area-inset-left))", top:"max(16px,env(safe-area-inset-top))", fontSize:10, fontWeight:900, letterSpacing:".2em", textTransform:"uppercase", color:"rgba(220,247,255,.72)" }}>Signed out · no personal data displayed</div>
  </main>;
}

function useWebGLCapability() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const supported = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.width = 1;
      canvas.height = 1;
      setAvailable(supported);
    } catch {
      setAvailable(false);
    }
  }, []);
  return available;
}

function LifeMapAccessGate() {
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => params.toString(), [params]);
  const [mode, setMode] = useState<LifeMapAccessMode>("checking");
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const webglAvailable = useWebGLCapability();

  useEffect(() => {
    const current = new URLSearchParams(query);
    if (current.get("demo") === "1") { setMode("explicit-demo"); setAuthenticatedUserId(null); return; }

    if (!firebasePublicEnvReady) {
      setAuthenticatedUserId(null);
      setMode("signed-out");
      return;
    }

    setMode("checking");
    const auth = getAuth(app);
    return onAuthStateChanged(auth, (user) => {
      setAuthenticatedUserId(user?.uid ?? null);
      setMode(user ? "private" : "signed-out");
    });
  }, [query]);

  const openDemo = useCallback(() => {
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    if (pathname !== "/life-map") return;
    const next = new URLSearchParams(query);
    next.set("demo", "1");
    next.set("manifestId", DEMO_MANIFEST_ID);
    next.set("overview", "1");
    setMode("explicit-demo");
    router.replace(`/life-map?${next.toString()}`, { scroll:false });
  }, [query, router]);

  if (mode === "checking" || webglAvailable === null) return <LifeMapLoading label="Checking the private threshold" />;
  if (!webglAvailable) {
    if (mode === "signed-out") {
      return <><SignedOutLifeMap onOpenDemo={openDemo} onReturnHome={() => router.push("/home")} /><LifeMapSemanticNavigator authenticatedUserId={null} /></>;
    }
    return <><LifeMapLoading label="WebGL is unavailable. Semantic navigation remains available" /><LifeMapSemanticNavigator authenticatedUserId={mode === "private" ? authenticatedUserId : null} /></>;
  }
  return <section role={mode === "signed-out" ? "main" : undefined} data-testid="urai-r3f-canonical-lifemap" data-canonical-asset={lifeMapAssets.primary.src} data-selected-memory-owner="spatial-lens-only" data-life-map-access={mode} data-life-map-source={mode} data-private-memory-mounted={mode === "signed-out" ? "false" : undefined} aria-label="URAI canonical spatial Life Map" style={{ position:"fixed", inset:0, zIndex:100, width:"100vw", height:"100svh", minHeight:"100svh", overflow:"hidden", background:"#01030a" }}>
    <div
      aria-hidden={mode === "signed-out" ? true : undefined}
      inert={mode === "signed-out" ? true : undefined}
      style={{ position:"absolute", inset:0 }}
    >
      <LifeMapRouteBoundary authenticatedUserId={mode === "private" ? authenticatedUserId : null} />
    </div>
    {mode === "signed-out" ? <aside data-testid="urai-life-map-signed-out-disclosure" aria-label="Signed-out Life Map disclosure" style={{ position:"absolute", zIndex:120, left:"max(16px,env(safe-area-inset-left))", bottom:"max(16px,env(safe-area-inset-bottom))", width:"min(390px,calc(100vw - 32px))", padding:14, border:"1px solid rgba(183,239,255,.2)", borderRadius:18, background:"rgba(2,7,17,.78)", backdropFilter:"blur(18px)", color:"#f8fbff" }}>
      <strong style={{ display:"block", fontSize:11, letterSpacing:".12em", textTransform:"uppercase" }}>Signed out · no personal data displayed</strong>
      <span style={{ display:"block", marginTop:6, fontSize:12, lineHeight:1.45, color:"rgba(235,244,255,.76)" }}>This is the real empty Life Map realm. No private memories are mounted.</span>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
        <button type="button" onClick={openDemo} style={{ minHeight:48, padding:"0 16px", border:0, borderRadius:999, fontWeight:900, cursor:"pointer" }}>Open disclosed sample</button>
        <button type="button" onClick={() => router.push("/home")} style={{ minHeight:48, padding:"0 16px", border:"1px solid rgba(232,251,255,.2)", borderRadius:999, background:"rgba(2,7,17,.62)", color:"#fff", fontWeight:900, cursor:"pointer" }}>Return Home</button>
        <AdamLauncherSlot name="life-map-unsigned-controls" />
      </div>
    </aside> : null}
  </section>;
}

export default function SpatialLifeMapCanonical() {
  return <Suspense fallback={<LifeMapLoading label="Checking the private threshold" />}><LifeMapAccessGate /></Suspense>;
}
