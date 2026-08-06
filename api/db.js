import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let initError = null;
let db = null;

if (getApps().length === 0) {
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

    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin init error:', error.stack);
    initError = error;
  }
}

if (!initError) {
  try {
    db = getFirestore();
  } catch (e) {
    initError = e;
  }
}

export { db, initError };
