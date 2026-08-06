import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Leer llaves
  let ACCESS_TOKEN = '';
  try {
    const keysData = fs.readFileSync(path.join(process.cwd(), 'api', 'keys.json'), 'utf8');
    ACCESS_TOKEN = JSON.parse(keysData).accessToken;
  } catch (error) {
    console.error('Error reading keys:', error);
    return res.status(500).json({ error: 'Error interno de configuración' });
  }

  try {
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
