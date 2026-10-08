import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {installedGraph} from './check-installed-reviewed-advisories.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const importerPaths = ['.', 'urai-tier1', 'apps/functions', 'packages/tier-locks', 'packages/release-tools', 'distribution/android-shell', 'distribution/ios-shell'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function workspaceGraph() {
  const patterns = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8').split('\n').filter(line => /^  - /.test(line)).map(line => JSON.parse(line.slice(4)));
  const expected = [...importerPaths.slice(1), '!**/_audit/**', '!**/.next/**'];
  if (JSON.stringify(patterns) !== JSON.stringify(expected)) throw new Error('Workspace scope changed; all actual importers must be explicitly verified');
  return installedGraph(root, importerPaths);
}
export function resolveConsumers() {
  const rootRequire = createRequire(path.join(root, 'package.json'));
  const nextRequire = createRequire(path.join(root, 'urai-tier1/package.json'));
  // The actual consumer declares eslint-config-next; its plugin is a dependency
  // of that config rather than a direct application dependency under PNPM.
  const configRequire = createRequire(nextRequire.resolve('eslint-config-next/package.json'));
  return {
    firebase: path.dirname(rootRequire.resolve('firebase-tools/package.json')),
    next: path.dirname(configRequire.resolve('@next/eslint-plugin-next/package.json')),
    eslint: nextRequire('eslint'),
  };
}
export function verifyConsumerSource(consumers = resolveConsumers()) {
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'patches/spatial-maintained-tooling-provenance.json')));
  for (const consumer of provenance.consumers) {
    const dir = consumer.name === 'firebase-tools' ? consumers.firebase : consumers.next;
    for (const [relative, expected] of Object.entries(consumer.installedSourceSha256)) {
      if (sha256(fs.readFileSync(path.join(dir, relative))) !== expected) throw new Error('Consumer source drift: ' + consumer.name + '/' + relative);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
    if (manifest.name !== consumer.name || manifest.version !== consumer.version) throw new Error('Unexpected consumer version');
  }
  return provenance;
}

export function resolveDeclaredPackageManifest(requireConsumer, name, expectedVersion) {
  if (!/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name) || !expectedVersion) throw new Error('Invalid expected package identity');
  const boundary = fs.realpathSync(root);
  const inside = file => file === boundary || file.startsWith(boundary + path.sep);
  const entry = fs.realpathSync(requireConsumer.resolve(name));
  if (!inside(entry)) throw new Error('Resolved dependency is outside current checkout: ' + name);
  let directory = path.dirname(entry);
  while (inside(directory) && directory !== boundary) {
    const manifestPath = path.join(directory, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const actualPath = fs.realpathSync(manifestPath);
      if (!inside(actualPath) || !fs.statSync(actualPath).isFile()) throw new Error('Dependency manifest is outside current checkout: ' + name);
      const manifest = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
      if (manifest.name !== undefined) {
        if (manifest.name !== name || manifest.version !== expectedVersion) throw new Error('Unexpected dependency identity: ' + name + '@' + manifest.version);
        return {path: actualPath, manifest, entry};
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('Actual resolved dependency manifest is missing: ' + name);
}

export function originalBaselineRequire(originalRoot, manifestPath, identities) {
  const boundary = fs.realpathSync(path.resolve(originalRoot));
  const inside = file => file.startsWith(boundary + path.sep);
  const manifest = fs.realpathSync(path.resolve(manifestPath));
  if (!inside(manifest) || !fs.statSync(manifest).isFile() || !identities.length) throw new Error('Explicit original public baseline authority required');
  const requireBaseline = createRequire(manifest);
  for (const [requestName, name, version] of identities) {
    const metadataPath = fs.realpathSync(requireBaseline.resolve(requestName + '/package.json'));
    const entryPath = fs.realpathSync(requireBaseline.resolve(requestName));
    if (!inside(metadataPath) || !inside(entryPath)) throw new Error('Original public package resolved outside baseline: ' + requestName);
    const actual = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (actual.name !== name || actual.version !== version) throw new Error('Original public package identity mismatch: ' + requestName);
  }
  return requireBaseline;
}

// Every literal registry and local/file package participates in the advisory census.
// File forks use authenticated canonical upstream identity as well as their actual
// installed identity; a prerelease or directory specifier cannot hide an advisory.
export function literalLockGraph(lock, semver, sourceRoot, allowRetainedLegacy = false) {
  if (!lock.packages || typeof lock.packages !== 'object' || Array.isArray(lock.packages)) throw new Error('Complete literal package inventory required');
  const localSources = [];
  const nodes = Object.keys(lock.packages).map(spec => {
    const at = spec.lastIndexOf('@');
    const name = spec.slice(0, at); let version = spec.slice(at + 1);
    if (at <= 0 || !name) throw new Error('Malformed literal package identity: ' + spec);
    if (version.startsWith('file:')) {
      if (!allowRetainedLegacy || !['braces@file:vendor/braces','chokidar@file:vendor/chokidar'].includes(spec)) throw new Error('Unreviewed local/file dependency: ' + spec);
      const dir = path.join(sourceRoot, version.slice(5));
      const actual = JSON.parse(fs.readFileSync(path.join(dir,'package.json')));
      const original = JSON.parse(fs.readFileSync(path.join(dir,'UPSTREAM-PROVENANCE.json')));
      version = original.version ?? original.upstreamVersion;
      if (actual.name !== name || original.package !== name || actual.license !== 'MIT' || !semver.valid(version)) throw new Error('Invalid retained source provenance: ' + spec);
      localSources.push({specifier:spec,name,actualVersion:actual.version,canonicalUpstreamVersion:version,license:actual.license,scope:'quarantined nonproduction',securityWaiver:false});
    }
    if (!semver.valid(version)) throw new Error('Unsupported literal package identity: ' + spec);
    return {name,version,packagePath:'literal complete frozen lock',sourcePaths:[['literal complete frozen lock',spec]]};
  });
  return {nodes,problems:[],localSources};
}
