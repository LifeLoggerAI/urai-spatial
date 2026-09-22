import Link from 'next/link'

const mediaHighlights = [
  "Founder release-candidate walkthrough",
  "Sample-data and approved-reference screenshot strip",
  "Privacy-first media promise",
  "Governed launch and campaign visuals",
] as const

export const metadata = {
  title: 'UrAi Launch',
  description: 'UrAi launch authority, release-candidate media, privacy boundaries, and governed certification status.',
}

export default function LaunchPage() {
  return (
    <main aria-labelledby="launch-heading">
      <section>
        <p>UrAi</p>
        <h1 id="launch-heading">A private spatial interface moving through governed release certification.</h1>
        <p>
          UrAi has a real account entry and private-world runtime. Public launch media uses sample data or explicitly approved
          material so release evidence can be shown without exposing private account state.
        </p>
        <p>
          Production certification remains fingerprint-gated until the frozen release candidate, independent review, provider
          boundaries, deployment, and live verification are complete.
        </p>
        <div>
          <Link href="/login">Open account entry</Link>
          <Link href="/status">View launch status</Link>
        </div>
      </section>

      <section aria-labelledby="launch-video-heading">
        <h2 id="launch-video-heading">Founder release walkthrough</h2>
        <p>
          Founder media may show the governed release candidate after its exact build, disclosures, and public claims are approved.
          Until then, this route does not present a placeholder video or imply release certification.
        </p>
      </section>

      <section aria-labelledby="launch-screenshots-heading">
        <h2 id="launch-screenshots-heading">Release media</h2>
        <ul>
          {mediaHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="launch-privacy-heading">
        <h2 id="launch-privacy-heading">Privacy promise</h2>
        <p>
          UrAi launch media uses sample or explicitly approved material and does not expose private account state, cloud/admin
          surfaces, debug output, credentials, or personal data.
        </p>
      </section>

      <section aria-labelledby="launch-founder-heading">
        <h2 id="launch-founder-heading">Founder note</h2>
        <p>
          UrAi is built to help people understand and direct their lives without turning private context into surveillance.
          It does not diagnose or decide what a life means. Persistent personal-memory claims remain bounded by authenticated
          account, consent, provenance, and release evidence.
        </p>
      </section>

      <section aria-labelledby="launch-status-heading">
        <h2 id="launch-status-heading">Launch authority</h2>
        <p>
          The Status route is the public authority for what is currently proven, gated, or still awaiting certification.
        </p>
        <Link href="/status">Open launch truth</Link>
      </section>
    </main>
  )
}
