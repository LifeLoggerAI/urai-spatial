import Link from 'next/link'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

const agents = [
  ['Logistics Agent', 'Tasks, errands, timing, and practical next moves.'],
  ['Memory Steward', 'Keeps objects connected to memories and relationships.'],
  ['Focus Guide', 'Turns pressure into a calm next action.'],
  ['Council Voice', 'Private AI workforce presence inside the ground layer.'],
]

const objects = [
  ['Kitchen table', 'Notes, bills, meals, and conversations become inspectable life objects.'],
  ['Keys by the door', 'Departures, errands, and appointments stay connected to the day.'],
  ['Work console', 'Projects, messages, and admin tasks route to the right helper.'],
  ['Memory case', 'Important items can open context before ascending to the Life Map.'],
]

const chain = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['Status', '/status'],
]

export const metadata = {
  title: 'URAI Ground World',
  description: 'The enterable URAI Ground World with private AI workforce presence and inspectable real-life objects.',
}

export default function GroundRealmPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white" data-urai-route="ground-world">
      <aside hidden aria-hidden="true" data-testid="ground-realm-contract">
        <RealmShell
          scene={groundScene}
          summary="The enterable Ground World keeps URAI realm routing, private AI workforce presence, and inspectable real-life objects connected."
        />
      </aside>
      <section className="relative min-h-screen px-6 py-8 md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.22),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(34,197,94,0.18),transparent_35%),linear-gradient(180deg,#08111f_0%,#0b1721_44%,#102015_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.35em] text-cyan-100/75">
            <Link href="/home" className="font-semibold text-white">URAI Ground World</Link>
            <nav className="flex flex-wrap gap-2 tracking-[0.18em]">
              {chain.map(([label, href]) => (
                <Link key={href} href={href} className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] text-white/70 hover:bg-white/10 hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.45em] text-emerald-200/70">Enterable life layer</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Your private world helps your real life.</h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 md:text-lg">
                Ground is the lived layer: objects, routines, pressure, work, and a private AI workforce quietly helping the day make sense before you ascend into the memory galaxy.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/life-map" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-100">Ascend to Life Map</Link>
                <Link href="/focus" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Open Focus</Link>
              </div>
            </section>

            <section className="relative min-h-[560px] rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur" aria-label="Embodied ground world scene">
              <div className="relative h-full min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(12,30,24,0.94))]">
                <div className="absolute left-1/2 top-16 h-36 w-36 -translate-x-1/2 rounded-full border border-cyan-200/20 bg-cyan-100/10 shadow-[0_0_90px_rgba(125,211,252,0.32)]" />
                <div className="absolute left-1/2 top-28 h-16 w-16 -translate-x-1/2 rounded-full bg-white shadow-[0_0_70px_rgba(255,255,255,0.8)]" aria-label="URAI orb companion" />

                {agents.map(([name, role], index) => {
                  const positions = ['left-[10%] top-[30%]', 'right-[10%] top-[32%]', 'left-[14%] bottom-[28%]', 'right-[12%] bottom-[24%]']
                  return (
                    <article key={name} className={`absolute ${positions[index]} w-44 rounded-3xl border border-cyan-100/15 bg-slate-950/70 p-3 shadow-xl backdrop-blur`}>
                      <div className="mb-3 h-9 w-9 rounded-full border border-cyan-200/20 bg-cyan-200/20" />
                      <h2 className="text-sm font-semibold text-white">{name}</h2>
                      <p className="mt-1 text-[0.72rem] leading-5 text-slate-300">{role}</p>
                    </article>
                  )
                })}

                <div className="absolute bottom-0 left-0 right-0 h-40 rounded-t-[50%] border-t border-emerald-100/15 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.2),rgba(15,23,42,0.86)_68%)]" />
                <div className="absolute bottom-24 left-1/2 grid w-[78%] -translate-x-1/2 gap-3 md:grid-cols-2">
                  {objects.map(([name, detail]) => (
                    <article key={name} className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur">
                      <h3 className="text-sm font-semibold text-white">{name}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
