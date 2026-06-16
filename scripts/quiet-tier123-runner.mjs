const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const ts = new Date().toISOString().replace(/[-:]/g,'').replace(/\..+/, 'Z');
const logDir = path.join('docs','release-evidence',ts);
fs.mkdirSync(logDir,{recursive:true});

function run(name, cmd, args, opts={}) {
  const file = path.join(logDir, `${name}.log`);
  const started = new Date().toISOString();

  let res;
  try {
    res = cp.spawnSync(cmd, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CI: '1',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
      shell: false,
      timeout: opts.timeout || 1000 * 60 * 20
    });
  } catch (e) {
    fs.writeFileSync(file, `START ${started}\nERROR\n${e.stack || e}\n`);
    fs.writeFileSync(path.join(logDir, `${name}.exit`), '999');
    console.log(`${name}: 999`);
    return 999;
  }

  const code = res.status === null ? 998 : res.status;

  fs.writeFileSync(file, [
    `START ${started}`,
    `COMMAND ${cmd} ${args.join(' ')}`,
    `EXIT ${code}`,
    `SIGNAL ${res.signal || ''}`,
    '',
    'STDOUT',
    res.stdout || '',
    '',
    'STDERR',
    res.stderr || ''
  ].join('\n'));

  fs.writeFileSync(path.join(logDir, `${name}.exit`), String(code));
  console.log(`${name}: ${code}`);
  return code;
}

let pkg = {};
try {
  pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
} catch {}

const scripts = pkg.scripts || {};

let pm = 'pnpm';
let pmPrefix = [];

const pnpmCheck = cp.spawnSync('pnpm', ['-v'], {
  encoding: 'utf8',
  shell: false
});

if (pnpmCheck.status !== 0) {
  pm = 'corepack';
  pmPrefix = ['pnpm'];
}

fs.writeFileSync(path.join(logDir, 'BASELINE.txt'), [
  `timestamp=${ts}`,
  `cwd=${process.cwd()}`,
  `node=${process.version}`,
  `packageManager=${pkg.packageManager || ''}`,
  `scripts=${Object.keys(scripts).sort().join(',')}`
].join('\n'));

run('git-status', 'git', ['status','--short'], { timeout: 60000 });
run('git-branch', 'git', ['branch','--show-current'], { timeout: 60000 });
run('git-head', 'git', ['rev-parse','HEAD'], { timeout: 60000 });

const checks = [
  ['check-source-integrity', ['check:source-integrity']],
  ['check-production-routes', ['check:production-routes']],
  ['check-spatial-copy', ['check:spatial-copy']],
  ['lint', ['lint']],
  ['typecheck', ['typecheck']],
  ['test', ['test']],
  ['build-urai-tier1', ['--filter','urai-tier1','build']]
];

const results = [];

for (const [name, args] of checks) {
  const first = args[0];

  if (first.startsWith('check:') && !scripts[first]) {
    fs.writeFileSync(path.join(logDir, `${name}.log`), `SKIPPED: missing package script ${first}\n`);
    fs.writeFileSync(path.join(logDir, `${name}.exit`), '777');
    console.log(`${name}: 777 skipped`);
    results.push([name, 777]);
    continue;
  }

  if (!first.startsWith('--') && !first.startsWith('check:') && !scripts[first]) {
    fs.writeFileSync(path.join(logDir, `${name}.log`), `SKIPPED: missing package script ${first}\n`);
    fs.writeFileSync(path.join(logDir, `${name}.exit`), '777');
    console.log(`${name}: 777 skipped`);
    results.push([name, 777]);
    continue;
  }

  const code = run(name, pm, [...pmPrefix, ...args]);
  results.push([name, code]);
}

const firstFail = results.find(([, code]) => code !== 0 && code !== 777);

const summary = [
  'URAI Spatial Tier-One / Tier-Two / Tier-Three quiet verification runner',
  `timestamp=${ts}`,
  `logDir=${logDir}`,
  '',
  ...results.map(([name, code]) => `${name}=${code}`),
  '',
  firstFail ? `FIRST_REAL_FAILURE=${firstFail[0]}` : 'FIRST_REAL_FAILURE=none'
].join('\n');

fs.writeFileSync(path.join(logDir, 'SUMMARY.txt'), summary);

fs.writeFileSync('docs/TIER_1_2_3_RELEASE_EVIDENCE.md', `# URAI Spatial Tier-One / Tier-Two / Tier-Three Release Evidence

Generated: ${ts}

## Latest evidence folder

\`${logDir}\`

## Verification results

${results.map(([name, code]) => `- ${name}: ${code}`).join('\n')}

## First real failure

${firstFail ? firstFail[0] : 'none'}

## Production safety lock

Tier-Three remains production-gated unless provider wiring, consent handling, tests, build output, deploy output, and live smoke evidence prove live readiness.

This evidence file does not claim live XR, AR, VR, Quest, VisionOS, biometric, memory-grounded provider, real-time world sync, or real-time asset-provider capability by itself.
`);

console.log('');
console.log(summary);
