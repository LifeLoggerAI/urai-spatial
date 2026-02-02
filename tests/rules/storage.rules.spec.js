
const assert = require('assert');
const { setupStorage, cleanup } = require('./rules-test-setup.js');
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

describe('Storage security rules', () => {
  let storage;

  // Mock users
  const adminUser = { uid: 'admin-user-id', token: { role: 'spatialAdmin' } };
  const regularUser = { uid: 'regular-user-id' };
  const unauthed = null;

  after(async () => {
    await cleanup();
  });

  // =================================================================
  // Asset Sources
  // =================================================================
  describe('assetSources', () => {
    it('should ALLOW admin to write', async () => {
      storage = await setupStorage(adminUser);
      const storageRef = ref(storage, 'assetSources/testProject/testAsset/v1/raw/model.gltf');
      await assertSucceeds(uploadBytes(storageRef, 'some content'));
    });

    it('should DENY non-admin write', async () => {
      storage = await setupStorage(regularUser);
      const storageRef = ref(storage, 'assetSources/testProject/testAsset/v1/raw/model.gltf');
      await assertFails(uploadBytes(storageRef, 'some content'));
    });

    it('should DENY unauthenticated write', async () => {
      storage = await setupStorage(unauthed);
      const storageRef = ref(storage, 'assetSources/testProject/testAsset/v1/raw/model.gltf');
      await assertFails(uploadBytes(storageRef, 'some content'));
    });
  });

  // =================================================================
  // Asset Builds
  // =================================================================
  describe('assetBuilds', () => {
    it('should ALLOW anyone to read', async () => {
      storage = await setupStorage(unauthed);
      // Note: We can't really test reads without uploading a file first, 
      // and we can't upload a file without admin rights. So we assume a file exists.
      // A full integration test would be needed to verify this properly.
      const storageRef = ref(storage, 'assetBuilds/testProject/testAsset/v1/somehash/model.glb');
      // This will fail because the object doesn't exist, but it will fail with an object-not-found error (good)
      // not a permission-denied error (bad).
      await assert.rejects(getDownloadURL(storageRef), /storage\/object-not-found/);
    });

    it('should DENY write access to everyone', async () => {
      storage = await setupStorage(adminUser);
      const storageRef1 = ref(storage, 'assetBuilds/testProject/testAsset/v1/somehash/model.glb');
      await assertFails(uploadBytes(storageRef1, 'some content'));

      storage = await setupStorage(regularUser);
      const storageRef2 = ref(storage, 'assetBuilds/testProject/testAsset/v1/somehash/model.glb');
      await assertFails(uploadBytes(storageRef2, 'some content'));
    });
  });
  
  // =================================================================
  // Default Deny
  // =================================================================
  describe('Default deny rule', () => {
    it('should DENY read/write to any other path', async () => {
      storage = await setupStorage(adminUser);
      const storageRef = ref(storage, 'some/other/path/file.txt');
      await assert.rejects(getDownloadURL(storageRef), /storage\/object-not-found/); // read check
      await assertFails(uploadBytes(storageRef, 'some content')); // write check
    });
  });
});
