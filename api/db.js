import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCQqqvpWmSnFMqCM6fmOvxzKnWJDtZgmwY",
  authDomain: "login-form-5d3c6.firebaseapp.com",
  projectId: "login-form-5d3c6",
  storageBucket: "login-form-5d3c6.firebasestorage.app",
  messagingSenderId: "507225046341",
  appId: "1:507225046341:web:d95b223cc3dbbe464f122c",
  measurementId: "G-DBEFWS4DS3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, getDoc, setDoc };
