import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { advanceLifeMapFlight, lifeMapFlightLookTarget, lifeMapApproachWaypoints } from "../src/components/lifemap/lifeMapFlight.mjs";

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
