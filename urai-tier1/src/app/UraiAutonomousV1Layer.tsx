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
 * excluded because its route client is canonical. Passport and Location Map
 * are likewise route-owned; Mirror remains the only legacy realm here.
 */
export default function UraiAutonomousV1Layer() {
  const pathname = usePathname() || "";

  if (pathname.startsWith("/mirror")) {
    return <UraiAutonomousV1Realms pathname={pathname} />;
  }

  return null;
}
