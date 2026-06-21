import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.URAI_AUDIT_BASE_URL || 'https://urai.app';
const outDir = process.env.URAI_AUDIT_OUT_DIR || 'live-final-audit';

const routes = [
  ['root', '/', /Own your life|Step inside yourself|Home World|Life Map/i],
  ['home', '/home', /Own your life|Step inside yourself|Home World|Life Map/i],
  ['spatial', '/spatial', /Every star remains a door|Life Map|Focus|Replay|Spatial field/i],
  ['life-map', '/life-map', /Life Map|constellation|star|Focus|Replay/i],
  ['focus', '/focus?memoryId=quiet-reset', /Focus|memory chamber|Life Map|Replay/i],
  ['replay', '/replay?manifestId=replay-recovery-thread', /Replay|cinematic|thread|Life Map/i],
  ['mirror', '/mirror', /Mirror|pattern|reflection|Life Map/i],
  ['passport', '/passport', /Passport|Own your life|Identity|Provenance|Control/i],
  ['status', '/status', /World online|Routes alive|Smoke|Export Safe/i],
  ['privacy-controls', '/privacy-controls', /Privacy|Passport Controls|Identity|Memory access|Provenance/i],
];

const rejectedCopy = /Opening your spatial field|Opening URAI Spatial|Preparing the scene|If the field does not open|Private Field|tap the sky|quiet blue weather/i;

function absolute(route) {
  return new URL(route, baseUrl).toString();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

await fs.mkdir(outDir, { recursive: true });
const results = [];

for (const [name, route, expected] of routes) {
  const url = absolute(route);
  let status = 0;
  let text = '';
  let error = '';

  try {
    const response = await fetch(url, { redirect: 'follow' });
    status = response.status;
    text = stripHtml(await response.text());
    await fs.writeFile(path.join(outDir, `strict-text-${name}.txt`), text);
  } catch (caught) {
    error = String(caught?.message || caught);
  }

  const expectedCopyPresent = expected.test(text);
  const rejectedCopyPresent = rejectedCopy.test(text);
  const ok = status === 200 && expectedCopyPresent && !rejectedCopyPresent && !error;
  results.push({ name, route, url, status, ok, expectedCopyPresent, rejectedCopyPresent, error, textSample: text.slice(0, 1200) });
  console.log(`STRICT TEXT ${name}: status=${status} expected=${expectedCopyPresent} rejected=${rejectedCopyPresent} ok=${ok}`);
}

const failed = results.filter((result) => !result.ok);
const markdown = [
  '# URAI strict final live text gates',
  '',
  `Base URL: ${baseUrl}`,
  `Created: ${new Date().toISOString()}`,
  '',
  `- Routes audited: ${results.length}`,
  `- Failed routes: ${failed.length}`,
  '',
  '## Failed routes',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.route}: status=${item.status}, expected=${item.expectedCopyPresent}, rejected=${item.rejectedCopyPresent}, error=${item.error || 'none'}`) : ['- none']),
  '',
].join('\n');

await fs.writeFile(path.join(outDir, 'strict-text-audit.json'), JSON.stringify({ baseUrl, results, failed }, null, 2));
await fs.writeFile(path.join(outDir, 'strict-text-audit.md'), markdown);

if (failed.length) {
  console.error('URAI_STRICT_TEXT_GATES_FAILED');
  console.error(markdown);
  process.exit(1);
}

console.log('URAI_STRICT_TEXT_GATES_PASSED');
