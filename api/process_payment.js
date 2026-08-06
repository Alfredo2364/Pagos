import { db } from './db.js';

const CONFIG_DOC_ID = 'mercado_pago';
const COLLECTION_NAME = 'config';

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Fetch access token from Firebase Admin
    const docRef = db.collection(COLLECTION_NAME).doc(CONFIG_DOC_ID);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || !docSnap.data().accessToken) {
      return res.status(500).json({ error: 'Configuración de Mercado Pago no encontrada en Firebase' });
    }
    
    const ACCESS_TOKEN = docSnap.data().accessToken;

    const data = req.body;

    const paymentData = {
      transaction_amount: Number(data.transaction_amount),
      description: data.description,
      payment_method_id: data.payment_method_id,
      token: data.token,
      installments: Number(data.installments),
      payer: data.payer // Pasamos el objeto entero (con todo y address, si existe)
    };

    const idempotencyKey = Date.now().toString() + Math.random().toString(36).substring(7);

    const headers = {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey
    };

    // Agregar Device ID si existe para bajar el riesgo de fraude
    if (data.device_id) {
      headers["X-Meli-Session-Id"] = data.device_id;
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentData)
    });

    const mpData = await mpResponse.json();

    return res.status(mpResponse.status).json(mpData);

  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
