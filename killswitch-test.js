
const { getFunctions, httpsCallable } = require('firebase/functions');
const { initializeApp } = require('firebase/app');

// IMPORTANT: This assumes a firebaseConfig object is available in the environment
// In a real CI/CD environment, this would be securely provided.
// For this test, we'll assume a placeholder config and that the functions emulator is running
// or that it's connecting to the live project with appropriate credentials.
const firebaseConfig = {
  // Your Firebase project configuration object
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // ...
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');

const narrate = httpsCallable(functions, 'narrate');

(async () => {
  try {
    console.log('Attempting to call "narrate" function...');
    const result = await narrate({ text: "hello" });
    console.log('Function call successful:', result.data);
    process.exit(0); // Success
  } catch (error) {
    console.error('Function call failed:', error.message);
    if (error.message.includes('unavailable')) {
      console.log('SUCCESS: Kill switch is active.');
      process.exit(10); // Special exit code for "unavailable"
    }
    process.exit(1); // Other error
  }
})();
