"use client";

import type { LifeMapEra, LifeMapNodeType, LifeMapTimeScope } from "./lifeMapData";
import { lifeMapFilters, lifeMapTimeScopeLabels, lifeMapTypeLabels } from "./lifeMapData";

export type LifeMapMode = "lifemap" | "focus" | "replay" | "mirror";

type LifeMapHudProps = {
  mode: LifeMapMode;
  activeFilters: LifeMapNodeType[];
  timeScope: LifeMapTimeScope;
  eras: LifeMapEra[];
  selectedEraId: string | null;
  narratorText: string;
  ttsEnabled: boolean;
  loading?: boolean;
  usingSeedData?: boolean;
  error?: string | null;
  onToggleFilter: (type: LifeMapNodeType) => void;
  onSelectTimeScope: (scope: LifeMapTimeScope) => void;
  onSelectEra: (eraId: string | null) => void;
  onToggleTts: () => void;
  onOpenMirror: () => void;
  onRecenter: () => void;
  onReturnHome: () => void;
};

const modeLabels: Record<LifeMapMode, string> = {
  lifemap: "Overview",
  focus: "Focus",
  replay: "Replay",
  mirror: "Mirror",
};

const timeScopes: LifeMapTimeScope[] = ["all", "year", "season", "month", "week", "era"];

export function LifeMapHud({
  mode,
  activeFilters,
  timeScope,
  eras,
  selectedEraId,
  narratorText,
  ttsEnabled,
  loading = false,
  usingSeedData = false,
  error = null,
  onToggleFilter,
  onSelectTimeScope,
  onSelectEra,
  onToggleTts,
  onOpenMirror,
  onRecenter,
  onReturnHome,
}: LifeMapHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 text-white sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <section className="pointer-events-auto max-w-[min(26rem,calc(100vw-1.5rem))] rounded-3xl border border-cyan-200/15 bg-slate-950/45 px-5 py-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-100/70">
            URAI Spatial
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-cyan-50 sm:text-3xl">
            Life Map
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-100/70">
            <span>{modeLabels[mode]}</span>
            {loading ? <span className="rounded-full border border-cyan-100/20 px-2 py-1 text-cyan-100/70">Loading signals</span> : null}
            {usingSeedData ? <span className="rounded-full border border-white/10 px-2 py-1 text-white/45">Seed mode</span> : null}
          </div>
          {error ? <p className="mt-2 text-xs leading-5 text-amber-100/75">Firestore fallback: {error}</p> : null}
        </section>

        <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onOpenMirror}
            className="rounded-full border border-fuchsia-200/25 bg-fuchsia-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-50 shadow-xl shadow-fuchsia-950/30 backdrop-blur-xl transition hover:border-fuchsia-200/50 hover:bg-fuchsia-200/20"
          >
            Mirror
          </button>
          <button
            type="button"
            onClick={onRecenter}
            className="rounded-full border border-cyan-200/20 bg-slate-950/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-50 shadow-xl shadow-cyan-950/30 backdrop-blur-xl transition hover:border-cyan-200/45 hover:bg-cyan-200/10"
          >
            Recenter
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="rounded-full border border-violet-200/20 bg-slate-950/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-50 shadow-xl shadow-violet-950/30 backdrop-blur-xl transition hover:border-violet-200/45 hover:bg-violet-200/10"
          >
            Return Home
          </button>
        </div>
      </div>

      <div className="pointer-events-auto mx-auto flex w-full max-w-6xl flex-col gap-3">
        <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl" aria-label="URAI narrator">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/55">Narrator</p>
              <p className="mt-1 text-sm leading-6 text-cyan-50/80">{narratorText}</p>
            </div>
            <button
              type="button"
              aria-pressed={ttsEnabled}
              onClick={onToggleTts}
              className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] transition ${
                ttsEnabled
                  ? "border-cyan-100/45 bg-cyan-100/15 text-cyan-50"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
              }`}
            >
              TTS {ttsEnabled ? "On" : "Off"}
            </button>
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/35 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Time Travel</p>
            <div className="flex flex-wrap gap-2">
              {timeScopes.map((scope) => {
                const active = timeScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => onSelectTimeScope(scope)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                      active
                        ? "border-violet-200/50 bg-violet-200/15 text-violet-50 shadow-lg shadow-violet-500/10"
                        : "border-white/10 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/75"
                    }`}
                  >
                    {lifeMapTimeScopeLabels[scope]}
                  </button>
                );
              })}
            </div>
            {timeScope === "era" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelectEra(null)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    selectedEraId === null ? "border-cyan-100/50 bg-cyan-100/15 text-cyan-50" : "border-white/10 bg-white/5 text-white/45"
                  }`}
                >
                  All Eras
                </button>
                {eras.map((era) => (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() => onSelectEra(era.id)}
                    aria-pressed={selectedEraId === era.id}
                    className={`rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                      selectedEraId === era.id
                        ? "border-cyan-100/50 bg-cyan-100/15 text-cyan-50"
                        : "border-white/10 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/75"
                    }`}
                    style={selectedEraId === era.id ? { boxShadow: `0 0 24px ${era.dominantAura}33` } : undefined}
                  >
                    {era.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Node Types</p>
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              {lifeMapFilters.map((type) => {
                const active = activeFilters.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onToggleFilter(type)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                      active
                        ? "border-cyan-200/50 bg-cyan-200/15 text-cyan-50 shadow-lg shadow-cyan-500/10"
                        : "border-white/10 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/75"
                    }`}
                    aria-pressed={active}
                  >
                    {lifeMapTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
