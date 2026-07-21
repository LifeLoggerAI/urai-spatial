# URAI Crowdfunding Capture Session Plan

## Authority

- Canonical repository: `LifeLoggerAI/urai-spatial`
- Verified public release SHA: `1bbf34d48bcb4d0814346bb69091d3f71c58d54f`
- Protected deployment run: `29710284063`
- Deployment artifact: `8448878245`
- Rollback SHA: `a42ded37d1486a95e72062d04f69016a57660af3`
- Route-matrix workflow run: `29802269787`
- Route-matrix artifact: `8484189712`
- Route-matrix digest: `sha256:4daede53e46b520d2b8a5c3a788868b43ed4783e069f5d90e1274da40a72a0a7`
- Route-matrix result: PASS

A passing route response does not independently prove deployed release identity. Every filming session must retain the release receipt above and record the route, viewport, device, operator, raw filename and approval state.

## Session defaults

- Public base URL: `https://urai.app`
- Canonical route form: trailing slash after redirect
- Capture desktop: 1440x900 minimum
- Capture portrait mobile: 390x844 minimum
- Browser: current stable Chromium unless another browser is explicitly recorded
- Data: public or explicit sample data only
- Sample-data disclosure: `SAMPLE DATA` must remain visible or be added as an approved on-screen disclosure
- Private accounts, private memories, internal dashboards, secrets and localhost are prohibited

## Shot order

### C01 — Home threshold

- Route: `https://urai.app/`
- Purpose: establish the Home world, visual hierarchy and Orb threshold
- Required proof: page loads without private data; primary interface is visible; no debug overlays
- Formats: desktop master and portrait mobile

### C02 — Home to Ground transition

- Start: `https://urai.app/`
- End: `https://urai.app/ground/`
- Purpose: show that URAI is navigable rather than a static wallpaper
- Required proof: real user interaction initiates the transition; no edit may fabricate movement that the product did not perform

### C03 — Ground movement

- Route: `https://urai.app/ground/`
- Purpose: show arrival, movement, destination approach and return affordance
- Required proof: keyboard or accessible fallback where applicable; no draft PR visuals

### C04 — Life Map overview

- Route: `https://urai.app/life-map/?demo=1`
- Purpose: show the navigable memory universe and timeline context
- Data mode: explicit sample
- Required disclosure: `SAMPLE DATA`

### C05 — Life Map selection

- Route: `https://urai.app/life-map/?demo=1`
- Purpose: show a user selecting a sample memory or focus destination
- Data mode: explicit sample
- Required disclosure: `SAMPLE DATA`

### C06 — Focus continuity

- Route: `https://urai.app/focus/?demo=1`
- Purpose: show continuity from selected memory into focused experience
- Data mode: explicit sample
- Required disclosure: `SAMPLE DATA`

### C07 — Replay entry

- Route: `https://urai.app/replay/?demo=1`
- Purpose: show the replay transition and presentation without implying unsupported generation or medical interpretation
- Data mode: explicit sample
- Required disclosure: `SAMPLE DATA`

### C08 — User authority and privacy

- Route: `https://urai.app/privacy/`
- Purpose: show privacy, control and user-authority language or controls
- Required proof: no claim may exceed the visible product or approved policy language

### C09 — Public status and evidence

- Route: `https://urai.app/status/`
- Purpose: provide brief trust context for campaign editors and reviewers
- Required proof: do not present status-page content as independent certification

### C10 — Mobile safe-area montage

- Routes: Home, Ground, Life Map, Focus and Replay
- Purpose: prove portrait usability and safe-area integrity
- Required proof: no clipped primary controls, disclosure or navigation

### C11 — Keyboard and reduced-motion evidence

- Routes: Ground, Life Map, Focus and Replay where applicable
- Purpose: capture accessibility evidence for review, not necessarily final hero-film inclusion
- Required proof: keyboard journey and reduced-motion/fallback result recorded separately

### C12 — Clean closing frame

- Route: `https://urai.app/`
- Purpose: final visual bed for the approved campaign close: `Help open the world. Because you own yourself.`
- Required proof: text is added in post only after campaign copy approval

## File naming

Use:

`URAI-CF-<SHOT-ID>-<DEVICE>-<TAKE>-<YYYYMMDDTHHMMSSZ>.<ext>`

Example:

`URAI-CF-C04-DESKTOP-T01-20260721T050000Z.mov`

Never overwrite a raw file. Retakes receive a new take number.

## Acceptance gates

A shot is accepted only when all are true:

- exact route and release receipt recorded;
- raw filename and checksum recorded;
- data mode and disclosure confirmed;
- privacy and security review pass;
- accessibility review pass where applicable;
- product-truth and claims review pass;
- media rights review pass;
- reviewer name and evidence link recorded;
- final status is `APPROVED FOR EDIT`.

Any missing field leaves the shot `HOLD`. Any private data, secrets, draft visuals, fabricated interaction or unverifiable release identity makes the shot `REJECTED`.
