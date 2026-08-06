import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'api', 'keys.json');

  if (req.method === 'GET') {
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const keys = JSON.parse(fileData);
      // Only return the public key for the frontend
      return res.status(200).json({ publicKey: keys.publicKey });
    } catch (error) {
      console.error('Error reading keys:', error);
      return res.status(500).json({ error: 'Error reading configuration' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { publicKey, accessToken } = req.body;
      if (!publicKey || !accessToken) {
        return res.status(400).json({ error: 'Faltan credenciales' });
      }

      const keys = { publicKey, accessToken };
      fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), 'utf8');
      return res.status(200).json({ message: 'Keys updated successfully' });
    } catch (error) {
      console.error('Error writing keys:', error);
      return res.status(500).json({ error: 'Error saving configuration' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
