# URAI Privacy and Location Rules

URAI Spatial treats location as highly private. Memory Places should feel personal and meaningful without exposing exact coordinates, exact addresses, or raw private source data by default.

## Default location rule

```text
Default location precision is symbolic or approximate.
Exact location is opt-in only.
Exact location sharing requires explicit confirmation every time.
```

## Allowed location privacy modes

```text
hidden
symbolic-only
city-only
approx-private
exact-private
exact-share-opt-in
```

## Default modes

For normal generated memory places, use one of:

```text
symbolic-only
city-only
approx-private
```

For public demo worlds, use:

```text
hidden
symbolic-only
city-only
```

For sensitive memory places, use:

```text
hidden
symbolic-only
approx-private
```

## Forbidden by default

```text
Do not display exact addresses in Genesis mode.
Do not display raw latitude and longitude in Genesis mode.
Do not export exact coordinates by default.
Do not expose raw location source events in public/demo mode.
Do not include private place labels in public exports without confirmation.
```

## Memory Place privacy requirements

Every MemoryPlace must include:

```ts
privacyLevel: "private" | "sensitive" | "shareable" | "demo";
locationPrivacy:
  | "hidden"
  | "symbolic-only"
  | "city-only"
  | "approx-private"
  | "exact-private"
  | "exact-share-opt-in";
```

Every PlaceObject must include:

```ts
privacyLevel: "private" | "sensitive" | "shareable" | "demo";
```

## Exact location handling

Exact location can exist only in private user-controlled contexts and must not render unless the user explicitly enables exact-private display. Exact location must not be included in share/export flows unless the user explicitly chooses exact-share-opt-in for that export.

## Export redaction

All place exports must pass through a privacy filter that checks:

```text
location label
address
coordinates
people names
raw transcript
raw email/text content
raw media references
sensitive object labels
```

Default export behavior:

```text
Use symbolic scene title.
Use abstract place category.
Remove exact address.
Remove exact coordinates.
Redact private names unless allowed.
Use narrator summary instead of raw source data.
```

## Spatial explanation rule

Every data-driven place or object should eventually answer:

```text
Why am I seeing this?
What data category created it?
How private is it?
Can I hide it?
Can I delete it?
Can I export it?
```

The explanation should never reveal raw sensitive source data by default.

## Public demo rule

Public demo worlds must use synthetic data only.

Public demo worlds must not include:

```text
real private addresses
real private names
raw private screenshots
raw private audio/text
precise coordinates
private user source events
```

## Fallback behavior

If location precision is unclear, downgrade to symbolic-only.

If privacy status is missing, treat the object as private and do not export it.

If an export privacy decision is uncertain, block export until reviewed or confirmed.
