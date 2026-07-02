"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_CLASSES = [
  "urai-route-home",
  "urai-route-ground",
  "urai-route-life-map",
  "urai-route-focus",
  "urai-route-replay",
  "urai-route-mirror",
  "urai-route-passport",
  "urai-route-status",
  "urai-route-privacy-controls",
  "urai-route-location-map",
  "urai-route-spatial-xr",
];

function txt(el: Element | null): string {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function routeClassFor(pathname: string): string | null {
  if (pathname === "/" || pathname.startsWith("/home")) return "urai-route-home";
  if (pathname.startsWith("/ground")) return "urai-route-ground";
  if (pathname.startsWith("/life-map")) return "urai-route-life-map";
  if (pathname.startsWith("/focus")) return "urai-route-focus";
  if (pathname.startsWith("/replay")) return "urai-route-replay";
  if (pathname.startsWith("/mirror")) return "urai-route-mirror";
  if (pathname.startsWith("/passport")) return "urai-route-passport";
  if (pathname.startsWith("/status")) return "urai-route-status";
  if (pathname.startsWith("/privacy-controls")) return "urai-route-privacy-controls";
  if (pathname.startsWith("/location-map")) return "urai-route-location-map";
  if (pathname.startsWith("/spatial/ar-vr")) return "urai-route-spatial-xr";
  return null;
}

function cleanup(root: HTMLElement) {
  ROUTE_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.remove(
    "urai-spatial-dragging",
    "urai-spatial-warping",
    "urai-spatial-hotspot-hover",
    "urai-spatial-focus-hover",
    "urai-spatial-replay-pulse",
  );

  document
    .querySelectorAll<HTMLElement>(
      ".urai-spatial-world-stage,.urai-spatial-memory-node,.urai-spatial-memory-armed"
    )
    .forEach((el) => {
      el.classList.remove("urai-spatial-world-stage", "urai-spatial-memory-node", "urai-spatial-memory-armed");
      el.removeAttribute("data-urai-spatial-node");
    });

  document
    .querySelectorAll<HTMLElement>(
      ".urai-spatial-hotspot,.urai-spatial-hud,.urai-spatial-depth-meter,.urai-spatial-reticle,.urai-spatial-warp-flash,.urai-spatial-route-backdrop,.urai-spatial-focus-aperture,.urai-spatial-focus-cue,.urai-spatial-replay-cinema,.urai-spatial-film-beats"
    )
    .forEach((el) => el.remove());
}

function node(className: string, text?: string): HTMLElement {
  let el = document.querySelector<HTMLElement>(`.${className}`);
  if (!el) {
    el = document.createElement("div");
    el.className = className;
    if (text) el.textContent = text;
    document.body.appendChild(el);
  }
  return el;
}

function ensureV1AuditRouteStyles() {
  if (document.getElementById("urai-v1-audit-route-styles")) return;
  const style = document.createElement("style");
  style.id = "urai-v1-audit-route-styles";
  style.textContent = `
html.urai-route-life-map,html.urai-route-life-map body{height:100svh!important;min-height:100svh!important;max-height:100svh!important;overflow:hidden!important}
html.urai-route-life-map main,html.urai-route-life-map [class*="stage"],html.urai-route-life-map [class*="Stage"],html.urai-route-life-map [class*="scene"],html.urai-route-life-map [class*="Scene"]{height:100svh!important;min-height:100svh!important;max-height:100svh!important;overflow:hidden!important}
html.urai-route-ground body,html.urai-route-location-map body,html.urai-route-privacy-controls body,html.urai-route-status body,html.urai-route-spatial-xr body{overflow-x:hidden!important;max-width:100vw!important}
html.urai-route-ground main,html.urai-route-ground section,html.urai-route-ground article,html.urai-route-location-map main,html.urai-route-location-map section,html.urai-route-location-map article{max-width:100vw!important;box-sizing:border-box!important}
@media(max-width:760px){html.urai-route-life-map body{height:100svh!important;min-height:100svh!important}html.urai-route-life-map .urai-spatial-hotspot{max-width:104px;max-height:104px}html.urai-route-life-map .urai-spatial-hud{left:8px!important;right:8px!important;bottom:calc(env(safe-area-inset-bottom) + 14px)!important;max-width:calc(100vw - 16px)!important;font-size:8.5px!important;line-height:1.25!important}html.urai-route-ground body{min-height:100svh!important;overflow-x:hidden!important}html.urai-route-ground [class*="card"],html.urai-route-ground [class*="Card"],html.urai-route-ground [class*="panel"],html.urai-route-ground [class*="Panel"]{max-width:calc(100vw - 20px)!important}html.urai-route-location-map body{height:100svh!important;min-height:100svh!important;max-height:100svh!important;overflow:auto!important}html.urai-route-location-map main{min-height:100svh!important;padding-bottom:24px!important}html.urai-route-location-map [class*="grid"],html.urai-route-location-map [class*="Grid"]{max-height:calc(100svh - 260px)!important;overflow:auto!important}html.urai-route-spatial-xr body{overflow-x:hidden!important}html.urai-route-spatial-xr main{max-width:100vw!important;overflow-x:hidden!important}}
`;
  document.head.appendChild(style);
}

function ensureFocusReplayCueStyles() {
  if (document.getElementById("urai-focus-replay-cue-styles")) return;
  const style = document.createElement("style");
  style.id = "urai-focus-replay-cue-styles";
  style.textContent = `
.urai-spatial-route-backdrop{position:fixed;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 42%,rgba(185,245,255,.12),transparent 30%),radial-gradient(circle at 72% 52%,rgba(169,126,255,.10),transparent 34%),linear-gradient(180deg,rgba(2,6,23,.12),rgba(2,6,23,.42));mix-blend-mode:screen}
html.urai-route-focus body,html.urai-route-replay body{background:#020617!important}
html.urai-route-focus .urai-spatial-world-stage,html.urai-route-replay .urai-spatial-world-stage{transform:perspective(1100px) translate3d(0,-.4vh,0) scale(1.012)!important;transform-origin:50% 50%!important;transition:transform 320ms ease,filter 320ms ease!important}
.urai-spatial-focus-cue,.urai-spatial-replay-cinema,.urai-spatial-film-beats{position:fixed;z-index:10032;color:rgba(240,253,255,.94);border:1px solid rgba(190,245,255,.30);background:rgba(3,10,19,.66);box-shadow:0 18px 60px rgba(0,0,0,.34),inset 0 0 28px rgba(150,230,255,.07);backdrop-filter:blur(18px) saturate(1.18);-webkit-backdrop-filter:blur(18px) saturate(1.18)}
.urai-spatial-focus-cue,.urai-spatial-replay-cinema{left:16px;bottom:58px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;max-width:min(720px,calc(100vw - 32px));padding:9px 11px;border-radius:999px;font-size:10px;font-weight:820;letter-spacing:.04em;text-transform:uppercase}
.urai-spatial-focus-cue b,.urai-spatial-replay-cinema b,.urai-spatial-film-beats b{color:rgba(172,245,255,.98);text-shadow:0 0 18px rgba(130,230,255,.42)}
.urai-spatial-focus-cue span,.urai-spatial-replay-cinema span,.urai-spatial-film-beats span{opacity:.84}
.urai-spatial-focus-aperture{position:fixed;left:50%;top:48%;z-index:10025;width:clamp(180px,26vw,310px);height:clamp(180px,26vw,310px);transform:translate(-50%,-50%);display:grid;place-items:center;text-align:center;color:rgba(242,253,255,.96);border-radius:999px;border:1px solid rgba(200,248,255,.34);background:radial-gradient(circle,rgba(230,255,255,.15),transparent 38%),radial-gradient(circle,rgba(143,120,255,.14),transparent 70%);box-shadow:0 0 48px rgba(125,235,255,.28),0 0 130px rgba(147,128,255,.24),inset 0 0 42px rgba(211,251,255,.12);outline:none;cursor:pointer}
.urai-spatial-focus-aperture i{position:absolute;inset:24px;border-radius:inherit;border:1px dashed rgba(218,253,255,.45)}
.urai-spatial-focus-aperture b{max-width:12rem;font-size:clamp(1rem,2.3vw,1.6rem);line-height:1.02;text-shadow:0 0 24px rgba(151,238,255,.62)}
.urai-spatial-focus-aperture span{position:absolute;bottom:-22px;padding:6px 10px;border-radius:999px;border:1px solid rgba(194,244,255,.36);background:rgba(3,10,19,.76);font-size:10px;font-weight:850;text-transform:uppercase;white-space:nowrap}
.urai-spatial-focus-aperture:hover,.urai-spatial-focus-aperture:focus-visible,html.urai-spatial-focus-hover .urai-spatial-focus-aperture{filter:saturate(1.18) brightness(1.12);box-shadow:0 0 66px rgba(151,245,255,.46),0 0 170px rgba(169,136,255,.34),inset 0 0 54px rgba(208,251,255,.16)}
.urai-spatial-film-beats{right:18px;top:88px;width:min(220px,calc(100vw - 36px));padding:12px;border-radius:22px;display:grid;gap:7px;font-size:10px;font-weight:840;text-transform:uppercase}
.urai-spatial-film-beats span{display:block;padding:7px 9px;border-radius:999px;border:1px solid rgba(190,245,255,.20);background:rgba(255,255,255,.045)}
@media(max-width:760px){.urai-spatial-focus-cue,.urai-spatial-replay-cinema{left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 70px);border-radius:18px;max-width:none}.urai-spatial-focus-aperture{top:45%;width:176px;height:176px}.urai-spatial-film-beats{right:10px;top:76px;width:168px;padding:9px}}
`;
  document.head.appendChild(style);
}

function findWorldStage(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("main, [data-testid], section, article, body > div"))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ el, r }) => {
      if (el.closest(".urai-spatial-hud,.urai-spatial-hotspot,.urai-spatial-depth-meter")) return false;
      return r.width > window.innerWidth * 0.55 && r.height > window.innerHeight * 0.55;
    })
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);

  return candidates[0]?.el || document.querySelector<HTMLElement>("main");
}

function findQuietResetAnchor(): { x: number; y: number } {
  const all = Array.from(document.querySelectorAll<HTMLElement>("a,button,[role='button'],div,span,article,section"));
  const selectedPanel = all.find((el) => txt(el).includes("SELECTED STAR"));

  const candidates = all
    .filter((el) => txt(el).includes("The Quiet Reset"))
    .filter((el) => !selectedPanel || !selectedPanel.contains(el))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => {
      return r.width > 8 && r.height > 8 && r.width < 420 && r.height < 220 &&
        r.left > 0 && r.top > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
    })
    .sort((a, b) => {
      const ax = a.r.left + a.r.width / 2;
      const ay = a.r.top + a.r.height / 2;
      const bx = b.r.left + b.r.width / 2;
      const by = b.r.top + b.r.height / 2;
      return (
        Math.hypot(ax - window.innerWidth * 0.74, ay - window.innerHeight * 0.50) -
        Math.hypot(bx - window.innerWidth * 0.74, by - window.innerHeight * 0.50)
      );
    });

  const best = candidates[0]?.r;
  if (best) return { x: best.left + best.width / 2, y: best.top + best.height / 2 };
  return { x: window.innerWidth * 0.74, y: window.innerHeight * 0.50 };
}

function wireLifeMap(root: HTMLElement, signal: AbortSignal) {
  const stage = findWorldStage();
  if (stage) stage.classList.add("urai-spatial-world-stage");

  const hud = node("urai-spatial-hud");
  hud.innerHTML = `<b>SPATIAL ACTIVE</b><span>Drag = orbit</span><span>Scroll = depth</span><span>Hover star = magnetic</span><span>Double-click = Focus</span>`;

  const meter = node("urai-spatial-depth-meter");
  meter.innerHTML = `<b>DEPTH</b><span>1.00x</span>`;

  const hotspot = node("urai-spatial-hotspot");
  hotspot.setAttribute("role", "button");
  hotspot.setAttribute("tabindex", "0");
  hotspot.setAttribute("aria-label", "The Quiet Reset. Hover, double click, or press Enter to enter Focus.");
  hotspot.innerHTML = `<i></i><b>The Quiet Reset</b><span>Hover / double-click</span>`;

  node("urai-spatial-reticle");
  node("urai-spatial-warp-flash");

  let pointerX = 0;
  let pointerY = 0;
  let orbitX = 0;
  let orbitY = 0;
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;

  const placeHotspot = () => {
    const pos = findQuietResetAnchor();
    root.style.setProperty("--urai-hotspot-x", `${pos.x}px`);
    root.style.setProperty("--urai-hotspot-y", `${pos.y}px`);
  };

  const write = () => {
    raf = 0;
    root.style.setProperty("--urai-pointer-x", `${pointerX}px`);
    root.style.setProperty("--urai-pointer-y", `${pointerY}px`);
    root.style.setProperty("--urai-orbit-x", `${orbitX.toFixed(2)}deg`);
    root.style.setProperty("--urai-orbit-y", `${orbitY.toFixed(2)}deg`);
    root.style.setProperty("--urai-pan-x", `${panX.toFixed(2)}px`);
    root.style.setProperty("--urai-pan-y", `${panY.toFixed(2)}px`);
    root.style.setProperty("--urai-zoom", zoom.toFixed(3));
    root.style.setProperty("--urai-dust-x", `${(pointerX / Math.max(1, window.innerWidth) - 0.5) * 34}px`);
    root.style.setProperty("--urai-dust-y", `${(pointerY / Math.max(1, window.innerHeight) - 0.5) * 24}px`);
    const span = meter.querySelector("span");
    if (span) span.textContent = `${zoom.toFixed(2)}x`;
  };

  const schedule = () => {
    if (!raf) raf = window.requestAnimationFrame(write);
  };

  const enterFocus = () => {
    root.classList.add("urai-spatial-warping");
    window.setTimeout(() => window.location.assign("/focus?memoryId=quiet-reset&from=life-map-star"), 280);
  };

  const pointerMove = (e: PointerEvent) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      orbitX = Math.max(-18, Math.min(18, orbitX + dx * 0.055));
      orbitY = Math.max(-12, Math.min(12, orbitY - dy * 0.05));
      panX = Math.max(-38, Math.min(38, panX + dx * 0.12));
      panY = Math.max(-26, Math.min(26, panY + dy * 0.10));
      lastX = e.clientX;
      lastY = e.clientY;
    }
    schedule();
  };

  const pointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest("a,button,.urai-spatial-hotspot")) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    root.classList.add("urai-spatial-dragging");
  };

  const pointerUp = () => {
    dragging = false;
    root.classList.remove("urai-spatial-dragging");
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = zoom + (e.deltaY < 0 ? 0.055 : -0.055);
    zoom = Math.max(0.72, Math.min(1.42, next));
    root.classList.add("urai-spatial-depth-pulse");
    window.setTimeout(() => root.classList.remove("urai-spatial-depth-pulse"), 180);
    schedule();
  };

  const resize = () => {
    placeHotspot();
    schedule();
  };

  hotspot.addEventListener("mouseenter", () => root.classList.add("urai-spatial-hotspot-hover"), { signal });
  hotspot.addEventListener("mouseleave", () => root.classList.remove("urai-spatial-hotspot-hover"), { signal });
  hotspot.addEventListener("dblclick", enterFocus, { signal });
  hotspot.addEventListener("click", () => {
    hotspot.classList.add("urai-spatial-hotspot-tap");
    window.setTimeout(() => hotspot.classList.remove("urai-spatial-hotspot-tap"), 220);
  }, { signal });
  hotspot.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") enterFocus();
  }, { signal });

  window.addEventListener("pointermove", pointerMove, { signal });
  window.addEventListener("pointerdown", pointerDown, { signal });
  window.addEventListener("pointerup", pointerUp, { signal });
  window.addEventListener("pointercancel", pointerUp, { signal });
  window.addEventListener("resize", resize, { signal });
  window.addEventListener("wheel", wheel, { signal, passive: false, capture: true });
  document.addEventListener("wheel", wheel, { signal, passive: false, capture: true });

  placeHotspot();
  write();
  const timers = [150, 500, 1200].map((ms) => window.setTimeout(placeHotspot, ms));
  signal.addEventListener("abort", () => {
    timers.forEach(window.clearTimeout);
    if (raf) window.cancelAnimationFrame(raf);
  });
}

function wireFocus(root: HTMLElement, signal: AbortSignal) {
  ensureFocusReplayCueStyles();
  const stage = findWorldStage();
  if (stage) stage.classList.add("urai-spatial-world-stage");
  node("urai-spatial-route-backdrop");
  const hud = node("urai-spatial-focus-cue");
  hud.innerHTML = `<b>SELECTED MEMORY CAMERA CHAMBER</b><span>The Quiet Reset</span><span>Enter Replay = open the living thread</span>`;
  const aperture = node("urai-spatial-focus-aperture");
  aperture.setAttribute("role", "button");
  aperture.setAttribute("tabindex", "0");
  aperture.setAttribute("aria-label", "The Quiet Reset. Press Enter or double click to open Replay.");
  aperture.innerHTML = `<i></i><b>The Quiet Reset</b><span>Double-click / Enter Replay</span>`;
  const enterReplay = () => {
    root.classList.add("urai-spatial-warping");
    window.setTimeout(() => window.location.assign("/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=focus-chamber"), 260);
  };
  aperture.addEventListener("mouseenter", () => root.classList.add("urai-spatial-focus-hover"), { signal });
  aperture.addEventListener("mouseleave", () => root.classList.remove("urai-spatial-focus-hover"), { signal });
  aperture.addEventListener("dblclick", enterReplay, { signal });
  aperture.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") enterReplay();
  }, { signal });
}

function wireReplay(root: HTMLElement, signal: AbortSignal) {
  ensureFocusReplayCueStyles();
  const stage = findWorldStage();
  if (stage) stage.classList.add("urai-spatial-world-stage");
  node("urai-spatial-route-backdrop");
  const cinema = node("urai-spatial-replay-cinema");
  cinema.innerHTML = `<b>REPLAY THE THREAD</b><span>Memory film active</span><span>Pause / return / unwind</span>`;
  const beats = node("urai-spatial-film-beats");
  beats.innerHTML = `<b>FILM BEATS</b><span>Pressure</span><span>Signal</span><span>Reset</span><span>Return</span>`;
  const pulse = () => {
    root.classList.add("urai-spatial-replay-pulse");
    window.setTimeout(() => root.classList.remove("urai-spatial-replay-pulse"), 420);
  };
  beats.addEventListener("mouseenter", pulse, { signal });
  beats.addEventListener("focusin", pulse, { signal });
}

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;
    const controller = new AbortController();
    cleanup(root);
    ensureV1AuditRouteStyles();

    const routeClass = routeClassFor(pathname);
    if (routeClass) root.classList.add(routeClass);

    if (pathname.startsWith("/life-map")) {
      wireLifeMap(root, controller.signal);
    } else if (pathname.startsWith("/focus")) {
      wireFocus(root, controller.signal);
    } else if (pathname.startsWith("/replay")) {
      wireReplay(root, controller.signal);
    }
    return () => {
      controller.abort();
      cleanup(root);
    };
  }, [pathname]);

  return null;
}
