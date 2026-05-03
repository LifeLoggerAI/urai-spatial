"use client";

export function uraiRuntimeGuard() {
  if (typeof window === "undefined") return;

  const key = "__URAI_RUNTIME_GUARD_INSTALLED__";
  const w = window as typeof window & Record<string, unknown>;

  if (w[key]) return;
  w[key] = true;

  const originalError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    const first = String(args[0] ?? "");

    if (first.includes("URAI_CANON_ILLEGAL")) {
      console.warn("[URAI_CANON_ILLEGAL]", ...args);
      return;
    }

    originalError(...args);
  };
}

export const installUraiRuntimeGuard = uraiRuntimeGuard;
