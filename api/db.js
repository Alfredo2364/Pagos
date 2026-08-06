import admin from 'firebase-admin';

let initError = null;

// Protect against multiple initializations in Serverless environments
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("La variable FIREBASE_SERVICE_ACCOUNT no existe. Asegúrate de hacer el Redeploy en Vercel.");
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      throw new Error("El JSON de FIREBASE_SERVICE_ACCOUNT es inválido o se copió mal.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin init error:', error.stack);
    initError = error;
  }
}

let db = null;
if (!initError) {
  try {
    db = admin.firestore();
  } catch (e) {
    initError = e;
  }
}

export { db, initError };
