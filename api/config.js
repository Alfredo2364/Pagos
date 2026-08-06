import { db, initError } from './db.js';

const CONFIG_DOC_ID = 'mercado_pago';
const COLLECTION_NAME = 'config';

export default async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ error: 'DB Init Error', details: initError.message });
  }

  const docRef = db.collection(COLLECTION_NAME).doc(CONFIG_DOC_ID);

  if (req.method === 'GET') {
    try {
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        res.status(200).json({ publicKey: data.publicKey || '' });
      } else {
        res.status(200).json({ publicKey: '' });
      }
    } catch (err) {
      console.error("Error reading from Firestore Admin:", err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { publicKey, accessToken } = req.body;
      
      // Merge with existing data so we don't overwrite other fields if they exist
      await docRef.set({ 
        publicKey: (publicKey || '').trim(), 
        accessToken: (accessToken || '').trim() 
      }, { merge: true });

      res.status(200).json({ success: true, message: 'Keys guardadas seguras en Firebase' });
    } catch (error) {
      console.error("Error writing to Firestore Admin:", error);
      res.status(500).json({ success: false, message: 'Error interno al guardar las keys', details: error.message });
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
