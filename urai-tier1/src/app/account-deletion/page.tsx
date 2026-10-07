export const metadata = {
  title: 'URAI Account Deletion',
  description: 'How to request deletion of your URAI account and repository-controlled personal data.',
}

export default function AccountDeletionPage() {
  return (
    <main
      aria-labelledby="account-deletion-heading"
      style={{
        minHeight: '100dvh',
        padding: 'clamp(32px, 7vw, 80px) 20px',
        color: '#f8fbff',
        background:
          'radial-gradient(circle at 22% 16%,rgba(103,232,249,.14),transparent 30%),radial-gradient(circle at 78% 20%,rgba(192,132,252,.12),transparent 32%),linear-gradient(180deg,#020713 0%,#04111b 58%,#01040a 100%)',
      }}
    >
      <section style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 22 }}>
        <p style={{ margin: 0, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7defff' }}>
          URAI · Privacy & ownership
        </p>
        <h1 id="account-deletion-heading" style={{ margin: 0, fontSize: 'clamp(42px,8vw,76px)', lineHeight: .94 }}>
          Delete your account on your terms.
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: 'rgba(235,250,255,.78)', fontSize: 18, lineHeight: 1.7 }}>
          Signed-in users can request deletion from the Consent Sanctuary or Passport. URAI records the request,
          applies the configured grace period for full-account deletion, and reports completion through the trusted
          privacy job instead of representing data as deleted before the operation finishes.
        </p>

        <section style={{ border: '1px solid rgba(186,230,253,.16)', borderRadius: 28, background: 'rgba(3,8,20,.52)', padding: 24 }}>
          <h2>Request account deletion</h2>
          <ol style={{ lineHeight: 1.8 }}>
            <li>Sign in to the URAI account you want to delete.</li>
            <li>Open Privacy & Consent and choose the deletion chamber.</li>
            <li>Select <strong>Entire account after a grace period</strong>.</li>
            <li>Enter the required confirmation phrase and submit the deletion request.</li>
            <li>Use the same privacy surface to review or cancel an eligible queued request.</li>
          </ol>
          <p style={{ lineHeight: 1.7 }}>
            If your account uses Sign in with Apple, confirm the same Apple account again. Accepting the request
            revokes its Apple sign-in permission before the deletion grace period starts. Cancelling the queued
            deletion does not restore that permission; you can grant it again when signing in. Signing in again
            requires a new verified deletion request before full-account deletion can complete.
          </p>
          <a
            href="/privacy-controls?from=account-deletion"
            style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', border: '1px solid currentColor', borderRadius: 999, color: 'inherit', textDecoration: 'none' }}
          >
            Open Privacy & Consent
          </a>
        </section>

        <section style={{ border: '1px solid rgba(186,230,253,.16)', borderRadius: 28, background: 'rgba(3,8,20,.42)', padding: 24 }}>
          <h2>What the request covers</h2>
          <p style={{ lineHeight: 1.7 }}>
            Account deletion is intended to remove repository-controlled account data through the governed deletion
            workflow. Provider or legal retention exceptions, when applicable, are disclosed rather than hidden, and
            privacy-safe audit evidence may be retained where required to prove that the request was handled.
          </p>
          <p style={{ lineHeight: 1.7 }}>
            If you cannot access your account, contact <a href="mailto:support@urailabs.com?subject=URAI%20account%20deletion%20request" style={{ color: 'inherit' }}>support@urailabs.com</a>.
            Support will still need to verify account authority before a destructive request can proceed.
          </p>
        </section>

        <nav aria-label="Account deletion related links" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <a href="/privacy-controls" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Privacy & Consent</a>
          <a href="/support" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Support</a>
          <a href="/" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Return Home</a>
        </nav>
      </section>
    </main>
  )
}
