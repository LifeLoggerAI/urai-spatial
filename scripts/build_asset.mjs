
import { NodeIO } from '@gltf-transform/core';
import { allExtensions } from '@gltf-transform/extensions';
import { dedup, resample, prune, textureResize, draco } from '@gltf-transform/functions';
import dracowasm from 'draco3dgltf';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

const PIPELINE_VERSION = '1';

async function buildLocalAsset(inputPath, outputPath) {
  console.log(`Building asset from: ${inputPath}`);

  // 1. Read the source asset.
  const originalContent = await fs.readFile(inputPath);

  // 2. Optimize the glTF asset.
  const io = new NodeIO()
      .registerExtensions(allExtensions)
      .registerDependencies({ 'draco3d.decoder': await dracowasm.createDecoderModule(), 'draco3d.encoder': await dracowasm.createEncoderModule() });
  
  const document = await io.read(inputPath);
  await document.transform(
      prune(),
      dedup(),
      resample(),
      textureResize({size: [1024, 1024]}),
      draco()
  );
  
  const optimizedContent = await io.writeBinary(document);

  // 3. Calculate hashes and create manifest.
  const originalHash = createHash('sha256').update(originalContent).digest('hex');
  const buildHash = createHash('sha256').update(optimizedContent).digest('hex');
  
  const manifest = {
      pipelineVersion: PIPELINE_VERSION,
      buildHash,
      originalHash,
      inputs: { [inputPath]: originalHash },
      outputs: {
          'model.glb': {
              hash: buildHash,
              size: optimizedContent.length,
              mime: 'model/gltf-binary'
          }
      },
      createdAt: new Date().toISOString()
  };

  // 4. Write build outputs and manifest.
  const outputDir = outputPath || join(dirname(inputPath), 'build', buildHash);
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(join(outputDir, 'model.glb'), optimizedContent);
  await fs.writeFile(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Successfully built asset. Output at: ${outputDir}`);
  console.log(`Build Hash: ${buildHash}`);
}

// Command-line execution
if (process.argv.length < 3) {
  console.error('Usage: node scripts/build_asset.mjs <path-to-gltf-file> [output-path]');
  process.exit(1);
}

buildLocalAsset(process.argv[2], process.argv[3]).catch(err => {
    console.error('Asset build failed:', err);
    process.exit(1);
});
