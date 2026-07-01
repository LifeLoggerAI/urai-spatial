import Link from 'next/link'
import type { CSSProperties } from 'react'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'
import { assetCssStack, avatarAssets, groundAssets } from '@/spatial/assets/uraiAssets'
import styles from './GroundAaaWorld.module.css'

type AgentSlot = 'reception' | 'schedule' | 'wellness' | 'relationship' | 'logistics' | 'privacy' | 'archive' | 'operator'

const agents: Array<{ name: string; role: string; zone: string; slot: AgentSlot; asset: string }> = [
  { name: 'Welcome Guide', zone: 'Reception', role: 'Greets the camera as you enter the lower life layer.', slot: 'reception', asset: assetCssStack(avatarAssets.receptionist) },
  { name: 'Schedule Steward', zone: 'Planning table', role: 'Turns calendars, routines, appointments, and deadlines into a calm next plan.', slot: 'schedule', asset: assetCssStack(avatarAssets.scheduleSteward) },
  { name: 'Wellness Guide', zone: 'Wellness corner', role: 'Keeps recovery, pressure, and focus signals private and contextual.', slot: 'wellness', asset: assetCssStack(avatarAssets.wellnessGuide) },
  { name: 'Relationship Liaison', zone: 'Connections desk', role: 'Prepares check-ins, repair threads, reminders, and important conversations.', slot: 'relationship', asset: assetCssStack(avatarAssets.relationshipLiaison) },
  { name: 'Logistics Helper', zone: 'Errands bay', role: 'Stages deliveries, returns, tasks, home services, and handoffs for approval.', slot: 'logistics', asset: assetCssStack(avatarAssets.logisticsHelper) },
  { name: 'Privacy Steward', zone: 'Privacy sanctuary', role: 'Keeps permissions, boundaries, exports, and access choices visible.', slot: 'privacy', asset: assetCssStack(avatarAssets.privacySteward) },
  { name: 'Archivist', zone: 'Memory archive', role: 'Connects objects to places, memories, relationships, and consent gates.', slot: 'archive', asset: assetCssStack(avatarAssets.archivist) },
  { name: 'Operator', zone: 'Work console', role: 'Works quietly on inboxes, timing, priorities, tasks, and unfinished decisions.', slot: 'operator', asset: assetCssStack(avatarAssets.operator) },
]

type ObjectSlot = 'keys' | 'table' | 'work' | 'case' | 'calendar' | 'body'

const objects: Array<{ name: string; detail: string; slot: ObjectSlot; kind: string }> = [
  { name: 'Keys by the door', kind: 'Object', slot: 'keys', detail: 'Departures, errands, appointments, and return-home rituals stay connected to the day.' },
  { name: 'Kitchen table', kind: 'Surface', slot: 'table', detail: 'Meals, bills, notes, calls, repairs, and conversations become inspectable life context.' },
  { name: 'Work console', kind: 'Station', slot: 'work', detail: 'Projects, messages, files, priorities, and unfinished decisions route to the right helper.' },
  { name: 'Memory case', kind: 'Archive', slot: 'case', detail: 'Important objects open context before the camera ascends into the Life Map.' },
  { name: 'Calendar tower', kind: 'Time', slot: 'calendar', detail: 'Deadlines, routines, windows, and timing are staged without pretending to live for you.' },
  { name: 'Body signal', kind: 'Private', slot: 'body', detail: 'Focus, recovery, pressure, and rhythm signals stay in context as personal reflection.' },
]

const zones = [
  ['Reception', 'Entry', 'zoneReception'],
  ['Privacy sanctuary', 'Consent', 'zonePrivacy'],
  ['Work console', 'Priority', 'zoneWork'],
  ['Memory archive', 'Meaning', 'zoneArchive'],
  ['Wellness corner', 'Recovery', 'zoneWellness'],
  ['Garden passage', 'Reset', 'zoneGarden'],
] as const

const mobileProof = [
  ['Camera mode', 'Avatar and orb remain at Home'],
  ['Walkable zones', 'Reception, privacy, work, archive'],
  ['XR ready', 'Quest/AR enters as first-person camera'],
  ['Objects', 'Keys, table, calendar, body signal'],
] as const

const rail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['XR', '/spatial/ar-vr'],
] as const

const worldStyle = {
  '--ground-world-stack': assetCssStack(groundAssets.primary),
} as CSSProperties

export const metadata = {
  title: 'URAI Ground World',
  description: 'A first-person, enterable Ground layer. Avatar and orb remain anchored at Home while the camera walks the private operating floor.',
}

export default function GroundRealmPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main className={styles.world} style={worldStyle} data-urai-route="ground-world" data-launch-surface="walkable-first-person-ground-layer" data-camera-mode="first-person" data-home-avatar-orb="anchored-at-home">
      <aside hidden aria-hidden="true" data-testid="ground-realm-contract">
        <RealmShell scene={groundScene} summary="The enterable Ground World is a first-person camera layer. The Home avatar and orb remain anchored at Home while Ground exposes private workforce zones, inspectable objects, and XR-ready walk paths." />
      </aside>

      <div className={styles.ceiling} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/home">URAI Ground</Link>
        <p>First-person life floor · avatar and orb stay at Home</p>
      </header>

      <section className={styles.cameraEntry} aria-label="Ground entry camera state">
        <p>Camera descended</p>
        <h1>You are inside the lower layer.</h1>
        <span>Walk the floor. Inspect objects. Enter zones.</span>
      </section>

      <section className={styles.stage} aria-label="Walkable private operating floor">
        <div className={styles.viewportReticle} aria-hidden="true" />
        <div className={styles.walkHint} aria-hidden="true">drag · tap · teleport in XR</div>

        <div className={styles.zonesRail} aria-label="Ground walkable zones">
          {zones.map(([name, detail, className]) => (
            <Link key={name} href={`#${name.toLowerCase().replaceAll(' ', '-')}`} className={`${styles.zone} ${styles[className]}`}>
              <span>{detail}</span>
              <strong>{name}</strong>
            </Link>
          ))}
        </div>

        <div className={styles.agentsLayer} aria-label="Private helper presence">
          {agents.map((agent) => (
            <article id={agent.zone.toLowerCase().replaceAll(' ', '-')} key={agent.name} className={`${styles.agent} ${styles[`agent${agent.slot[0].toUpperCase()}${agent.slot.slice(1)}` as keyof typeof styles]}`}>
              <span className={styles.avatar} style={{ '--agent-art': agent.asset } as CSSProperties} aria-hidden="true" />
              <small>{agent.zone}</small>
              <h2>{agent.name}</h2>
              <p>{agent.role}</p>
            </article>
          ))}
        </div>

        <div className={styles.objectLayer} aria-label="Inspectable life objects">
          {objects.map((object) => (
            <details key={object.name} className={`${styles.object} ${styles[`object${object.slot[0].toUpperCase()}${object.slot.slice(1)}` as keyof typeof styles]}`}>
              <summary>
                <span>{object.kind}</span>
                <strong>{object.name}</strong>
              </summary>
              <p>{object.detail}</p>
            </details>
          ))}
        </div>

        <aside className={styles.inspector} aria-label="Ground canon">
          <span>Canon lock</span>
          <strong>No Home avatar. No Home orb.</strong>
          <p>Ground is entered by camera. Home keeps the body/orb anchor; this layer is walked from the user point of view.</p>
          <Link href="/spatial/ar-vr">Open XR entry</Link>
        </aside>
      </section>

      <section className="urai-ground-mobile-proof" aria-label="Mobile Ground World proof tray">
        {mobileProof.map(([title, copy]) => (
          <article key={title}>
            <span>{title}</span>
            <strong>{copy}</strong>
          </article>
        ))}
      </section>

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {rail.map(([label, href]) => <Link key={href} href={href} data-active={label === 'Ground' ? 'true' : 'false'}>{label}</Link>)}
      </nav>
    </main>
  )
}
