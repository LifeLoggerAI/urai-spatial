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
