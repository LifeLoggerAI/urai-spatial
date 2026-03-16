# URAI Spatial Next Actions

Timestamp: 20260316_124316

Tier 1 status:
- build: locked
- smoke route: locked
- shell rescue: complete

Next required proof:
- hosted preview not yet proven
- local prod preview is up at http://127.0.0.1:3001/
- either wire Firebase Hosting in this repo or deploy via your chosen host

After preview QA:
1. git push --follow-tags
2. create tier2 branch
3. start polish/features, not shell repair

Visual QA checklist:
- home loads
- lifemap enters cleanly
- focus enters from star select
- replay enters/exits cleanly
- no broken camera jumps
- no black-screen dead ends
- no obvious console/runtime errors
