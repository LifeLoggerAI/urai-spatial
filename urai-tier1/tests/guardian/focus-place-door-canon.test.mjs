import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const doorFile = join(app, "src/app/focus/FocusPlaceDoor.tsx");
const focusPageFile = join(app, "src/app/focus/page.tsx");
const memoryStarFile = join(app, "src/spatial/memory/memoryStarSchema.ts");

assert.equal(existsSync(doorFile), true, "FocusPlaceDoor must exist.");
assert.equal(existsSync(focusPageFile), true, "Focus route must exist.");

const door = readFileSync(doorFile, "utf8");
const focusPage = readFileSync(focusPageFile, "utf8");
const memoryStar = readFileSync(memoryStarFile, "utf8");

assert.match(door, /Enter Place/, "FocusPlaceDoor must expose an Enter Place action.");
assert.match(door, /canEnterMemoryPlace/, "FocusPlaceDoor must check whether the star can enter a place.");
assert.match(door, /enterPlaceHref/, "FocusPlaceDoor must use enterPlaceHref.");
assert.match(focusPage, /FocusPlaceDoor/, "Focus route must render FocusPlaceDoor.");
assert.match(focusPage, /manifestId/, "Focus route must pass manifestId into FocusPlaceDoor.");
assert.match(memoryStar, /canEnterMemoryPlace/, "Memory star schema must define canEnterMemoryPlace.");

console.log("URAI focus place doorway canon passed.");
