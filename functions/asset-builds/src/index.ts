
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Document, NodeIO } from '@gltf-transform/core';
import { allExtensions } from '@gltf-transform/extensions';
import { dedup, resample, prune, textureResize, draco } from '@gltf-transform/functions';
import dracowasm from 'draco3dgltf';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();
const PIPELINE_VERSION = '1';

export const buildAsset = functions.storage.object().onFinalize(async (object) => {
  const { name: filePath, bucket: fileBucket, contentType } = object;

  // 1. Validate file path and type.
  if (!contentType?.startsWith('model/gltf') && !filePath?.endsWith('.glb') && !filePath?.endsWith('.gltf')) {
    console.log(`Skipping non-glTF file: ${filePath}`);
    return null;
  }
  
  const parts = filePath.split('/');
  if (parts.length < 5 || parts[parts.length - 2] !== 'raw') {
      console.log(`Skipping file not in a 'raw' directory: ${filePath}`);
      return null;
  }
  const [_, project, assetId, version] = parts;
  const assetKey = `${project}/${assetId}/${version}`;
  const jobId = functions.config().execution_id || `local-${Date.now()}`;

  // 2. Set initial job status in Firestore.
  const jobRef = db.doc(`assetBuildJobs/${jobId}`);
  await jobRef.set({
      assetKey,
      status: 'running',
      filePath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 3. Download the source asset.
  const localPath = join(tmpdir(), filePath.split('/').pop());
  await bucket.file(filePath).download({ destination: localPath });
  const originalContent = await fs.readFile(localPath);

  // 4. Optimize the glTF asset.
  try {
    const io = new NodeIO()
        .registerExtensions(allExtensions)
        .registerDependencies({ 'draco3d.decoder': await dracowasm.createDecoderModule(), 'draco3d.encoder': await dracowasm.createEncoderModule() });
    
    const document = await io.read(localPath);
    await document.transform(
        // Basic cleanup
        prune(),
        dedup(),
        // Optimization
        resample(),
        textureResize({size: [1024, 1024]}),
        draco()
    );
    
    const optimizedContent = await io.writeBinary(document);

    // 5. Calculate hashes and create manifest.
    const originalHash = createHash('sha256').update(originalContent).digest('hex');
    const buildHash = createHash('sha256').update(optimizedContent).digest('hex');
    const buildOutputPath = `assetBuilds/${assetKey}/${buildHash}`;
    
    const manifest = {
        pipelineVersion: PIPELINE_VERSION,
        buildHash,
        originalHash,
        inputs: { [filePath]: originalHash },
        outputs: {
            'model.glb': {
                hash: buildHash,
                size: optimizedContent.length,
                mime: 'model/gltf-binary'
            }
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 6. Upload build outputs and manifest.
    const buildFile = bucket.file(`${buildOutputPath}/model.glb`);
    await buildFile.save(optimizedContent, { contentType: 'model/gltf-binary' });

    const manifestFile = bucket.file(`${buildOutputPath}/manifest.json`);
    await manifestFile.save(JSON.stringify(manifest, null, 2), { contentType: 'application/json' });

    // 7. Update Firestore records.
    const buildRef = db.doc(`assetBuilds/${assetKey}:${buildHash}`);
    await buildRef.set(manifest);

    await jobRef.update({ status: 'completed', buildRef: buildRef.path });

    return console.log(`Successfully built asset: ${assetKey}`);

  } catch (error) {
    console.error(`Failed to build asset: ${assetKey}`, error);
    await jobRef.update({ status: 'failed', error: error.message });
    return null;
  }
});
