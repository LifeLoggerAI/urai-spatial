"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSceneStore } from "../store/useSceneStore";

export default function RoutePlaceSync() {
  const pathname = usePathname();
  const setPlaceFromRoute = useSceneStore((state) => state.setPlaceFromRoute);

  useEffect(() => {
    if (!pathname) return;
    setPlaceFromRoute(pathname);
  }, [pathname, setPlaceFromRoute]);

  return null;
}
