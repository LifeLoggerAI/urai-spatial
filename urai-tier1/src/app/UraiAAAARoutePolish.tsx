"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import releaseReceipt from "@/data/release-receipt.json";

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

const ASSET_GATES = [
  { version: "v2", minimum: 80, className: "urai-v2-assets-ready" },
  { version: "v3", minimum: 14, className: "urai-v3-assets-ready" },
] as const;

type HandoffManifest = {
  ready?: number;
  missing?: number;
  assets?: Array<{ status?: string; renderer?: string }>;
};

type ReleaseReceipt = {
  deployedSha?: string | null;
  rollbackSha?: string | null;
};

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

function handoffReady(payload: HandoffManifest, minimum: number) {
  const assets = Array.isArray(payload.assets) ? payload.assets : [];
  return (
    Number(payload.ready ?? 0) >= minimum &&
    Number(payload.missing ?? 0) === 0 &&
    assets.length >= minimum &&
    assets.every((asset) => asset.status === "ready" && asset.renderer === "provider")
  );
}

function validSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

export default function UraiAAAARoutePolish() {
  const pathname = usePathname() ?? "";
  const receipt = releaseReceipt as ReleaseReceipt;
  const deployedSha = validSha(receipt.deployedSha) ? receipt.deployedSha : "unverified";
  const rollbackSha = validSha(receipt.rollbackSha) ? receipt.rollbackSha : "unverified";

  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;

    ROUTE_CLASSES.forEach((routeClass) => root.classList.remove(routeClass));
    ASSET_GATES.forEach((gate) => root.classList.remove(gate.className));

    const routeClass = routeClassFor(pathname);
    if (routeClass) root.classList.add(routeClass);
    root.dataset.uraiRoutePolish = routeClass ?? "none";
    root.dataset.deployedSha = deployedSha;
    root.dataset.rollbackSha = rollbackSha;

    for (const gate of ASSET_GATES) {
      void fetch(`/assets/urai/final/manifests/${gate.version}-asset-factory-spatial-handoff.json`, {
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: HandoffManifest | null) => {
          if (!cancelled && payload && handoffReady(payload, gate.minimum)) {
            root.classList.add(gate.className);
          }
        })
        .catch(() => {
          // A pending handoff intentionally keeps the stable V1 fallback active.
        });
    }

    return () => {
      cancelled = true;
      if (routeClass) root.classList.remove(routeClass);
      ASSET_GATES.forEach((gate) => root.classList.remove(gate.className));
      delete root.dataset.uraiRoutePolish;
      delete root.dataset.deployedSha;
      delete root.dataset.rollbackSha;
    };
  }, [deployedSha, pathname, rollbackSha]);

  return (
    <span
      hidden
      aria-hidden="true"
      data-urai-release-identity="receipt"
      data-deployed-sha={deployedSha}
      data-rollback-sha={rollbackSha}
    />
  );
}
