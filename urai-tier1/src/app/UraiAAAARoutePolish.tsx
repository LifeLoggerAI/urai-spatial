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
] as const;

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

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;
    ROUTE_CLASSES.forEach((routeClass) => root.classList.remove(routeClass));

    const routeClass = routeClassFor(pathname);
    if (routeClass) root.classList.add(routeClass);
    root.dataset.uraiRoutePolish = routeClass ?? "none";

    return () => {
      if (routeClass) root.classList.remove(routeClass);
      delete root.dataset.uraiRoutePolish;
    };
  }, [pathname]);

  return null;
}
