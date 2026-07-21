import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-route-manifest.json');
const outDir = path.join(repoRoot, 'artifacts', 'crowdfunding-route-matrix');
const baseUrl = (process.env.URAI