import Link from 'next/link'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

const agents = [
  ['Guide', 'Turns pressure into a calm next action and keeps the path humane.'],
  ['Builder', 'Shapes ideas, projects, and product work into finished next steps.'],
  ['Archivist', 'Keeps objects connected to memories, places, relationships, and consent.'],
  ['Operator', 'Works now on calendars, inboxes, tasks, errands, timing, and practical handoffs.'],
  ['Strategist', 'Helps compare choices, risks, tradeoffs, and long-range life direction.'],
  ['Protector', 'Guards privacy, permissions, model access, exports, and deletion boundaries.'],
  ['Mirror', 'Reflects loops, pressure patterns, recovery arcs, and repeating choices.'],
  ['Legacy', 'Protects voice notes, lessons, photos, places, and memory-presence with permission.'],
]

const objects = [
  ['Calendar tower', 'Appointments, routines, deadlines, and timing become inspectable life context.'],
  ['Inbox lantern', 'Messages and requests are sorted into what matters, what can wait, and what needs action.'],
  ['Task forge', 'Loose pressure becomes a small next move the private workforce can help stage.'],
  ['Decision table', 'Choices, tradeoffs, risks, and options are laid out without pretending to decide for you.'],
  ['Privacy vault', 'Consent, exports, deletion, and model access stay visible before anything acts.'],
  ['Memory archive', 'Important items can open context before ascending to the Life Map.'],
  ['Health/status beacon', 'Body, focus, recovery, and pressure signals are reflected as context only, never diagnosis.'],
  ['Relationship thread', 'People, conversations, promises, repair, and care loops stay connected to real life.'],
  ['Replay projector', 'Protected moments can open as cinematic proof without faking anyone or anything.'],
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
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white" data-urai-route="ground-world" data-launch-surface="embodied-ground-world">
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
              <p className="text-xs uppercase tracking-[0.45em] text-emerald-200/70">Enterable life layer · launch source refreshed</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Your private world helps your real life.</h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 md:text-lg">
                This is where your private AI workforce helps organize real life: objects, routines, pressure, work, relationships, and permissioned context before you ascend into the Life Map.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-100/75">
                Models with roles. Access with permission. URAI handles the noise. You live the life.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/life-map" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-100">Ascend to Life Map</Link>
                <Link href="/focus" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Open Focus</Link>
              </div>
            </section>

            <section className="relative min-h-[640px] rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur" aria-label="Embodied ground world scene">
              <div className="relative h-full min-h-[600px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(12,30,24,0.94))]">
                <div className="absolute left-1/2 top-16 h-36 w-36 -translate-x-1/2 rounded-full border border-cyan-200/20 bg-cyan-100/10 shadow-[0_0_90px_rgba(125,211,252,0.32)]" />
                <div className="absolute left-1/2 top-28 h-16 w-16 -translate-x-1/2 rounded-full bg-white shadow-[0_0_70px_rgba(255,255,255,0.8)]" aria-label="URAI orb companion" />
                <div className="absolute left-1/2 top-48 -translate-x-1/2 rounded-full border border-emerald-100/20 bg-emerald-100/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">Operator working now</div>

                {agents.map(([name, role], index) => {
                  const positions = [
                    'left-[8%] top-[20%]',
                    'right-[8%] top-[22%]',
                    'left-[5%] top-[43%]',
                    'right-[5%] top-[44%]',
                    'left-[13%] bottom-[20%]',
                    'right-[13%] bottom-[18%]',
                    'left-[35%] bottom-[10%]',
                    'right-[35%] bottom-[10%]',
                  ]
                  return (
                    <article key={name} className={`absolute ${positions[index]} w-40 rounded-3xl border border-cyan-100/15 bg-slate-950/70 p-3 shadow-xl backdrop-blur`}>
                      <div className="mb-3 h-9 w-9 rounded-full border border-cyan-200/20 bg-cyan-200/20" />
                      <h2 className="text-sm font-semibold text-white">{name}</h2>
                      <p className="mt-1 text-[0.7rem] leading-5 text-slate-300">{role}</p>
                    </article>
                  )
                })}

                <div className="absolute bottom-0 left-0 right-0 h-48 rounded-t-[50%] border-t border-emerald-100/15 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.2),rgba(15,23,42,0.86)_68%)]" />
                <div className="absolute bottom-24 left-1/2 grid w-[86%] -translate-x-1/2 gap-3 md:grid-cols-3">
                  {objects.map(([name, detail]) => (
                    <article key={name} tabIndex={0} className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur focus:border-cyan-200 focus:outline-none">
                      <p className="mb-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-cyan-100/60">Click to inspect</p>
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
