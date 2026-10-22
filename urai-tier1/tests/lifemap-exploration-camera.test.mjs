import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { advanceLifeMapFlight, lifeMapFlightLookTarget, lifeMapApproachWaypoints, lifeMapWorldStageTransform, lifeMapStagePoint } from "../src/components/lifemap/lifeMapFlight.mjs";

const origin = () => ({ position: [0, 1.55, 13.4], velocity: [0, 0, 0], yaw: 0, pitch: 0 });

test("exploring forward moves into the galaxy with finite values", () => {
  const moved = advanceLifeMapFlight(origin(), { forward: 1 }, 1 / 60);
  assert.ok(moved.position[2] < 13.4);
  assert.ok(moved.position.every(Number.isFinite));
});

test("diagonal movement is normalized instead of accelerated", () => {
  const moved = advanceLifeMapFlight(origin(), { forward: 1, strafe: 1, vertical: 1 }, 0.05);
  assert.ok(Math.hypot(...moved.velocity) <= 5.001);
});

test("camera rotation redirects travel and clamps vertical pitch", () => {
  const turned = advanceLifeMapFlight(origin(), { lookX: 0.2, lookY: 100, forward: 1 }, 0.05);
  assert.ok(turned.yaw > 0 && turned.pitch <= 1.18);
  assert.ok(turned.position[0] > 0);
});

test("world bounds keep explored camera inside the navigable field", () => {
  const moved = advanceLifeMapFlight({ ...origin(), position: [36, 20, -54] }, { forward: 1, strafe: 1, vertical: 1 }, 0.05);
  assert.ok(moved.position[0] <= 36 && moved.position[1] <= 20 && moved.position[2] >= -54);
});

test("non-finite and negative clock deltas never cause a teleport", () => {
  for (const dt of [Infinity, Number.NaN, -5]) {
    assert.deepEqual(advanceLifeMapFlight(origin(), { forward: 1 }, dt).position, origin().position);
  }
});

test("look target tracks the explored yaw and pitch", () => {
  const look = lifeMapFlightLookTarget(origin());
  assert.ok(look[2] < 13.4);
  assert.equal(look.length, 3);
});

test("original world still owns WebGL and owner authorization", () => {
  const scene = readFileSync(new URL("../src/components/lifemap/ComposedLifeMapScene.tsx", import.meta.url), "utf8");
  assert.match(scene, /advanceLifeMapFlight\(flight\.current, input, delta\)/);
  assert.match(scene, /<LifeMapProductionWorld/);
  assert.match(scene, /forwardPrivateMovieRouteSelection/);
  assert.match(scene, /WebGLRecoveryBridge/);
  assert.match(scene, /phase === "overview" && !selected/);
  assert.match(scene, /window\.addEventListener\("blur", clear\)/);
});

test("selected memory departure inherits the explored camera checkpoint", () => {
  const scene = readFileSync(new URL("../src/components/lifemap/ComposedLifeMapScene.tsx", import.meta.url), "utf8");
  assert.match(scene, /departureOrigin\.current\.copy\(camera\.position\)/);
  assert.match(scene, /goalForNode\(selected, phase, portrait, departureOrigin\.current\)/);
  assert.match(scene, /phase === "departure" \? waypoints\.departure/);
  assert.doesNotMatch(scene, /travel\.x \+=/);
});

test("star travel waypoints remain finite and depart exactly from explored camera", () => {
  const start = [24, 6, -17], target = [-8, 0, -22];
  const journey = lifeMapApproachWaypoints(start, target);
  assert.deepEqual(journey.departure, start);
  for (const key of ["travel", "approach", "arrival"]) assert.ok(journey[key].every(Number.isFinite));
  assert.ok(Math.hypot(...journey.arrival.map((x, i) => x - target[i])) < 7);
});
test("nearby stars do not produce NaN camera waypoints", () => {
  const journey = lifeMapApproachWaypoints([2, 2, 2], [2, 2, 2]);
  assert.ok(Object.values(journey).every(p => p.every(Number.isFinite)));
});

test("selecting a nearby star never pulls the camera several units backward", () => {
  const start = [2, 2, 3], target = [2, 2, 2];
  const journey = lifeMapApproachWaypoints(start, target);
  const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
  assert.ok(distance(journey.arrival, target) <= distance(start, target));
  assert.ok(distance(journey.arrival, start) < 0.3);
});

test("distant star journey progresses inward through both approach phases", () => {
  const target = [-5, 0, -24];
  const journey = lifeMapApproachWaypoints([0, 1.55, 13.4], target);
  const distances = ["departure", "travel", "approach", "arrival"].map((phase) =>
    Math.hypot(...journey[phase].map((x, i) => x - target[i])));
  assert.ok(distances.every((value, i) => i === 0 || value < distances[i - 1]));
});

test("deliberate camera drag cannot trigger memory-star selection", () => {
  const world = readFileSync(new URL("../src/components/lifemap/LifeMapProductionWorld.tsx", import.meta.url), "utf8");
  assert.match(world, /if \(event\.delta > 6\) return/);
  assert.match(world, /event\.stopPropagation\(\);\s*onSelect\(node\)/);
});

test("inside-close-focus selection remains at current camera location", () => {
  const start = [0, 0, 0.04], target = [0, 0, 0];
  const journey = lifeMapApproachWaypoints(start, target);
  for (const key of ["departure", "travel", "approach", "arrival"]) {
    assert.deepEqual(journey[key], start);
  }
});

test("hundreds of near and far selections never increase distance to memory star", () => {
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  for (let i = 0; i < 2000; i++) {
    const radius = (i % 200) / 20;
    const start = [Math.sin(i) * radius, Math.cos(i) * radius, Math.sin(i * 0.17) * radius];
    const target = [0, 0, 0];
    const waypoints = lifeMapApproachWaypoints(start, target);
    const d = ["departure", "travel", "approach", "arrival"].map(k => distance(waypoints[k], target));
    assert.ok(d.every((v, j) => j === 0 || v <= d[j - 1] + 1e-8), `non-progressive approach: ${JSON.stringify(d)}`);
  }
});

test("world transform does not change when a star is selected", () => {
  const world = readFileSync(new URL("../src/components/lifemap/LifeMapProductionWorld.tsx", import.meta.url), "utf8");
  assert.match(world, /const stage = lifeMapWorldStageTransform\(portrait\)/);
  assert.doesNotMatch(world, /const stageScale: Point3 = selected \?/);
  assert.match(world, /const visible = true/);
});
test("camera aims at star in the same fixed transformed world coordinates", () => {
  const scene = readFileSync(new URL("../src/components/lifemap/ComposedLifeMapScene.tsx", import.meta.url), "utf8");
  assert.match(scene, /new THREE\.Vector3\(\.\.\.lifeMapStagePoint\(node\.position, portrait\)\)/);
  for (const portrait of [true, false]) {
    const stage = lifeMapWorldStageTransform(portrait);
    for (let i = 0; i < 1000; i++) {
      const point = [Math.sin(i) * 18, Math.cos(i) * 12, Math.sin(i * 0.19) * 27];
      assert.deepEqual(lifeMapStagePoint(point, portrait), point.map((v, n) => v * stage.scale[n] + stage.position[n]));
    }
  }
});

test("arrival preserves one authored selected star and surrounding visible alternatives", () => {
  const world = readFileSync(new URL("../src/components/lifemap/LifeMapProductionWorld.tsx", import.meta.url), "utf8");
  const arrival = world.slice(world.indexOf("function SelectedMemoryArrival("), world.indexOf("function ArchiveParticles(", world.indexOf("function SelectedMemoryArrival(")));
  assert.ok(arrival.includes('semanticOwner: "life-map-selected-memory-atmosphere"'));
  assert.doesNotMatch(arrival, /<AuthoredMemoryStar /);
  assert.match(world, /const visible = true/);
});
