import Link from 'next/link'
import type { CSSProperties } from 'react'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'
import { assetCssStack, avatarAssets, groundAssets, uiAssets } from '@/spatial/assets/uraiAssets'
import styles from './GroundAaaWorld.module.css'

type AgentSlot = 'reception' | 'schedule' | 'wellness' | 'relationship' | 'logistics' | 'privacy' | 'archive' | 'operator'

const agents: Array<{ name: string; role: string; zone: string; slot: AgentSlot; asset: string }> = [
  { name: 'Welcome Guide', zone: 'Reception', role: 'Greets you at the threshold, explains what can help, and keeps the world human.', slot: 'reception', asset: assetCssStack(avatarAssets.receptionist) },
  { name: 'Schedule Steward', zone: 'Planning table', role: 'Turns calendars, routines, appointments, and deadlines into a calm next plan.', slot: 'schedule', asset: assetCssStack(avatarAssets.scheduleSteward) },
  { name: 'Wellness Guide', zone: 'Wellness corner', role: 'Reflects focus, recovery, and pressure context as guidance.', slot: 'wellness', asset: assetCssStack(avatarAssets.wellnessGuide) },
  { name: 'Relationship Liaison', zone: 'Connections desk', role: 'Helps prepare check-ins, repair threads, reminders, and important conversations.', slot: 'relationship', asset: assetCssStack(avatarAssets.relationshipLiaison) },
  { name: 'Logistics Helper', zone: 'Errands bay', role: 'Stages deliveries, returns, tasks, home services, and handoffs for approval.', slot: 'logistics', asset: assetCssStack(avatarAssets.logisticsHelper) },
  { name: 'Privacy Steward', zone: 'Privacy sanctuary', role: 'Keeps permissions, boundaries, exports, access choices, and records visible.', slot: 'privacy', asset: assetCssStack(avatarAssets.privacySteward) },
  { name: 'Archivist', zone: 'Memory archive', role: 'Keeps objects connected to places, memories, relationships, and consent gates.', slot: 'archive', asset: assetCssStack(avatarAssets.archivist) },
  { name: 'Operator', zone: 'Work console', role: 'Works quietly on inboxes, timing, priorities, tasks, and unfinished decisions.', slot: 'operator', asset: assetCssStack(avatarAssets.operator) },
]

type ObjectSlot = 'keys' | 'table' | 'work' | 'case' | 'calendar' | 'body'

const objects: Array<{ name: string; detail: string; slot: ObjectSlot; kind: string }> = [
  { name: 'Keys by the door', kind: 'Real object', slot: 'keys', detail: 'Departures, errands, appointments, and return-home rituals stay connected to the day.' },
  { name: 'Kitchen table', kind: 'Life surface', slot: 'table', detail: 'Meals, bills, notes, calls, repairs, and conversations become inspectable life context.' },
  { name: 'Work console', kind: 'Priority station', slot: 'work', detail: 'Projects, messages, files, priorities, and unfinished decisions route to the right helper.' },
  { name: 'Memory case', kind: 'Archive object', slot: 'case', detail: 'Important objects can open context before ascending into the Life Map.' },
  { name: 'Calendar tower', kind: 'Time layer', slot: 'calendar', detail: 'Deadlines, routines, windows, and timing are staged without pretending to live for you.' },
  { name: 'Body signal', kind: 'Private context', slot: 'body', detail: 'Focus, recovery, pressure, and rhythm signals stay in context as personal reflection.' },
]

const zones = [
  ['Reception', 'A human-readable welcome layer keeps the world understandable.', 'zoneReception'],
  ['Privacy sanctuary', 'Consent, boundaries, exports, and access choices stay visible.', 'zonePrivacy'],
  ['Work console', 'Inboxes, timing, unfinished choices, and next moves stage quietly.', 'zoneWork'],
  ['Memory archive', 'Objects and places connect to meaning before ascending to Life Map.', 'zoneArchive'],
  ['Wellness corner', 'Recovery and pressure signals stay as personal context.', 'zoneWellness'],
  ['Garden passage', 'A calmer path for breath, return, and reset.', 'zoneGarden'],
] as const

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

const worldStyle = {
  '--ground-world-stack': assetCssStack(groundAssets.primary),
  '--ground-orb-stack': assetCssStack(uiAssets.orbActive),
} as CSSProperties

export const metadata = {
  title: 'URAI Ground World',
  description: 'The enterable URAI Ground World with private workforce presence and inspectable real-life objects.',
}

export default function GroundRealmPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main className={styles.world} style={worldStyle} data-urai-route="ground-world" data-launch-surface="premium-embodied-ground-world">
      <aside hidden aria-hidden="true" data-testid="ground-realm-contract">
        <RealmShell scene={groundScene} summary="The enterable Ground World keeps URAI realm routing, private workforce presence, and inspectable real-life objects connected." />
      </aside>

      <div className={styles.ceiling} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/home">URAI Ground World</Link>
        <p>Private real-life operating layer · embodied helpers · inspectable objects · permission first</p>
      </header>

      <section className={styles.copy} aria-label="Ground World introduction">
        <p className={styles.eyebrow}>Private world below the sky</p>
        <h1>Your real life has a place.</h1>
        <p>
          Ground is the private operating world below the Life Map: reception, objects, calendars, relationships, tasks, wellness context, privacy, and helpers arranged like a place you can inspect.
        </p>
        <div className={styles.actions}>
          <Link href="/home">Return Home</Link>
          <Link href="/life-map" className={styles.primary}>Ascend to Life Map</Link>
        </div>
      </section>

      <section className={styles.stage} aria-label="Embodied private operating world">
        <div className={styles.orbBeam} aria-hidden="true" />
        <div className={styles.orbCore} aria-hidden="true" />

        {zones.map(([name, detail, className]) => (
          <article key={name} className={`${styles.zone} ${styles[className]}`}>
            <span>World zone</span>
            <strong>{name}</strong>
            <p>{detail}</p>
          </article>
        ))}

        {agents.map((agent) => (
          <article key={agent.name} className={`${styles.agent} ${styles[`agent${agent.slot[0].toUpperCase()}${agent.slot.slice(1)}` as keyof typeof styles]}`}>
            <span className={styles.avatar} style={{ '--agent-art': agent.asset } as CSSProperties} aria-hidden="true" />
            <small>{agent.zone}</small>
            <h2>{agent.name}</h2>
            <p>{agent.role}</p>
          </article>
        ))}

        {objects.map((object) => (
          <details key={object.name} className={`${styles.object} ${styles[`object${object.slot[0].toUpperCase()}${object.slot.slice(1)}` as keyof typeof styles]}`}>
            <summary>
              <span>{object.kind}</span>
              <strong>{object.name}</strong>
            </summary>
            <p>{object.detail}</p>
          </details>
        ))}

        <aside className={styles.inspector} aria-label="Object inspector panel">
          <span>Object inspector</span>
          <strong>Open any station, object, or helper.</strong>
          <p>Ground turns real-life pressure into staged context: what matters, what can wait, what needs a human choice.</p>
        </aside>
      </section>

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {rail.map(([label, href]) => <Link key={href} href={href} data-active={label === 'Ground' ? 'true' : 'false'}>{label}</Link>)}
      </nav>
    </main>
  )
}
