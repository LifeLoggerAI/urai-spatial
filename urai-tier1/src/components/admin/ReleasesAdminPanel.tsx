import {
  URAI_APP_VERSION,
  URAI_BUILD_LABEL,
  URAI_RELEASE_CHANNEL,
} from "../../lib/system/version";

const releaseDocLinks = [
  "docs/ops/release-operations.md",
  "docs/ops/patch-triage.md",
  "docs/ops/hotfix-policy.md",
  "docs/ops/rollback-triggers.md",
  "docs/ops/v1-patch-checklist.md",
  "CHANGELOG.md",
] as const;

export function ReleasesAdminPanel() {
  return (
    <section aria-labelledby="releases-admin-heading">
      <div>
        <p>Releases</p>
        <h2 id="releases-admin-heading">{URAI_BUILD_LABEL}</h2>
      </div>

      <dl>
        <div>
          <dt>Current app version</dt>
          <dd>{URAI_APP_VERSION}</dd>
        </div>
        <div>
          <dt>Launch phase</dt>
          <dd>{URAI_RELEASE_CHANNEL}</dd>
        </div>
        <div>
          <dt>Latest changelog entry</dt>
          <dd>0.1.0 Genesis V1 baseline. Update after each hotfix, patch, or polish release.</dd>
        </div>
      </dl>

      <div>
        <h3>Release docs</h3>
        <ul>
          {releaseDocLinks.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </div>

      <p>Before shipping any patch, run the V1 patch checklist and confirm privacy defaults remain unchanged.</p>
    </section>
  );
}

export default ReleasesAdminPanel;
