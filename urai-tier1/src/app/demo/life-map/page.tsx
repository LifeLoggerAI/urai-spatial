"use client";

import { useEffect } from "react";
import LifeMapRoute from "../../life-map/page";

export default function DemoLifeMapPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("urai:first-light-complete");
    window.localStorage.setItem("urai:demo-mode", "first-light");
  }, []);

  return <LifeMapRoute />;
}
