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
  const replayLayers = [
    ['What happened', active?.title ?? selected.title],
    ['Who was there', 'People stay protected until permission is granted.'],
    ['What it meant', selected.whyThis],
    ['What changed after', active?.line ?? selected.narratorLine],
    ['What remains', selected.unresolvedness > 0.45 ? 'A still-open thread for Mirror, Focus, or care.' : 'A protected memory-presence that can be revisited.'],
  ];
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
}