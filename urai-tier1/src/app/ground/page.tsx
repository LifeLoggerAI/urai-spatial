import Link from 'next/link'
import type { CSSProperties } from 'react'
import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'
import { assetCssStack, avatarAssets, groundAssets, uiAssets } from '@/spatial/assets/uraiAssets'
import styles from './GroundWorld.module.css'

type AgentSlot = 'reception' | 'schedule' | 'wellness' | 'relationship' | 'logistics' | 'privacy' | 'archive' | 'operator'

const agents: Array<{ name: string; role: string; zone: string; slot: AgentSlot; asset: string }> = [
  { name: 'Welcome Guide', zone: 'Reception', role: 'Greets you at the threshold, explains what can help, and keeps the world human.', slot: 'reception', asset: assetCssStack(avatarAssets.receptionist) },
  { name: 'Schedule Steward', zone: 'Planning table', role: 'Turns calendars, routines, appointments, and deadlines into a calm next plan.', slot: 'schedule', asset: assetCssStack(avatarAssets.scheduleSteward) },
  { name: 'Wellness Guide', zone: 'Wellness corner', role: 'Reflects focus, recovery, pressure, and body context as guidance only.', slot: 'wellness', asset: assetCssStack(avatarAssets.wellnessGuide) },
  { name: 'Relationship Liaison', zone: 'Connections desk', role: 'Helps prepare check-ins, repair threads, reminders, and important conversations.', slot: 'relationship', asset: assetCssStack(avatarAssets.relationshipLiaison) },
  { name: 'Logistics Helper', zone: 'Errands bay', role: 'Stages deliveries, returns, tasks, home services, and handoffs for approval.', slot: 'logistics', asset: assetCssStack(avatarAssets.logisticsHelper) },
  { name: 'Privacy Steward', zone: 'Privacy sanctuary', role: 'Guards permissions, data boundaries, exports, model access, and deletion choices.', slot: 'privacy', asset: assetCssStack(avatarAssets.privacySteward) },
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
  { name: 'Health signal', kind: 'Private context', slot: 'body', detail: 'Body, focus, recovery, and pressure signals are reflected as context only, never diagnosis.' },
]

const zones = [
  ['Privacy Sanctuary', 'Your data. Your rules. Consent before access.'],
  ['Reception', 'A welcome guide keeps the system understandable.'],
  ['Garden Passage', 'A quiet path for reset, breath, and return.'],
  ['Memory Archive', 'Personal objects stay connected to meaning.'],
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
  '--ground-reception-stack': assetCssStack(groundAssets.accents.reception),
  '--ground-privacy-stack': assetCssStack(groundAssets.accents.privacySanctuary),
  '--ground-logistics-stack': assetCssStack(groundAssets.accents.logistics),
  '--ground-wellness-stack': assetCssStack(groundAssets.accents.wellness),
  '--ground-archive-stack': assetCssStack(groundAssets.accents.memoryArchive),
  '--ground-orb-stack': assetCssStack(uiAssets.orbActive),
} as CSSProperties

export const metadata = {
  title: 'URAI Ground World',
  description: 'The enterable URAI Ground World with private AI workforce presence and inspectable real-life objects.',
}

export default function GroundRealmPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main className={styles.world} style={worldStyle} data-urai-route="ground-world" data-launch-surface="assetized-embodied-ground-world">
      <aside hidden aria-hidden="true" data-testid="ground-realm-contract">
        <RealmShell
          scene={groundScene}
          summary="The enterable Ground World keeps URAI realm routing, private AI workforce presence, and inspectable real-life objects connected."
        />
      </aside>

      <div className={styles.assetBackdrop} aria-hidden="true" />
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/home" className={styles.brand}>URAI Ground World</Link>
        <p>Private real-life operating layer · reception · privacy · helpers · permission</p>
      </header>

      <section className={styles.copy} aria-label="Ground World introduction">
        <p className={styles.eyebrow}>Enterable real-life layer</p>
        <h1>Your private world helps your real life.</h1>
        <p>
          Ground is the lived place: reception, privacy, objects, routines, work, relationships, calendars, and a private AI workforce quietly staging the next useful move.
        </p>
        <div className={styles.actions}>
          <Link href="/home">Return Home</Link>
          <Link href="/life-map" className={styles.primary}>Ascend to Life Map</Link>
        </div>
      </section>

      <section className={styles.scene} aria-label="Embodied ground world scene">
        <div className={styles.roomDepth} aria-hidden="true">
          <span className={styles.backWindow} />
          <span className={styles.leftLibrary} />
          <span className={styles.rightWorkshop} />
          <span className={styles.privacyVault} />
          <span className={styles.gardenPassage} />
        </div>

        <div className={styles.zoneLabels} aria-label="Ground zones">
          {zones.map(([name, detail]) => (
            <article key={name}>
              <span>{name}</span>
              <p>{detail}</p>
            </article>
          ))}
        </div>

        <div className={styles.orbColumn} aria-hidden="true">
          <span className={styles.orbBeam} />
          <span className={styles.orb} />
          <span className={styles.orbLabel}>URAI orb companion</span>
        </div>

        <div className={styles.agentRing} aria-label="Private AI workforce">
          {agents.map((agent) => (
            <article key={agent.name} className={`${styles.agent} ${styles[`agent_${agent.slot}` as keyof typeof styles]}`}>
              <span className={styles.agentAvatar} style={{ '--agent-art': agent.asset } as CSSProperties} aria-hidden="true" />
              <span className={styles.agentPulse} aria-hidden="true" />
              <small>{agent.zone}</small>
              <h2>{agent.name}</h2>
              <p>{agent.role}</p>
            </article>
          ))}
        </div>

        <div className={styles.objectField} aria-label="Inspectable real-life objects">
          {objects.map((object) => (
            <details key={object.name} className={`${styles.object} ${styles[`object_${object.slot}` as keyof typeof styles]}`}>
              <summary>
                <span>{object.kind}</span>
                <strong>{object.name}</strong>
              </summary>
              <p>{object.detail}</p>
            </details>
          ))}
        </div>

        <aside className={styles.inspector} aria-label="Object inspector panel">
          <span>Object inspector</span>
          <strong>Open any object or station.</strong>
          <p>Ground turns real-life pressure into staged, permissioned context: what matters, what can wait, what needs a human choice.</p>
        </aside>
      </section>

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {rail.map(([label, href]) => <Link key={href} href={href} data-active={label === 'Ground' ? 'true' : 'false'}>{label}</Link>)}
      </nav>
    </main>
  )
}
