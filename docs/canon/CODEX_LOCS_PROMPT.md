You are a principal architect, release-governance engineer, repo auditor, and canon systems designer.

Project:
URAI

Mission:
Create, document, organize, enforce, and protect the Tier-2, Tier-3, Tier-4, and Tier-5 LOCS standards for URAI, aligned beneath the already locked Tier-1 Canon Standards.

Definition:
LOCS means “Layers of Canon Standards” unless this repo already defines LOCS differently. If the repo contains an existing LOCS definition, preserve it, clarify it, and reconcile this work with it.

Non-negotiable rule:
Tier-1 is immutable foundation canon.
Do not alter Tier-1 except to reference it, link to it, or import from it.
Tier-2 through Tier-5 may extend, implement, operationalize, or govern Tier-1, but they may never redefine, weaken, contradict, duplicate, or bypass it.

Do not ask questions unless completely blocked.
Make the best repo-informed decisions.
Do the work directly in the codebase.

OBJECTIVE

Build a complete LOCS hierarchy for:

- Tier-2: System Canon
- Tier-3: Feature Canon
- Tier-4: Implementation Canon
- Tier-5: Operational Canon

Each tier must have:
- Documentation
- Source-of-truth code exports
- Dependency rules
- Mutation/governance rules
- Tests
- Enforcement scripts
- CI protection
- Migration process
- Examples from the actual repo

SUCCESS CONDITION

URAI has a complete, enforceable LOCS hierarchy for Tier-2 through Tier-5, fully aligned beneath locked Tier-1 canon, with docs, exports, tests, CI checks, migration rules, and drift protection.

PHASE 1 — REPO AUDIT

Inspect the entire repository.

Search for:
- Tier-1
- Tier 1
- Tier-2
- Tier 2
- Tier-3
- Tier 3
- Tier-4
- Tier 4
- Tier-5
- Tier 5
- LOCS
- canon
- canonical
- standards
- foundation
- design system
- schema
- prompt
- narrator
- ritual
- scroll
- companion
- memory
- spatial
- privacy
- admin
- studio
- cinematic
- emotional OS
- symbolic OS
- Storytime
- forecast
- cognitive mirror
- relationship intelligence
- consent
- data licensing

Identify:
- Existing canon files
- Existing Tier-1 lock files
- Existing system definitions
- Existing feature definitions
- Existing implementation standards
- Existing operational/deployment standards
- Duplicate/conflicting tier definitions
- Hardcoded canon terminology
- Drift from Tier-1
- Missing governance/test/CI coverage

Produce an internal audit map before editing.

PHASE 2 — CREATE OFFICIAL DOCS

Create or update:

- `docs/canon/LOCS_OVERVIEW.md`
- `docs/canon/LOCS_CANON_MAP.md`
- `docs/canon/TIER_2_CANON_STANDARDS.md`
- `docs/canon/TIER_3_CANON_STANDARDS.md`
- `docs/canon/TIER_4_CANON_STANDARDS.md`
- `docs/canon/TIER_5_CANON_STANDARDS.md`
- `docs/canon/LOCS_MIGRATION_PROCESS.md`
- `docs/canon/CANON_MIGRATION_PROCESS.md` if missing or incomplete

Each tier doc must include:

- Official tier name
- Tier purpose
- Scope
- What belongs in this tier
- What does not belong in this tier
- Dependency rules
- Mutation rules
- Review requirement
- Examples from this repo
- Migration process
- Enforcement expectations
- Required tests/checks
- Relationship to Tier-1

Use this hierarchy unless the repo already has a stronger definition:

Tier-1:
Immutable URAI Foundation Canon.
Core identity, naming, product ontology, sacred schemas, protected constants, root design language, and non-negotiable URAI principles.

Tier-2:
System Canon.
Major URAI systems/modules that extend Tier-1:
- Storytime
- Spatial
- Privacy
- Admin
- Foundation
- Studio
- Companion
- Memory
- Scrolls
- Rituals
- Narrator
- Emotional OS
- Symbolic OS
- Consent/data licensing
- Relationship/social intelligence
- Forecast systems
- Cognitive Mirror systems

Tier-3:
Feature Canon.
Product-level features inside Tier-2 systems:
- Story creation flow
- Story playback flow
- Story library
- Ritual cards
- Mood weather
- Memory map
- Timeline replay
- Dream tracking
- Companion voice modes
- Shadow mode
- Threshold mode
- Export/share flows
- Onboarding sequences
- AI narrator prompt families

Tier-4:
Implementation Canon.
Code-level implementation standards:
- Components
- Routes
- Hooks
- Services
- Firestore collections
- API contracts
- Prompt templates
- Test conventions
- Design tokens
- Animation state names
- Environment variables
- Loading states
- Error states
- Empty states
- Accessibility conventions
- Security/privacy implementation patterns

Tier-5:
Operational Canon.
Launch and production standards:
- QA
- Analytics
- Deployment
- Monitoring
- Smoke tests
- Release notes
- Changelogs
- Backups
- CI/CD
- Staging/prod rules
- Demo readiness
- Incident response
- Rollback rules

PHASE 3 — CREATE SOURCE-OF-TRUTH EXPORTS

Create or update:

- `src/canon/locs.ts`
- `src/canon/tier2.ts`
- `src/canon/tier3.ts`
- `src/canon/tier4.ts`
- `src/canon/tier5.ts`
- `src/canon/index.ts`

Each tier export must define:

- Tier id
- Official label
- Purpose
- Scope
- Governance level
- Allowed mutation level
- Depends on
- May reference
- Must not redefine
- Example domains
- Protected status
- Migration requirement
- Required review level
- Required checks

Add strong typing where TypeScript exists.

PHASE 4 — GOVERNANCE LEVELS

Implement these lock levels in docs and code:

Tier-1:
Locked / immutable / migration-only.

Tier-2:
Protected / architecture review required.

Tier-3:
Governed / product review required.

Tier-4:
Controlled / engineering review required.

Tier-5:
Operational / release review required.

Every tier should clearly define:
- Who can change it
- Why it can change
- What review is required
- What tests must pass
- What migration marker is required

PHASE 5 — DEPENDENCY RULES

Enforce this dependency model:

- Tier-2 may depend on Tier-1.
- Tier-3 may depend on Tier-1 and Tier-2.
- Tier-4 may depend on Tier-1, Tier-2, and Tier-3.
- Tier-5 may reference all tiers but may not redefine them.
- No tier may contradict or redefine a higher tier.
- No lower-tier file may create an alternate Tier-1 canon.
- No feature/system/implementation file may hardcode canonical Tier-1 terminology if a canon export exists.

PHASE 6 — REMOVE DRIFT AND DUPLICATION

Replace scattered tier definitions with imports from `src/canon`.

Remove or consolidate:
- Duplicate LOCS definitions
- Conflicting tier names
- Conflicting governance language
- Hardcoded Tier-1/Tier-2/Tier-3/Tier-4/Tier-5 labels
- Parallel canon systems
- Outdated canon docs

Add deprecated wrappers only when needed for backward compatibility.

Ensure docs link to:
- `LOCS_OVERVIEW.md`
- Tier-specific docs
- Migration process

PHASE 7 — ENFORCEMENT SCRIPTS

Create scripts such as:

- `scripts/check-locs-hierarchy.ts`
- `scripts/check-tier-drift.ts`
- `scripts/check-canon-imports.ts`

Adapt filenames/extensions to the repo stack.

Scripts must check:

- Required LOCS docs exist.
- Required canon exports exist.
- Tier docs include required headers.
- Tier dependency rules are valid.
- LOCS metadata is internally consistent.
- No duplicate conflicting tier definitions exist.
- No forbidden Tier-1 redefinitions appear outside Tier-1 canon files.
- Lower tiers do not redefine higher tiers.
- Docs and code exports stay aligned.
- Migration files exist.
- Required CI workflow includes canon/LOCS checks.

Add package scripts such as:

- `canon:check`
- `locs:check`
- `tier:check`
- `test:canon`

Use existing package manager conventions.

PHASE 8 — TESTS

Add tests for:

- LOCS tier metadata snapshots
- Tier dependency graph validity
- Canon exports
- Migration requirement metadata
- Review level metadata
- No duplicate tier definitions
- Required docs present
- Required headers present
- Required enforcement scripts present
- LOCS overview links to every tier doc
- Tier-2 through Tier-5 do not redefine Tier-1

Use the repo’s existing test framework. If none exists, add the smallest practical test setup.

PHASE 9 — CI ENFORCEMENT

Update or create GitHub Actions workflow to run:

- Install
- Format check, if available
- Lint
- Typecheck
- Unit tests
- Canon checks
- LOCS hierarchy checks
- Build

Do not remove existing CI coverage.
Add LOCS/canon checks to existing workflows where possible.

PHASE 10 — MIGRATION PROCESS

Ensure migration docs include:

- Who can propose changes
- Required review level per tier
- Required tests
- Required changelog entry
- Required backward compatibility notes
- Required migration marker
- Required version bump rule
- Rollback process
- Emergency exception process
- Explicit statement that Tier-1 is not modified by lower-tier migrations

Define migration markers such as:

- `CANON_MIGRATION_APPROVED`
- `LOCS_TIER_2_MIGRATION_APPROVED`
- `LOCS_TIER_3_MIGRATION_APPROVED`
- `LOCS_TIER_4_MIGRATION_APPROVED`
- `LOCS_TIER_5_MIGRATION_APPROVED`

Use these markers in enforcement scripts or CI where practical.

PHASE 11 — VISUAL CANON MAP

Create:

- `docs/canon/LOCS_CANON_MAP.md`

Include:

```text
Tier-1: Immutable URAI Foundation Canon
  ↓
Tier-2: System Canon
  ↓
Tier-3: Feature Canon
  ↓
Tier-4: Implementation Canon
  ↓
Tier-5: Operational Canon
```

Also include examples from the actual repository under each tier.

PHASE 12 — VALIDATION

Run and fix until clean:

* Package manager install
* Format
* Lint
* Typecheck
* Unit tests
* Canon checks
* LOCS checks
* Build

Use the detected package manager:

* npm
* pnpm
* yarn
* bun

Do not claim success unless commands actually pass.
If something cannot pass because of pre-existing unrelated failures, document exactly what failed, where, and why.

PHASE 13 — FINAL REPORT

Produce a final report including:

* Files audited
* Existing Tier-1 canon references found
* Tier-2 standards created
* Tier-3 standards created
* Tier-4 standards created
* Tier-5 standards created
* Source-of-truth exports created
* Drift removed
* Duplicate definitions removed or deprecated
* Enforcement scripts added
* Tests added
* CI checks added
* Commands run and results
* Remaining risks
* Exact commands future contributors should run
* Confirmation of whether LOCS is fully enforced

RULES

* Do not alter Tier-1 canon except to reference it.
* Do not weaken Tier-1.
* Do not create parallel canon systems.
* Do not make Tier-2 through Tier-5 vague.
* Do not leave unenforced documentation-only standards where code checks are practical.
* Prefer strict, boring, enforceable standards over inspirational language.
* Preserve URAI’s symbolic, emotional, spatial, story, privacy, and companion architecture.
* Keep the hierarchy simple enough that future contributors can follow it.
* Make it difficult to accidentally drift away from canon.
* Make future canon changes intentional, reviewed, tested, and traceable.

Final success condition:
Tier-2, Tier-3, Tier-4, and Tier-5 LOCS are fully defined, documented, exported, tested, CI-protected, and migration-gated beneath immutable Tier-1 Canon Standards.
