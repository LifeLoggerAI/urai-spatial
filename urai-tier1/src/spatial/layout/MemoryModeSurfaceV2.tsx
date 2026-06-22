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

function svgText(value?: string) {
  return (value ?? 'Memory')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 72);
}

function memoryPosterSvg(input: { title: string; subtitle: string; tone?: string; color: string; core: string; replay: boolean }) {
  const title = svgText(input.title);
  const subtitle = svgText(input.subtitle);
  const tone = svgText(input.tone ?? 'memory signal');
  const mode = input.replay ? 'CINEMATIC REPLAY' : 'FOCUS MEMORY';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 920" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071225"/><stop offset="0.42" stop-color="#0b1d34"/><stop offset="1" stop-color="#020617"/></linearGradient>
      <radialGradient id="core" cx="42%" cy="31%" r="36%"><stop offset="0" stop-color="#fff"/><stop offset="0.18" stop-color="${input.color}"/><stop offset="0.58" stop-color="${input.core}" stop-opacity="0.34"/><stop offset="1" stop-color="${input.core}" stop-opacity="0"/></radialGradient>
      <radialGradient id="memory" cx="64%" cy="58%" r="42%"><stop offset="0" stop-color="${input.core}" stop-opacity="0.92"/><stop offset="0.38" stop-color="${input.core}" stop-opacity="0.38"/><stop offset="1" stop-color="${input.core}" stop-opacity="0"/></radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="grain" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 0h1v1H0zM11 7h1v1h-1zM4 14h1v1H4z" fill="#fff" opacity="0.08"/></pattern>
    </defs>
    <rect width="1400" height="920" rx="54" fill="url(#sky)"/>
    <rect width="1400" height="920" fill="url(#grain)" opacity="0.42"/>
    <ellipse cx="700" cy="760" rx="740" ry="190" fill="#0b1727" opacity="0.78"/>
    <ellipse cx="670" cy="730" rx="470" ry="96" fill="${input.core}" opacity="0.12" filter="url(#soft)"/>
    <circle cx="520" cy="296" r="280" fill="url(#core)" filter="url(#glow)"/>
    <circle cx="850" cy="500" r="330" fill="url(#memory)" filter="url(#glow)"/>
    <path d="M178 596 C470 524, 760 535, 1222 438" stroke="${input.color}" stroke-width="3" opacity="0.34" fill="none"/>
    <path d="M260 480 C610 414, 850 390, 1188 320" stroke="#e0f2fe" stroke-width="2" opacity="0.20" fill="none"/>
    <path d="M628 134 C548 344, 520 610, 464 870" stroke="#e0f2fe" stroke-width="46" opacity="0.14" fill="none"/>
    <path d="M690 118 C618 345, 590 612, 524 906" stroke="#f8fbff" stroke-width="16" opacity="0.18" fill="none"/>
    <g opacity="0.52"><path d="M258 724h884" stroke="#dbeafe" stroke-width="2"/><path d="M398 666h600" stroke="#93c5fd" stroke-width="1" opacity="0.45"/><path d="M690 220v430" stroke="${input.color}" stroke-width="2" opacity="0.42"/></g>
    <g filter="url(#glow)"><circle cx="690" cy="498" r="18" fill="none" stroke="#e0f2fe" stroke-width="7" stroke-dasharray="4 18" opacity="0.9"/><circle cx="690" cy="498" r="4" fill="${input.color}"/></g>
    <text x="76" y="96" fill="${input.color}" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="900" letter-spacing="9">URAI ${mode}</text>
    <text x="76" y="800" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="74" font-weight="950" letter-spacing="-4">${title}</text>
    <text x="80" y="846" fill="#dbeafe" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800">${subtitle}</text>
    <text x="80" y="884" fill="${input.color}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="5">${tone}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  const posterImageSrc = useMemo(
    () =>
      memoryPosterSvg({
        title: node?.title ?? title,
        subtitle: node?.subtitle ?? subtitle,
        tone: replay ? activeCaption : node?.emotionalTone,
        color: node?.auraColor ?? '#bfefff',
        core: node?.color ?? '#38bdf8',
        replay,
      }),
    [activeCaption, node?.auraColor, node?.color, node?.emotionalTone, node?.subtitle, node?.title, replay, subtitle, title],
  );
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
          <img src={posterImageSrc} alt="" draggable={false} />
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
