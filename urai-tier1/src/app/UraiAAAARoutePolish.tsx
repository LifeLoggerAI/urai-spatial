"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_CLASSES = [
  "urai-route-life-map",
  "urai-route-focus",
  "urai-route-replay",
];

function cleanText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function removeRuntimeNodes() {
  document.querySelector<HTMLElement>(".urai-spatial-focus-cue")?.remove();
  document.querySelector<HTMLElement>(".urai-spatial-reticle")?.remove();
  document.querySelector<HTMLElement>(".urai-spatial-depth-halo")?.remove();
}

function clearMarkers(root: HTMLElement) {
  ROUTE_CLASSES.forEach((className) => root.classList.remove(className));
  root.classList.remove("urai-life-selected", "urai-spatial-dragging", "urai-spatial-warping");

  document
    .querySelectorAll<HTMLElement>(".urai-spatial-memory-node")
    .forEach((el) => {
      el.classList.remove("urai-spatial-memory-node", "urai-spatial-memory-armed");
      el.removeAttribute("data-urai-spatial-node");
    });
}

function ensureRuntimeNode(className: string, text?: string): HTMLElement {
  let node = document.querySelector<HTMLElement>(`.${className}`);
  if (!node) {
    node = document.createElement("div");
    node.className = className;
    if (text) node.textContent = text;
    document.body.appendChild(node);
  }
  return node;
}

function findQuietResetNode(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>("a,button,[role='button'],div,span,article,section"));
  const selectedPanel = all.find((el) => cleanText(el.textContent).includes("SELECTED STAR"));

  const candidates = all
    .filter((el) => cleanText(el.textContent).includes("The Quiet Reset"))
    .filter((el) => !selectedPanel || !selectedPanel.contains(el))
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return { el, rect };
    })
    .filter(({ rect }) => {
      return (
        rect.width >= 12 &&
        rect.height >= 8 &&
        rect.width < 380 &&
        rect.height < 190 &&
        rect.left > -20 &&
        rect.top > -20 &&
        rect.left < window.innerWidth - 20 &&
        rect.top < window.innerHeight - 20
      );
    })
    .sort((a, b) => {
      const ax = a.rect.left + a.rect.width / 2;
      const ay = a.rect.top + a.rect.height / 2;
      const bx = b.rect.left + b.rect.width / 2;
      const by = b.rect.top + b.rect.height / 2;
      const ad = Math.hypot(ax - window.innerWidth * 0.72, ay - window.innerHeight * 0.48);
      const bd = Math.hypot(bx - window.innerWidth * 0.72, by - window.innerHeight * 0.48);
      return ad - bd;
    });

  return candidates[0]?.el || null;
}

function wireLifeMap(root: HTMLElement, signal: AbortSignal) {
  let pointerX = 0;
  let pointerY = 0;
  let orbitX = 0;
  let orbitY = 0;
  let depth = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;

  const reticle = ensureRuntimeNode("urai-spatial-reticle");
  const halo = ensureRuntimeNode("urai-spatial-depth-halo");
  const cue = ensureRuntimeNode("urai-spatial-focus-cue", "Double click / Enter Focus");

  const writeVars = () => {
    raf = 0;

    const parallaxX = pointerX * 18 + orbitX * 1.8;
    const parallaxY = pointerY * 12 + orbitY * 1.2;
    const twist = orbitX * 0.025;

    root.style.setProperty("--urai-parallax-x", `${parallaxX.toFixed(2)}px`);
    root.style.setProperty("--urai-parallax-y", `${parallaxY.toFixed(2)}px`);
    root.style.setProperty("--urai-orbit-x", `${orbitX.toFixed(2)}deg`);
    root.style.setProperty("--urai-orbit-y", `${orbitY.toFixed(2)}deg`);
    root.style.setProperty("--urai-depth-scale", depth.toFixed(3));
    root.style.setProperty("--urai-twist", `${twist.toFixed(2)}deg`);
    root.style.setProperty("--urai-pointer-screen-x", `${((pointerX + 1) * 50).toFixed(2)}vw`);
    root.style.setProperty("--urai-pointer-screen-y", `${((pointerY + 1) * 50).toFixed(2)}vh`);
  };

  const schedule = () => {
    if (!raf) raf = window.requestAnimationFrame(writeVars);
  };

  const markSelected = () => {
    const node = findQuietResetNode();
    if (!node) return;

    node.classList.add("urai-spatial-memory-node");
    node.dataset.uraiSpatialNode = "quiet-reset";
    node.setAttribute("tabindex", node.getAttribute("tabindex") || "0");
    node.setAttribute("role", node.getAttribute("role") || "button");
    node.setAttribute("aria-label", "The Quiet Reset. Double click or press Enter to enter Focus.");

    const rect = node.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    root.classList.add("urai-life-selected");
    root.style.setProperty("--urai-selected-x", `${x}px`);
    root.style.setProperty("--urai-selected-y", `${y}px`);
    root.style.setProperty("--urai-cue-x", `${Math.max(130, Math.min(window.innerWidth - 170, x + 102))}px`);
    root.style.setProperty("--urai-cue-y", `${Math.max(88, Math.min(window.innerHeight - 110, y - 44))}px`);
  };

  const enterFocus = () => {
    root.classList.add("urai-spatial-warping");
    window.setTimeout(() => {
      window.location.assign("/focus?memoryId=quiet-reset&from=life-map-star");
    }, 260);
  };

  const onPointerMove = (event: PointerEvent) => {
    const nx = event.clientX / Math.max(1, window.innerWidth);
    const ny = event.clientY / Math.max(1, window.innerHeight);

    pointerX = nx * 2 - 1;
    pointerY = ny * 2 - 1;

    root.style.setProperty("--urai-cursor-x", `${event.clientX}px`);
    root.style.setProperty("--urai-cursor-y", `${event.clientY}px`);

    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;

      orbitX = Math.max(-18, Math.min(18, orbitX + dx * 0.035));
      orbitY = Math.max(-12, Math.min(12, orbitY - dy * 0.03));

      lastX = event.clientX;
      lastY = event.clientY;
    }

    schedule();
  };

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    root.classList.add("urai-spatial-dragging");
  };

  const onPointerUp = () => {
    dragging = false;
    root.classList.remove("urai-spatial-dragging");
  };

  const onWheel = (event: WheelEvent) => {
    if (!root.classList.contains("urai-route-life-map")) return;

    depth = Math.max(0.92, Math.min(1.13, depth + (event.deltaY < 0 ? 0.018 : -0.018)));
    schedule();
  };

  const onDoubleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const node = target.closest<HTMLElement>(".urai-spatial-memory-node");
    if (node) enterFocus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest(".urai-spatial-memory-node")) enterFocus();
  };

  const onMouseOver = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const node = target?.closest<HTMLElement>(".urai-spatial-memory-node");
    if (node) node.classList.add("urai-spatial-memory-armed");
  };

  const onMouseOut = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const node = target?.closest<HTMLElement>(".urai-spatial-memory-node");
    if (node) node.classList.remove("urai-spatial-memory-armed");
  };

  window.addEventListener("pointermove", onPointerMove, { signal });
  window.addEventListener("pointerdown", onPointerDown, { signal });
  window.addEventListener("pointerup", onPointerUp, { signal });
  window.addEventListener("pointercancel", onPointerUp, { signal });
  window.addEventListener("wheel", onWheel, { signal, passive: true });
  window.addEventListener("dblclick", onDoubleClick, { signal });
  window.addEventListener("keydown", onKeyDown, { signal });
  document.body.addEventListener("mouseover", onMouseOver, { signal });
  document.body.addEventListener("mouseout", onMouseOut, { signal });

  writeVars();
  markSelected();

  const timers = [120, 400, 900, 1600].map((delay) => window.setTimeout(markSelected, delay));
  signal.addEventListener("abort", () => {
    timers.forEach(window.clearTimeout);
    if (raf) window.cancelAnimationFrame(raf);
    reticle.remove();
    halo.remove();
    cue.remove();
  });
}

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;
    const controller = new AbortController();

    clearMarkers(root);
    removeRuntimeNodes();

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
      clearMarkers(root);
      removeRuntimeNodes();
    };
  }, [pathname]);

  return null;
}
