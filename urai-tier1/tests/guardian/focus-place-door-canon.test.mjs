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
assert.match(focusClient, /useSelectedMemory\(\)/, "Final Focus chamber must resolve the authenticated selected-memory contract.");
assert.match(focusClient, /aria-label={`Open Replay for \${memory\.title}`}/, "Final Focus chamber must expose an accessible Replay portal action.");
assert.match(focusClient, /requestUraiWorldTravel\(\{/, "Final Focus chamber must enter Replay through persistent world travel.");
assert.match(focusClient, /destination: 'replay'/, "Final Focus chamber must target the Replay destination.");
assert.match(focusClient, /replayManifestId: memory\.replayManifest\.id/, "Final Focus chamber must preserve replay manifest identity.");
assert.match(focusClient, /new URLSearchParams\(\{/, "Final Focus chamber must construct a canonical Replay query.");
assert.match(focusClient, /memoryId:\s*memory\.id/, "Final Focus chamber must preserve selected memory identity in its Replay route.");
assert.match(focusClient, /manifestId:\s*memory\.replayManifest\.id/, "Final Focus chamber must preserve selected manifest identity in its Replay route.");
assert.match(focusClient, /node:\s*memory\.star\.id/, "Final Focus chamber must preserve selected star identity in its Replay route.");
assert.match(focusClient, /from:\s*'focus-artifact'/, "Final Focus chamber must preserve its entry provenance in the Replay route.");
assert.match(focusClient, /if \(!memory \|\| !replayHref\) return/, "Final Focus chamber must fail closed before Replay when no authorized memory exists.");
assert.match(focusClient, /requestUraiWorldReturn\(\)/, "Final Focus chamber must retain deterministic world return.");
assert.match(memoryStar, /canEnterMemoryPlace/, "Memory star schema must define canEnterMemoryPlace.");

console.log("URAI focus place doorway canon passed: place door remains available and authenticated Focus uses the selected-memory Replay portal contract.");
