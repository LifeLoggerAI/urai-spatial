'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { lifeMapNodes } from '@/spatial/v1/lifeMapDemoData';
import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import styles from './ReplayChamber.module.css';

type Props = { mode: 'focus' | 'replay'; node?: LifeMapNode; replayPath?: ReplayPath };
type Beat = { id: string; title: string; line: string; tone: string; origin: string; intensity: number; importance: number; open: number; glyph: string; color: string };

const pct = (value = 0.5) => `${Math.round(value * 100)}%`;
const clamp = (value = 0.5) => Math.max(0, Math.min(1, value));
const prettyType = (value = 'memory') => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').toLowerCase();
const privacy = (level?: LifeMapNode['privacyLevel']) => level === 'publicSafe' ? 'public-safe memory' : level === 'privateDetail' ? 'private detail gated' : level === 'hidden' ? 'hidden until allowed' : 'private summary';

function timeLabel(value?: string) {
  const date = new Date(value ?? '');
  return !value || Number.isNaN(date.valueOf()) ? 'memory time preserved' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function findNode(id?: string) { return lifeMapNodes.find((candidate) => candidate.id === id); }
function unique<T extends { id: string }>(items: T[]) { const seen = new Set<string>(); return items.filter((item) => !seen.has(item.id) && seen.add(item.id)); }

function makeBeat(candidate: LifeMapNode, selected: LifeMapNode, index: number): Beat {
  return {
    id: `${candidate.id}-${index}`,
    title: candidate.title,
    line: index === 0 ? candidate.narratorLine : candidate.whyThis || candidate.narratorLine,
    tone: candidate.emotionalTone,
    origin: candidate.id === selected.id ? 'selected Life Map star' : `${prettyType(candidate.type)} linked signal`,
    intensity: clamp(candidate.emotionalIntensity),
    importance: clamp(candidate.importance),
    open: clamp(candidate.unresolvedness),
    glyph: candidate.glyph,
    color: candidate.auraColor || candidate.color,
  };
}

function beatsFor(selected: LifeMapNode, replayPath?: ReplayPath): Beat[] {
  const fromPath = replayPath?.nodeIds.map(findNode).filter(Boolean) as LifeMapNode[] | undefined;
  const related = selected.relatedNodeIds.map(findNode).filter(Boolean) as LifeMapNode[];
  const chapter = lifeMapNodes.filter((candidate) => candidate.chapterId && candidate.chapterId === selected.chapterId).slice(0, 4);
  const nodeBeats = unique([selected, ...(fromPath ?? []), ...related, ...chapter]).slice(0, 5).map((item, index) => makeBeat(item, selected, index));
  const captionBeats = (replayPath?.captionLines ?? []).slice(0, 4).map((line, index): Beat => ({
    id: `${replayPath?.id ?? 'replay'}-${index}`,
    title: index === 0 ? 'Memory opens' : `Replay beat ${index + 1}`,
    line,
    tone: selected.emotionalTone,
    origin: replayPath?.title ?? 'replay path',
    intensity: clamp(selected.emotionalIntensity + index * 0.04),
    importance: clamp(selected.importance),
    open: clamp(selected.unresolvedness - index * 0.03),
    glyph: selected.glyph,
    color: selected.auraColor || selected.color,
  }));
  const combined = replayPath?.nodeIds.includes(selected.id) ? unique([...nodeBeats, ...captionBeats]) : nodeBeats;
  return combined.length ? combined.slice(0, 5) : [makeBeat(selected, selected, 0)];
}

function beatProgress(index: number, count: number) { return count <= 1 ? 0 : index / (count - 1); }
function sceneName(tone = '') {
  const text = tone.toLowerCase();
  if (text.includes('recover')) return 'green recovery field';
  if (text.includes('dream')) return 'violet dream aperture';
  if (text.includes('threshold')) return 'threshold doorway light';
  if (text.includes('relation') || text.includes('rose')) return 'warm orbit corridor';
  if (text.includes('shadow') || text.includes('low')) return 'protected fog chamber';
  return 'private memory chamber';
}

export function MemoryModeSurfaceV2({ mode, node, replayPath }: Props) {
  const router = useRouter();
  const replay = mode === 'replay';
  const selected = node ?? lifeMapNodes[0];
  const nodeId = selected.id;
  const focusHref = `/focus?memoryId=${encodeURIComponent(nodeId)}`;
  const replayHref = `/replay?memoryId=${encodeURIComponent(nodeId)}&manifestId=${encodeURIComponent(replayPath?.id ?? 'replay-recovery-thread')}`;
  const lifeMapHref = `/life-map?memoryId=${encodeURIComponent(nodeId)}`;
  const unwindHref = replay ? `/unwind?memoryId=${encodeURIComponent(nodeId)}` : lifeMapHref;
  const beats = useMemo(() => beatsFor(selected, replayPath), [selected, replayPath]);
  const duration = Math.min(30000, Math.max(12000, replayPath?.durationMs ?? 18000));
  const [playing, setPlaying] = useState(replay);
  const [progress, setProgress] = useState(0);
  const activeIndex = replay ? Math.min(beats.length - 1, Math.floor(progress * beats.length)) : 0;
  const active = beats[activeIndex] ?? beats[0];
  const progressPercent = Math.round(progress * 100);
  const surfaceStyle = {
    '--memory-color': active?.color ?? selected.auraColor ?? '#67e8f9',
    '--memory-core': selected.color ?? '#38bdf8',
    '--memory-progress': `${progressPercent}%`,
    '--beat-intensity': String(active?.intensity ?? selected.emotionalIntensity ?? 0.5),
    '--beat-open': String(active?.open ?? selected.unresolvedness ?? 0.35),
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId);
    window.sessionStorage.setItem('urai-replay-return-manifest-id', replayPath?.id ?? 'replay-recovery-thread');
  }, [nodeId, replayPath?.id]);

  useEffect(() => { setPlaying(replay); setProgress(0); }, [nodeId, replay]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); router.push(unwindHref); }
      if (replay && event.key === ' ') { event.preventDefault(); setPlaying((value) => !value); }
      if (replay && event.key.toLowerCase() === 'r') { event.preventDefault(); setProgress(0); setPlaying(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replay, router, unwindHref]);

  useEffect(() => {
    if (!replay || !playing) return;
    const interval = window.setInterval(() => setProgress((value) => {
      const next = Math.min(1, value + 160 / duration);
      if (next >= 1) setPlaying(false);
      return next;
    }), 160);
    return () => window.clearInterval(interval);
  }, [duration, playing, replay]);

  const jumpToBeat = (index: number) => { setProgress(beatProgress(index, beats.length)); if (replay) setPlaying(true); };
  const restartReplay = () => { setProgress(0); setPlaying(true); };

  return (
    <section className={`${styles.shell} ${!playing ? styles.paused : ''}`} data-testid={`urai-${mode}-surface`} data-mode={mode} data-playing={playing ? 'true' : 'false'} aria-label={replay ? 'URAI cinematic memory replay chamber' : 'URAI selected memory focus chamber'} style={surfaceStyle}>
      <div className={styles.chamberBg} aria-hidden="true" /><div className={styles.fog} aria-hidden="true" /><div className={styles.particles} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>

      <article className={styles.identity}>
        <p className={styles.kicker}>{replay ? 'URAI Replay · living memory chamber' : 'URAI Focus · selected memory object'}</p>
        <h1>{selected.title}</h1>
        <p className={styles.subtitle}>{replay ? `A living pass through ${sceneName(active?.tone)}, opened from the selected Life Map star.` : selected.subtitle ?? 'One selected star is waiting to open.'}</p>
        <div className={styles.signalRow}><span>{selected.emotionalTone}</span><span>{timeLabel(selected.timestamp)}</span><span>{privacy(selected.privacyLevel)}</span><span>{replay ? (playing ? 'playing' : 'paused') : 'ready to replay'}</span></div>
      </article>

      {replay && <ol className={styles.beatReel} aria-label="Replay beat sequence">{beats.map((beat, index) => <li key={beat.id} data-active={index === activeIndex ? 'true' : 'false'}><button type="button" onClick={() => jumpToBeat(index)}><span>{String(index + 1).padStart(2, '0')}</span><p>{beat.title}</p></button></li>)}</ol>}

      <button type="button" className={styles.stage} onClick={() => replay ? setPlaying((value) => !value) : router.push(replayHref)} aria-label={replay ? (playing ? 'Pause this memory replay' : 'Play this memory replay') : `Open ${selected.title} in Replay`}>
        <span className={styles.stageShadow} aria-hidden="true" />
        <span className={styles.frame}><span className={styles.scene}>
          <span className={styles.path} aria-hidden="true" />
          {beats.map((beat, index) => <span key={`${beat.id}-star`} className={styles.star} data-active={index === activeIndex ? 'true' : 'false'} style={{ '--x': `${16 + index * 17}%`, '--y': `${34 + ((index * 13) % 32)}%`, '--size': `${8 + Math.round(beat.importance * 10)}px` } as CSSProperties} aria-hidden="true" />)}
          <span className={styles.glyph} aria-hidden="true">{active?.glyph ?? selected.glyph}</span>
          <span className={styles.caption}><small>{replay ? 'Current beat' : 'Selected memory'}</small><strong>{replay ? active?.title : selected.title}</strong><em>{replay ? active?.line : selected.narratorLine}</em></span>
        </span></span>
        <span className={styles.stageStatus}>{replay ? (playing ? 'playing cinematic replay' : 'replay paused') : 'click memory image to replay'}</span>
      </button>

      <aside className={styles.narrator} aria-label="Replay narrator panel">
        <p className={styles.kicker}>{replay ? 'Now Playing' : prettyType(selected.type)}</p>
        <h2>{replay ? active?.title : selected.title}</h2>
        <p>{replay ? active?.line : selected.whyThis}</p>
        <dl className={styles.details}><div><dt>Why this matters</dt><dd>{selected.whyThis}</dd></div><div><dt>Pattern detected</dt><dd>{active?.tone ?? selected.emotionalTone} · {pct(active?.intensity)} intensity</dd></div><div><dt>Life Map origin</dt><dd>{active?.origin ?? 'selected Life Map star'}</dd></div><div><dt>Replay state</dt><dd>{replay ? `${playing ? 'Playing' : 'Paused'} · ${progressPercent}% complete` : 'Focus object ready'}</dd></div><div><dt>Current beat</dt><dd>{String(activeIndex + 1).padStart(2, '0')} of {beats.length}</dd></div></dl>
        <div className={styles.chips}>{beats.map((beat, index) => <button key={`${beat.id}-chip`} type="button" onClick={() => jumpToBeat(index)} data-active={index === activeIndex ? 'true' : 'false'}>{beat.title}</button>)}</div>
      </aside>

      <section className={styles.meters} aria-label="Replay mood meters"><div style={{ '--meter': pct(active?.intensity) } as CSSProperties}><span>Intensity</span><strong>{pct(active?.intensity)}</strong></div><div style={{ '--meter': pct(active?.importance) } as CSSProperties}><span>Importance</span><strong>{pct(active?.importance)}</strong></div><div style={{ '--meter': pct(active?.open) } as CSSProperties}><span>Unresolved</span><strong>{pct(active?.open)}</strong></div></section>

      {replay && <section className={styles.transport} aria-label="Replay playback controls"><div className={styles.scrub}><span style={{ width: `${progressPercent}%` }} />{beats.map((beat, index) => <button key={`${beat.id}-marker`} type="button" className={styles.marker} style={{ left: `${beatProgress(index, beats.length) * 100}%` }} data-active={index === activeIndex ? 'true' : 'false'} onClick={() => jumpToBeat(index)} aria-label={`Move replay to ${beat.title}`} />)}</div><div className={styles.controls}><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button><button type="button" onClick={restartReplay}>Restart</button><button type="button" onClick={() => router.push(focusHref)}>Return Focus</button><button type="button" className={styles.safe} onClick={() => router.push(unwindHref)}>ESC / Unwind</button></div></section>}

      <nav className={styles.routeRail} aria-label="Spatial return paths"><a href={lifeMapHref}>Life Map</a><a href={focusHref}>Focus</a><a href={replayHref}>Replay</a><a href={unwindHref} className={styles.safe}>ESC / Unwind</a><a href="/mirror">Mirror</a><a href="/passport">Passport</a><a href="/status">Status</a></nav>
    </section>
  );
}
