const mediaHighlights = [
  "Founder demo video package",
  "Sample-data screenshot strip",
  "Privacy-first media promise",
  "Waitlist and approved campaign visuals",
] as const;

export default function LaunchPage() {
  return (
    <main aria-labelledby="launch-heading">
      <section>
        <p>URAI</p>
        <h1 id="launch-heading">A private spatial interface for the current sample-data demo.</h1>
        <p>
          Launch media for URAI is built around sample data, permission-first storytelling, and a clear founder-led demonstration.
        </p>
        <p>This demo uses sample data. Some capabilities use fallback-safe behavior and remain production-certification pending.</p>
      </section>

      <section aria-labelledby="launch-video-heading">
        <h2 id="launch-video-heading">Founder demo video</h2>
        <p>
          This page can support a founder demo recording after the exact build, media, disclosure, and public claims are approved. Until then, no broken video placeholder is shown.
        </p>
      </section>

      <section aria-labelledby="launch-screenshots-heading">
        <h2 id="launch-screenshots-heading">Screenshot strip</h2>
        <ul>
          {mediaHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="launch-privacy-heading">
        <h2 id="launch-privacy-heading">Privacy promise</h2>
        <p>
          URAI launch media uses sample data, avoids private account state, and does not show cloud, admin, debug, console, environment, credential, or personal-data surfaces.
        </p>
      </section>

      <section aria-labelledby="launch-founder-heading">
        <h2 id="launch-founder-heading">Founder note</h2>
        <p>
          URAI is being built to help people understand and direct their lives without turning private context into surveillance. It does not diagnose, decide what a life means, or prove persistent personal memory in this demo.
        </p>
      </section>

      <section aria-labelledby="launch-waitlist-heading">
        <h2 id="launch-waitlist-heading">Waitlist</h2>
        <p>Join the waitlist to follow URAI as the sample-data demo expands carefully under evidence-backed privacy and release controls.</p>
      </section>
    </main>
  );
}
