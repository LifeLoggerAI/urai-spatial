import Link from 'next/link'
import { SpatialSceneDefinition } from './sceneRegistry'

export function RealmShell({ scene, summary }: { scene: SpatialSceneDefinition; summary: string }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(103,232,249,0.14),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(167,139,250,0.12),transparent_28%)]" />
        <div className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur md:p-8">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">URAI Realm</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{scene.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">{summary}</p>
          <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300 md:grid-cols-2">
            <p>Camera: {scene.cameraPreset}</p>
            <p>Lighting: {scene.lightingPreset}</p>
            <p>Privacy: {scene.privacyLevel}</p>
            <p>Fallback: {scene.fallbackRoute}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href={scene.exitRoute}>
              Return Home
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/location-map">
              Location Map
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/life-map">
              LifeMap
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
