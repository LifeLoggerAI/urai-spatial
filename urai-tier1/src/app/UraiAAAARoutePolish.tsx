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

function rect(el: HTMLElement): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  return r;
}

function els(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("body *"));
}

function lift(el: HTMLElement, phrase: string): HTMLElement {
  let node = el;
  for (let i = 0; i < 8 && node.parentElement; i += 1) {
    const parent = node.parentElement as HTMLElement;
    const r = rect(parent);
    if (!r) break;
    const txt = cleanText(parent.textContent);
    if (!txt.includes(phrase)) break;
    if (r.width > window.innerWidth * 0.9 || r.height > window.innerHeight * 0.72) break;
    node = parent;
  }
  return node;
}

function markPanel(phrase: string, className: string): HTMLElement | null {
  const seen = new Set<HTMLElement>();
  const candidates = els()
    .filter((el) => cleanText(el.textContent).includes(phrase))
    .map((el) => lift(el, phrase))
    .filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    })
    .map((el) => {
      const r = rect(el);
      return r ? { el, area: r.width * r.height } : null;
    })
    .filter(Boolean) as Array<{ el: HTMLElement; area: number }>;

  candidates.sort((a, b) => b.area - a.area);
  const winner = candidates[0]?.el || null;
  if (winner) winner.classList.add(className);
  return winner;
}

function markNav(): HTMLElement | null {
  const words = ["Home", "Ground", "Focus", "Replay", "Mirror", "Passport"];
  const winner = els()
    .map((el) => {
      const txt = cleanText(el.textContent);
      const r = rect(el);
      return r ? { el, r, score: words.filter((w) => txt.includes(w)).length } : null;
    })
    .filter(Boolean)
    .filter((x: any) => x.score >= 4 && x.r.width < 760 && x.r.height < 130)
    .sort((a: any, b: any) => b.score - a.score || b.r.top - a.r.top)[0]?.el || null;

  if (winner) winner.classList.add("urai-lifemap-bottom-nav");
  return winner;
}

function markSelectedStar(): HTMLElement | null {
  const selectedCard = document.querySelector(".urai-lifemap-selected-card");

  const candidates = els()
    .filter((el) => cleanText(el.textContent).includes("The Quiet Reset"))
    .filter((el) => !selectedCard || !selectedCard.contains(el))
    .map((el) => {
      const r = rect(el);
      return r ? { el, r } : null;
    })
    .filter(Boolean) as Array<{ el: HTMLElement; r: DOMRect }>;

  const node = candidates
    .filter(({ r }) =>
      r.width < 340 &&
      r.height < 180 &&
      r.left > window.innerWidth * 0.06 &&
      r.top > window.innerHeight * 0.06 &&
      r.left < window.innerWidth * 0.94 &&
      r.top < window.innerHeight * 0.88
    )
    .sort((a, b) => {
      const ax = a.r.left + a.r.width / 2;
      const ay = a.r.top + a.r.height / 2;
      const bx = b.r.left + b.r.width / 2;
      const by = b.r.top + b.r.height / 2;
      return (
        Math.hypot(ax - window.innerWidth / 2, ay - window.innerHeight / 2) -
        Math.hypot(bx - window.innerWidth / 2, by - window.innerHeight / 2)
      );
    })[0]?.el || null;

  if (!node) return null;

  node.classList.add("urai-lifemap-selected-node");
  node.setAttribute("tabindex", node.getAttribute("tabindex") || "0");
  node.setAttribute("role", node.getAttribute("role") || "button");
  node.setAttribute("aria-label", "The Quiet Reset. Double click or press Enter to enter Focus.");

  if (!node.dataset.uraiFocusHook) {
    node.dataset.uraiFocusHook = "true";
    const enterFocus = () => window.location.assign("/focus?memoryId=quiet-reset&from=life-map-star");
    node.addEventListener("dblclick", enterFocus);
    node.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") enterFocus();
    });
  }

  const r = node.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const root = document.documentElement;

  root.classList.add("urai-life-selected");
  root.style.setProperty("--urai-selected-x", `${x}px`);
  root.style.setProperty("--urai-selected-y", `${y}px`);
  root.style.setProperty("--urai-pull-x", `${(window.innerWidth / 2 - x) * 0.018}px`);
  root.style.setProperty("--urai-pull-y", `${(window.innerHeight / 2 - y) * 0.018}px`);
  root.style.setProperty("--urai-cue-x", `${Math.max(124, Math.min(window.innerWidth - 170, x))}px`);
  root.style.setProperty("--urai-cue-y", `${Math.max(92, Math.min(window.innerHeight - 126, y - 58))}px`);

  let cue = document.querySelector<HTMLElement>(".urai-focus-cue");
  if (!cue) {
    cue = document.createElement("div");
    cue.className = "urai-focus-cue";
    cue.textContent = "Double click / Enter Focus";
    document.body.appendChild(cue);
  }

  return node;
}

function applyLifeMap() {
  markPanel("Inside your memory field", "urai-lifemap-title-card");
  markPanel("SELECTED STAR", "urai-lifemap-selected-card");
  markNav();
  markSelectedStar();
}

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      ROUTE_CLASSES.forEach((c) => root.classList.remove(c));
      root.classList.remove("urai-life-selected");

      if (pathname.startsWith("/life-map")) {
        root.classList.add("urai-route-life-map");
        applyLifeMap();
      } else if (pathname.startsWith("/focus")) {
        root.classList.add("urai-route-focus");
      } else if (pathname.startsWith("/replay")) {
        root.classList.add("urai-route-replay");
      } else {
        document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
      }
    };

    apply();
    const timers = [120, 500, 1200].map((ms) => window.setTimeout(apply, ms));
    window.addEventListener("resize", apply);

    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", apply);
      ROUTE_CLASSES.forEach((c) => root.classList.remove(c));
      root.classList.remove("urai-life-selected");
      document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
    };
  }, [pathname]);

  return null;
}
