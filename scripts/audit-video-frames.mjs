import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const input = process.argv[2];
const outDir = process.argv[3] || 'artifacts/video-frame-audit';

if (!input) {
  console.error('Usage: node scripts/audit-video-frames.mjs <recording.webm|mp4> [outDir]');
  process.exit(2);
}

if (!existsSync(input)) {
  console.error(`Video not found: ${input}`);
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status})\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function commandExists(command) {
  const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

if (!commandExists('ffprobe') || !commandExists('ffmpeg')) {
  console.error('ffmpeg and ffprobe are required for frame extraction. Install ffmpeg or run this in CI with ffmpeg available.');
  process.exit(2);
}

const probeRaw = run('ffprobe', [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=avg_frame_rate,duration,width,height,nb_frames',
  '-of', 'json',
  input,
]);

const probe = JSON.parse(probeRaw);
const stream = probe.streams?.[0] || {};
const duration = Number(stream.duration || 0);
const frameEverySeconds = Number(process.env.URAI_VIDEO_FRAME_INTERVAL_SECONDS || 0.25);
const framePattern = path.join(outDir, 'frame-%05d.png');
const scenePattern = path.join(outDir, 'scene-%05d.png');

run('ffmpeg', [
  '-y',
  '-i', input,
  '-vf', `fps=1/${frameEverySeconds}`,
  framePattern,
]);

run('ffmpeg', [
  '-y',
  '-i', input,
  '-vf', "select='gt(scene,0.18)',showinfo",
  '-vsync', 'vfr',
  scenePattern,
]);

const timeline = [];
const totalSamples = Math.max(1, Math.ceil(duration / frameEverySeconds));
for (let i = 0; i < totalSamples; i += 1) {
  timeline.push({
    frame: `frame-${String(i + 1).padStart(5, '0')}.png`,
    timestampSeconds: Number((i * frameEverySeconds).toFixed(2)),
    screenOrState: 'UNKNOWN - classify during audit',
    userAction: 'UNKNOWN - infer from recording or trace',
    expectedBehavior: 'Compare against Home, Ascent, Life Map, Focus, Replay, Mirror lock matrix',
    observedBehavior: 'PENDING_REVIEW',
    status: 'UNKNOWN',
    issueOrAction: 'Review this frame and adjacent transition frames',
  });
}

const report = {
  input,
  outDir,
  probe: stream,
  frameEverySeconds,
  requiredAudit: [
    'Screen-to-screen transitions',
    'Camera movement',
    'Return movement',
    'ESC unwind behavior',
    'Animation timing',
    'Jank, stutter, lag, or dropped frames',
    'UI flicker',
    'Layout shift during transitions',
    'Loading state flashes',
    'Broken hover/click/tap states',
    'Navigation race conditions',
    'State loss between screens',
    'Unexpected resets',
    'Incorrect back-stack behavior',
    'Incorrect deep-link or return behavior',
  ],
  timeline,
};

writeFileSync(path.join(outDir, 'video-frame-audit-template.json'), JSON.stringify(report, null, 2));
writeFileSync(path.join(outDir, 'README.md'), `# URAI Spatial Video Frame Audit\n\nInput: ${input}\n\nFrames were extracted every ${frameEverySeconds}s. Scene-change frames were also extracted using ffmpeg scene detection. Fill out video-frame-audit-template.json with the strict pass/fail/unknown audit.\n`);
console.log(`Video frame audit assets written to ${outDir}`);
