
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

let testEnv;

async function getTestEnv() {
  if (testEnv) {
    return testEnv;
  }
  const projectId = `rules-spec-${Date.now()}`;
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
    storage: {
        rules: fs.readFileSync('storage.rules', 'utf8'),
    }
  });
  return testEnv;
}

async function setupFirestore(auth, data) {
  const env = await getTestEnv();
  if (data) {
    await env.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      for (const key in data) {
        await firestore.doc(key).set(data[key]);
      }
    });
  }
  return auth
    ? env.authenticatedContext(auth.uid, auth.token).firestore()
    : env.unauthenticatedContext().firestore();
}

async function setupStorage(auth) {
    const env = await getTestEnv();
    return auth
        ? env.authenticatedContext(auth.uid, auth.token).storage()
        : env.unauthenticatedContext().storage();
}

async function cleanup() {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}

module.exports = { getTestEnv, setupFirestore, setupStorage, cleanup };
