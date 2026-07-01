'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './MirrorRealm.module.css';

type OrbMode = 'calm' | 'revealing' | 'held-private';

type ThreadSpec = {
  id: string;
  title: string;
  sourceLabel: string;
  patternLabel: string;
  focusMemoryId: string;
  replayManifestId: string;
  recognition: string;
  continuity: string;
  consent: string;
};

type StateSpec = {
  label: string;
  orbMode: OrbMode;
  description: string;
};

const THREADS: Record<string, ThreadSpec> = {
  'seed-memory-bloom': {
    id: 'seed-memory-bloom',
    title: 'Memory Bloom Thread',
    sourceLabel: 'Life Map bloom',
    patternLabel: 'Bloom · Return · Breath',
    focusMemoryId: 'quiet-reset',
    replayManifestId: 'replay-recovery-thread',
    recognition:
      'URAI is noticing a return pattern: care, recovery, and becoming keep showing up as the same emotional shape.',
    continuity:
      'This thread stays connected to the Life Map, opens cleanly in Focus, and can become an embodied Replay without losing context.',
    consent:
      'The raw memory remains behind Passport. Mirror only displays the public-safe shape, rhythm, and return path.',
  },
  'chapter-becoming': {
    id: 'chapter-becoming',
    title: 'Chapter of Becoming',
    sourceLabel: 'Selected chapter',
    patternLabel: 'Becoming · Signal · Return',
    focusMemoryId: 'chapter-becoming',
    replayManifestId: 'replay-becoming-thread',
    recognition:
      'The selected chapter is reflecting a becoming pattern: pressure, courage, and return are arranging into a visible signal.',
    continuity:
      'Mirror keeps this chapter tied to the same emotional route across Life Map, Focus, and Replay.',
    consent:
      'Private detail stays sealed. The chamber shows the pattern without publishing the memory underneath it.',
  },
  'quiet-reset': {
    id: 'quiet-reset',
    title: 'Quiet Reset Thread',
    sourceLabel: 'Focus recovery thread',
    patternLabel: 'Quiet · Reset · Ground',
    focusMemoryId: 'quiet-reset',
    replayManifestId: 'replay-recovery-thread',
    recognition:
      'A quiet reset pattern is visible: the system is reflecting the shape of regulation, pause, and safe return.',
    continuity:
      'The reset remains one step from Life Map while Focus and Replay preserve the selected emotional thread.',
    consent:
      'Mirror keeps the intimate details private and shows only the reflection geometry the user chooses to carry forward.',
  },
};

const STATE_COPY: Record<string, StateSpec> = {
  softened: {
    label: 'Softened',
    orbMode: 'calm',
    description: 'The reflection is calm: the pattern is visible without pressure, judgment, or exposure.',
  },
  calm: {
    label: 'Calm',
    orbMode: 'calm',
    description: 'The chamber is calm: the orb holds the selected thread as a quiet, safe reflection.',
  },
  revealing: {
    label: 'Revealing',
    orbMode: 'revealing',
    description: 'The chamber is revealing: waveform rings open so the shape can be understood without raw memory detail.',
  },
  'held-private': {
    label: 'Held Private',
    orbMode: 'held-private',
    description: 'The chamber is held private: a consent shield stays around the reflection and the raw memory remains sealed.',
  },
};

const PORTALS = [
  { label: 'Home', href: '/home' },
  { label: 'Life Map', href: '/life-map' },
  { label: 'Focus', href: '/focus?memoryId=quiet-reset' },
  { label: 'Replay', href: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread' },
  { label: 'Mirror', href: '/mirror', active: true },
  { label: 'Passport', href: '/passport' },
  { label: 'Status', href: '/status' },
];

function normalizeState(value: string | null | undefined): keyof typeof STATE_COPY {
  if (!value) return 'softened';

  const normalized = value.toLowerCase().replace(/[\s_]+/g, '-');

  if (normalized.includes('reveal')) return 'revealing';
  if (normalized.includes('held') || normalized.includes('private')) return 'held-private';
  if (normalized.includes('calm')) return 'calm';
  if (normalized.includes('soft')) return 'softened';

  return 'softened';
}

function normalizeThread(value: string | null | undefined): ThreadSpec {
  const id = value?.trim() || 'seed-memory-bloom';
  const known = THREADS[id];

  if (known) return known;

  const title = id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    id,
    title: title ? `${title} Thread` : THREADS['seed-memory-bloom'].title,
    sourceLabel: 'Selected thread',
    patternLabel: 'Shape · Rhythm · Return',
    focusMemoryId: id,
    replayManifestId: `replay-${id}`,
    recognition:
      'URAI is reflecting the selected thread as a public-safe pattern so the shape can be seen without exposing the memory.',
    continuity:
      'The same thread can return to Life Map, deepen in Focus, and open in Replay while staying connected.',
    consent:
      'Private detail remains user-controlled. Mirror only shows the safe reflection layer.',
  };
}

function normalizeSource(value: string | null | undefined) {
  if (!value) return 'Safe default';

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function MirrorRealm() {
  const searchParams = useSearchParams();
  const rawThread = searchParams?.get('thread') ?? searchParams?.get('memoryId');
  const stateKey = normalizeState(searchParams?.get('state'));
  const fromLabel = normalizeSource(searchParams?.get('from'));
  const thread = useMemo(() => normalizeThread(rawThread), [rawThread]);
  const state = STATE_COPY[stateKey];
  const [interactionMode, setInteractionMode] = useState<OrbMode | null>(null);

  const orbMode = interactionMode ?? state.orbMode;
  const contextQuery = `thread=${encodeURIComponent(thread.id)}&from=mirror&state=${encodeURIComponent(stateKey)}`;
  const lifeMapHref = `/life-map?${contextQuery}`;
  const focusHref = `/focus?memoryId=${encodeURIComponent(thread.focusMemoryId)}&from=mirror&state=${encodeURIComponent(stateKey)}`;
  const replayHref = `/replay?memoryId=${encodeURIComponent(thread.focusMemoryId)}&manifestId=${encodeURIComponent(thread.replayManifestId)}&from=mirror&state=${encodeURIComponent(stateKey)}`;
  const passportHref = `/passport?${contextQuery}`;
  const statusHref = `/status?from=mirror&thread=${encodeURIComponent(thread.id)}`;
  const mirrorHref = `/mirror?${contextQuery}`;

  const lenses = [
    { title: 'Recognition', kicker: 'Pattern noticed', body: thread.recognition, href: focusHref, cta: 'Open Focus' },
    { title: 'Continuity', kicker: 'Thread connected', body: thread.continuity, href: replayHref, cta: 'Open Replay' },
    { title: 'Consent', kicker: 'Memory protected', body: thread.consent, href: passportHref, cta: 'View Passport' },
  ];

  return (
    <main className={styles.realmShell} data-orb-mode={orbMode}>
      <a className={styles.skipLink} href="#mirror-actions">Skip to Mirror actions</a>
      <div className={styles.farStars} aria-hidden="true" />
      <div className={styles.midStars} aria-hidden="true" />
      <div className={styles.nebulaDepth} aria-hidden="true" />
      <div className={styles.chamberShell} aria-hidden="true" />
      <div className={styles.memoryThreadLine} aria-hidden="true" />
      <div className={styles.mirrorPlane} aria-hidden="true"><span /><span /><span /></div>

      <div className={styles.realmGrid}>
        <section className={styles.copyPanel} aria-labelledby="mirror-title">
          <p className={styles.eyebrow}>URAI Mirror · Reflection Realm</p>
          <h1 id="mirror-title">See the pattern without leaving the world.</h1>
          <p className={styles.promise}>Mirror shows the shape of a pattern without exposing the raw memory.</p>
          <p className={styles.lead}>Your raw memory stays private. The shape stays visible, connected, and user-controlled.</p>
          <dl className={styles.contextStrip} aria-label="Mirror context">
            <div><dt>Thread</dt><dd>{thread.title}</dd></div>
            <div><dt>From</dt><dd>{fromLabel}</dd></div>
          </dl>
          <div className={styles.actionCluster} id="mirror-actions" aria-label="Mirror actions">
            <button type="button" className={styles.primaryAction} onClick={() => setInteractionMode('revealing')}>Reflect current thread</button>
            <Link href={lifeMapHref}>Return to Life Map</Link>
            <Link href={replayHref}>Open Replay</Link>
            <Link href={passportHref}>Save reflection privately</Link>
          </div>
        </section>

        <section className={styles.orbChamber} aria-label="Interactive emotional mirror orb">
          <div className={styles.routePathways} aria-hidden="true"><span /><span /><span /></div>
          <button
            type="button"
            className={styles.orbButton}
            onClick={() => setInteractionMode(orbMode === 'revealing' ? 'held-private' : 'revealing')}
            aria-label={`Reflect ${thread.title}. Current orb state is ${STATE_COPY[orbMode].label}.`}
          >
            <span className={styles.privacyAura} />
            <span className={styles.reflectionRing} />
            <span className={styles.reflectionRingTwo} />
            <span className={styles.orbCore}><span className={styles.patternGlyph}>{thread.patternLabel}</span></span>
          </button>
          <p className={styles.orbCaption}>{state.description}</p>
          <div className={styles.orbStateControls} aria-label="Orb visible states">
            <button type="button" aria-pressed={orbMode === 'calm'} onClick={() => setInteractionMode('calm')}>Calm</button>
            <button type="button" aria-pressed={orbMode === 'revealing'} onClick={() => setInteractionMode('revealing')}>Revealing</button>
            <button type="button" aria-pressed={orbMode === 'held-private'} onClick={() => setInteractionMode('held-private')}>Held/private</button>
          </div>
        </section>

        <aside className={styles.statusPanel} aria-label="Mirror chamber status">
          <p className={styles.eyebrow}>Current reflection</p>
          <h2>{state.label}</h2>
          <p>{state.description}</p>
          <dl>
            <div><dt>Source</dt><dd>{thread.sourceLabel}</dd></div>
            <div><dt>Pattern</dt><dd>{thread.patternLabel}</dd></div>
            <div><dt>Privacy</dt><dd>Raw memory sealed</dd></div>
          </dl>
        </aside>
      </div>

      <section className={styles.lensGrid} aria-label="Mirror interpretation lenses">
        {lenses.map((lens) => (
          <article key={lens.title}>
            <p>{lens.kicker}</p>
            <h2>{lens.title}</h2>
            <span>{lens.body}</span>
            <Link href={lens.href}>{lens.cta}</Link>
          </article>
        ))}
      </section>

      <nav className={styles.portalRail} aria-label="URAI route rail">
        {PORTALS.map((portal) => (
          <Link key={portal.href} href={portal.href} aria-current={portal.active ? 'page' : undefined}>
            {portal.label}
          </Link>
        ))}
        <Link href={mirrorHref}>Refresh Mirror</Link>
      </nav>
    </main>
  );
}

export default MirrorRealm;
