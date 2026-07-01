"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_CLASSES = [
  "urai-route-life-map",
  "urai-route-focus",
  "urai-route-replay",
];

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;

    const clear = () => {
      ROUTE_CLASSES.forEach((className) => root.classList.remove(className));
      root.classList.remove("urai-life-selected");

      // Kill the old risky marker classes if the previous runtime left them behind.
      document
        .querySelectorAll(
          ".urai-lifemap-title-card,.urai-lifemap-selected-card,.urai-lifemap-bottom-nav,.urai-lifemap-selected-node"
        )
        .forEach((el) => {
          el.classList.remove(
            "urai-lifemap-title-card",
            "urai-lifemap-selected-card",
            "urai-lifemap-bottom-nav",
            "urai-lifemap-selected-node"
          );
        });
    };

    clear();

    if (pathname.startsWith("/life-map")) {
      root.classList.add("urai-route-life-map");

      let cue = document.querySelector<HTMLElement>(".urai-focus-cue");
      if (!cue) {
        cue = document.createElement("div");
        cue.className = "urai-focus-cue";
        cue.textContent = "Double click / Enter Focus";
        document.body.appendChild(cue);
      }
    } else if (pathname.startsWith("/focus")) {
      root.classList.add("urai-route-focus");
      document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
    } else if (pathname.startsWith("/replay")) {
      root.classList.add("urai-route-replay");
      document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
    } else {
      document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
    }

    return () => {
      clear();
      document.querySelector<HTMLElement>(".urai-focus-cue")?.remove();
    };
  }, [pathname]);

  return null;
}
