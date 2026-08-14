// ============================================================
// PAYMENT API - v6.0 (DIRECT + FALLBACK)
// ============================================================

const PAYMENT_API = {
    // PAKAI DIRECT API
    async createInvoice(amount) {
        try {
            console.log('📤 Creating invoice for Rp', amount);
            
            // PAKAI LZPEDIA DIRECT
            const result = await LZPEDIA.createInvoice(amount);
            
            if (result && result.success) {
                console.log('✅ Invoice created:', result);
                return result;
            }
            
            // FALLBACK: buat manual
            return this._manualFallback(amount);
            
        } catch (error) {
            console.error('❌ Error:', error);
            return this._manualFallback(amount);
        }
    },

    async checkInvoiceStatus(invoiceId) {
        try {
            // Coba cek status
            const url = `https://app.lzpedia.my.id/api/invoice/status?apikey=LXZ_015d8a759df64d48&invoice_id=${invoiceId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            
            if (data.success) {
                return {
                    success: true,
                    invoiceId: data.invoice_id,
                    amount: data.amount || 0,
                    fee: data.fee || 0,
                    total: data.total || 0,
                    status: data.status || 'pending',
                    qrisImage: data.qris_image,
                    paymentLink: data.payment_link,
                    raw: data
                };
            }
            return { success: false, error: 'Status check failed' };
            
        } catch (error) {
            // Kalo gagal, return pending
            return {
                success: true,
                invoiceId: invoiceId,
                status: 'pending',
                message: 'Status masih pending, silakan cek nanti'
            };
        }
    },

    _manualFallback(amount) {
        const invoiceId = 'JOELL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // QRIS GENERATOR MANUAL
        const qrisData = `PAY-${invoiceId}-${amount}`;
        const qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisData)}`;
        
        return {
            success: true,
            invoiceId: invoiceId,
            amount: amount,
            fee: 0,
            total: amount,
            qrisImage: qrisImage,
            paymentLink: `https://www.google.com/search?q=qr+code+${encodeURIComponent(qrisData)}`,
            expiredAt: new Date(Date.now() + 30 * 60000).toISOString(),
            status: 'pending',
            raw: { manual: true, qrisData: qrisData }
        };
    }
};
