"use strict";

const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { test } = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");

const sourceRoot = path.resolve(__dirname, "..");
assert.equal(process.env.URAI_LEGACY_TOOLING_QUARANTINE, "1", "Legacy generic API proof must use the explicit standalone nonproduction fixture");
const bounded = Boolean(process.env.URAI_BRACES_CONSUMER_ROOT);
const installedRoot = bounded ? path.resolve(process.env.URAI_BRACES_CONSUMER_ROOT) : sourceRoot;
const rootRequire = createRequire(path.join(installedRoot, "package.json"));
const cliPath = bounded ? process.env.URAI_BRACES_FIREBASE_CLI_PACKAGE : rootRequire.resolve("firebase-tools/package.json");
assert.ok(cliPath, "bounded proof requires the actual installed Firebase CLI package metadata");
const cliManifest = JSON.parse(fs.readFileSync(cliPath, "utf8"));
const cliRequire = createRequire(cliPath);
const watcherRequire = createRequire((bounded ? rootRequire : cliRequire).resolve("chokidar/package.json"));
const nextRequire = createRequire(rootRequire.resolve("@next/eslint-plugin-next/package.json"));
const globRequire = createRequire(nextRequire.resolve("fast-glob/package.json"));
const matchRequire = createRequire(globRequire.resolve("micromatch/package.json"));
const consumers = [["direct", rootRequire], ["Firebase CLI delegated watcher", watcherRequire], ["Next ESLint delegated matcher", matchRequire]];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const guard = error => error instanceof RangeError && /supported depth of 64/.test(error.message);

console.log(JSON.stringify({ measurement: "QUARANTINED_LEGACY_SOURCE_API_WITH_AUTHENTICATED_ORIGINAL_CLI_METADATA", rawAdvisory: "GHSA-vfj7-8cjw-p6xm", advisoryWaiver: false, node: process.version, wholeRepositoryBuildClaim: false, upstreamFixedReleaseClaim: false }));

test("quarantined locked tooling retains the original generic consumer versions", () => {
  assert.equal(cliManifest.version, "15.32.1");
  assert.equal(cliManifest.dependencies.chokidar, "^3.6.0");
  assert.equal(watcherRequire("./package.json").version, "3.6.0-urai.spatial.1");
  assert.equal(watcherRequire("./package.json").license, "MIT");
  assert.equal(digest(fs.readFileSync(watcherRequire.resolve("./index.js"))), digest(fs.readFileSync(path.join(sourceRoot, "vendor/chokidar/index.js"))));
  assert.equal(nextRequire("./package.json").version, "15.5.27");
  assert.equal(globRequire("./package.json").version, "3.3.1");
  assert.equal(matchRequire("./package.json").version, "4.0.8");
});

for (const [name, requireConsumer] of consumers) {
  const braces = requireConsumer("braces");
  test(`${name}: the exact installed fork and license match this source`, () => {
    const packagePath = requireConsumer.resolve("braces/package.json");
    const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    assert.equal(manifest.version, "3.0.3-urai.spatial.1");
    assert.equal(manifest.license, "MIT");
    for (const file of ["LICENSE", "index.js", "lib/constants.js", "lib/parse.js", "lib/compile.js", "lib/expand.js", "lib/stringify.js", "lib/utils.js"]) {
      assert.equal(digest(fs.readFileSync(path.join(path.dirname(packagePath), file))), digest(fs.readFileSync(path.join(sourceRoot, "vendor/braces", file))), file);
    }
  });
  test(`${name}: normal escaped patterns and numeric expansion retain behavior`, () => {
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
  test(`${name}: hostile braces, parentheses and option overrides cannot raise the fixed ceiling`, () => {
    for (const method of ["parse", "compile", "expand", "stringify"]) {
      for (const [open, close] of [["{", "}"], ["(", ")"]]) {
        const input = open.repeat(4000) + "x" + close.repeat(4000);
        assert.throws(() => braces[method](input, { maxDepth: Infinity, maxLength: Infinity }), guard, method);
      }
    }
  });
  test(`${name}: direct caller AST depth and child cycles remain bounded`, () => {
    let ast = { type: "text", value: "leaf" };
    for (let depth = 0; depth < 4000; depth++) ast = { type: "root", nodes: [ast] };
    for (const method of ["compile", "expand", "stringify"]) assert.throws(() => braces[method](ast), guard, method);
    const cycle = { type: "root", nodes: [] }; cycle.nodes.push(cycle);
    for (const method of ["compile", "expand", "stringify"]) assert.throws(() => braces[method](cycle), guard, method);
  });
}

test("all public paths reject depth before exhausting a small process stack", () => {
  const entry = rootRequire.resolve("braces");
  const child = spawnSync(process.execPath, ["--stack-size=256", "-e", `const a=require('node:assert/strict');const b=require(${JSON.stringify(entry)});for(const m of ['parse','compile','expand','stringify'])a.throws(()=>b[m]('('.repeat(4000)+'x'+')'.repeat(4000)),e=>e instanceof RangeError&&/supported depth of 64/.test(e.message));`], { encoding: "utf8", timeout: 5000 });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.equal(child.signal, null);
});

test("the actual Next ESLint fast-glob and micromatch leaves select real files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "urai-braces-glob-"));
  try {
    fs.mkdirSync(path.join(dir, "src"));
    for (const file of ["a.ts", "b.tsx", "c.css"]) fs.writeFileSync(path.join(dir, "src", file), "synthetic local fixture");
    assert.deepEqual(globRequire("fast-glob").sync("src/**/*.{ts,tsx}", { cwd: dir }).sort(), ["src/a.ts", "src/b.tsx"]);
    assert.deepEqual(globRequire("micromatch")(["src/a.ts", "src/b.tsx", "src/c.css"], "src/**/*.{ts,tsx}"), ["src/a.ts", "src/b.tsx"]);
    const { rules } = nextRequire("@next/eslint-plugin-next");
    assert.equal(typeof rules["no-html-link-for-pages"].create, "function");
    fs.mkdirSync(path.join(dir, "packages/ui/pages"), { recursive: true });
    fs.writeFileSync(path.join(dir, "packages/ui/pages/about.tsx"), "export default function Page() { return null }");
    const reports = [];
    const context = { options: [], cwd: dir, settings: { next: { rootDir: path.join(dir, "packages/{ui,unused}") } }, report(value) { reports.push(value); } };
    const listener = rules["no-html-link-for-pages"].create(context);
    assert.equal(typeof listener.JSXOpeningElement, "function");
    listener.JSXOpeningElement({ name: { name: "a" }, attributes: [{ type: "JSXAttribute", name: { name: "href" }, value: { type: "Literal", value: "/about" } }] });
    assert.equal(reports.length, 1);
    assert.match(reports[0].message, /Use.*Link/);
    assert.throws(() => rules["no-html-link-for-pages"].create({ ...context, settings: { next: { rootDir: "{a,".repeat(2400) + "b" + "}".repeat(2400) } } }), guard);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the actual Firebase delegated watcher preserves brace file discovery and closes", { timeout: 5000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "urai-braces-watch-"));
  const chokidar = watcherRequire("./index.js");
  const watcher = chokidar.watch(path.join(dir, "*.{ts,tsx}"), { ignoreInitial: false, persistent: false });
  const files = [];
  watcher.on("add", file => files.push(path.basename(file)));
  try {
    fs.writeFileSync(path.join(dir, "a.ts"), "synthetic local fixture");
    fs.writeFileSync(path.join(dir, "b.tsx"), "synthetic local fixture");
    fs.writeFileSync(path.join(dir, "c.css"), "synthetic local fixture");
    await new Promise((resolve, reject) => { watcher.once("ready", resolve); watcher.once("error", reject); });
    assert.deepEqual(files.sort(), ["a.ts", "b.tsx"]);
  } finally { await watcher.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  const hostile = chokidar.watch("{a,".repeat(2400) + "b" + "}".repeat(2400), { persistent: false });
  try {
    const error = await new Promise(resolve => hostile.once("error", resolve));
    assert.equal(guard(error), true, "public watcher must report the original bounded error");
    assert.equal(hostile._readyEmitted, false);
  } finally { await hostile.close(); }
});

for (const closeEarly of [false, true]) {
  test(`retained FSEvents source error channel handles a synthetic rejected promise; closeEarly=${closeEarly}`, () => {
    const entry = watcherRequire.resolve("./index.js");
    // This bounded private-handler fixture checks only the source error channel.
    // It neither exercises the real FSEvents handler nor grants native acceptance.
    // Genuine native failure logs establish applicability; the original watcher
    // case and successor macOS CI remain the native backend authority.
    const script = `
      const assert=require('node:assert/strict');
      const sdk=require(${JSON.stringify(entry)});
      const watcher=new sdk.FSWatcher({persistent:false,useFsEvents:false});
      watcher.options={...watcher.options,useFsEvents:true};
      assert.equal(watcher.options.useFsEvents,true);
      let branchCalls=0,errors=0;
      const rejection=new Error('Synthetic retained FSEvents rejection');
      watcher._fsEventsHandler={_addToFsEvents(){branchCalls++;return Promise.reject(rejection)}};
      watcher.on('ready',()=>{throw Error('Rejected input cannot emit ready')});
      watcher.on('error',async error=>{
        assert.equal(error,rejection);
        assert.equal(watcher._readyEmitted,false);assert.equal(${closeEarly},false);
        errors++;await watcher.close();
      });
      watcher.add('synthetic-source-only.txt');
      if(${closeEarly})watcher.close();
      setImmediate(()=>{
        assert.equal(branchCalls,1);assert.equal(errors,${closeEarly ? 0 : 1});
        assert.equal(watcher.closed,true);
        console.log('retained source error channel PASS; synthetic private-handler fixture only');
      });
    `;
    const child=spawnSync(process.execPath,["--unhandled-rejections=strict","-e",script],{encoding:"utf8",timeout:5000});
    assert.equal(child.status,0,child.stdout+child.stderr);
    assert.equal(child.signal,null);
    assert.match(child.stdout,/retained source error channel PASS/);
  });
}
