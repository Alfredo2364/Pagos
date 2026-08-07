import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let db = null;
let initError = null;

try {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Configúralas en Vercel.");
  }
  
  // Usamos el SERVICE_ROLE_KEY para poder acceder y modificar la tabla de configuración 
  // incluso si tiene Row Level Security (RLS) bloqueada para el público.
  db = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully.');
} catch (error) {
  console.error('Supabase init error:', error.stack || error);
  initError = error;
}

export { db, initError };
