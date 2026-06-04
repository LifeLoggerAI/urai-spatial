const safetyCriticalFlags = [
  "Companion AI",
  "Shadow",
  "Legacy",
  "Exports",
  "Cloud sync",
  "Notifications",
  "Public demo",
  "Waitlist",
] as const;

const standardFlags = [
  "Visual polish",
  "Optional audio",
  "Noncritical animations",
] as const;

export function FeatureFlagsPanel() {
  return (
    <section aria-labelledby="feature-flags-heading">
      <h2 id="feature-flags-heading">Feature Flags</h2>
      <p>Changing this may require launch smoke test.</p>
      <h3>Safety-critical</h3>
      <ul>
        {safetyCriticalFlags.map((flag) => (
          <li key={flag}>
            <span>{flag}</span>
            <strong>Safety-critical</strong>
            <span>Requires smoke test after change</span>
          </li>
        ))}
      </ul>
      <h3>Safe to disable anytime</h3>
      <ul>
        {standardFlags.map((flag) => (
          <li key={flag}>
            <span>{flag}</span>
            <strong>Safe to disable anytime</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
