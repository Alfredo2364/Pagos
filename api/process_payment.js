export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Las llaves de Producción (APP_USR-...)
  const ACCESS_TOKEN = "APP_USR-580831879833618-072801-e8bf3f8da8eb4a9769299cbd924eeb90-730654234";

  try {
    const data = req.body;

    const paymentData = {
      transaction_amount: Number(data.transaction_amount),
      description: data.description,
      payment_method_id: data.payment_method_id,
      token: data.token,
      installments: Number(data.installments),
      payer: {
        email: data.payer.email,
        first_name: data.payer.first_name
      }
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
