# URAI Spatial Life Map QA Checklist

Use this checklist after running typecheck, build, and tests in Cloud Workstation.

## Commands

```bash
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 build
pnpm --filter urai-tier1 test:lifemap
```

Optional Firestore demo seed with the runtime's managed Application Default Credentials:

```bash
cd urai-tier1
FIREBASE_PROJECT_ID=<project-id> pnpm seed:lifemap -- --user=demo-user
```

For an approved local or other non-managed validation environment, configure ADC with an access-controlled credential file outside the repository:

```bash
cd urai-tier1
FIREBASE_PROJECT_ID=<project-id> GOOGLE_APPLICATION_CREDENTIALS=/secure/path/adc-credentials.json pnpm seed:lifemap -- --user=demo-user
```

Do not paste service-account JSON into environment variables, commit credential files, or use this seeding command against production without a separately approved protected workflow and identity.

## Route Smoke Test

Open:

```text
/life-map
```

Expected:

- Life Map renders without a blank screen.
- HUD shows `URAI Spatial`, `Life Map`, mode, narrator copy, TTS toggle, filters, time controls, Recenter, Return Home, and Mirror.
- If Firestore has no records, `Seed mode` appears.
- If Firestore has records, seed mode should disappear after data loads.

## Node Controls

- Click a star/node.
- Focus card appears.
- Node title, subtitle, date/type, summary, intensity, and replay state display.
- Close/Esc button returns to overview.
- Locked nodes should not start replay.
- Replayable unlocked nodes should show `Begin Replay`.

## Replay Controls

- Select a replayable node.
- Click `Begin Replay`.
- Replay overlay appears.
- Replay highlights connected sequence nodes in the galaxy.
- Back to Focus returns to focus mode.
- Escape unwinds replay -> focus.

## Time/Era Controls

- Switch All Time, Year, Season, Month, Week, Era.
- Era mode displays era chips.
- Selecting an era filters to that era's nodes.
- Selecting All Eras restores era visibility.

## Mirror of Becoming

- Click Mirror.
- Mirror panel opens.
- Becoming statement is generated from the visible nodes.
- Archetypes, patterns, recovery signals, relationship themes, creative signals, threshold moments, and confidence render.
- Escape closes Mirror and returns to Life Map overview.

## Keyboard

- `R` recenters.
- `M` opens Mirror.
- `Esc` unwinds replay -> focus -> overview -> home.
- `Enter` or `Space` on focused replayable node starts replay.

## Mobile

- Tap node to focus.
- Swipe left/right while focused to move through connected nodes.
- HUD remains usable on small screens.
- Focus card does not block all controls.

## Firestore Shape

Events path:

```text
users/{userId}/lifeMapEvents/{eventId}
```

Eras path:

```text
users/{userId}/lifeMapEras/{eraId}
```

Minimum event fields:

```ts
{
  title: string,
  type: 'memory' | 'season' | 'ritual' | 'forecast' | 'threshold' | 'relationship' | 'recovery' | 'legacy',
  sourceType: string,
  summary: string,
  intensity: number,
  occurredAt: Timestamp,
  replayAvailable: boolean,
  connectedTo: string[],
  privacyLevel: 'private' | 'hidden' | 'shareable'
}
```

Minimum era fields:

```ts
{
  title: string,
  startLabel: string,
  type: string,
  summary: string,
  dominantAura: string,
  nodeIds: string[]
}
```

## Known Follow-Up Decision

The current production-safe Life Map scene is a static/CSS galaxy. A full React Three Fiber restoration should be done as a separate pass after this route passes build/test, so pinch/drag orbit and true 3D camera motion can be added without breaking the working route.
