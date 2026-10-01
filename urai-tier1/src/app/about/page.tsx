import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'About URAI',
  description: 'URAI is a private spatial system for memory, identity, reflection, focus, and human-directed digital continuity.',
}

export default function AboutPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="About URAI"
      title="A life you can move through."
      lede="URAI brings memory, focus, replay, identity, privacy, and spatial computing into one human-directed system designed to keep the person—not the platform—in control."
      note="This public page describes the product direction without claiming unsupported provider, device, or production certification."
      links={[
        { href: '/life-map', label: 'Enter Life Map', primary: true },
        { href: '/technology', label: 'Explore the system' },
        { href: '/privacy-controls', label: 'Privacy & consent' },
      ]}
    >
      <p><strong>Memory becomes navigable.</strong> Life Map, Focus, Replay, Mirror, Passport, and place-based experiences share one governed journey.</p>
      <p><strong>Privacy stays explicit.</strong> Consent, provenance, revocation, and clear claim boundaries are part of the architecture.</p>
    </InstitutionalPublicSurface>
  )
}
