
const assert = require('assert');
const { setup } = require('./rules-test-setup.js');
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('Firestore security rules', () => {
  let firestore;
  let testEnv;

  // Mock users
  const adminUser = { uid: 'admin-user-id', token: { role: 'spatialAdmin' } };
  const regularUser = { uid: 'regular-user-id' };
  const unauthed = null;

  // Mock data
  const mockData = {
    'scenes/scene1': { title: 'StarWorld', currentReleaseId: 'release1' },
    'sceneReleases/release1': { sceneId: 'scene1', status: 'published', manifestRef: 'manifest1' },
    'sceneReleases/release2': { sceneId: 'scene1', status: 'draft', manifestRef: 'manifest2' },
    'sceneManifests/manifest1': { releaseId: 'release1', sceneJson: '{...}' },
    'assetBuilds/build1': { status: 'completed' },
    'assetBuildJobs/job1': { status: 'running' },
  };

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // Helper to get firestore instance
  async function getFirestore(auth) {
    const env = await setup(auth, mockData);
    if (!testEnv) testEnv = env.testEnv; // Keep a reference to the environment
    return env.firestore;
  }

  // =================================================================
  // Scenes
  // =================================================================
  describe('scenes collection', () => {
    it('should ALLOW admin to read and write', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('scenes/scene1');
      await assertSucceeds(docRef.get());
      await assertSucceeds(docRef.update({ title: 'New Title' }));
    });

    it('should DENY non-admin read and write', async () => {
      firestore = await getFirestore(regularUser);
      const docRef = firestore.doc('scenes/scene1');
      await assertFails(docRef.get());
      await assertFails(docRef.update({ title: 'New Title' }));
    });

    it('should DENY unauthenticated read and write', async () => {
      firestore = await getFirestore(unauthed);
      const docRef = firestore.doc('scenes/scene1');
      await assertFails(docRef.get());
      await assertFails(docRef.update({ title: 'New Title' }));
    });
  });

  // =================================================================
  // Scene Releases
  // =================================================================
  describe('sceneReleases collection', () => {
    it('should ALLOW anyone to read a "published" release', async () => {
      firestore = await getFirestore(unauthed);
      const docRef = firestore.doc('sceneReleases/release1');
      await assertSucceeds(docRef.get());
    });

    it('should DENY anyone to read a "draft" release', async () => {
      firestore = await getFirestore(regularUser);
      const docRef = firestore.doc('sceneReleases/release2');
      await assertFails(docRef.get());
    });

    it('should ALLOW admin to read a "draft" release', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('sceneReleases/release2');
      await assertSucceeds(docRef.get());
    });

    it('should ALLOW admin to write to any release', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('sceneReleases/release1');
      await assertSucceeds(docRef.update({ status: 'rolledBack' }));
    });

    it('should DENY non-admin write access', async () => {
      firestore = await getFirestore(regularUser);
      const docRef = firestore.doc('sceneReleases/release1');
      await assertFails(docRef.update({ status: 'rolledBack' }));
    });
  });

  // =================================================================
  // Scene Manifests
  // =================================================================
  describe('sceneManifests collection', () => {
    it('should ALLOW anyone to read manifest of a "published" release', async () => {
      firestore = await getFirestore(unauthed);
      const docRef = firestore.doc('sceneManifests/manifest1');
      await assertSucceeds(docRef.get());
    });

    it('should DENY public read of manifest for a "draft" release', async () => {
        firestore = await getFirestore(unauthed);
        // This manifest is for a draft release
        const docRef = firestore.doc('sceneManifests/manifest2');
        await assertFails(docRef.get());
    });
    
    it('should ALLOW admin to read any manifest', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('sceneManifests/manifest1');
      const docRef2 = firestore.doc('sceneManifests/manifest2');
      await assertSucceeds(docRef.get());
      await assertSucceeds(docRef2.get());
    });

    it('should ALLOW admin to write to any manifest', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('sceneManifests/new-manifest');
      await assertSucceeds(docRef.set({ sceneJson: '{"foo":"bar"}' }));
    });

    it('should DENY non-admin write access', async () => {
      firestore = await getFirestore(regularUser);
      const docRef = firestore.doc('sceneManifests/new-manifest');
      await assertFails(docRef.set({ sceneJson: '{"foo":"bar"}' }));
    });
  });
  
  // =================================================================
  // Asset Builds
  // =================================================================
  describe('assetBuilds collection', () => {
    it('should ALLOW anyone to read', async () => {
      firestore = await getFirestore(unauthed);
      const docRef = firestore.doc('assetBuilds/build1');
      await assertSucceeds(docRef.get());
    });
    
    it('should DENY write access to everyone', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('assetBuilds/build1');
      await assertFails(docRef.update({ status: 'failed' }));
      
      firestore = await getFirestore(regularUser);
      const docRef2 = firestore.doc('assetBuilds/build1');
      await assertFails(docRef2.update({ status: 'failed' }));
    });
  });
  
  // =================================================================
  // Asset Build Jobs
  // =================================================================
  describe('assetBuildJobs collection', () => {
    it('should ALLOW admin to read and write', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('assetBuildJobs/job1');
      await assertSucceeds(docRef.get());
      await assertSucceeds(docRef.update({ status: 'completed' }));
    });
    
    it('should DENY non-admin read and write', async () => {
      firestore = await getFirestore(regularUser);
      const docRef = firestore.doc('assetBuildJobs/job1');
      await assertFails(docRef.get());
      await assertFails(docRef.update({ status: 'failed' }));
    });
  });
  
  // =================================================================
  // Default Deny
  // =================================================================
  describe('Default deny rule', () => {
    it('should DENY read/write to any other collection', async () => {
      firestore = await getFirestore(adminUser);
      const docRef = firestore.doc('someOtherCollection/doc1');
      await assertFails(docRef.get());
      await assertFails(docRef.set({ data: 123 }));
    });
  });

});
