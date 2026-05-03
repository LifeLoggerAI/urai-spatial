"use client";

type HomeOverlayProps = {
  phase: string;
  title: string;
  body: string;
  action: string;
  onAdvance: () => void;
  onUnwind: () => void;
  onPreviewMap: () => void;
};

export function HomeOverlay({
  phase,
  title,
  body,
  action,
  onAdvance,
  onUnwind,
  onPreviewMap,
}: HomeOverlayProps) {
  return (
    <section className="relative z-20 flex min-h-screen items-center justify-center px-6 text-center">
      <div className="mt-[17rem] w-full max-w-5xl">
        <div className="mb-5 text-[11px] font-medium tracking-[0.42em] text-white/58">
          {phase}
        </div>

        <h1 className="text-5xl font-semibold tracking-[-0.075em] text-white sm:text-6xl md:text-7xl lg:text-8xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
          {body}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-full bg-white px-7 py-3 text-sm font-bold text-black shadow-[0_0_34px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            {action}
          </button>

          <button
            type="button"
            onClick={onUnwind}
            className="rounded-full border border-white/14 bg-white/6 px-7 py-3 text-sm font-medium text-white/88 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Unwind
          </button>

          <button
            type="button"
            onClick={onPreviewMap}
            className="rounded-full border border-white/10 bg-transparent px-7 py-3 text-sm font-medium text-white/64 transition hover:-translate-y-0.5 hover:border-white/18 hover:text-white/88"
          >
            Preview map
          </button>
        </div>

        <div className="mt-8 text-sm text-white/38">
          Home → Ascent → LifeMap → Focus → Replay → Unwind
        </div>
      </div>
    </section>
  );
}

export default HomeOverlay;
