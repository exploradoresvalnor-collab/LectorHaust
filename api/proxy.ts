import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'Falta la URL' });

  try {
    const response = await axios.get(decodeURIComponent(url as string), {
      headers: {
        'User-Agent': 'Miravoy-App/1.0',
        'Referer': 'https://mangadex.org'
      },
      responseType: 'arraybuffer' // Para manejar imágenes también
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=86400'); // Cache on Vercel Edge for 24 hours
    
    return res.send(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: 'Error en el proxy interno' });
  }
}
