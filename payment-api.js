// ============================================================
// PAYMENT API - v10.0 (FULL FIXED)
// ============================================================

// ===== KONFIGURASI =====
const LZPEDIA_CONFIG = {
    apiKey: 'LXZ_015d8a759df64d48',
    baseUrl: 'https://app.lzpedia.my.id/api'
};

// ============================================================
// PAYMENT API CORE
// ============================================================

const PAYMENT_API = {
    async createInvoice(amount) {
        try {
            console.log('📤 Creating invoice for Rp', amount);
            
            // ===== METHOD 1: PROXY PHP =====
            try {
                const proxyUrl = '/lzpedia-proxy.php?action=create&amount=' + amount;
                console.log('🔗 Proxy URL:', proxyUrl);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📥 Proxy response:', data);
                    
                    if (data && data.success && data.invoice_id) {
                        console.log('✅ Proxy success!');
                        return this._formatResponse(data);
                    }
                }
            } catch (e) {
                console.log('❌ Proxy error:', e.message);
            }

            // ===== METHOD 2: DIRECT API =====
            try {
                const directUrl = `${LZPEDIA_CONFIG.baseUrl}/invoice?apikey=${LZPEDIA_CONFIG.apiKey}&amount=${amount}`;
                console.log('🔗 Direct URL:', directUrl);
                
                const response = await fetch(directUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache',
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📥 Direct response:', data);
                    
                    if (data && data.success && data.invoice_id) {
                        console.log('✅ Direct success!');
                        return this._formatResponse(data);
                    }
                }
            } catch (e) {
                console.log('❌ Direct error:', e.message);
            }

            // ===== METHOD 3: CORS PROXY =====
            try {
                const corsUrl = 'https://corsproxy.io/?' + encodeURIComponent(
                    `${LZPEDIA_CONFIG.baseUrl}/invoice?apikey=${LZPEDIA_CONFIG.apiKey}&amount=${amount}`
                );
                console.log('🔗 CORS Proxy URL:', corsUrl);
                
                const response = await fetch(corsUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    let data = await response.text();
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        // Mungkin response wrapped di 'contents'
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.contents) {
                                data = JSON.parse(parsed.contents);
                            }
                        } catch (e2) {}
                    }
                    
                    if (data && data.success && data.invoice_id) {
                        console.log('✅ CORS Proxy success!');
                        return this._formatResponse(data);
                    }
                }
            } catch (e) {
                console.log('❌ CORS Proxy error:', e.message);
            }

            // ===== METHOD 4: MANUAL QRIS (FALLBACK) =====
            console.log('⚠️ All methods failed, using manual QRIS fallback');
            return this._manualQris(amount);

        } catch (error) {
            console.error('❌ Fatal error:', error);
            return this._manualQris(amount);
        }
    },

    async checkInvoiceStatus(invoiceId) {
        try {
            console.log('📤 Checking status for:', invoiceId);
            
            // ===== PROXY PHP =====
            try {
                const proxyUrl = '/lzpedia-proxy.php?action=status&invoice_id=' + encodeURIComponent(invoiceId);
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.success) {
                        return this._formatStatusResponse(data);
                    }
                }
            } catch (e) {}

            // ===== DIRECT API =====
            try {
                const directUrl = `${LZPEDIA_CONFIG.baseUrl}/invoice/status?apikey=${LZPEDIA_CONFIG.apiKey}&invoice_id=${encodeURIComponent(invoiceId)}`;
                const response = await fetch(directUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.success) {
                        return this._formatStatusResponse(data);
                    }
                }
            } catch (e) {}

            return { success: false, error: 'Gagal cek status' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ===== MANUAL QRIS (FALLBACK) =====
    _manualQris(amount) {
        const invoiceId = 'JOELL-' + Date.now().toString(36).toUpperCase() + '-' + 
                          Math.random().toString(36).substr(2, 4).toUpperCase();
        
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
            raw: { manual: true, source: 'qrserver.com' }
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
            expiredAt: data.expired_at || data.expiry || new Date(Date.now() + 30 * 60000).toISOString(),
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
// GLOBAL STATE
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
// CREATE INVOICE
// ============================================================

window.createInvoice = async function(amount) {
    console.log('🔥 createInvoice called with amount:', amount);
    
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
                <p style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;">Menggunakan LZPedia API</p>
            </div>
        `;
    }

    try {
        const result = await PAYMENT_API.createInvoice(amount);
        console.log('📄 Final Result:', result);

        if (result.success && result.invoiceId) {
            window.currentInvoiceId = result.invoiceId;
            
            // CEK SUMBER QRIS
            const isManual = result.raw && result.raw.manual;
            const sourceText = isManual ? '⚠️ QRIS Manual (Fallback)' : '✅ QRIS LZPedia';
            console.log(sourceText);

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
                payment_link: result.paymentLink,
                source: isManual ? 'manual' : 'lzpedia'
            });
            setInvoiceHistory(history);
            
            // TAMPILKAN QRIS
            const expiryDate = result.expiredAt ? new Date(result.expiredAt) : new Date(Date.now() + 30 * 60000);
            
            // ✅ PASTIKAN QRIS TAMPIL
            window.showQrisDisplay(result, expiryDate, isManual);
            window.startPaymentTimer(expiryDate);
            window.startAutoCheckStatus(result.invoiceId);
            
            const msg = isManual ? '⚠️ QRIS Manual (LZPedia offline)' : '✅ QRIS dari LZPedia';
            showToast('Invoice Dibuat', msg, isManual ? 'warning' : 'success');

        } else {
            // GAGAL TOTAL
            if (container) {
                container.innerHTML = `
                    <div class="qris-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>❌ Gagal Membuat Invoice</h3>
                        <p>${result.error || 'Terjadi kesalahan'}</p>
                        <button onclick="window.createInvoice(${amount})" class="btn-retry">
                            <i class="fas fa-redo"></i> Coba Lagi
                        </button>
                        <p style="margin-top:12px;font-size:0.7rem;color:var(--text-muted);">
                            Pastikan file <strong>lzpedia-proxy.php</strong> ada di root folder.
                        </p>
                    </div>
                `;
            }
            showToast('❌ Gagal', result.error || 'Error', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
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
// SHOW QRIS DISPLAY
// ============================================================

window.showQrisDisplay = function(result, expiryDate, isManual = false) {
    console.log('🖥️ Showing QRIS display...');
    
    const container = document.getElementById('qrisDisplayContainer');
    if (!container) {
        console.error('❌ qrisDisplayContainer not found!');
        return;
    }

    // PASTIKAN QRIS IMAGE ADA
    let qrisImage = result.qrisImage || result.qr_code || result.qris;
    if (!qrisImage || qrisImage === 'undefined' || qrisImage === 'null') {
        qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY-${result.invoiceId}-${result.amount}`;
    }

    const statusColor = result.status === 'pending' ? '#fbbf24' : 
                        (result.status === 'paid' ? '#10b981' : '#ef4444');
    const statusText = result.status === 'pending' ? '⏳ Menunggu Pembayaran' : 
                       (result.status === 'paid' ? '✅ Lunas' : '❌ Kadaluarsa');

    const timerDisplay = window.formatTimer ? window.formatTimer(expiryDate) : '30:00';
    
    // TAMBAHKAN INDIKATOR SUMBER QRIS
    const sourceIndicator = isManual ? 
        `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;font-size:0.7rem;color:var(--orange);">
            ⚠️ QRIS Manual (LZPedia API tidak tersedia)
        </div>` :
        `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;font-size:0.7rem;color:var(--green);">
            ✅ QRIS dari LZPedia
        </div>`;

    container.innerHTML = `
        <div class="lzpedia-style-invoice">
            ${sourceIndicator}
            
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

            <!-- QRIS IMAGE -->
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
    
    console.log('✅ QRIS displayed! Source:', isManual ? 'MANUAL' : 'LZPEDIA');
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
        } else {
            showToast('Error', result.error || 'Gagal cek status', 'error');
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
// TIMER FUNCTIONS
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
    console.log('🔄 Opening payment modal...');
    
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

    // AUTO GENERATE QRIS
    const container = document.getElementById('qrisDisplayContainer');
    if (container && total > 0) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>⏳ Membuat QRIS...</p>
                <p style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;">Menghubungi LZPedia API</p>
            </div>
        `;
        
        setTimeout(() => {
            window.createInvoice(total);
        }, 500);
    }

    overlay.classList.add('open');
};

// ============================================================
// RENDER INVOICE HISTORY
// ============================================================

window.renderInvoiceHistory = function() {
    const container = document.getElementById('invoiceHistoryList');
    if (!container) return;
    
    const history = getInvoiceHistory();
    if (!history.length) {
        container.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-file-invoice"></i>
                <p>Belum ada invoice</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = history.slice(0, 10).map(item => {
        const statusMap = {
            'pending': { label: '⏳ Menunggu', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
            'paid': { label: '✅ Lunas', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            'expired': { label: '❌ Kadaluarsa', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
        };
        const s = statusMap[item.status] || statusMap['pending'];
        const date = item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-';
        const sourceIcon = item.source === 'manual' ? '⚠️' : '✅';
        
        return `
            <div class="history-item" onclick="window.openInvoiceDetail('${item.invoice_id}')">
                <div class="history-info">
                    <span class="history-id">${sourceIcon} #${item.invoice_id}</span>
                    <span class="history-amount">Rp ${Number(item.total || item.amount).toLocaleString('id-ID')}</span>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-status">
                    <span style="background:${s.bg};color:${s.color}">${s.label}</span>
                    ${item.status === 'pending' ? `<button onclick="event.stopPropagation(); window.checkInvoiceStatus('${item.invoice_id}')"><i class="fas fa-sync-alt"></i></button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

window.openInvoiceDetail = function(invoiceId) {
    const history = getInvoiceHistory();
    const invoice = history.find(i => i.invoice_id === invoiceId);
    if (!invoice) return;

    const expiryDate = invoice.expired_at ? new Date(invoice.expired_at) : new Date(Date.now() + 30 * 60000);
    window.currentInvoiceId = invoiceId;
    
    const isManual = invoice.source === 'manual';
    window.showQrisDisplay({
        invoiceId: invoice.invoice_id,
        amount: invoice.amount,
        fee: invoice.fee,
        total: invoice.total,
        qrisImage: invoice.qris_image,
        paymentLink: invoice.payment_link,
        status: invoice.status
    }, expiryDate, isManual);

    const overlay = document.getElementById('paymentOverlay');
    if (overlay) overlay.classList.add('open');

    if (invoice.status === 'pending' && expiryDate > new Date()) {
        window.startPaymentTimer(expiryDate);
        window.startAutoCheckStatus(invoiceId);
    }
};

// ============================================================
// COPY BANK INFO
// ============================================================

window.copyBankInfo = function() {
    navigator.clipboard.writeText('Bank: BCA\nNo Rek: 1234567890\nAtas Nama: JOELL SHOP').then(() => {
        showToast('Berhasil', 'Info bank disalin', 'success');
    }).catch(() => showToast('Error', 'Gagal menyalin', 'error'));
};

// ============================================================
// TOAST (fallback jika tidak ada di script.js)
// ============================================================

if (typeof showToast === 'undefined') {
    window.showToast = function(title, message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-circle' };
        toast.innerHTML = `
            <div class="toast-icon ${type}"><i class="fas ${icons[type] || icons.info}"></i></div>
            <div class="toast-content"><h4>${title}</h4><p>${message}</p></div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };
}

console.log('✅ payment-api.js v10.0 Loaded!');
