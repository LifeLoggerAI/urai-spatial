export type ActionState = 'idle' | 'resolving' | 'resolved';

export function capGlowingStars(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(3, Math.floor(count));
}

export function resolveActionState(current: ActionState, intent: 'resolve' | 'reset'): ActionState {
  if (intent === 'reset') return 'idle';
  if (current === 'idle') return 'resolving';
  return 'resolved';
}

export function shouldLoopAnimations(prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion;
}

export function clearFocusOnEscape(key: string, focusedId: string | null): string | null {
  if (key !== 'Escape') return focusedId;
  return null;
}

export function focusClusterByChapterAnchor(chapterId: string, chapterToCluster: Record<string, string>): string | null {
  return chapterToCluster[chapterId] ?? null;
}

export function buildLifemapEventPayload(type: 'chapter_anchor' | 'focus_cleared', value: string | null) {
  return { type, value, ts: '2026-05-04T12:00:00.000Z' };
}
