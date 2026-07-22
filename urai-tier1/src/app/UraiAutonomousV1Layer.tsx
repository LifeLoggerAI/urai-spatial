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
 * still lack a route-owned canonical client. Mirror remains the only legacy
 * realm here; Privacy Controls, Passport, Location Map, and Focus are route-owned
 * and excluded from this layer.
 */
export default function UraiAutonomousV1Layer() {
  const pathname = usePathname() || "";

  if (pathname.startsWith("/mirror")) {
    return <UraiAutonomousV1Realms pathname={pathname} />;
  }

  return null;
}
