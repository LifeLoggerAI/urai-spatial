import test from "node:test";
import assert from "node:assert/strict";

import {
  buildClusterFocusPayload,
  buildStarFocusPayload,
  buildStarGlowPayload,
  buildStarResolvedPayload,
  buildTimelineSyncPayload,
} from "../src/spatial/scene/lifemapEventEmitters.ts";

test("star payload builders enforce required fields and timestamp", () => {
  const glow = buildStarGlowPayload({ starId: "s1", chapterId: "c1", emotion: "joy" });
  const focus = buildStarFocusPayload({ starId: "s2", chapterId: "c2", emotion: "grief" });
  const resolved = buildStarResolvedPayload({ starId: "s3", chapterId: "c3", emotion: "focus" });

  for (const payload of [glow, focus, resolved]) {
    assert.equal(typeof payload.timestamp, "number");
    assert.ok(payload.timestamp > 0);
    assert.equal(typeof payload.starId, "string");
    assert.equal(typeof payload.chapterId, "string");
    assert.equal(typeof payload.emotion, "string");
  }
});

test("cluster focus supports optional star data and keeps chapter required", () => {
  const cluster = buildClusterFocusPayload({ chapterId: "chapter-a" });
  assert.equal(cluster.event, "lifemap.cluster.focus");
  assert.equal(cluster.chapterId, "chapter-a");
  assert.equal(cluster.starId, undefined);
  assert.equal(cluster.emotion, undefined);

  const withStar = buildClusterFocusPayload({ chapterId: "chapter-a", starId: "star-a", emotion: "recovery" });
  assert.equal(withStar.starId, "star-a");
  assert.equal(withStar.emotion, "recovery");
});

test("timeline payload enforces mode/phase and nullability rules", () => {
  const timeline = buildTimelineSyncPayload({ phase: "focus", activeChapterId: "chapter-1", activeStarId: "star-1" });
  assert.equal(timeline.mode, "lifemap");
  assert.equal(timeline.phase, "focus");
  assert.equal(timeline.activeChapterId, "chapter-1");
  assert.equal(timeline.activeStarId, "star-1");

  const withoutStar = buildTimelineSyncPayload({ phase: "cluster", activeChapterId: "chapter-1" });
  assert.equal(withoutStar.activeStarId, undefined);
});

test("builder throws on empty required fields", () => {
  assert.throws(() => buildStarFocusPayload({ starId: "", chapterId: "c1", emotion: "joy" }), /starId is required/);
  assert.throws(() => buildClusterFocusPayload({ chapterId: "" }), /chapterId is required/);
  assert.throws(() => buildTimelineSyncPayload({ phase: "living", activeChapterId: "" }), /activeChapterId is required/);
});
