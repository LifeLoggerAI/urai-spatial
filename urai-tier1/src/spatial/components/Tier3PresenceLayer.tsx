"use client";

export function Tier3PresenceLayer({ phase }: { phase?: string }) {
const currentPhase = String(phase ?? "HOME");
const visible =
currentPhase === "FOCUS" ||
currentPhase === "REPLAY" ||
currentPhase === "LIFEMAP";

if (!visible) return null;

return (
<> <div className="urai-tier3-vignette" /> <div className="urai-tier3-breath" /> <div className="urai-tier3-memory-dust d1" /> <div className="urai-tier3-memory-dust d2" /> <div className="urai-tier3-memory-dust d3" />
</>
);
}

export default Tier3PresenceLayer;
