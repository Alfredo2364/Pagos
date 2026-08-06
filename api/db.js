import admin from 'firebase-admin';

// Protect against multiple initializations in Serverless environments
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin init error (check FIREBASE_SERVICE_ACCOUNT env var):', error.stack);
  }
}

const db = admin.firestore();

export { db };
