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

const standardFlags = ["Visual polish", "Optional audio", "Noncritical animations"] as const;

export function FeatureFlagsPanel() {
  return (
    <section aria-labelledby="feature-flags-heading">
      <h2 id="feature-flags-heading">Feature Flags</h2>

      <div>
        <h3>Safety-critical</h3>
        <p>Changing this may require launch smoke test.</p>
        <ul>
          {safetyCriticalFlags.map((flag) => (
            <li key={flag}>
              <strong>{flag}</strong>
              <span>Safety-critical</span>
              <span>Requires smoke test after change</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Safe to disable anytime</h3>
        <ul>
          {standardFlags.map((flag) => (
            <li key={flag}>
              <strong>{flag}</strong>
              <span>Safe to disable anytime</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default FeatureFlagsPanel;
