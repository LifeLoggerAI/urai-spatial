import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

export function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
    shell: false,
  });
  return result.status === 0;
}

function expandHomePath(input) {
  if (!input) return input;
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return path.join(homedir(), input.slice(2));
  return input;
}

export function prependLdLibraryPath(libDir) {
  if (!libDir || !existsSync(libDir)) return false;
  const current = process.env.LD_LIBRARY_PATH || '';
  const parts = current.split(':').filter(Boolean);
  if (!parts.includes(libDir)) {
    process.env.LD_LIBRARY_PATH = [libDir, ...parts].join(':');
  }
  return true;
}

function findLibraryDir(root, marker) {
  if (!root || !existsSync(root)) return null;
  const stack = [root];
  let visited = 0;
  while (stack.length && visited < 12000) {
    visited += 1;
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isFile() && entry.name === marker) return current;
      if (entry.isDirectory()) stack.push(full);
    }
  }
  return null;
}

function nixOutPath(pkg) {
  if (!commandExists('nix')) return null;

  const attempts = [
    ['nix', ['eval', '--raw', `nixpkgs#${pkg}.outPath`]],
    ['nix', ['build', '--no-link', '--print-out-paths', `nixpkgs#${pkg}`]],
    ['nix-instantiate', ['--eval', '-E', `with import <nixpkgs> {}; ${pkg}.outPath`]],
  ];

  for (const [command, args] of attempts) {
    if (!commandExists(command)) continue;
    const result = spawnSync(command, args, {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false,
      encoding: 'utf8',
    });
    if (result.status !== 0 || !result.stdout) continue;
    const out = result.stdout.trim().split('\n').at(-1)?.replace(/^"|"$/g, '');
    if (out && existsSync(out)) return out;
  }

  return null;
}

function addNixLibrary(pkg, marker) {
  if (process.platform !== 'linux' || process.env.URAI_DISABLE_NIX_BROWSER_LIBS === 'true') return null;
  const outPath = nixOutPath(pkg);
  if (!outPath) return null;
  const libDir = findLibraryDir(outPath, marker);
  if (libDir && prependLdLibraryPath(libDir)) return `nix:${pkg}:${libDir}`;
  return null;
}

function addAptExtractedLibrary(pkg, marker) {
  if (process.platform !== 'linux' || process.env.URAI_DISABLE_APT_BROWSER_LIBS === 'true') return null;
  if (!commandExists('dpkg-deb')) return null;
  if (!commandExists('apt-get') && !commandExists('apt')) return null;

  const cacheRoot = path.join(process.cwd(), '.cache', 'urai-browser-libs');
  const pkgRoot = path.join(cacheRoot, pkg);
  const extractRoot = path.join(pkgRoot, 'extract');
  mkdirSync(pkgRoot, { recursive: true });
  mkdirSync(extractRoot, { recursive: true });

  const existing = findLibraryDir(extractRoot, marker);
  if (existing && prependLdLibraryPath(existing)) return `apt:${pkg}:${existing}`;

  const download = commandExists('apt-get')
    ? spawnSync('apt-get', ['download', pkg], { cwd: pkgRoot, stdio: 'ignore', shell: false })
    : spawnSync('apt', ['download', pkg], { cwd: pkgRoot, stdio: 'ignore', shell: false });
  if (download.status !== 0) return null;

  const deb = readdirSync(pkgRoot).find((name) => name.endsWith('.deb'));
  if (!deb) return null;

  const extract = spawnSync('dpkg-deb', ['-x', path.join(pkgRoot, deb), extractRoot], {
    stdio: 'ignore',
    shell: false,
  });
  if (extract.status !== 0) return null;

  const libDir = findLibraryDir(extractRoot, marker);
  if (libDir && prependLdLibraryPath(libDir)) return `apt:${pkg}:${libDir}`;
  return null;
}

export function addPortableBrowserLibraries() {
  const added = [];
  const specs = [
    { nix: 'expat', apt: 'libexpat1', marker: 'libexpat.so.1' },
  ];

  for (const spec of specs) {
    const nixAdded = addNixLibrary(spec.nix, spec.marker);
    if (nixAdded) {
      added.push(nixAdded);
      continue;
    }
    const aptAdded = addAptExtractedLibrary(spec.apt, spec.marker);
    if (aptAdded) added.push(aptAdded);
  }

  return added;
}

export function findFullChromiumExecutable() {
  const browsersDir = expandHomePath(process.env.PLAYWRIGHT_BROWSERS_PATH) || path.join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(browsersDir)) return null;

  const entries = readdirSync(browsersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const entry of entries) {
    const candidates = [
      path.join(browsersDir, entry, 'chrome-linux64', 'chrome'),
      path.join(browsersDir, entry, 'chrome-linux', 'chrome'),
      path.join(browsersDir, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join(browsersDir, entry, 'chrome-win', 'chrome.exe'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

export function chromiumLaunchOptions() {
  const configuredPath = expandHomePath(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
  const executablePath = configuredPath || findFullChromiumExecutable();
  return executablePath ? { executablePath } : {};
}

export function chromiumLaunchOptionsLiteral() {
  const configuredPath = expandHomePath(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
  const executablePath = configuredPath || findFullChromiumExecutable();
  return executablePath ? `{ headless: true, executablePath: ${JSON.stringify(executablePath)} }` : '{ headless: true }';
}
