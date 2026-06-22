'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import styles from './MemoryModeSurface.module.css';

type Props = { mode: 'focus' | 'replay'; node?: LifeMapNode; replayPath?: ReplayPath };
const pct = (value = 0.5, progress = 1) => `${Math.round(value * progress * 100)}%`;
const label = (value?: string) => (value ?? 'memory').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').toLowerCase();
const timeLabel = (value?: string) => { const date = new Date(value ?? ''); return !value || Number.isNaN(date.valueOf()) ? 'memory time preserved' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); };
const privacy = (value?: LifeMapNode['privacyLevel']) => value === 'publicSafe' ? 'public-safe memory' : value === 'privateDetail' ? 'detail gated' : value === 'hidden' ? 'gated memory' : 'private summary';
const chipsFor = (items?: string[]) => { const clean = (items ?? []).filter((item) => !/demo/i.test(item)).map((item) => item.replace(/-/g, ' ')); return clean.length ? clean : ['life map linked', 'replay ready', 'signal resolving']; };

function artifactStyle(node: LifeMapNode | undefined, replay: boolean): CSSProperties {
  const color = node?.auraColor ?? '#bfefff';
  const core = node?.color ?? '#38bdf8';
  const tone = node?.type === 'shadow' || node?.type === 'habitPattern' ? 'rgba(88,28,135,.28)' : node?.type === 'relationship' || node?.type === 'socialPattern' ? 'rgba(251,113,133,.22)' : node?.type === 'recovery' || node?.type === 'rebirth' ? 'rgba(132,204,22,.22)' : node?.type === 'dream' || node?.type === 'ritual' ? 'rgba(139,92,246,.24)' : 'rgba(103,232,249,.18)';
  return { background: `radial-gradient(circle at 34% 25%, rgba(255,255,255,.95), ${color} 10%, transparent 31%), radial-gradient(circle at 68% 54%, ${core}, transparent 36%), radial-gradient(ellipse at 50% 90%, ${tone}, transparent 54%), linear-gradient(155deg, #071225 0%, #0b1d34 44%, #020617 100%)`, boxShadow: replay ? `inset 0 0 140px rgba(255,255,255,.12), 0 0 140px ${color}` : undefined };
}

export function MemoryModeSurfaceV2({ mode, node, replayPath }: Props) {
  const router = useRouter();
  const replay = mode === 'replay';
  const [playing, setPlaying] = useState(replay);
  const [progress, setProgress] = useState(0);
  const [signalProgress, setSignalProgress] = useState(1);
  const nodeId = node?.id ?? 'quiet-reset';
  const focusHref = `/focus?memoryId=${encodeURIComponent(nodeId)}`;
  const replayHref = `/replay?memoryId=${encodeURIComponent(nodeId)}&manifestId=${encodeURIComponent(replayPath?.id ?? 'replay-recovery-thread')}`;
  const lifeMapHref = `/life-map?memoryId=${encodeURIComponent(nodeId)}`;
  const unwindHref = replay ? focusHref : lifeMapHref;
  const captions = useMemo(() => replayPath?.captionLines?.length ? replayPath.captionLines : [node?.narratorLine ?? 'The star opens into a stable memory chamber.', node?.whyThis ?? 'The surrounding signals connect into a private path.', 'The replay closes with the return route still visible.'], [node?.narratorLine, node?.whyThis, replayPath?.captionLines]);
  const activeIndex = captions.length ? Math.min(captions.length - 1, Math.floor(progress * captions.length)) : 0;
  const activeCaption = captions[activeIndex] ?? node?.narratorLine ?? 'The memory is ready.';
  const title = replay ? replayPath?.title ?? `${node?.title ?? 'Memory'} Replay` : node?.title ?? 'One living memory';
  const subtitle = replay ? `A cinematic pass through ${node?.title ?? 'the selected memory'} with the return path kept open.` : node?.subtitle ?? 'One selected star stays stable.';
  const surfaceStyle = { '--memory-color': node?.auraColor ?? '#67e8f9', '--memory-core': node?.color ?? '#38bdf8', '--memory-progress': `${Math.round(progress * 100)}%` } as CSSProperties;

  useEffect(() => { if (typeof window !== 'undefined') window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId); }, [nodeId]);
  useEffect(() => { if (typeof window === 'undefined') return; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; setSignalProgress(0); const id = window.setTimeout(() => setSignalProgress(1), 80); return () => window.clearTimeout(id); }, [nodeId, mode]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); router.push(unwindHref); } if (replay && event.key === ' ') { event.preventDefault(); setPlaying((value) => !value); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [replay, router, unwindHref]);
  useEffect(() => { if (!replay || !playing) return; const interval = window.setInterval(() => setProgress((value) => Math.min(1, value + 900 / (replayPath?.durationMs ?? 90000))), 900); return () => window.clearInterval(interval); }, [playing, replay, replayPath?.durationMs]);

  return <section className={styles.shell} data-testid={`urai-${mode}-surface`} aria-label={replay ? 'URAI Replay memory scene' : 'URAI Focus selected memory chamber'} style={surfaceStyle}>
    <div className={styles.sky} aria-hidden="true" /><div className={styles.depthLines} aria-hidden="true"><span /><span /><span /></div><div className={styles.particleField} aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <article className={styles.chamber}><p className={styles.kicker}>{replay ? 'Replay Scene · Living memory' : 'Focus Chamber · Selected memory'}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p><div className={styles.signalRow} aria-label="Selected memory details"><span>{label(node?.type)}</span><span>{timeLabel(node?.timestamp)}</span><span>{privacy(node?.privacyLevel)}</span><span>{replay ? 'scene active' : 'replay ready'}</span></div></article>
    <button type="button" className={`${styles.memoryPoster} ${replay ? styles.memoryPosterReplay : ''}`} onClick={() => replay ? setPlaying((value) => !value) : router.push(replayHref)} aria-label={replay ? 'Pause or play this memory replay' : `Replay ${node?.title ?? 'this selected memory'}`}><span className={styles.posterAura} aria-hidden="true" /><span className={styles.posterGlyph}>{node?.glyph ?? '◌'}</span><span className={styles.posterImage} aria-hidden="true" style={artifactStyle(node, replay)}><span /><span /><span /></span><span className={styles.posterCaption}><strong>{replay ? (playing ? 'Memory playing' : 'Replay paused') : 'Replay memory'}</strong><small>{replay ? 'click to pause or play' : 'click or press enter to open'}</small></span></button>
    <aside className={styles.contextPanel}><p className={styles.kicker}>{replay ? 'Playback strand' : 'Memory signal'}</p><h2>{replay ? 'Scene unfolding' : 'Signal resolving'}</h2><p>{replay ? node?.whyThis ?? activeCaption : node?.narratorLine ?? 'Stay with one signal until it becomes clear.'}</p><div className={styles.whyList}>{(replay ? captions.slice(0, 4) : chipsFor(node?.sourceSignals)).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></aside>
    <section className={styles.memoryMetrics} aria-label="Memory signal controls"><div><span>Signal force</span><strong>{pct(node?.emotionalIntensity, signalProgress)}</strong></div><div><span>Identity weight</span><strong>{pct(node?.importance, signalProgress)}</strong></div><div><span>Open loop</span><strong>{pct(node?.unresolvedness, signalProgress)}</strong></div></section>
    {replay ? <><div className={styles.replayScrub} aria-label="Replay progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div><div className={styles.replayControls} aria-label="Replay controls"><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button><button type="button" onClick={() => { setProgress(0); setPlaying(true); }}>Restart</button><button type="button" onClick={() => router.push(focusHref)}>Return Focus</button></div><ol className={styles.timeline}>{captions.slice(0, 5).map((line, index) => <li key={`${line}-${index}`} data-active={index === activeIndex}><span>{String(index + 1).padStart(2, '0')}</span><p>{line}</p></li>)}</ol></> : null}
    <nav className={styles.routeRail} aria-label="Memory route controls"><a href={lifeMapHref}>Life Map</a><a href={focusHref}>Focus</a><a href={replayHref}>Replay memory</a><a href={unwindHref}>ESC / Unwind</a><a href="/">Home</a></nav>
  </section>;
}
