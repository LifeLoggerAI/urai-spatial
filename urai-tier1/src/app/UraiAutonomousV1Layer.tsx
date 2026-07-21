"use client";

import { usePathname } from "next/navigation";
import UraiAutonomousV1Realms from "./UraiAutonomousV1Realms";
import "./urai-autonomous-v1-layer.css";
import "./urai-autonomous-v1-assets.css";
import "./urai-autonomous-v1-realms.css";
import "./urai-autonomous-v1-isolation.css";
import "./urai-autonomous-v1-workforce.css";

/**
 * Legacy autonomous presentation is retained only for secondary realms that
 * still lack a route-owned canonical client. Privacy Controls is explicitly
 * excluded because its route client is the sole visual/runtime owner. Location
 * Map is explicitly excluded for the same route-owned authority reason.
 */
export default function UraiAutonomousV1Layer() {
  const pathname = usePathname() || "";

  if (
    pathname.startsWith("/mirror") ||
    pathname.startsWith("/passport")
  ) {
    return <UraiAutonomousV1Realms pathname={pathname} />;
  }

  return null;
}
