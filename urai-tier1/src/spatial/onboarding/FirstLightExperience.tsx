"use client";

import { useEffect, useState } from "react";
import { firstLightScript } from "./firstLightScript";
import { MAX_COMPANION_LINES_FIRST_SESSION } from "./firstLightTypes";

export default function FirstLightExperience() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= firstLightScript.length || index >= MAX_COMPANION_LINES_FIRST_SESSION) return;

    const line = firstLightScript[index];
    const t = setTimeout(() => {
      setIndex((i) => i + 1);
    }, line.delayMs + line.silenceAfterMs);

    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className="urai-firstlight">
      {firstLightScript.slice(0, index).map((l) => (
        <p key={l.id}>{l.text}</p>
      ))}
    </div>
  );
}
