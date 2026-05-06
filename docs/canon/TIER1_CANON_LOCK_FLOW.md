# Tier-1 Canon Lock Flow

1. Detect Tier-1 scoped file changes from git diff.
2. Require migration marker `CANON_MIGRATION_APPROVED`.
3. Run lexical redefinition guard across Tier-2..Tier-5.
4. Run canon lock and LOCS checks.
5. Block merge if any Tier-1 lock check fails.

Tier-1 remains immutable except migration-approved canon maintenance.
