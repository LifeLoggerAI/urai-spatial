import {
  URAI_APP_VERSION,
  URAI_BUILD_LABEL,
  URAI_RELEASE_CHANNEL,
} from "../../lib/system/version";

const releaseDocs = [
  "docs/ops/release-operations.md",
  "docs/ops/patch-triage.md",
  "docs/ops/hotfix-policy.md",
  "docs/ops/rollback-triggers.md",
  "docs/ops/v1-patch-checklist.md",
] as const;

export function ReleasesAdminPanel() {
  return (
    <section aria-labelledby="releases-admin-heading">
      <h2 id="releases-admin-heading">Releases</h2>
      <dl>
        <div>
          <dt>Current app version</dt>
          <dd>{URAI_APP_VERSION}</dd>
        </div>
        <div>
          <dt>Launch phase</dt>
          <dd>{URAI_BUILD_LABEL}</dd>
        </div>
        <div>
          <dt>Release channel</dt>
          <dd>{URAI_RELEASE_CHANNEL}</dd>
        </div>
        <div>
          <dt>Latest changelog entry</dt>
          <dd>See CHANGELOG.md for the latest Genesis V1 patch notes.</dd>
        </div>
      </dl>
      <p>Patch checklist reminder: run privacy checks, smoke checks, route checks, and changelog updates before every patch.</p>
      <ul>
        {releaseDocs.map((docPath) => (
          <li key={docPath}>{docPath}</li>
        ))}
      </ul>
    </section>
  );
}
