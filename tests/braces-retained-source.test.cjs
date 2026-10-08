"use strict";

// The retained fork is source history, not an installed launch dependency.
// Current installed watcher/linter acceptance is a separate maintained gate.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const sourceRoot = path.resolve(__dirname, "..");
const entry = path.join(sourceRoot, "vendor/braces/index.js");
const braces = require(entry);
const guard = error => error instanceof RangeError && /supported depth of 64/.test(error.message);
console.log(JSON.stringify({ proofScope: "RETAINED_VENDOR_SOURCE_ONLY", installedGraphAcceptance: false, upstreamFixedReleaseClaim: false }));

test("retained bounded source identity and MIT attribution are preserved", () => {
  const manifest = require("../vendor/braces/package.json");
  assert.equal(manifest.version, "3.0.3-urai.spatial.1");
  assert.equal(manifest.license, "MIT");
  const expected = {
    "LICENSE": "35bdd8a44339719441900fb50fbefc5e2dca1ca662cbaed7a687de842c8b70f2",
    "index.js": "332ea07c7b006361aad12aa994ca75dc1db8e8382b884909e2f38f10b85c88a4",
    "lib/parse.js": "f7c831a8ebeab3adf97033db02ddaff6be161de99a41679cf5c8ce2a27a3f2c8",
    "lib/compile.js": "f19df819a86cb4e0fb34c343fe11057fab70b08c766b4bba20d68592d3166c65",
    "lib/expand.js": "5e38f04bbb90fec93f48d20e40f7a8f4983f31b41b9895ac02f163de6ada42b3",
    "lib/stringify.js": "9d37c12cf14519a6660df4711b95fea3bb2ef6c96cc0e95ce6e2e38ba0c458a1",
    "lib/constants.js": "db7a2d4cdf5d1e1f9429f237b2516d8513ff73a2b3f0929230b2a13f6a14aca8",
    "lib/utils.js": "b5a7596aa67730412b3c029ef09e84e6b67b8e445cffd35d1d295549c89066c7"
  };
  for (const [file, digest] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(fs.readFileSync(path.join(sourceRoot, "vendor/braces", file))).digest("hex"), digest, file);
  }
});

test("retained source preserves normal escaped, nested and padded-range behavior", () => {
  assert.deepEqual(braces.expand("{a,b}-{01..03}"), ["a-01", "a-02", "a-03", "b-01", "b-02", "b-03"]);
  assert.deepEqual(braces("src/**/*.{js,ts,tsx}"), ["src/**/*.(js|ts|tsx)"]);
  assert.deepEqual(braces.expand("{a,{b,c}}"), ["a", "b", "c"]);
  assert.equal(braces.stringify("src/{app,{lib,test}}/*.ts"), "src/{app,{lib,test}}/*.ts");
  assert.deepEqual(braces.expand("a\\{b,c\\}"), ["a{b,c}"]);
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    assert.doesNotThrow(() => braces[method]("{".repeat(63) + "x" + "}".repeat(63)));
  }
  assert.throws(() => braces.expand("{1..1001}"), /range limit/);
});

test("retained source rejects excessive braces and parentheses despite option overrides", () => {
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    for (const [open, close] of [["{", "}"], ["(", ")"]]) {
      assert.throws(() => braces[method](open.repeat(4000) + "x" + close.repeat(4000), { maxDepth: Infinity, maxLength: Infinity }), guard, method);
    }
  }
});

test("retained source rejects deep direct ASTs and child cycles", () => {
  let ast = { type: "text", value: "leaf" };
  for (let depth = 0; depth < 4000; depth++) ast = { type: "root", nodes: [ast] };
  const cycle = { type: "root", nodes: [] }; cycle.nodes.push(cycle);
  for (const method of ["compile", "expand", "stringify"]) {
    assert.throws(() => braces[method](ast), guard, method);
    assert.throws(() => braces[method](cycle), guard, method);
  }
});

test("retained source rejects depth before exhausting a small process stack", () => {
  const child = spawnSync(process.execPath, ["--stack-size=256", "-e", `const a=require('node:assert/strict');const b=require(${JSON.stringify(entry)});for(const m of ['parse','compile','expand','stringify'])a.throws(()=>b[m]('('.repeat(4000)+'x'+')'.repeat(4000)),e=>e instanceof RangeError&&/supported depth of 64/.test(e.message));`], { encoding: "utf8", timeout: 5000 });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.equal(child.signal, null);
});
