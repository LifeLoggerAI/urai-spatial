
const assert = require('assert');
const { execSync } = require('child_process');
const { promises: fs, existsSync } = require('fs');
const { join, dirname } = require('path');

describe('Asset Pipeline Determinism', () => {
  const inputFile = 'tests/pipeline/test-asset.gltf';
  const tempOutputDir = 'tests/pipeline/temp_build';

  // Helper to run build and get hash
  const getBuildHash = () => {
    const output = execSync(`node scripts/build_asset.mjs ${inputFile} ${tempOutputDir}`).toString();
    const match = output.match(/Build Hash: (\w+)/);
    if (!match) {
      throw new Error('Could not find build hash in script output.');
    }
    return match[1];
  };

  // Clean up before and after
  beforeEach(async () => {
    if (existsSync(tempOutputDir)) {
      await fs.rm(tempOutputDir, { recursive: true, force: true });
    }
  });

  after(async () => {
    if (existsSync(tempOutputDir)) {
        await fs.rm(tempOutputDir, { recursive: true, force: true });
    }
    const defaultBuildDir = join(dirname(inputFile), 'build');
    if (existsSync(defaultBuildDir)) {
        await fs.rm(defaultBuildDir, { recursive: true, force: true });
    }
  });

  it('should produce the same build hash for the same input file across multiple runs', () => {
    console.log('Running first build...');
    const hash1 = getBuildHash();
    console.log(`First hash: ${hash1}`);

    // Clean and run again
    console.log('Running second build...');
    const hash2 = getBuildHash();
    console.log(`Second hash: ${hash2}`);

    assert.strictEqual(hash1, hash2, 'Build hashes should be identical');
  });
});
