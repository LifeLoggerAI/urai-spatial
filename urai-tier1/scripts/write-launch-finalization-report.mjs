import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(process.cwd(), '..')
const receiptDir = process.env.URAI_RECEIPT_DIR || path.join(root, 'docs', 'receipts', `launch-finalization-${new Date().toISOString().replace(/[:.]/g, '-')}`)

fs.mkdirSync(receiptDir, { recursive: true })

function run(name, command, args) {
  const started = new Date().toISOString()
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  })

  const output = [
    `$ ${[command, ...args].join(' ')}`,
    '',
    result.stdout || '',
    result.stderr ? `\n[stderr]\n${result.stderr}` : '',
  ].join('\n')

  fs.writeFileSync(path.join(receiptDir, `${name}.log`), output)

  return {
    name,
    command: [command, ...args].join(' '),
    started,
    completed: new Date().toISOString(),
    exitCode: result.status ?? 1,
    signal: result.signal,
    log: path.relative(root, path.join(receiptDir, `${name}.log`)),
  }
}

const checks = [
  ['01-typecheck', 'corepack', ['pnpm', 'run', 'typecheck']],
  ['02-build', 'corepack', ['pnpm', 'run', 'build']],
  ['03-route-audit', 'corepack', ['pnpm', 'run', 'audit:routes']],
  ['04-tier1-verify', 'corepack', ['pnpm', 'run', 'tier1:verify']],
  ['05-tier5-verify', 'corepack', ['pnpm', 'run', 'tier5:verify']],
  ['06-launch-truth-live', 'corepack', ['pnpm', 'run', 'audit:launch-truth-live']],
]

const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
const gitStatus = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).stdout

const results = checks.map(([name, command, args]) => run(name, command, args))
const allGreen = results.every((result) => result.exitCode === 0)

const report = {
  generated: new Date().toISOString(),
  repository: 'LifeLoggerAI/urai-spatial',
  runtimeRoot: 'urai-tier1',
  gitHead,
  gitStatus,
  receiptDir: path.relative(root, receiptDir),
  allGreen,
  results,
  finalBlockers: ['verification', 'deployment identity', 'route parity', 'final public clarity'],
  note: 'This report verifies source/build/route/launch-truth checks. Production certification still requires exact deployed SHA, rollback SHA, deployment receipt, and screenshot evidence.',
}

fs.writeFileSync(path.join(receiptDir, 'launch-finalization-report.json'), `${JSON.stringify(report, null, 2)}\n`)

const markdown = [
  '# URAI Launch Finalization Report',
  '',
  `Generated: ${report.generated}`,
  `Repository: ${report.repository}`,
  `Runtime root: ${report.runtimeRoot}`,
  `Git HEAD: ${report.gitHead}`,
  `All green: ${report.allGreen ? 'YES' : 'NO'}`,
  '',
  '## Git status',
  '',
  '```text',
  report.gitStatus || '(clean)',
  '```',
  '',
  '## Check results',
  '',
  '| Check | Exit | Log |',
  '| --- | ---: | --- |',
  ...report.results.map((result) => `| ${result.name} | ${result.exitCode} | ${result.log} |`),
  '',
  '## Remaining production gates',
  '',
  '- exact deployed SHA;',
  '- rollback SHA;',
  '- immutable deployment receipt;',
  '- custom-domain route parity after deploy;',
  '- desktop/mobile screenshots;',
  '- public Status updated only from evidence.',
  '',
  '## Claim boundary',
  '',
  'Do not claim production certification unless this report is green and the production gates above are also recorded.',
  '',
].join('\n')

fs.writeFileSync(path.join(receiptDir, 'launch-finalization-report.md'), markdown)
console.log(markdown)

if (!allGreen) {
  process.exitCode = 1
}
