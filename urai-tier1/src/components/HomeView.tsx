'use client'

export default function HomeView() {
  return (
    <>
      <div className="home-bg"></div>
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center text-white">
        <header className="mb-12">
          <p className="text-sm tracking-[0.3em] uppercase text-white/70">URAI SPATIAL</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Enter Your Living Memory Map
          </h1>
          <p className="max-w-xl mx-auto mt-4 text-base text-white/70 sm:text-lg">
            Replay the emotional shape of your life through memory, ritual, and cinematic meaning.
          </p>
        </header>

        <div className="relative w-48 h-48 md:w-64 md:h-64 mb-12">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse"></div>
          <div className="absolute inset-4 rounded-full bg-indigo-500/30 animate-pulse [animation-delay:0.5s]"></div>
          <div className="absolute inset-8 rounded-full bg-white/20"></div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <a href="#" className="glow-pill-button">Begin Ascent</a>
          <a href="#" className="glow-pill-button">Open Life Map</a>
          <a href="#" className="glow-pill-button">Unwind</a>
        </div>

        <footer className="absolute bottom-8 text-xs text-white/50">
          <p>Home → Ascent → Life Map → Focus → Replay → Unwind</p>
          <div className="flex justify-center gap-6 mt-6">
              <div className="glass-card">Memory Replay</div>
              <div className="glass-card">Emotional Weather</div>
              <div className="glass-card">Symbolic Timeline</div>
          </div>
        </footer>
      </main>
    </>
  );
}
