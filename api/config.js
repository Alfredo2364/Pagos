import { db, doc, getDoc, setDoc } from './db.js';

const CONFIG_DOC_ID = 'mercado_pago';
const COLLECTION_NAME = 'config';

export default async function handler(req, res) {
  const docRef = doc(db, COLLECTION_NAME, CONFIG_DOC_ID);

  if (req.method === 'GET') {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        res.status(200).json({ publicKey: data.publicKey || '' });
      } else {
        res.status(200).json({ publicKey: '' });
      }
    } catch (err) {
      console.error("Error reading from Firestore:", err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { publicKey, accessToken } = req.body;
      
      // Merge with existing data so we don't overwrite other fields if they exist
      await setDoc(docRef, { 
        publicKey, 
        accessToken 
      }, { merge: true });

      res.status(200).json({ success: true, message: 'Keys guardadas en Firebase correctamente' });
    } catch (error) {
      console.error("Error writing to Firestore:", error);
      res.status(500).json({ success: false, message: 'Error interno al guardar las keys' });
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
