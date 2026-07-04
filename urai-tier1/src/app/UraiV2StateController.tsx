"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  inferMemoryKind,
  resolveConsentState,
  resolveMemoryState,
  type ConsentState,
} from "@/spatial/v2/livingStateResolver";
import "./v2-state-controller.css";

const consentValues = new Set<ConsentState>([
  "private", "requested", "granted", "revoked",
  "export-ready", "delete-ready", "provenance-visible", "shared-expired",
]);

function V2StateControllerContent() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const [announcement, setAnnouncement] = useState("V2 living state ready");

  useEffect(() => {
    const kind = inferMemoryKind(searchParams?.get("memoryId") ?? null);
    const memory = resolveMemoryState(kind);
    const requested = searchParams?.get("consent") as ConsentState | null | undefined;
    const consent = requested && consentValues.has(requested) ? requested : "private";
    const passport = resolveConsentState(consent);
    const body = document.body;

    body.dataset.v2MemoryKind = kind;
    body.dataset.v2ConsentState = consent;
    body.style.setProperty("--v2-star-state", `url("${memory.star.src}")`);
    body.style.setProperty("--v2-focus-state", `url("${memory.focus.src}")`);
    body.style.setProperty("--v2-replay-state", `url("${memory.replay.src}")`);
    body.style.setProperty("--v2-mirror-state", `url("${memory.mirror.src}")`);
    body.style.setProperty("--v2-passport-state", `url("${passport.src}")`);
    setAnnouncement(`${kind} memory state active`);
  }, [pathname, query, searchParams]);

  useEffect(() => {
    if (!pathname.startsWith("/ground")) return;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".uraiGroundObject"));
    const cleanups = buttons.map((button) => {
      const match = button.className.match(/uraiGroundObject-(reception|privacy|work|wellness|memory|logistics)/);
      const lane = match?.[1] === "reception" ? "welcome" : match?.[1] || "welcome";
      const handler = () => {
        document.body.dataset.v2GroundLane = lane;
        setAnnouncement(`Ground ${lane} state active`);
      };
      button.addEventListener("click", handler);
      return () => button.removeEventListener("click", handler);
    });
    document.body.dataset.v2GroundLane = "welcome";
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      delete document.body.dataset.v2GroundLane;
    };
  }, [pathname]);

  return <span className="uraiV2StateAnnouncer" aria-live="polite">{announcement}</span>;
}

export default function UraiV2StateController() {
  return (
    <Suspense fallback={null}>
      <V2StateControllerContent />
    </Suspense>
  );
}
