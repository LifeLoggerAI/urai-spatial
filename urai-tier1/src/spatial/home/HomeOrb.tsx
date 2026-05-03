"use client";

export function HomeOrb() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[16vh] z-10 -translate-x-1/2">
      <div className="relative flex h-[18rem] w-[18rem] items-center justify-center">
        <div className="absolute h-[18rem] w-[18rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute h-[13rem] w-[13rem] rounded-full bg-fuchsia-300/10 blur-2xl" />
        <div className="absolute h-[11.5rem] w-[11.5rem] rounded-full border border-violet-200/10" />

        <div
          className="relative h-[9rem] w-[9rem] rounded-full border border-white/15 shadow-[0_0_58px_rgba(168,120,255,0.42)]"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.96) 0%, rgba(225,214,255,0.78) 13%, rgba(126,78,214,0.42) 33%, rgba(26,12,58,0.98) 72%, rgba(8,4,22,1) 100%)",
          }}
        />

        <div className="absolute h-[5.2rem] w-[5.2rem] rounded-full bg-white/18 blur-2xl" />
        <div className="absolute h-[1.8rem] w-[1.8rem] rounded-full bg-white/80 blur-md" />
      </div>
    </div>
  );
}

export default HomeOrb;
