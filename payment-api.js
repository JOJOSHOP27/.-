async _tryProxy(action, amount = 0, invoiceId = '') {
    try {
        // COBA PROXY PHP DULU
        let url = '/lzpedia-proxy.php?action=' + action;
        if (action === 'create') url += '&amount=' + amount;
        if (action === 'status') url += '&invoice_id=' + encodeURIComponent(invoiceId);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.invoice_id) return this._formatResponse(data);
            if (data.success && data.status) return this._formatStatusResponse(data);
        }

        // KALO GAGAL, PAKAI CORS PROXY
        console.log('⚠️ Proxy PHP gagal, coba CORS proxy...');
        const corsUrl = 'https://corsproxy.io/?' + encodeURIComponent(
            LZPEDIA_CONFIG.baseUrl + 
            (action === 'create' ? '/invoice?apikey=' + LZPEDIA_CONFIG.apiKey + '&amount=' + amount : 
             '/invoice/status?apikey=' + LZPEDIA_CONFIG.apiKey + '&invoice_id=' + encodeURIComponent(invoiceId))
        );
        
        const corsResponse = await fetch(corsUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        });
        
        if (corsResponse.ok) {
            const data = await corsResponse.json();
            if (data.success && data.invoice_id) return this._formatResponse(data);
            if (data.success && data.status) return this._formatStatusResponse(data);
        }

        return null;
    } catch (e) {
        console.log('Proxy error:', e.message);
        return null;
    }
}
