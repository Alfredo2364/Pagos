import { db, initError } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (initError) {
    return res.status(500).json({ error: 'DB Init Error', details: initError.message });
  }

  try {
    const { data, error } = await db
      .from('historial_pagos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1000);

    if (error) throw error;

    res.status(200).json({ history: data });
  } catch (err) {
    console.error("Error reading history from Supabase:", err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
}
