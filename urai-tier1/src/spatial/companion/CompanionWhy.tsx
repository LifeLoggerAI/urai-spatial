"use client";

import { useState } from "react";

export default function CompanionWhy() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center mt-2">
      <button
        className="text-xs text-cyan-200/60 hover:text-cyan-100"
        onClick={() => setOpen((o) => !o)}
      >
        Why am I seeing this?
      </button>

      {open && (
        <div className="mt-2 text-xs text-slate-300/80 max-w-sm mx-auto">
          URAI shows this because a symbolic pattern, memory, or map event became visible.
          <br />
          This is not a diagnosis. It is a reflection prompt.
        </div>
      )}
    </div>
  );
}
