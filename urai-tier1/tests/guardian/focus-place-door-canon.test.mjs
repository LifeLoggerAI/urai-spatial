import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const doorFile = join(app, "src/app/focus/FocusPlaceDoor.tsx");
const focusPageFile = join(app, "src/app/focus/page.tsx");
const finalMemorySurfacesFile = join(app, "src/app/FinalMemorySurfaces.tsx");
const memoryStarFile = join(app, "src/spatial/memory/memoryStarSchema.ts");

assert.equal(existsSync(doorFile), true, "FocusPlaceDoor module must remain available for place-capable memory stars.");
assert.equal(existsSync(focusPageFile), true, "Focus route must exist.");
assert.equal(existsSync(finalMemorySurfacesFile), true, "Final memory surfaces must exist.");
assert.equal(existsSync(memoryStarFile), true, "Memory star schema must exist.");

const door = readFileSync(doorFile, "utf8");
const focusPage = readFileSync(focusPageFile, "utf8");
const finalMemorySurfaces = readFileSync(finalMemorySurfacesFile, "utf8");
const memoryStar = readFileSync(memoryStarFile, "utf8");

assert.match(door, /Enter Place/, "FocusPlaceDoor must expose its place action for place-capable stars.");
assert.match(door, /canEnterMemoryPlace/, "FocusPlaceDoor must check whether the star can enter a place.");
assert.match(door, /enterPlaceHref/, "FocusPlaceDoor must use enterPlaceHref.");
assert.match(focusPage, /FinalFocusChamber/, "Focus route must render the final chamber owner.");
assert.match(finalMemorySurfaces, /Camera into Replay/, "Final Focus chamber must expose the Replay camera action.");
assert.match(finalMemorySurfaces, /memoryId=quiet-reset/, "Final Focus chamber must preserve memory identity in route copy and links.");
assert.match(memoryStar, /canEnterMemoryPlace/, "Memory star schema must define canEnterMemoryPlace.");

console.log("URAI focus place doorway canon passed: place door remains available and Focus route uses the final chamber owner.");
