import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const doorFile = join(app, "src/app/focus/FocusPlaceDoor.tsx");
const focusPageFile = join(app, "src/app/focus/page.tsx");
const focusClientFile = join(app, "src/app/focus/FocusChamberClient.tsx");
const memoryStarFile = join(app, "src/spatial/memory/memoryStarSchema.ts");

assert.equal(existsSync(doorFile), true, "FocusPlaceDoor module must remain available for explicitly disclosed demo/provenance use.");
assert.equal(existsSync(focusPageFile), true, "Focus route must exist.");
assert.equal(existsSync(focusClientFile), true, "Final focus chamber client must exist.");
assert.equal(existsSync(memoryStarFile), true, "Memory star schema must exist.");

const door = readFileSync(doorFile, "utf8");
const focusPage = readFileSync(focusPageFile, "utf8");
const focusClient = readFileSync(focusClientFile, "utf8");
const memoryStar = readFileSync(memoryStarFile, "utf8");

assert.match(door, /explicitDemo = searchParams\?\.get\('demo'\) === '1'/, "Bundled symbolic place door must require explicit demo mode.");
assert.match(door, /star\.privacyState === 'demo' && !explicitDemo/, "Demo star place door must stay hidden in ordinary Focus.");
assert.match(door, /data-place-door-authority="explicit-demo-only"/, "Focus demo place door must disclose its authority.");
assert.match(door, /Enter Sample Place/, "Explicit demo mode may retain a clearly labelled sample-place action.");
assert.match(door, /bundled demo data, not reconstructed personal memory/, "Focus must distinguish sample place data from autobiography.");
assert.match(door, /canEnterMemoryPlace/, "FocusPlaceDoor must still validate place capability inside explicit demo mode.");
assert.match(door, /enterPlaceHref/, "Explicit demo door may use the sample enterPlaceHref.");
assert.match(focusPage, /FocusChamberClient/, "Focus route must render the final focus chamber client owner.");
assert.match(focusClient, /useSelectedMemory\(\)/, "Final Focus chamber must resolve the authenticated selected-memory contract.");
assert.match(focusClient, /aria-label=\{memory \? `Enter Replay for \$\{memory\.title\}`/, "Final Focus chamber must expose the canonical accessible Enter Replay action.");
assert.match(focusClient, /requestUraiWorldTravel\(\{/, "Final Focus chamber must enter Replay through persistent world travel.");
assert.match(focusClient, /destination: 'replay'/, "Final Focus chamber must target the Replay destination.");
assert.match(focusClient, /replayManifestId: memory\.replayManifest\.id/, "Final Focus chamber must preserve replay manifest identity.");
assert.match(focusClient, /new URLSearchParams\(\{/, "Final Focus chamber must construct a canonical Replay query.");
assert.match(focusClient, /memoryId: memory\.id/, "Final Focus chamber must preserve selected memory identity in its Replay route.");
assert.match(focusClient, /manifestId: memory\.replayManifest\.id/, "Final Focus chamber must preserve selected manifest identity in its Replay route.");
assert.match(focusClient, /node: memory\.star\.id/, "Final Focus chamber must preserve selected star identity in its Replay route.");
assert.match(focusClient, /from: 'focus-artifact'/, "Final Focus chamber must preserve its entry provenance in the Replay route.");

const hasAuthorizedReplayGuard = /if \(!memory \|\| !replayHref(?: \|\| committed)?\) return/.test(focusClient);
const hasCommittedDebounce = /if \(!memory \|\| !replayHref \|\| committed\) return/.test(focusClient) || /if \(committed\) return/.test(focusClient);
assert.equal(hasAuthorizedReplayGuard, true, "Final Focus chamber must fail closed when no authorized memory or Replay route exists.");
assert.equal(hasCommittedDebounce, true, "Final Focus chamber must debounce an already committed Replay transition.");

assert.match(focusClient, /requestUraiWorldReturn\(\)/, "Final Focus chamber must retain deterministic world return.");
assert.match(focusClient, /data-focus-spatial="explorable-observatory"/, "Final Focus chamber must expose the spatial observatory contract.");
assert.match(focusClient, /<OrbitControls/, "Final Focus chamber must retain bounded pointer and touch exploration.");
assert.match(memoryStar, /canEnterMemoryPlace/, "Memory star schema may retain demo/provenance place capability without making it ordinary autobiography.");

console.log("URAI focus place doorway canon passed: ordinary Focus hides demo place doors; explicit demo mode remains disclosed while authenticated Focus uses canonical Replay.");
