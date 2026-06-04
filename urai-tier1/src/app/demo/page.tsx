import UraiV1Experience from "@/components/urai/UraiV1Experience";

const demoMediaHooks = [
  "Founder walkthrough recording",
  "Screenshot strip using sample data",
  "Privacy promise card",
  "Waitlist CTA",
] as const;

export default function DemoPage() {
  return (
    <main aria-labelledby="demo-heading">
      <section>
        <p>URAI Genesis public demo</p>
        <h1 id="demo-heading">Explore URAI with sample data.</h1>
        <p>This demo uses sample data.</p>
      </section>

      <UraiV1Experience mode="demo" profileLabel="Public Demo Field" />

      <section aria-labelledby="demo-media-heading">
        <h2 id="demo-media-heading">Media-ready demo hooks</h2>
        <ul>
          {demoMediaHooks.map((hook) => (
            <li key={hook}>{hook}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="demo-privacy-heading">
        <h2 id="demo-privacy-heading">Privacy promise</h2>
        <p>
          Demo media must avoid private data, raw Firebase, admin, debug, console, environment data, and real Shadow or Legacy content.
        </p>
      </section>
    </main>
  );
}
