import { notFound } from 'next/navigation'
import { StoryChapterReader } from '@/components/storytime/StoryChapterReader'
import { publicStorytimeSampleAvailable } from '@/lib/storytime/publicSampleAvailable'
import { buildNamedExplicitDemoMemory } from '@/spatial/memory/explicitDemoMemory'
import styles from './storytime.module.css'

export const metadata = { title: 'Storytime sample | UrAi', robots: { index: false, follow: false } }

export default function StorytimeSamplePage() {
  if (!publicStorytimeSampleAvailable()) notFound()

  const sample = buildNamedExplicitDemoMemory('demo:quiet-reset')
  return (
    <main className={styles.reader} aria-label="Storytime sample" data-demo-disclosure="not-personal-data">
      <picture className={styles.backdrop} aria-hidden="true">
        <source media="(max-width: 640px)" srcSet="/assets/urai/v3/storytime-theater-mobile.webp" />
        <img src="/assets/urai/v3/storytime-theater-main.webp" alt="" />
      </picture>
      <div className={styles.content}>
        <nav aria-label="Storytime navigation"><a href="/launch#storytime-sample">Return to Launch</a></nav>
        <p className={styles.disclosure}>Storytime · Public sample</p>
        <StoryChapterReader
          title={sample.title}
          introduction={sample.summary}
          chapters={sample.replayManifest.segments.map(segment => ({
            id: segment.id,
            title: segment.label,
            summary: segment.caption,
          }))}
        />
      </div>
    </main>
  )
}
