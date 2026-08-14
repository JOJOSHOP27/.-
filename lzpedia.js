// ============================================================
// LZPEDIA API - VERCEL SERVERLESS FUNCTION
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
            if (!amount || parseInt(amount) <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount harus lebih dari 0'
                });
            }
            targetUrl = `${BASE_URL}/invoice?apikey=${API_KEY}&amount=${parseInt(amount)}`;
        } else if (action === 'status') {
            if (!invoice_id) {
                return res.status(400).json({
                    success: false,
                    error: 'invoice_id wajib diisi'
                });
            }
            targetUrl = `${BASE_URL}/invoice/status?apikey=${API_KEY}&invoice_id=${encodeURIComponent(invoice_id)}`;
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Gunakan "create" atau "status"'
            });
        }

        console.log('📤 [LZPEDIA] Calling:', targetUrl);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'JOELL-SHOP/2.0'
            }
        });

        const data = await response.json();
        console.log('📥 [LZPEDIA] Response:', data);

        res.status(200).json(data);

    } catch (error) {
        console.error('❌ [LZPEDIA] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
