// ============================================================
// LZPEDIA - SERVERLESS VERSION (Vercel/Netlify)
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, amount, invoice_id } = req.query;
  const API_KEY = 'LXZ_015d8a759df64d48';
  const BASE_URL = 'https://app.lzpedia.my.id/api';

  try {
    let targetUrl;
    if (action === 'create') {
      targetUrl = `${BASE_URL}/invoice?apikey=${API_KEY}&amount=${amount}`;
    } else if (action === 'status') {
      targetUrl = `${BASE_URL}/invoice/status?apikey=${API_KEY}&invoice_id=${invoice_id}`;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(targetUrl);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
