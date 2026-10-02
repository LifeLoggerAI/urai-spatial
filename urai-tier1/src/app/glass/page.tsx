import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Glass Entry',
  description: 'A compatibility entry for spatial and XR-capable URAI experiences.',
}

export default function GlassPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Spatial entry"
      title="Move from screen to space."
      lede="Glass is a compatibility doorway into the governed spatial and XR surfaces. Capability is detected at runtime; unsupported devices stay on safe web fallbacks."
      note="This route does not claim certified headset, wearable, or camera-anchored support. Device-specific acceptance remains separate."
      links={[
        { href: '/spatial/ar-vr', label: 'Open XR preview', primary: true },
        { href: '/spatial', label: 'Open spatial web' },
        { href: '/status', label: 'Check capability status' },
      ]}
    />
  )
}
