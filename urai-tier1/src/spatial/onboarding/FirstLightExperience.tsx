"use client";

import { useEffect, useMemo, useState } from "react";
import { firstLightScript } from "./firstLightScript";
import { MAX_COMPANION_LINES_FIRST_SESSION } from "./firstLightTypes";

type Props = {
  onComplete?: () => void;
};

export default function FirstLightExperience({ onComplete }: Props) {
  const lines = useMemo(() => firstLightScript.slice(0, MAX_COMPANION_LINES_FIRST_SESSION), []);
  const [index, setIndex] = useState(0);
  const complete = index >= lines.length;

  useEffect(() => {
    if (complete) {
      const t = setTimeout(() => onComplete?.(), 1400);
      return () => clearTimeout(t);
    }

    const line = lines[index];
    const t = setTimeout(() => {
      setIndex((i) => i + 1);
    }, line.delayMs + line.silenceAfterMs);

    return () => clearTimeout(t);
  }, [complete, index, lines, onComplete]);

  return (
    <div className="urai-firstlight fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-6 text-center backdrop-blur-sm">
      <div className="max-w-xl space-y-5">
        {lines.slice(0, index).map((l) => (
          <p key={l.id} className="urai-firstlight__line text-xl leading-relaxed text-slate-100/90 md:text-2xl">
            {l.text}
          </p>
        ))}

        {complete && (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full border border-cyan-200/30 bg-cyan-100/10 px-5 py-2 text-sm text-cyan-50 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-100/20"
          >
            Enter the Life Map
          </button>
        )}
      </div>
    </div>
  );
}
