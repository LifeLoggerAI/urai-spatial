"use client";

import { usePathname } from "next/navigation";
import UraiAutonomousV1Realms from "./UraiAutonomousV1Realms";
import "./urai-autonomous-v1-layer.css";
import "./urai-autonomous-v1-assets.css";
import "./urai-autonomous-v1-realms.css";
import "./urai-autonomous-v1-isolation.css";
import "./urai-autonomous-v1-workforce.css";

/**
 * Legacy autonomous presentation is retained only for secondary private realms
 * that do not yet have a route-owned canonical client. Home, Focus and Replay
 * are owned exclusively by their canonical route clients.
 */
export default function UraiAutonomousV1Layer() {
  const pathname = usePathname() || "";

  if (
    pathname.startsWith("/mirror") ||
    pathname.startsWith("/passport") ||
    pathname.startsWith("/privacy-controls") ||
    pathname.startsWith("/location-map") ||
    pathname.startsWith("/status")
  ) {
    return <UraiAutonomousV1Realms pathname={pathname} />;
  }

  return null;
}
