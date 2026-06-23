import Link from 'next/link'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'
import styles from './GroundWorld.module.css'

const agents = [
  ['Guide', 'Turns pressure into a calm next action and keeps the path humane.', 'north'],
  ['Builder', 'Shapes ideas, product work, and creative pressure into finished next steps.', 'east'],
  ['Archivist', 'Keeps objects connected to memories, places, relationships, and consent.', 'west'],
  ['Operator', 'Works now on calendars, inboxes, tasks, errands, timing, and handoffs.', 'center'],
  ['Protector', 'Guards privacy, permissions, model access, exports, and deletion boundaries.', 'vault'],
  ['Mirror', 'Reflects loops, pressure patterns, recovery arcs, and repeating choices.', 'mirror'],
]

const objects = [
  ['Keys by the door', 'Departures, errands, appointments, and return-home rituals stay connected to the day.', 'keys'],
  ['Kitchen table', 'Meals, bills, notes, calls, repairs, and conversations become inspectable life context.', 'table'],
  ['Work console', 'Projects, messages, files, priorities, and unfinished decisions route to the right helper.', 'work'],
  ['Memory case', 'Important objects can open context before ascending into the Life Map.', 'case'],
  ['Calendar tower', 'Deadlines, routines, windows, and timing are staged without pretending to live for you.', 'calendar'],
  ['Health signal', 'Body, focus, recovery, and pressure signals are reflected as context only, never diagnosis.', 'body'],
]

const rail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

export const metadata = {
  title: 'URAI Ground World',
  description: 'The enterable URAI Ground World with private AI workforce presence and inspectable real-life objects.',
}

export default function GroundRealmPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main className={styles.world} data-urai-route="ground-world" data-launch-surface="embodied-ground-world">
      <aside hidden aria-hidden="true" data-testid="ground-realm-contract">
        <RealmShell
          scene={groundScene}
          summary="The enterable Ground World keeps URAI realm routing, private AI workforce presence, and inspectable real-life objects connected."
        />
      </aside>

      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/home" className={styles.brand}>URAI Ground World</Link>
        <p>Private real-life operating layer · models with roles · access with permission</p>
      </header>

      <section className={styles.copy} aria-label="Ground World introduction">
        <p className={styles.eyebrow}>Enterable life layer</p>
        <h1>Your private world helps your real life.</h1>
        <p>
          Ground is the lived layer: objects, routines, pressure, work, relationships, calendars, and a private AI workforce quietly staging the next useful move before you ascend into memory.
        </p>
        <div className={styles.actions}>
          <Link href="/home">Return Home</Link>
          <Link href="/life-map" className={styles.primary}>Ascend to Life Map</Link>
        </div>
      </section>

      <section className={styles.scene} aria-label="Embodied ground world scene">
        <div className={styles.orbColumn} aria-hidden="true">
          <span className={styles.orbBeam} />
          <span className={styles.orb} />
          <span className={styles.orbLabel}>URAI orb companion</span>
        </div>

        <div className={styles.agentRing} aria-label="Private AI workforce">
          {agents.map(([name, role, slot]) => (
            <article key={name} className={`${styles.agent} ${styles[`agent_${slot}` as keyof typeof styles]}`}>
              <span className={styles.agentAvatar} aria-hidden="true" />
              <span className={styles.agentPulse} aria-hidden="true" />
              <h2>{name}</h2>
              <p>{role}</p>
            </article>
          ))}
        </div>

        <div className={styles.objectField} aria-label="Inspectable real-life objects">
          {objects.map(([name, detail, slot]) => (
            <details key={name} className={`${styles.object} ${styles[`object_${slot}` as keyof typeof styles]}`}>
              <summary>
                <span>Inspect</span>
                <strong>{name}</strong>
              </summary>
              <p>{detail}</p>
            </details>
          ))}
        </div>

        <aside className={styles.inspector} aria-label="Object inspector panel">
          <span>Object inspector</span>
          <strong>Hover or open any object.</strong>
          <p>Ground turns real-life pressure into staged, permissioned context: what matters, what can wait, what needs a human choice.</p>
        </aside>
      </section>

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {rail.map(([label, href]) => <Link key={href} href={href} data-active={label === 'Ground' ? 'true' : 'false'}>{label}</Link>)}
      </nav>
    </main>
  )
}
