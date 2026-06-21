'use client';

import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import styles from './MemoryModeSurface.module.css';

type MemoryModeSurfaceProps = {
  mode: 'focus' | 'replay';
  node?: LifeMapNode;
  replayPath?: ReplayPath;
};

function privacyLabel(level?: LifeMapNode['privacyLevel']) {
  if (level === 'publicSafe') return 'public-safe';
  if (level === 'privateDetail') return 'private detail gated';
  if (level === 'hidden') return 'hidden by default';
  return 'private summary';
}

export function MemoryModeSurface({ mode, node, replayPath }: MemoryModeSurfaceProps) {
  const activeNode = node;
  const isReplay = mode === 'replay';
  const title = isReplay ? 'Replay the thread.' : activeNode?.title ?? 'Open one living memory.';
  const subtitle = isReplay
    ? replayPath?.title ?? 'A cinematic memory path is ready.'
    : activeNode?.subtitle ?? 'A single star stays stable while the rest of the world quiets.';
  const narrator = isReplay
    ? replayPath?.captionLines?.[0] ?? 'The memory path moves without losing consent, context, or return routes.'
    : activeNode?.narratorLine ?? 'Stay with one signal. Let the world dim around it.';
  const whyThis = isReplay
    ? replayPath?.captionLines?.slice(1, 4) ?? []
    : activeNode?.sourceSignals ?? [];
  const focusHref = activeNode ? `/focus?memoryId=${encodeURIComponent(activeNode.id)}` : '/focus?memoryId=quiet-reset';
  const replayHref = replayPath ? `/replay?manifestId=${encodeURIComponent(replayPath.id)}` : '/replay?manifestId=replay-recovery-thread';

  return (
    <section className={styles.shell} data-testid={`urai-${mode}-surface`} aria-label={isReplay ? 'URAI Replay memory thread' : 'URAI Focus memory chamber'}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.depthLines} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <article className={styles.chamber}>
        <p className={styles.kicker}>{isReplay ? 'URAI Replay · cinematic thread' : 'URAI Focus · memory chamber'}</p>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.signalRow} aria-label="Memory state">
          <span>{activeNode?.emotionalTone ?? 'single signal'}</span>
          <span>{privacyLabel(activeNode?.privacyLevel)}</span>
          <span>{isReplay ? 'time path active' : 'stable chamber'}</span>
        </div>
      </article>

      <div className={styles.memoryOrb} aria-hidden="true" style={{ '--memory-color': activeNode?.auraColor ?? '#67e8f9' } as React.CSSProperties}>
        <span>{activeNode?.glyph ?? '◌'}</span>
      </div>

      <aside className={styles.contextPanel} aria-label={isReplay ? 'Replay narration' : 'Memory context'}>
        <p className={styles.kicker}>{isReplay ? 'Now playing' : activeNode?.type ?? 'selected memory'}</p>
        <h2>{isReplay ? replayPath?.title ?? 'Recovery thread' : activeNode?.title ?? 'Selected signal'}</h2>
        <p>{narrator}</p>
        <div className={styles.whyList}>
          {(whyThis.length ? whyThis : ['route-safe', 'private-by-default', 'return path visible']).slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </aside>

      {isReplay ? (
        <ol className={styles.timeline} aria-label="Replay sequence">
          {(replayPath?.captionLines?.length ? replayPath.captionLines : ['The star opens.', 'The thread moves.', 'The self returns.']).slice(0, 5).map((line, index) => (
            <li key={`${line}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{line}</p>
            </li>
          ))}
        </ol>
      ) : null}

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
