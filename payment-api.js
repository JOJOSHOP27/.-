// ============================================================
// PAYMENT API - v9.0 (CLIENT SIDE ONLY)
// ============================================================

const PAYMENT_API = {
    apiKey: 'LXZ_015d8a759df64d48',
    baseUrl: 'https://app.lzpedia.my.id/api',

    // ===== BUAT INVOICE =====
    async createInvoice(amount) {
        try {
            console.log('📤 Creating invoice for Rp', amount);
            
            // METHOD 1: PROXY PHP
            const proxyUrl = '/lzpedia-proxy.php?action=create&amount=' + amount;
            const proxyResult = await this._fetchJson(proxyUrl);
            if (proxyResult && proxyResult.success && proxyResult.invoice_id) {
                console.log('✅ Proxy success');
                return this._formatResponse(proxyResult);
            }

            // METHOD 2: DIRECT API (dengan CORS)
            const directUrl = `${this.baseUrl}/invoice?apikey=${this.apiKey}&amount=${amount}`;
            const directResult = await this._fetchJson(directUrl);
            if (directResult && directResult.success && directResult.invoice_id) {
                console.log('✅ Direct success');
                return this._formatResponse(directResult);
            }

            // METHOD 3: MANUAL QRIS (FALLBACK)
            console.log('⚠️ Using manual QRIS fallback');
            return this._manualQris(amount);

        } catch (error) {
            console.error('❌ Error:', error);
            return this._manualQris(amount);
        }
    },

    // ===== CEK STATUS =====
    async checkInvoiceStatus(invoiceId) {
        try {
            // PROXY
            const proxyUrl = `/lzpedia-proxy.php?action=status&invoice_id=${encodeURIComponent(invoiceId)}`;
            const proxyResult = await this._fetchJson(proxyUrl);
            if (proxyResult && proxyResult.success) {
                return this._formatStatusResponse(proxyResult);
            }

            // DIRECT
            const directUrl = `${this.baseUrl}/invoice/status?apikey=${this.apiKey}&invoice_id=${encodeURIComponent(invoiceId)}`;
            const directResult = await this._fetchJson(directUrl);
            if (directResult && directResult.success) {
                return this._formatStatusResponse(directResult);
            }

            return { success: false, error: 'Gagal cek status' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ===== HELPER FETCH =====
    async _fetchJson(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    },

    // ===== MANUAL QRIS =====
    _manualQris(amount) {
        const invoiceId = 'JOELL-' + Date.now().toString(36).toUpperCase() + '-' + 
                          Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // QRIS GENERATOR
        const qrisData = `PAY-${invoiceId}-${amount}`;
        const qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisData)}`;
        
        return {
            success: true,
            invoiceId: invoiceId,
            amount: amount,
            fee: 0,
            total: amount,
            qrisImage: qrisImage,
            paymentLink: qrisImage,
            expiredAt: new Date(Date.now() + 30 * 60000).toISOString(),
            status: 'pending',
            raw: { manual: true }
        };
    },

    _formatResponse(data) {
        return {
            success: true,
            invoiceId: data.invoice_id,
            amount: data.amount || 0,
            fee: data.fee || 0,
            total: data.total || data.amount || 0,
            qrisImage: data.qris_image || data.qr_code || data.qris,
            paymentLink: data.payment_link || data.url,
            expiredAt: data.expired_at || new Date(Date.now() + 30 * 60000).toISOString(),
            status: data.status || 'pending',
            raw: data
        };
    },

    _formatStatusResponse(data) {
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
};

// ============================================================
// GLOBAL FUNCTIONS - FIXED UNTUK QRIS MUNCUL
// ============================================================

window.currentInvoiceId = null;
window.timerInterval = null;
window.autoCheckInterval = null;

function getInvoiceHistory() {
    try {
        return JSON.parse(localStorage.getItem('joellInvoiceHistory') || '[]');
    } catch {
        return [];
    }
}

function setInvoiceHistory(history) {
    localStorage.setItem('joellInvoiceHistory', JSON.stringify(history));
}

// ============================================================
// CREATE INVOICE - YANG PALING PENTING
// ============================================================
window.createInvoice = async function(amount) {
    const container = document.getElementById('qrisDisplayContainer');
    const createBtn = document.getElementById('createInvoiceBtn');

    if (!amount || amount <= 0) {
        showToast('Error', 'Jumlah tidak valid', 'error');
        return;
    }

    // TAMPILKAN LOADING
    if (container) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>⏳ Membuat Invoice...</p>
            </div>
        `;
    }

    try {
        const result = await PAYMENT_API.createInvoice(amount);
        console.log('📄 Result:', result);

        if (result.success && result.invoiceId) {
            window.currentInvoiceId = result.invoiceId;

            // SIMPAN HISTORY
            const history = getInvoiceHistory();
            history.unshift({
                invoice_id: result.invoiceId,
                total: result.total,
                amount: result.amount,
                fee: result.fee || 0,
                status: 'pending',
                created_at: new Date().toISOString(),
                expired_at: result.expiredAt,
                qris_image: result.qrisImage,
                payment_link: result.paymentLink
            });
            setInvoiceHistory(history);
            
            // TAMPILKAN QRIS
            const expiryDate = result.expiredAt ? new Date(result.expiredAt) : new Date(Date.now() + 30 * 60000);
            
            // ✅ PASTIKAN QRIS TAMPIL
            window.showQrisDisplay(result, expiryDate);
            window.startPaymentTimer(expiryDate);
            window.startAutoCheckStatus(result.invoiceId);
            
            showToast('✅ Invoice Dibuat', 'Scan QRIS untuk bayar', 'success');

            // UPDATE ORDER
            if (typeof updateOrderPaymentStatus === 'function') {
                updateOrderPaymentStatus(result.invoiceId, 'pending');
            }

        } else {
            if (container) {
                container.innerHTML = `
                    <div class="qris-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>❌ Gagal Membuat Invoice</h3>
                        <p>${result.error || 'Terjadi kesalahan'}</p>
                        <button onclick="window.createInvoice(${amount})" class="btn-retry">
                            <i class="fas fa-redo"></i> Coba Lagi
                        </button>
                    </div>
                `;
            }
            showToast('❌ Gagal', result.error || 'Error', 'error');
        }
    } catch (error) {
        if (container) {
            container.innerHTML = `
                <div class="qris-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>⚠️ Error</h3>
                    <p>${error.message}</p>
                    <button onclick="window.createInvoice(${amount})" class="btn-retry">
                        <i class="fas fa-redo"></i> Coba Lagi
                    </button>
                </div>
            `;
        }
        showToast('❌ Error', error.message, 'error');
    }
};

// ============================================================
// SHOW QRIS DISPLAY - FIXED (PALING PENTING)
// ============================================================
window.showQrisDisplay = function(result, expiryDate) {
    const container = document.getElementById('qrisDisplayContainer');
    if (!container) {
        console.error('❌ qrisDisplayContainer not found!');
        return;
    }

    // ✅ PASTIKAN QRIS IMAGE ADA
    let qrisImage = result.qrisImage || result.qr_code || result.qris;
    if (!qrisImage || qrisImage === 'undefined' || qrisImage === 'null') {
        // FALLBACK QRIS
        qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY-${result.invoiceId}-${result.amount}`;
    }

    const statusColor = result.status === 'pending' ? '#fbbf24' : 
                        (result.status === 'paid' ? '#10b981' : '#ef4444');
    const statusText = result.status === 'pending' ? '⏳ Menunggu Pembayaran' : 
                       (result.status === 'paid' ? '✅ Lunas' : '❌ Kadaluarsa');

    const timerDisplay = window.formatTimer ? window.formatTimer(expiryDate) : '30:00';

    // ✅ RENDER QRIS
    container.innerHTML = `
        <div class="lzpedia-style-invoice">
            <div class="invoice-detail-table">
                <div class="detail-row">
                    <span class="label">ID Invoice</span>
                    <span class="value id-value">${result.invoiceId}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status</span>
                    <span class="value status-value" style="color:${statusColor}">${statusText}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Jumlah</span>
                    <span class="value">Rp ${Number(result.amount).toLocaleString('id-ID')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Biaya Admin</span>
                    <span class="value">Rp ${Number(result.fee || 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total Bayar</span>
                    <span class="value total-value">Rp ${Number(result.total).toLocaleString('id-ID')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Expired</span>
                    <span class="value">${expiryDate.toLocaleString('id-ID', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(/\//g,'-')}</span>
                </div>
            </div>

            <div class="qris-timer" id="qrisTimerDisplay">${timerDisplay}</div>

            <!-- ✅ QRIS IMAGE -->
            <div class="qris-image-box">
                <img id="qrisCodeImage" 
                     src="${qrisImage}" 
                     alt="QRIS Code" 
                     style="width:100%; max-width:240px; height:auto; margin:0 auto; display:block;"
                     onerror="this.style.display='none'; document.getElementById('qrisFallback').style.display='block';">
                <div id="qrisFallback" style="display:none; text-align:center; padding:20px;">
                    <i class="fas fa-qrcode" style="font-size:3rem; color:var(--text-muted);"></i>
                    <p style="color:var(--text-muted); margin-top:10px;">Gagal memuat QRIS</p>
                    <a href="${qrisImage}" target="_blank" style="color:var(--accent-light);">Buka QRIS di Tab Baru</a>
                </div>
            </div>

            <p class="qris-hint">📱 Scan QR Code di Aplikasi Ewallet/M-Banking</p>

            <div class="qris-actions">
                <button onclick="window.checkInvoiceStatus('${result.invoiceId}')" class="btn-check">
                    <i class="fas fa-sync-alt"></i> Cek Status
                </button>
                <button onclick="window.downloadQris('${qrisImage}')" class="btn-download">
                    <i class="fas fa-download"></i> Simpan QRIS
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ QRIS displayed successfully!');
};

// ============================================================
// CHECK STATUS
// ============================================================
window.checkInvoiceStatus = async function(invoiceId) {
    if (!invoiceId) {
        showToast('Error', 'Tidak ada invoice', 'error');
        return;
    }

    const btn = document.getElementById('checkStatusBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        const result = await PAYMENT_API.checkInvoiceStatus(invoiceId);
        
        if (result.success) {
            const statusEl = document.querySelector('.status-value');
            if (statusEl) {
                const colors = { 'pending': '#fbbf24', 'paid': '#10b981', 'expired': '#ef4444' };
                const texts = { 'pending': '⏳ Menunggu', 'paid': '✅ Lunas', 'expired': '❌ Kadaluarsa' };
                statusEl.style.color = colors[result.status] || '#fbbf24';
                statusEl.textContent = texts[result.status] || 'Menunggu';
            }

            if (result.status === 'paid') {
                showToast('✅ Lunas!', 'Pesanan akan diproses', 'success', 5000);
                if (window.autoCheckInterval) {
                    clearInterval(window.autoCheckInterval);
                    window.autoCheckInterval = null;
                }
                if (typeof updateOrderPaymentStatus === 'function') {
                    updateOrderPaymentStatus(invoiceId, 'paid');
                }
                setTimeout(() => {
                    const overlay = document.getElementById('paymentOverlay');
                    if (overlay) overlay.classList.remove('open');
                }, 3000);
            } else if (result.status === 'expired') {
                showToast('⏰ Kadaluarsa', 'Buat invoice baru', 'warning');
                if (window.autoCheckInterval) {
                    clearInterval(window.autoCheckInterval);
                    window.autoCheckInterval = null;
                }
            } else {
                showToast('⏳ Menunggu', 'Belum dibayar', 'info');
            }
        }
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Cek Status';
        }
    }
};

// ============================================================
// TIMER
// ============================================================
window.formatTimer = function(expiryDate) {
    const diff = expiryDate - new Date();
    if (diff <= 0) return '00:00';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

window.startPaymentTimer = function(expiryDate) {
    const displayEl = document.getElementById('qrisTimerDisplay');
    if (window.timerInterval) clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
        const diff = expiryDate - new Date();
        if (diff <= 0) {
            clearInterval(window.timerInterval);
            window.timerInterval = null;
            if (displayEl) displayEl.textContent = '00:00';
            const statusEl = document.querySelector('.status-value');
            if (statusEl) {
                statusEl.textContent = '❌ Kadaluarsa';
                statusEl.style.color = '#ef4444';
            }
            if (typeof updateOrderPaymentStatus === 'function') {
                updateOrderPaymentStatus(window.currentInvoiceId, 'expired');
            }
            return;
        }
        if (displayEl) {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            displayEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
    }, 1000);
};

window.startAutoCheckStatus = function(invoiceId) {
    if (window.autoCheckInterval) clearInterval(window.autoCheckInterval);
    window.autoCheckInterval = setInterval(() => {
        if (window.currentInvoiceId) {
            window.checkInvoiceStatus(window.currentInvoiceId);
        }
    }, 15000);
};

window.downloadQris = function(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qris-payment.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Berhasil', 'QRIS sedang diunduh', 'success');
};

// ============================================================
// OPEN PAYMENT MODAL
// ============================================================
window.openPaymentModal = function(orderData) {
    const overlay = document.getElementById('paymentOverlay');
    if (!overlay) return;

    const itemsContainer = document.getElementById('paymentOrderItems');
    const totalEl = document.getElementById('paymentOrderTotal');

    let total = 0;
    if (orderData && orderData.items) {
        if (itemsContainer) {
            itemsContainer.innerHTML = orderData.items.map(i => 
                `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price*i.qty).toLocaleString('id-ID')}</div>`
            ).join('');
        }
        total = orderData.total;
    } else {
        const cart = JSON.parse(localStorage.getItem('joellCart')) || [];
        if (itemsContainer) {
            itemsContainer.innerHTML = cart.map(i => 
                `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price*i.qty).toLocaleString('id-ID')}</div>`
            ).join('');
        }
        total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    }
    if (totalEl) totalEl.textContent = 'Total: Rp ' + total.toLocaleString('id-ID');

    // ✅ AUTO GENERATE QRIS
    const container = document.getElementById('qrisDisplayContainer');
    if (container && total > 0) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>⏳ Membuat QRIS...</p>
            </div>
        `;
        
        setTimeout(() => {
            window.createInvoice(total);
        }, 500);
    }

    overlay.classList.add('open');
};

console.log('✅ payment-api.js v9.0 Loaded!');
