import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const doorFile = join(app, "src/app/focus/FocusPlaceDoor.tsx");
const focusPageFile = join(app, "src/app/focus/page.tsx");
const focusClientFile = join(app, "src/app/focus/FocusChamberClient.tsx");
const memoryStarFile = join(app, "src/spatial/memory/memoryStarSchema.ts");

assert.equal(existsSync(doorFile), true, "FocusPlaceDoor module must remain available for place-capable memory stars.");
assert.equal(existsSync(focusPageFile), true, "Focus route must exist.");
assert.equal(existsSync(focusClientFile), true, "Final focus chamber client must exist.");
assert.equal(existsSync(memoryStarFile), true, "Memory star schema must exist.");

const door = readFileSync(doorFile, "utf8");
const focusPage = readFileSync(focusPageFile, "utf8");
const focusClient = readFileSync(focusClientFile, "utf8");
const memoryStar = readFileSync(memoryStarFile, "utf8");

assert.match(door, /Enter Place/, "FocusPlaceDoor must expose its place action for place-capable stars.");
assert.match(door, /canEnterMemoryPlace/, "FocusPlaceDoor must check whether the star can enter a place.");
assert.match(door, /enterPlaceHref/, "FocusPlaceDoor must use enterPlaceHref.");
assert.match(focusPage, /FocusChamberClient/, "Focus route must render the final focus chamber client owner.");
function validateFocusSource(focusClient) {
  assert.match(focusClient, /useSelectedMemory\(\)/, "Final Focus chamber must resolve the authenticated selected-memory contract.");
  const navigation = focusClient.match(/<nav className="focusControls"[\s\S]*?<\/nav>/)?.[0] ?? '';
  const portals = [...navigation.matchAll(/<button\b[^>]*className="primary"[^>]*>/g)];
  assert.equal(portals.length, 1, "Final Focus chamber must retain exactly one accessible Replay portal control.");
  const portal = portals[0]?.[0] ?? '';
  assert.match(navigation, /\{memory \? <button\b[^>]*className="primary"/, "Replay portal visibility must require the selected memory.");
  assert.match(portal, /type="button"/, "Replay portal must be a semantic button.");
  assert.match(portal, /disabled=\{committed\}/, "Replay portal must remain disabled during committed travel.");
  assert.match(portal, /onClick=\{enterReplay\}/, "Replay portal must use the authorized Replay travel owner.");
  assert.match(portal, /\{\.\.\.locale\.props\((?:memory \? )?'focus.openReplayFor'(?: : 'focus.chooseReplay')?\)\}/, "Replay portal must retain matching localized language and direction metadata.");
  assert.match(portal, /aria-label=\{(?:memory \? )?locale\.text\('focus\.openReplayFor',\s*\{\s*title:\s*memory\.title\s*\}\)(?: : locale\.text\('focus\.chooseReplay'\))?\}/, "Final Focus chamber must expose the localized selected-memory Replay action with its private title.");
  assert.match(focusClient, /requestUraiWorldTravel\(\{/, "Final Focus chamber must enter Replay through persistent world travel.");
  assert.match(focusClient, /destination: 'replay'/, "Final Focus chamber must target the Replay destination.");
  assert.match(focusClient, /replayManifestId: memory\.replayManifest\.id/, "Final Focus chamber must preserve replay manifest identity.");
  const replayQuery = focusClient.match(/new URLSearchParams\(\{[\s\S]*?\}\)/)?.[0] ?? '';
  assert.match(replayQuery, /new URLSearchParams\(\{/, "Final Focus chamber must construct a canonical Replay query.");
  assert.match(replayQuery, /memoryId: memory\.id/, "Final Focus chamber must preserve selected memory identity in its Replay route.");
  assert.match(replayQuery, /manifestId: memory\.replayManifest\.id/, "Final Focus chamber must preserve selected manifest identity in its Replay route.");
  assert.match(replayQuery, /node: memory\.star\.id/, "Final Focus chamber must preserve selected star identity in its Replay route.");
  assert.match(replayQuery, /from: 'focus-artifact'/, "Final Focus chamber must preserve its entry provenance in the Replay route.");

  const hasAuthorizedReplayGuard = /if \(!memory \|\| !replayHref(?: \|\| committed)?\) return/.test(focusClient);
  const hasCommittedDebounce = /if \(!memory \|\| !replayHref \|\| committed\) return/.test(focusClient) || /if \(committed\) return/.test(focusClient);
  assert.equal(hasAuthorizedReplayGuard, true, "Final Focus chamber must fail closed when no authorized memory or Replay route exists.");
  assert.equal(hasCommittedDebounce, true, "Final Focus chamber must debounce an already committed Replay transition.");

  assert.match(focusClient, /requestUraiWorldReturn\(\)/, "Final Focus chamber must retain deterministic world return.");
  assert.match(focusClient, /data-focus-spatial="inside-memory-star"/, "Final Focus must expose the inside-memory-star spatial contract.");
  assert.match(focusClient, /data-focus-composition="stellar-photosphere-corona-with-living-memory-vfx"/, "Final Focus must retain the stellar photosphere/corona composition contract.");
  assert.doesNotMatch(focusClient, /data-focus-spatial="explorable-observatory"/, "Retired observatory authority must not return to canonical Focus.");
  assert.match(focusClient, /<OrbitControls/, "Final Focus chamber must retain bounded pointer and touch exploration.");
  assert.match(focusClient, /privacyMode: memory\.privacy === 'private' \? 'held-private' : 'private'/, "Replay travel must preserve the selected memory privacy fence.");
}

validateFocusSource(focusClient);

assert.match(memoryStar, /canEnterMemoryPlace/, "Memory star schema must define canEnterMemoryPlace.");

// Execute the same complete source guard against mutations, so accepting the
// current portal cannot silently retire title, privacy, identity or travel gates.
for (const [label, before, after, expected] of [
  ['portal ownership', 'className="primary"', 'className="secondary"', /exactly one accessible Replay portal/],
  ['selected visibility', '{memory ? <button type="button" className="primary"', '{true ? <button type="button" className="primary"', /visibility must require/],
  ['semantic button', '<button type="button" className="primary"', '<button type="submit" className="primary"', /semantic button/],
  ['committed disabled state', 'disabled={committed}', 'disabled={false}', /disabled during committed/],
  ['authorized click owner', "onClick={enterReplay} {...locale.props", "onClick={unwind} {...locale.props", /authorized Replay travel owner/],
  ['locale metadata', "{...locale.props(memory ? 'focus.openReplayFor' : 'focus.chooseReplay')}", 'lang="ar" dir="rtl"', /matching localized language/],
  ['private title', '{title:memory.title}', "{title:'generic'}", /private title/],
  ['memory identity', 'memoryId: memory.id', "memoryId: 'foreign'", /selected memory identity/],
  ['manifest identity', 'manifestId: memory.replayManifest.id', "manifestId: 'foreign'", /selected manifest identity/],
  ['star identity', 'node: memory.star.id', "node: 'foreign'", /selected star identity/],
  ['query provenance', "from: 'focus-artifact'", "from: 'foreign'", /entry provenance/],
  ['authorization denial', 'if (!memory || !replayHref || committed) return', 'if (committed) return', /fail closed/],
  ['privacy fence', "privacyMode: memory.privacy === 'private' ? 'held-private' : 'private'", "privacyMode: 'public'", /privacy fence/],
  ['canonical composition', 'data-focus-composition="stellar-photosphere-corona-with-living-memory-vfx"', 'data-focus-composition="retired-observatory"', /composition contract/],
]) {
  assert.ok(focusClient.includes(before), `${label} mutation must alter the current source.`);
  assert.throws(() => validateFocusSource(focusClient.replace(before, after)), expected, `${label} mutation must remain denied.`);
}

console.log("URAI focus place doorway canon passed: place door remains available and authenticated stellar Focus preserves the selected-memory Replay portal contract.");
