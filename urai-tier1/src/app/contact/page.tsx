import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'Contact URAI',
  description: 'Contact URAI for product support, privacy, accessibility, press, and institutional inquiries.',
}

export default function ContactPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Contact"
      title="Reach the right door."
      lede="Use the dedicated channel for the kind of help you need. Product support and privacy controls are available without exposing private account or memory data."
      links={[
        { href: 'mailto:support@urailabs.com', label: 'Product support', primary: true },
        { href: 'mailto:legal@urailabs.com', label: 'Legal' },
        { href: '/support', label: 'Support center' },
      ]}
    >
      <p><strong>Privacy-sensitive requests:</strong> use the in-product Consent Sanctuary whenever possible so account context stays inside governed controls.</p>
    </InstitutionalPublicSurface>
  )
}
