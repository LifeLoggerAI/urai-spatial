import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const p = path.join(root, 'operations', 'presentation');
const required = [
  'zero-budget-parallel-pack-2026-08-14.json',
  'URAI_ZERO_BUDGET_PARALLEL_PACK.md',
  'urai-system-glyphs.svg',
  'launch-surface-matrix.csv',
  'brand-tokens.json',
  'surface-presets.json',
  'capture-receipt.schema.json',
  'pack-copy.json'
];
for (const file of required) {
  if (!fs.existsSync(path.join(p, file))) throw new Error(`Missing presentation pack file: ${file}`);
}
const registry = JSON.parse(fs.readFileSync(path.join(p, required[0]), 'utf8'));
const presets = JSON.parse(fs.readFileSync(path.join(p, 'surface-presets.json'), 'utf8'));
if (registry.budgetBoundary.providerCalls !== 0 || registry.budgetBoundary.spendUsd !== '0.00') throw new Error('Zero-budget boundary changed');
if (registry.budgetBoundary.paidGenerationAllowed || registry.budgetBoundary.paidRetryAllowed) throw new Error('Paid generation/retry must remain disabled');
if (registry.authority.productionMutationAllowed) throw new Error('Production mutation must remain disabled in pack lane');
if (registry.systems.length < 29) throw new Error(`Expected at least 29 system identities, found ${registry.systems.length}`);
if (presets.presets.length < 10) throw new Error(`Expected at least 10 surface presets, found ${presets.presets.length}`);
for (const preset of presets.presets) {
  if (!Number.isInteger(preset.width) || !Number.isInteger(preset.height) || preset.width <= 0 || preset.height <= 0) throw new Error(`Invalid dimensions for ${preset.id}`);
}
const workflow = path.join(root, '.github', 'workflows', 'zero-budget-presentation-pack.yml');
if (fs.existsSync(workflow)) {
  const source = fs.readFileSync(workflow, 'utf8');
  for (const forbidden of ['OPENAI_API_KEY','REPLICATE_API_TOKEN','ELEVENLABS_API_KEY','STABILITY_API_KEY','FAL_KEY','firebase deploy','gcloud ']) {
    if (source.includes(forbidden)) throw new Error(`Forbidden provider/deploy marker in zero-budget workflow: ${forbidden}`);
  }
}
console.log(`PASS zero-budget presentation pack: ${registry.systems.length} systems, ${presets.presets.length} presets, spend USD 0.00`);
