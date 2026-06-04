const mediaHighlights = [
  "Founder demo video package",
  "Sample-data screenshot strip",
  "Privacy-first media promise",
  "Waitlist and fundraiser visuals",
] as const;

export default function LaunchPage() {
  return (
    <main aria-labelledby="launch-heading">
      <section>
        <p>URAI Genesis</p>
        <h1 id="launch-heading">A private symbolic life interface for the public demo.</h1>
        <p>
          Launch media for URAI Genesis is built around sample data, permission-first storytelling, and a clear founder-led demo.
        </p>
        <p>This demo uses sample data.</p>
      </section>

      <section aria-labelledby="launch-video-heading">
        <h2 id="launch-video-heading">Founder demo video</h2>
        <p>
          The launch page can support a founder demo recording once final media is approved. Until then, no broken video placeholder is shown.
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
          URAI launch media uses sample data, avoids private account state, and does not show raw Firebase, admin, debug, console, or environment data.
        </p>
      </section>

      <section aria-labelledby="launch-founder-heading">
        <h2 id="launch-founder-heading">Founder note</h2>
        <p>
          URAI is not trying to own your data. It is trying to give your life back to you in a form you can understand, control, and carry forward.
        </p>
      </section>

      <section aria-labelledby="launch-waitlist-heading">
        <h2 id="launch-waitlist-heading">Waitlist</h2>
        <p>Join the waitlist to follow URAI Genesis as the demo expands carefully.</p>
      </section>
    </main>
  );
}
