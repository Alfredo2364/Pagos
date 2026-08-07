import { db, initError } from './db.js';

export default async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ error: 'DB Init Error', details: initError.message });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('mercado_pago_config')
        .select('public_key')
        .eq('id', 'default')
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (which is fine on first run)
        throw error;
      }

      res.status(200).json({ publicKey: data?.public_key || '' });
    } catch (err) {
      console.error("Error reading from Supabase:", err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { publicKey, accessToken } = req.body;
      
      const { error } = await db
        .from('mercado_pago_config')
        .upsert({
          id: 'default',
          public_key: (publicKey || '').trim(),
          access_token: (accessToken || '').trim(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      res.status(200).json({ success: true, message: 'Keys guardadas seguras en Supabase' });
    } catch (error) {
      console.error("Error writing to Supabase:", error);
      res.status(500).json({ success: false, message: 'Error interno al guardar las keys', details: error.message });
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
