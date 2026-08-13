// Vercel Serverless Function - LZPedia Proxy
// Save as: api/lzpedia.js
// Endpoint: POST /api/lzpedia

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { action, amount, invoice_id, product } = req.body;
  const API_KEY = 'LXZ_015d8a759df64d48';
  const BASE_URL = 'https://app.lzpedia.my.id/api';

  try {
    let targetUrl;

    if (action === 'create') {
      targetUrl = `${BASE_URL}/invoice?apikey=${API_KEY}&amount=${amount}&product=${encodeURIComponent(product || 'Pesanan JOELL SHOP')}`;
    } else if (action === 'status') {
      if (!invoice_id) {
        return res.status(400).json({ error: 'invoice_id required for status check' });
      }
      targetUrl = `${BASE_URL}/invoice/status?apikey=${API_KEY}&invoice_id=${invoice_id}`;
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "create" or "status"' });
    }

    console.log(`📤 Proxy request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JOELL-SHOP/2.0'
      }
    });

    const data = await response.json();
    console.log(`📥 Proxy response:`, data);

    res.status(200).json(data);

  } catch (error) {
    console.error('LZPedia Proxy Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Proxy error', 
      message: error.message 
    });
  }
}