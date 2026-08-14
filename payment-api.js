// ============================================================
// PAYMENT API - v12.0 (FULLY WORKING WITH LZPEDIA)
// ============================================================

const LZPEDIA_CONFIG = {
    apiKey: 'LXZ_015d8a759df64d48',
    baseUrl: 'https://app.lzpedia.my.id/api'
};

const PAYMENT_API = {
    async createInvoice(amount) {
        console.log('📤 [LZPEDIA] Creating invoice for Rp', amount);
        
        // ===== PROXY PHP =====
        try {
            const proxyUrl = '/lzpedia-proxy.php?action=create&amount=' + amount;
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📥 [LZPEDIA] Response:', data);
                
                if (data && data.success && data.invoice_id) {
                    console.log('✅ [LZPEDIA] Invoice created:', data.invoice_id);
                    return {
                        success: true,
                        invoiceId: data.invoice_id,
                        amount: data.amount || amount,
                        fee: data.fee || 0,
                        total: data.total || (data.amount + data.fee) || amount,
                        qrisImage: data.qris_image || data.qris || data.qr_code,
                        paymentLink: data.payment_link || data.url,
                        expiredAt: data.expired_at || data.expiry,
                        status: data.status || 'pending',
                        raw: data
                    };
                }
            }
        } catch (e) {
            console.log('❌ [LZPEDIA] Proxy error:', e.message);
        }

        // ===== DIRECT API =====
        try {
            const directUrl = `${LZPEDIA_CONFIG.baseUrl}/invoice?apikey=${LZPEDIA_CONFIG.apiKey}&amount=${amount}`;
            const response = await fetch(directUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.success && data.invoice_id) {
                    console.log('✅ [LZPEDIA] Direct success:', data.invoice_id);
                    return {
                        success: true,
                        invoiceId: data.invoice_id,
                        amount: data.amount || amount,
                        fee: data.fee || 0,
                        total: data.total || (data.amount + data.fee) || amount,
                        qrisImage: data.qris_image || data.qris || data.qr_code,
                        paymentLink: data.payment_link || data.url,
                        expiredAt: data.expired_at || data.expiry,
                        status: data.status || 'pending',
                        raw: data
                    };
                }
            }
        } catch (e) {
            console.log('❌ [LZPEDIA] Direct error:', e.message);
        }

        // ===== FALLBACK =====
        console.log('⚠️ [LZPEDIA] All methods failed, using fallback');
        return this._manualFallback(amount);
    },

    async checkInvoiceStatus(invoiceId) {
        console.log('📤 [LZPEDIA] Checking status:', invoiceId);
        
        try {
            // PROXY
            const proxyUrl = '/lzpedia-proxy.php?action=status&invoice_id=' + encodeURIComponent(invoiceId);
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.success) {
                    return {
                        success: true,
                        invoiceId: data.invoice_id,
                        amount: data.amount || 0,
                        fee: data.fee || 0,
                        total: data.total || 0,
                        status: data.status || 'pending',
                        qrisImage: data.qris_image || data.qris,
                        paymentLink: data.payment_link,
                        raw: data
                    };
                }
            }
            
            // DIRECT
            const directUrl = `${LZPEDIA_CONFIG.baseUrl}/invoice/status?apikey=${LZPEDIA_CONFIG.apiKey}&invoice_id=${encodeURIComponent(invoiceId)}`;
            const directResponse = await fetch(directUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            
            if (directResponse.ok) {
                const data = await directResponse.json();
                if (data && data.success) {
                    return {
                        success: true,
                        invoiceId: data.invoice_id,
                        amount: data.amount || 0,
                        fee: data.fee || 0,
                        total: data.total || 0,
                        status: data.status || 'pending',
                        qrisImage: data.qris_image || data.qris,
                        paymentLink: data.payment_link,
                        raw: data
                    };
                }
            }
            
            return { success: false, error: 'Gagal cek status' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    _manualFallback(amount) {
        const invoiceId = 'JOELL-' + Date.now().toString(36).toUpperCase() + '-' + 
                          Math.random().toString(36).substr(2, 4).toUpperCase();
        const qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY-${invoiceId}-${amount}`;
        
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
// CREATE INVOICE - PAKAI LZPEDIA
// ============================================================

window.createInvoice = async function(amount) {
    console.log('🔥 [CREATE] Starting for Rp', amount);
    
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
                <p>⏳ Menghubungi LZPedia...</p>
                <p style="font-size:0.7rem;color:var(--text-muted);">Membuat invoice pembayaran</p>
            </div>
        `;
    }

    try {
        // ===== PANGGIL API LZPEDIA =====
        const result = await PAYMENT_API.createInvoice(amount);
        console.log('📄 [CREATE] Result:', result);

        // ===== CEK APAKAH DARI LZPEDIA ATAU MANUAL =====
        const isLzpedia = result.invoiceId && result.invoiceId.startsWith('INV');
        const isManual = !isLzpedia;

        if (isLzpedia) {
            console.log('✅ [CREATE] INVOICE DARI LZPEDIA:', result.invoiceId);
        } else {
            console.log('⚠️ [CREATE] PAKAI FALLBACK MANUAL');
        }

        if (result.success && result.invoiceId) {
            // ===== SIMPAN CURRENT INVOICE ID =====
            window.currentInvoiceId = result.invoiceId;

            // ===== UPDATE ORDER DENGAN INVOICE DARI LZPEDIA =====
            const orders = JSON.parse(localStorage.getItem('joellOrders') || '[]');
            
            // CARI ORDER YANG BELUM PUNYA INVOICE
            const pendingOrder = orders.find(o => o.status === 'pending' && !o.invoiceId);
            if (pendingOrder) {
                pendingOrder.invoiceId = result.invoiceId;
                pendingOrder.lzpediaInvoice = result.invoiceId;
                pendingOrder.paymentStatus = 'pending';
                pendingOrder.lzpediaTotal = result.total;
                pendingOrder.lzpediaFee = result.fee;
                
                localStorage.setItem('joellOrders', JSON.stringify(orders));
                if (typeof syncOrdersToCloud === 'function') syncOrdersToCloud();
                console.log('✅ [CREATE] Order updated with LZPedia invoice:', result.invoiceId);
            }

            // ===== SIMPAN HISTORY =====
            const history = getInvoiceHistory();
            const existingIndex = history.findIndex(h => h.invoice_id === result.invoiceId);
            if (existingIndex === -1) {
                history.unshift({
                    invoice_id: result.invoiceId,
                    total: result.total,
                    amount: result.amount,
                    fee: result.fee || 0,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    expired_at: result.expiredAt || new Date(Date.now() + 30 * 60000).toISOString(),
                    qris_image: result.qrisImage,
                    payment_link: result.paymentLink,
                    source: isLzpedia ? 'lzpedia' : 'manual'
                });
                setInvoiceHistory(history);
                console.log('✅ [CREATE] History saved');
            }

            // ===== RENDER ULANG ORDERS =====
            if (typeof renderOrdersList === 'function') renderOrdersList();

            // ===== TAMPILKAN QRIS =====
            const expiryDate = result.expiredAt ? new Date(result.expiredAt) : new Date(Date.now() + 30 * 60000);
            window.showQrisDisplay(result, expiryDate, !isLzpedia);
            window.startPaymentTimer(expiryDate);
            window.startAutoCheckStatus(result.invoiceId);
            
            // ===== TOAST =====
            const msg = isLzpedia ? '✅ QRIS dari LZPedia siap dibayar' : '⚠️ QRIS Manual (LZPedia offline)';
            showToast('Invoice Dibuat', msg, isLzpedia ? 'success' : 'warning');

        } else {
            // ===== GAGAL =====
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
        console.error('❌ [CREATE] Error:', error);
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
// SHOW QRIS DISPLAY - QRIS DARI LZPEDIA
// ============================================================

window.showQrisDisplay = function(result, expiryDate, isManual = false) {
    console.log('🖥️ [DISPLAY] Showing QRIS...');
    
    const container = document.getElementById('qrisDisplayContainer');
    if (!container) {
        console.error('❌ [DISPLAY] Container not found!');
        return;
    }

    // ===== QRIS IMAGE - PASTIKAN DARI LZPEDIA =====
    let qrisImage = result.qrisImage || result.qris || result.qr_code || result.qris_url;
    
    // CEK APAKAH QRIS DARI LZPEDIA
    const isLzpediaQris = qrisImage && (qrisImage.includes('lzpedia') || qrisImage.includes('storage'));
    
    if (isLzpediaQris) {
        console.log('✅ [DISPLAY] QRIS dari LZPEDIA:', qrisImage);
    } else {
        console.log('⚠️ [DISPLAY] QRIS MANUAL (fallback)');
        if (!qrisImage || qrisImage === 'undefined' || qrisImage === 'null') {
            qrisImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY-${result.invoiceId}-${result.amount}`;
        }
    }

    const statusColor = result.status === 'pending' ? '#fbbf24' : 
                        (result.status === 'paid' ? '#10b981' : '#ef4444');
    const statusText = result.status === 'pending' ? '⏳ Menunggu Pembayaran' : 
                       (result.status === 'paid' ? '✅ Lunas' : '❌ Kadaluarsa');

    const timerDisplay = window.formatTimer ? window.formatTimer(expiryDate) : '30:00';
    
    // ===== INDIKATOR SUMBER QRIS =====
    const sourceIndicator = isLzpediaQris ? 
        `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;font-size:0.7rem;color:var(--green);">
            ✅ QRIS dari LZPedia - Bisa Dibayar
        </div>` :
        `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;font-size:0.7rem;color:var(--orange);">
            ⚠️ QRIS Manual - TIDAK Bisa Dibayar!
        </div>`;

    container.innerHTML = `
        <div class="lzpedia-style-invoice">
            ${sourceIndicator}
            
            <div class="invoice-detail-table">
                <div class="detail-row">
                    <span class="label">ID Invoice</span>
                    <span class="value id-value" style="font-size:0.7rem;">${result.invoiceId}</span>
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
                ${result.paymentLink ? `
                <div class="detail-row">
                    <span class="label">Link Bayar</span>
                    <a href="${result.paymentLink}" target="_blank" class="value link-value">Klik Disini</a>
                </div>
                ` : ''}
            </div>

            <div class="qris-timer" id="qrisTimerDisplay">${timerDisplay}</div>

            <!-- QRIS IMAGE -->
            <div class="qris-image-box">
                <img id="qrisCodeImage" 
                     src="${qrisImage}" 
                     alt="QRIS Code" 
                     style="width:100%; max-width:240px; height:auto; margin:0 auto; display:block;"
                     onload="console.log('✅ [DISPLAY] QRIS loaded successfully!')"
                     onerror="console.log('❌ [DISPLAY] QRIS load failed'); this.style.display='none'; document.getElementById('qrisFallback').style.display='block';">
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
    
    console.log('✅ [DISPLAY] QRIS displayed! Source:', isLzpediaQris ? 'LZPEDIA' : 'MANUAL');
};

// ============================================================
// CHECK STATUS
// ============================================================

window.checkInvoiceStatus = async function(invoiceId) {
    if (!invoiceId) {
        showToast('Error', 'Tidak ada invoice', 'error');
        return;
    }

    console.log('📤 [STATUS] Checking:', invoiceId);

    const btn = document.getElementById('checkStatusBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        const result = await PAYMENT_API.checkInvoiceStatus(invoiceId);
        console.log('📥 [STATUS] Result:', result);
        
        if (result.success) {
            const statusEl = document.querySelector('.status-value');
            if (statusEl) {
                const colors = { 'pending': '#fbbf24', 'paid': '#10b981', 'expired': '#ef4444' };
                const texts = { 'pending': '⏳ Menunggu', 'paid': '✅ Lunas', 'expired': '❌ Kadaluarsa' };
                statusEl.style.color = colors[result.status] || '#fbbf24';
                statusEl.textContent = texts[result.status] || 'Menunggu';
            }

            // UPDATE HISTORY
            const history = getInvoiceHistory();
            const item = history.find(h => h.invoice_id === invoiceId);
            if (item) {
                item.status = result.status;
                setInvoiceHistory(history);
                if (typeof renderInvoiceHistory === 'function') renderInvoiceHistory();
            }

            // UPDATE ORDER
            if (typeof updateOrderPaymentStatus === 'function') {
                updateOrderPaymentStatus(invoiceId, result.status);
            }

            if (result.status === 'paid') {
                showToast('✅ Lunas!', 'Pesanan akan diproses', 'success', 5000);
                if (window.autoCheckInterval) clearInterval(window.autoCheckInterval);
                setTimeout(() => {
                    const overlay = document.getElementById('paymentOverlay');
                    if (overlay) overlay.classList.remove('open');
                }, 3000);
            } else if (result.status === 'expired') {
                showToast('⏰ Kadaluarsa', 'Buat invoice baru', 'warning');
                if (window.autoCheckInterval) clearInterval(window.autoCheckInterval);
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
        if (window.currentInvoiceId) window.checkInvoiceStatus(window.currentInvoiceId);
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
    showToast('Berhasil', 'QRIS diunduh', 'success');
};

// ============================================================
// OPEN PAYMENT MODAL
// ============================================================

window.openPaymentModal = function(orderData) {
    console.log('🔄 [MODAL] Opening payment modal...');
    
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
        const cart = JSON.parse(localStorage.getItem('joellCart') || '[]');
        if (itemsContainer) {
            itemsContainer.innerHTML = cart.map(i => 
                `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price*i.qty).toLocaleString('id-ID')}</div>`
            ).join('');
        }
        total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    }
    if (totalEl) totalEl.textContent = 'Total: Rp ' + total.toLocaleString('id-ID');

    const container = document.getElementById('qrisDisplayContainer');
    if (container && total > 0) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>⏳ Membuat QRIS dari LZPedia...</p>
                <p style="font-size:0.7rem;color:var(--text-muted);">Mohon tunggu sebentar</p>
            </div>
        `;
        setTimeout(() => window.createInvoice(total), 500);
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
        const isLzpedia = item.source === 'lzpedia' || item.invoice_id.startsWith('INV');
        const sourceIcon = isLzpedia ? '✅' : '⚠️';
        
        return `
            <div class="history-item" onclick="window.openInvoiceDetail('${item.invoice_id}')">
                <div class="history-info">
                    <span class="history-id">${sourceIcon} ${item.invoice_id}</span>
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
    
    const isLzpedia = invoice.source === 'lzpedia' || invoice.invoice_id.startsWith('INV');
    window.showQrisDisplay({
        invoiceId: invoice.invoice_id,
        amount: invoice.amount,
        fee: invoice.fee,
        total: invoice.total,
        qrisImage: invoice.qris_image,
        paymentLink: invoice.payment_link,
        status: invoice.status
    }, expiryDate, !isLzpedia);

    const overlay = document.getElementById('paymentOverlay');
    if (overlay) overlay.classList.add('open');

    if (invoice.status === 'pending' && expiryDate > new Date()) {
        window.startPaymentTimer(expiryDate);
        window.startAutoCheckStatus(invoiceId);
    }
};

window.copyBankInfo = function() {
    navigator.clipboard.writeText('Bank: BCA\nNo Rek: 1234567890\nAtas Nama: JOELL SHOP').then(() => {
        showToast('Berhasil', 'Info bank disalin', 'success');
    }).catch(() => showToast('Error', 'Gagal menyalin', 'error'));
};

console.log('✅ payment-api.js v12.0 Loaded!');
