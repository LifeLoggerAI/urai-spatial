# Incident Response Lite

Use this process for privacy or security issues during the Genesis V1 public demo period.

## Steps

1. Disable affected feature flag.
2. Enable maintenance mode if needed.
3. Stop related exports or sync if needed.
4. Preserve logs without private content.
5. Identify affected routes and features.
6. Patch or rollback.
7. Review Firestore and Storage rules.
8. Update known limitations if needed.
9. Prepare user-facing note if necessary.

## Privacy Incident Examples

- Export leak.
- Admin access leak.
- Demo loads private data.
- Companion uses closed layer.
- Shadow content appears outside Shadow.
- Firestore rules expose user paths.

## Evidence Rules

- Preserve enough evidence to debug safely.
- Do not copy private user content into tickets, docs, or chat.
- Redact identifiers unless they are required for safe remediation.
- Record whether Passport, Shadow, Legacy, Exports, or AI boundaries were involved.
