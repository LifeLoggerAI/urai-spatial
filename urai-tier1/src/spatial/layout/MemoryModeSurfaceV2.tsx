'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import styles from './MemoryModeSurface.module.css';

type Props = {
  mode: 'focus' | 'replay';
  node?: LifeMapNode;
  replayPath?: ReplayPath;
};

function privacyText(level?: LifeMapNode['privacyLevel']) {
  if (level === 'publicSafe') return 'public-safe memory';
  if (level === 'privateDetail') return 'private detail gated';
  if (level === 'hidden') return 'hidden until allowed';
  return 'private summary';
}

function formatMomentTime(timestamp?: string) {
  if (!timestamp) return 'memory time preserved';
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return 'memory time preserved';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function compactPercent(value?: number) {
  return `${Math.round((value ?? 0.5) * 100)}%`;
}

export function MemoryModeSurfaceV2({ mode, node, replayPath }: Props) {
  const router = useRouter();
  const replay = mode === 'replay';
  const [playing, setPlaying] = useState(replay);
  const [progress, setProgress] = useState(0);
  const nodeId = node?.id ?? 'quiet-reset';
  const focusHref = `/focus?memoryId=${encodeURIComponent(nodeId)}`;
  const replayHref = `/replay?memoryId=${encodeURIComponent(nodeId)}&manifestId=${encodeURIComponent(replayPath?.id ?? 'replay-recovery-thread')}`;
  const lifeMapHref = `/life-map?memoryId=${encodeURIComponent(nodeId)}`;
  const unwindHref = replay ? focusHref : lifeMapHref;
  const durationMs = replayPath?.durationMs ?? 90000;
  const captionLines = useMemo(
    () =>
      replayPath?.captionLines?.length
        ? replayPath.captionLines
        : [
            node?.narratorLine ?? 'The star opens into a stable memory chamber.',
            node?.whyThis ?? 'The surrounding signals connect into a private path.',
            'The replay closes with the return route still visible.',
          ],
    [node?.narratorLine, node?.whyThis, replayPath?.captionLines],
  );
  const activeCaptionIndex = captionLines.length ? Math.min(captionLines.length - 1, Math.floor(progress * captionLines.length)) : 0;
  const activeCaption = captionLines[activeCaptionIndex] ?? node?.narratorLine ?? 'The memory is ready.';
  const title = replay ? replayPath?.title ?? `${node?.title ?? 'Memory'} Replay` : node?.title ?? 'One living memory';
  const subtitle = replay
    ? `A cinematic pass through ${node?.title ?? 'the selected memory'}, with Focus and Life Map return paths kept open.`
    : node?.subtitle ?? 'One selected star stays stable.';
  const chips = replay ? captionLines.slice(0, 4) : node?.sourceSignals ?? [];
  const surfaceStyle = {
    '--memory-color': node?.auraColor ?? '#67e8f9',
    '--memory-core': node?.color ?? '#38bdf8',
    '--memory-progress': `${Math.round(progress * 100)}%`,
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId);
  }, [nodeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        router.push(unwindHref);
      }
      if (replay && event.key === ' ') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (replay && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setProgress(0);
        setPlaying(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replay, router, unwindHref]);

  useEffect(() => {
    if (!replay || !playing) return;
    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 1 ? 1 : Math.min(1, value + 900 / durationMs)));
    }, 900);
    return () => window.clearInterval(interval);
  }, [durationMs, playing, replay]);

  return (
    <section className={styles.shell} data-testid={`urai-${mode}-surface`} aria-label={replay ? 'URAI Replay surface' : 'URAI Focus surface'} style={surfaceStyle}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.depthLines} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.particleField} aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <article className={styles.chamber}>
        <p className={styles.kicker}>{replay ? 'URAI Replay · cinematic memory scene' : 'URAI Focus · selected memory chamber'}</p>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.signalRow}>
          <span>{node?.emotionalTone ?? 'single signal'}</span>
          <span>{formatMomentTime(node?.timestamp)}</span>
          <span>{privacyText(node?.privacyLevel)}</span>
          <span>{replay ? 'replay active' : 'image opens replay'}</span>
        </div>
      </article>

      <button
        type="button"
        className={`${styles.memoryPoster} ${replay ? styles.memoryPosterReplay : ''}`}
        onClick={() => {
          if (replay) {
            setPlaying((value) => !value);
            return;
          }
          router.push(replayHref);
        }}
        aria-label={replay ? 'Pause or play this memory replay' : `Open ${node?.title ?? 'this memory'} in Replay`}
      >
        <span className={styles.posterAura} aria-hidden="true" />
        <span className={styles.posterGlyph}>{node?.glyph ?? '◌'}</span>
        <span className={styles.posterImage} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.posterCaption}>
          <strong>{node?.title ?? 'Selected memory'}</strong>
          <small>{replay ? (playing ? 'playing cinematic replay' : 'replay paused') : 'click the memory image to replay'}</small>
        </span>
      </button>

      <aside className={styles.contextPanel}>
        <p className={styles.kicker}>{replay ? 'Now playing' : node?.type ?? 'selected memory'}</p>
        <h2>{replay ? activeCaption : node?.title ?? 'Selected signal'}</h2>
        <p>{replay ? node?.whyThis ?? activeCaption : node?.narratorLine ?? 'Stay with one signal.'}</p>
        <div className={styles.whyList}>{(chips.length ? chips : ['private return path', 'focus stable', 'life map linked']).slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      </aside>

      <section className={styles.memoryMetrics} aria-label="Memory signal controls">
        <div><span>Intensity</span><strong>{compactPercent(node?.emotionalIntensity)}</strong></div>
        <div><span>Importance</span><strong>{compactPercent(node?.importance)}</strong></div>
        <div><span>Unresolved</span><strong>{compactPercent(node?.unresolvedness)}</strong></div>
      </section>

      {replay ? (
        <>
          <div className={styles.replayScrub} aria-label="Replay progress">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className={styles.replayControls} aria-label="Replay controls">
            <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button>
            <button type="button" onClick={() => { setProgress(0); setPlaying(true); }}>Restart</button>
            <button type="button" onClick={() => router.push(focusHref)}>Return Focus</button>
          </div>
          <ol className={styles.timeline}>{captionLines.slice(0, 5).map((line, index) => <li key={`${line}-${index}`} data-active={index === activeCaptionIndex}><span>{String(index + 1).padStart(2, '0')}</span><p>{line}</p></li>)}</ol>
        </>
      ) : null}

      <nav className={styles.routeRail} aria-label="Memory route controls">
        <a href={lifeMapHref}>Life Map</a>
        <a href={focusHref}>Focus</a>
        <a href={replayHref}>Replay</a>
        <a href={unwindHref}>ESC / Unwind</a>
        <a href="/mirror">Mirror</a>
        <a href="/passport">Passport</a>
        <a href="/status">Status</a>
      </nav>
    </section>
  );
}
