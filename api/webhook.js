import { db, initError } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (initError) {
    console.error('Webhook DB Init Error:', initError);
    return res.status(500).send('Internal Server Error');
  }

  try {
    const payload = req.body;
    
    // Solo nos importan los webhooks de tipo "payment"
    if (payload.type === 'payment' || payload.topic === 'payment') {
      const paymentId = payload.data?.id || payload.resource?.split('/').pop();
      
      if (!paymentId) {
        return res.status(400).send('Missing payment ID');
      }

      // 1. Obtener Access Token de la DB
      const { data: configData, error: configError } = await db
        .from('mercado_pago_config')
        .select('access_token')
        .eq('id', 'default')
        .single();
        
      if (configError || !configData?.access_token) {
        throw new Error('No Access Token in DB to verify webhook');
      }

      const ACCESS_TOKEN = configData.access_token;

      // 2. Verificar estatus real del pago directo con MP (Seguridad)
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      if (!mpResponse.ok) {
        throw new Error(`MP API returned ${mpResponse.status}`);
      }
      
      const mpData = await mpResponse.json();
      
      const extRef = mpData.external_reference;
      const status = mpData.status;
      const detail = mpData.status_detail;

      // 3. Actualizar la tabla de historial
      if (extRef) {
        await db.from('historial_pagos')
          .update({
            estatus: status,
            detalle_estatus: detail,
            payment_id: mpData.id // por si en pending no se guardó el ID original
          })
          .eq('referencia_externa', extRef);
          
        console.log(`Webhook procesado: ${extRef} -> ${status}`);
      }
    }
    
    // MP espera siempre un status 200 de confirmación rápido
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Error procesando webhook:', error);
    // Retornamos 200 de todos modos para que MP no encole y reintente el webhook si fue un error nuestro
    // a menos que queramos que reintente. Retornar 200 es buena práctica si ya vimos la notificación.
    res.status(200).send('OK (with errors)'); 
  }
}
