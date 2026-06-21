'use client';

import type { CSSProperties } from 'react';
import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import styles from './MemoryModeSurface.module.css';

type Props = {
  mode: 'focus' | 'replay';
  node?: LifeMapNode;
  replayPath?: ReplayPath;
};

function privacyText(level?: LifeMapNode['privacyLevel']) {
  if (level === 'publicSafe') return 'public-safe';
  if (level === 'privateDetail') return 'private detail gated';
  if (level === 'hidden') return 'hidden by default';
  return 'private summary';
}

export function MemoryModeSurfaceV2({ mode, node, replayPath }: Props) {
  const replay = mode === 'replay';
  const title = replay ? 'Replay the thread.' : node?.title ?? 'One living memory.';
  const subtitle = replay ? replayPath?.title ?? 'A cinematic memory path is ready.' : node?.subtitle ?? 'One selected star stays stable.';
  const narration = replay ? replayPath?.captionLines?.[0] ?? 'The thread moves with return routes visible.' : node?.narratorLine ?? 'Stay with one signal.';
  const chips = replay ? replayPath?.captionLines?.slice(1, 4) ?? [] : node?.sourceSignals ?? [];
  const focusHref = node ? `/focus?memoryId=${encodeURIComponent(node.id)}` : '/focus?memoryId=quiet-reset';
  const replayHref = replayPath ? `/replay?manifestId=${encodeURIComponent(replayPath.id)}` : '/replay?manifestId=replay-recovery-thread';
  const orbStyle = { '--memory-color': node?.auraColor ?? '#67e8f9' } as CSSProperties;

  return (
    <section className={styles.shell} data-testid={`urai-${mode}-surface`} aria-label={replay ? 'URAI Replay surface' : 'URAI Focus surface'}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.depthLines} aria-hidden="true"><span /><span /><span /></div>
      <article className={styles.chamber}>
        <p className={styles.kicker}>{replay ? 'URAI Replay · cinematic thread' : 'URAI Focus · memory chamber'}</p>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.signalRow}>
          <span>{node?.emotionalTone ?? 'single signal'}</span>
          <span>{privacyText(node?.privacyLevel)}</span>
          <span>{replay ? 'time path active' : 'stable chamber'}</span>
        </div>
      </article>
      <div className={styles.memoryOrb} aria-hidden="true" style={orbStyle}><span>{node?.glyph ?? '◌'}</span></div>
      <aside className={styles.contextPanel}>
        <p className={styles.kicker}>{replay ? 'Now playing' : node?.type ?? 'selected memory'}</p>
        <h2>{replay ? replayPath?.title ?? 'Recovery thread' : node?.title ?? 'Selected signal'}</h2>
        <p>{narration}</p>
        <div className={styles.whyList}>{(chips.length ? chips : ['route-safe', 'private-by-default', 'return path visible']).slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      </aside>
      {replay ? <ol className={styles.timeline}>{(replayPath?.captionLines?.length ? replayPath.captionLines : ['The star opens.', 'The thread moves.', 'The self returns.']).slice(0, 5).map((line, index) => <li key={`${line}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{line}</p></li>)}</ol> : null}
      <nav className={styles.routeRail} aria-label="Memory route controls">
        <a href="/life-map">Life Map</a>
        <a href={focusHref}>Focus</a>
        <a href={replayHref}>Replay</a>
        <a href="/mirror">Mirror</a>
        <a href="/passport">Passport</a>
        <a href="/status">Status</a>
      </nav>
    </section>
  );
}
