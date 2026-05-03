"use client";

export function Tier3Field({ phase }: { phase: string }) {
const visible = phase === "FOCUS" || phase === "REPLAY" || phase === "LIFEMAP";

if (!visible) return null;

return (
<> <div className="vignette" /> <div className="breath" /> <div className="dust d1" /> <div className="dust d2" /> <div className="dust d3" />
</>
);
}

export default Tier3Field;
