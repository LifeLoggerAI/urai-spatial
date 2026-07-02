"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_CLASSES = [
  "urai-route-life-map",
  "urai-route-focus",
  "urai-route-replay",
];

function txt(el: Element | null): string {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function cleanup(root: HTMLElement) {
  ROUTE_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.remove("urai-spatial-dragging", "urai-spatial-warping", "urai-spatial-hotspot-hover");

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
      ".urai-spatial-hotspot,.urai-spatial-hud,.urai-spatial-depth-meter,.urai-spatial-reticle,.urai-spatial-warp-flash"
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
  if (best) {
    return { x: best.left + best.width / 2, y: best.top + best.height / 2 };
  }

  return { x: window.innerWidth * 0.74, y: window.innerHeight * 0.50 };
}

function wireLifeMap(root: HTMLElement, signal: AbortSignal) {
  const stage = findWorldStage();
  if (stage) {
    window.setTimeout(() => {
      if (!signal.aborted) stage.classList.add("urai-spatial-world-stage");
    }, 80);
  }

  const hud = node("urai-spatial-hud");
  hud.innerHTML = `
    <b>SPATIAL ACTIVE</b>
    <span>Drag = orbit</span>
    <span>Scroll = depth</span>
    <span>Hover star = magnetic</span>
    <span>Double-click = Focus</span>
  `;

  const meter = node("urai-spatial-depth-meter");
  meter.innerHTML = `<b>DEPTH</b><span>1.00x</span>`;

  const hotspot = node("urai-spatial-hotspot");
  hotspot.setAttribute("role", "button");
  hotspot.setAttribute("tabindex", "0");
  hotspot.setAttribute("aria-label", "The Quiet Reset. Hover, double click, or press Enter to enter Focus.");
  hotspot.innerHTML = `
    <i></i>
    <b>The Quiet Reset</b>
    <span>Hover / double-click</span>
  `;

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
    window.setTimeout(() => {
      window.location.assign("/focus?memoryId=quiet-reset&from=life-map-star");
    }, 280);
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

  // Capture phase + passive false is the important fix for scroll-wheel depth.
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

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;
    const controller = new AbortController();

    cleanup(root);

    if (pathname.startsWith("/life-map")) {
      root.classList.add("urai-route-life-map");
      wireLifeMap(root, controller.signal);
    } else if (pathname.startsWith("/focus")) {
      root.classList.add("urai-route-focus");
    } else if (pathname.startsWith("/replay")) {
      root.classList.add("urai-route-replay");
    }

    return () => {
      controller.abort();
      cleanup(root);
    };
  }, [pathname]);

  return null;
}
