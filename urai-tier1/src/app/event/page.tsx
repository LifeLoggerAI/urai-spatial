import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Event Entry',
  description: 'A bounded public entry point for URAI demonstrations and event walkthroughs.',
}

export default function EventPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Event entry"
      title="See the system without overstating it."
      lede="This route is a public demonstration doorway. It sends visitors into governed sample-data experiences and current verified surfaces rather than creating a separate event-only product."
      note="Demo and preview surfaces use bounded claims. Personal memory data should not be exposed during public demonstrations without explicit consent."
      links={[
        { href: '/demo', label: 'Open demo', primary: true },
        { href: '/life-map', label: 'Open Life Map' },
        { href: '/status', label: 'View release status' },
      ]}
    />
  )
}
