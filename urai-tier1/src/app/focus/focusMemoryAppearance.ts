import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'

// Existing bundled illustrations describe disclosed samples, never private memories.
const samples: Record<string, { imageUrl: string; accent: string; light: string }> = {
  'seed-memory-bloom': { imageUrl: '/demo/memories/recovery-bloom.svg', accent: '#74dfc1', light: '#e3fff3' },
  'seed-recovery-arc': { imageUrl: '/demo/memories/recovery-bloom.svg', accent: '#74dfc1', light: '#e3fff3' },
  'seed-threshold-storm': { imageUrl: '/demo/memories/threshold-storm.svg', accent: '#efb27c', light: '#fff0d9' },
  'seed-mirror-focus': { imageUrl: '/demo/memories/mirror-focus.svg', accent: '#87cfff', light: '#e5f6ff' },
  'seed-ritual-echo': { imageUrl: '/demo/memories/ritual-echo.svg', accent: '#cca8ef', light: '#f3e7ff' },
  'seed-dream-signal': { imageUrl: '/demo/memories/dream-signal.svg', accent: '#e3a1dd', light: '#ffe7fb' },
  'seed-calm-return': { imageUrl: '/demo/memories/calm-return.svg', accent: '#82ddd9', light: '#e0fffa' },
}

export function focusMemoryAppearance(memory: SelectedMemory | null, demoFallback: string) {
  const sample = memory?.demo && Object.hasOwn(samples, memory.star.id) ? samples[memory.star.id] : null
  return {
    accent: sample?.accent ?? memory?.visuals.accent ?? '#79dfff',
    light: sample?.light ?? memory?.visuals.light ?? '#e7fbff',
    imageUrl: memory?.sourceMedia.find((media) => media.kind === 'image')?.url
      ?? sample?.imageUrl ?? (memory?.demo ? demoFallback : null),
  }
}
