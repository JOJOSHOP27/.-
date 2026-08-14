// ============================================================
// PAYMENT API - v5.0 (Dengan Proxy PHP Permanen)
// ============================================================

const PAYMENT_API = {
    // Gunakan proxy PHP kita sebagai prioritas utama
    proxyUrl: window.location.origin + '/lzpedia-proxy.php',
    apiKey: 'LXZ_015d8a759df64d48',
    baseUrl: 'https://app.lzpedia.my.id/api',
    
    // Fallback ke metode lama jika proxy gagal
    corsProxies: [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ],

    async createInvoice(amount) {
        try {
            // METHOD 1: Proxy PHP (paling stabil)
            console.log('📤 [METHOD 1] Proxy PHP...');
            const result = await this._tryProxy('create', amount);
            if (result && result.success) return result;

            // METHOD 2: Direct CORS
            console.log('📤 [METHOD 2] Direct fetch...');
            const direct = await this._tryDirectFetch(`${this.baseUrl}/invoice?apikey=${this.apiKey}&amount=${amount}`);
            if (direct && direct.success) return direct;

            // METHOD 3: CORS Proxies
            console.log('📤 [METHOD 3] CORS Proxy...');
            for (let proxy of this.corsProxies) {
                const res = await this._tryCorsProxy(proxy, `${this.baseUrl}/invoice?apikey=${this.apiKey}&amount=${amount}`);
                if (res && res.success) return res;
            }

            // METHOD 4: JSONP
            console.log('📤 [METHOD 4] JSONP...');
            const jsonp = await this._tryJsonp(`${this.baseUrl}/invoice?apikey=${this.apiKey}&amount=${amount}`);
            if (jsonp && jsonp.success) return jsonp;

            return {
                success: false,
                error: 'Semua metode gagal. Pastikan server proxy aktif.',
                debug: 'Gunakan lzpedia-proxy.php di root folder'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async checkInvoiceStatus(invoiceId) {
        try {
            // METHOD 1: Proxy PHP
            console.log('📤 [STATUS] Proxy PHP...');
            const result = await this._tryProxy('status', null, invoiceId);
            if (result && result.success) return result;

            // METHOD 2: Direct
            const url = `${this.baseUrl}/invoice/status?apikey=${this.apiKey}&invoice_id=${invoiceId}`;
            const direct = await this._tryDirectFetch(url);
            if (direct && direct.success) return direct;

            // METHOD 3: CORS Proxies
            for (let proxy of this.corsProxies) {
                const res = await this._tryCorsProxy(proxy, url);
                if (res && res.success) return res;
            }

            // METHOD 4: JSONP
            const jsonp = await this._tryJsonp(url);
            if (jsonp && jsonp.success) return jsonp;

            return { success: false, error: 'Gagal mengecek status' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ===== PROXY PHP =====
    async _tryProxy(action, amount = 0, invoiceId = '') {
        try {
            let url = this.proxyUrl + '?action=' + action;
            if (action === 'create') url += '&amount=' + amount;
            if (action === 'status') url += '&invoice_id=' + encodeURIComponent(invoiceId);

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });

            if (!response.ok) {
                console.warn('Proxy response error:', response.status);
                return null;
            }

            const data = await response.json();
            if (data.success && (data.invoice_id || data.status)) {
                if (action === 'create') return this._formatResponse(data);
                if (action === 'status') return this._formatStatusResponse(data);
            }
            return null;
        } catch (e) {
            console.warn('Proxy error:', e.message);
            return null;
        }
    },

    // ===== DIRECT FETCH =====
    async _tryDirectFetch(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors',
                cache: 'no-cache'
            });
            const text = await response.text();
            const data = JSON.parse(text);
            if (data.success && data.invoice_id) return this._formatResponse(data);
            if (data.success && data.status) return this._formatStatusResponse(data);
            return null;
        } catch (e) { return null; }
    },

    // ===== CORS PROXY =====
    async _tryCorsProxy(proxy, url) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const response = await fetch(proxyUrl, { method: 'GET', cache: 'no-cache' });
            const text = await response.text();
            let data;
            try {
                const parsed = JSON.parse(text);
                data = parsed.contents ? JSON.parse(parsed.contents) : parsed;
            } catch (e) { data = JSON.parse(text); }
            if (data.success && data.invoice_id) return this._formatResponse(data);
            if (data.success && data.status) return this._formatStatusResponse(data);
            return null;
        } catch (e) { return null; }
    },

    // ===== JSONP =====
    _tryJsonp(url) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            const cbName = 'lzpedia_cb_' + Date.now();
            let resolved = false;
            window[cbName] = function(data) {
                resolved = true;
                delete window[cbName];
                if (script.parentNode) document.head.removeChild(script);
                if (data && data.success && (data.invoice_id || data.status)) {
                    if (data.invoice_id) resolve(PAYMENT_API._formatResponse(data));
                    else if (data.status) resolve(PAYMENT_API._formatStatusResponse(data));
                    else resolve(null);
                } else resolve(null);
            };
            script.src = url + '&callback=' + cbName;
            script.onerror = () => { if (!resolved) { resolved = true; delete window[cbName]; if (script.parentNode) document.head.removeChild(script); resolve(null); } };
            document.head.appendChild(script);
            setTimeout(() => { if (!resolved) { resolved = true; delete window[cbName]; if (script.parentNode) document.head.removeChild(script); resolve(null); } }, 8000);
        });
    },

    _formatResponse(data) {
        return {
            success: true,
            invoiceId: data.invoice_id,
            amount: data.amount,
            fee: data.fee || 0,
            total: data.total,
            qrisImage: data.qris_image,
            paymentLink: data.payment_link,
            expiredAt: data.expired_at,
            raw: data
        };
    },

    _formatStatusResponse(data) {
        const statusMap = { 'pending': 'pending', 'paid': 'paid', 'expired': 'expired' };
        return {
            success: true,
            invoiceId: data.invoice_id,
            amount: data.amount || 0,
            fee: data.fee || 0,
            total: data.total || 0,
            status: statusMap[data.status] || 'pending',
            qrisImage: data.qris_image,
            paymentLink: data.payment_link,
            expiredAt: data.expired_at,
            createdAt: data.created_at,
            raw: data
        };
    }
};

// ============================================================
// GLOBAL STATE & FUNCTIONS
// ============================================================
window.currentInvoiceId = null;
window.timerInterval = null;
window.autoCheckInterval = null;

function getInvoiceHistory() {
    return JSON.parse(localStorage.getItem('joellInvoiceHistory') || '[]');
}
function setInvoiceHistory(history) {
    localStorage.setItem('joellInvoiceHistory', JSON.stringify(history));
}

// ============================================================
// CREATE INVOICE
// ============================================================
window.createInvoice = async function(amount) {
    const container = document.getElementById('qrisDisplayContainer');
    const createBtn = document.getElementById('createInvoiceBtn');

    if (!amount || amount <= 0) {
        showToast('Error', 'Jumlah tidak valid', 'error');
        return;
    }

    if (container) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Membuat Invoice...</p>
            </div>
        `;
    }
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat...';
    }

    try {
        const result = await PAYMENT_API.createInvoice(amount);
        console.log('📄 Invoice Result:', result);

        if (result.success && result.invoiceId) {
            window.currentInvoiceId = result.invoiceId;

            let expiryDate;
            if (result.expiredAt) {
                expiryDate = new Date(result.expiredAt.replace(' ', 'T'));
            } else {
                expiryDate = new Date(Date.now() + 30 * 60000);
            }

            const invoiceData = {
                invoice_id: result.invoiceId,
                total: result.total,
                amount: result.amount,
                fee: result.fee,
                status: 'pending',
                created_at: new Date().toISOString(),
                expired_at: expiryDate.toISOString(),
                qris_image: result.qrisImage,
                payment_link: result.paymentLink
            };
            let history = getInvoiceHistory();
            history.unshift(invoiceData);
            setInvoiceHistory(history);
            window.renderInvoiceHistory();

            window.showQrisDisplay(result, expiryDate);
            window.startPaymentTimer(expiryDate);
            window.startAutoCheckStatus(result.invoiceId);

            showToast('✅ Invoice Dibuat', 'Scan QRIS untuk bayar', 'success');

        } else {
            if (container) {
                container.innerHTML = `
                    <div class="qris-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Gagal Membuat Invoice</h3>
                        <p>${result.error || 'Terjadi kesalahan'}</p>
                        <button onclick="window.createInvoice(${amount})" class="btn-retry">
                            <i class="fas fa-redo"></i> Coba Lagi
                        </button>
                        <p style="margin-top:10px;font-size:0.7rem;color:var(--text-muted);">
                            Pastikan file <strong>lzpedia-proxy.php</strong> ada di root folder.
                        </p>
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
                    <h3>Error</h3>
                    <p>${error.message}</p>
                    <button onclick="window.createInvoice(${amount})" class="btn-retry">
                        <i class="fas fa-redo"></i> Coba Lagi
                    </button>
                </div>
            `;
        }
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fas fa-qrcode"></i> Buat Invoice QRIS';
        }
    }
};

// ============================================================
// SHOW QRIS DISPLAY
// ============================================================
window.showQrisDisplay = function(result, expiryDate) {
    const container = document.getElementById('qrisDisplayContainer');
    if (!container) return;

    const statusColor = result.status === 'pending' ? '#fbbf24' : (result.status === 'paid' ? '#10b981' : '#ef4444');
    const statusText = result.status === 'pending' ? 'Menunggu Pembayaran' : (result.status === 'paid' ? 'Lunas ✅' : 'Kadaluarsa ❌');

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
                    <span class="label">Tanggal</span>
                    <span class="value">${new Date().toLocaleString('id-ID', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(/\//g,'-')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Expired</span>
                    <span class="value">${expiryDate.toLocaleString('id-ID', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(/\//g,'-')}</span>
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
                ${result.paymentLink ? `
                <div class="detail-row">
                    <span class="label">Link Pembayaran</span>
                    <a href="${result.paymentLink}" target="_blank" class="value link-value">Klik Disini</a>
                </div>
                ` : ''}
            </div>

            <div class="qris-timer" id="qrisTimerDisplay">${window.formatTimer(expiryDate)}</div>

            <div class="qris-image-box">
                <img id="qrisCodeImage" src="${result.qrisImage}" alt="QRIS Code" 
                     onload="this.style.display='block'" 
                     onerror="this.style.display='none';document.getElementById('qrisFallback').style.display='block'">
                <div id="qrisFallback" class="qris-fallback" style="display:none;">
                    <i class="fas fa-qrcode"></i>
                    <p>Gagal memuat QRIS</p>
                    <a href="${result.qrisImage}" target="_blank">Buka QRIS di Tab Baru</a>
                </div>
            </div>

            <p class="qris-hint">Scan QR Code Pembayaran Di Aplikasi Ewallet/M-Banking Kamu</p>

            <div class="qris-actions">
                <button id="checkStatusBtn" onclick="window.checkInvoiceStatus('${result.invoiceId}')" class="btn-check">
                    <i class="fas fa-sync-alt"></i> Cek Status
                </button>
                <button onclick="window.downloadQris('${result.qrisImage}')" class="btn-download">
                    <i class="fas fa-download"></i> Simpan QRIS
                </button>
            </div>
        </div>
    `;
};

window.formatTimer = function(expiryDate) {
    const diff = expiryDate - new Date();
    if (diff <= 0) return '00:00';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
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
// CEK STATUS PEMBAYARAN
// ============================================================
window.checkInvoiceStatus = async function(invoiceId) {
    if (!invoiceId) { showToast('Error', 'Tidak ada invoice', 'error'); return; }

    const btn = document.getElementById('checkStatusBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengecek...'; }

    try {
        const result = await PAYMENT_API.checkInvoiceStatus(invoiceId);
        if (result.success) {
            const statusEl = document.querySelector('.status-value');
            if (statusEl) {
                const colors = { 'pending': '#fbbf24', 'paid': '#10b981', 'expired': '#ef4444' };
                const texts = { 'pending': 'Menunggu Pembayaran', 'paid': 'Lunas ✅', 'expired': 'Kadaluarsa ❌' };
                statusEl.style.color = colors[result.status] || '#fbbf24';
                statusEl.textContent = texts[result.status] || 'Menunggu';
            }

            let history = getInvoiceHistory();
            const item = history.find(i => i.invoice_id === invoiceId);
            if (item) { 
                item.status = result.status; 
                setInvoiceHistory(history); 
                window.renderInvoiceHistory(); 
            }

            if (result.status === 'paid') {
                showToast('✅ Pembayaran Lunas!', 'Pesanan Anda akan segera diproses', 'success', 5000);
                updateOrderPaymentStatus(invoiceId, 'paid');
                if (window.autoCheckInterval) { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
                setTimeout(() => { 
                    const overlay = document.getElementById('paymentOverlay'); 
                    if (overlay) overlay.classList.remove('open'); 
                }, 3000);
            } else if (result.status === 'expired') {
                showToast('⏰ Kadaluarsa', 'Buat invoice baru', 'warning');
                updateOrderPaymentStatus(invoiceId, 'expired');
                if (window.autoCheckInterval) { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
            } else {
                showToast('⏳ Menunggu Pembayaran', 'Belum dibayar', 'info');
            }
        } else {
            showToast('Error', result.error || 'Gagal cek status', 'error');
        }
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Cek Status'; }
    }
};

// ============================================================
// UPDATE ORDER PAYMENT STATUS (dipanggil dari script.js)
// ============================================================
function updateOrderPaymentStatus(invoiceId, status) {
    if (typeof orders === 'undefined' || !orders || !Array.isArray(orders)) return;
    
    const order = orders.find(o => o.invoiceId === invoiceId || o.id === invoiceId);
    if (order) {
        if (status === 'paid') {
            order.status = 'processing';
            order.statusLabel = 'Diproses';
            order.paymentStatus = 'paid';
            if (order.timeline && order.timeline[0]) {
                order.timeline[0].completed = true;
                order.timeline[0].time = new Date().toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'});
            }
        } else if (status === 'expired') {
            order.status = 'pending';
            order.statusLabel = 'Kadaluarsa';
            order.paymentStatus = 'expired';
        }
        localStorage.setItem('joellOrders', JSON.stringify(orders));
        if (typeof syncOrdersToCloud === 'function') syncOrdersToCloud();
        if (typeof renderOrdersList === 'function') renderOrdersList();
        if (typeof isAdminLoggedIn !== 'undefined' && isAdminLoggedIn) {
            if (typeof renderAdminOrders === 'function') renderAdminOrders();
            if (typeof updateAdminStats === 'function') updateAdminStats();
        }
    }
}

// ============================================================
// TIMER
// ============================================================
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
            if (statusEl) { statusEl.textContent = 'Kadaluarsa ❌'; statusEl.style.color = '#ef4444'; }
            if (window.autoCheckInterval) { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
            let history = getInvoiceHistory();
            const item = history.find(i => i.invoice_id === window.currentInvoiceId);
            if (item) { item.status = 'expired'; setInvoiceHistory(history); window.renderInvoiceHistory(); }
            updateOrderPaymentStatus(window.currentInvoiceId, 'expired');
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
        else { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
    }, 15000);
};

// ============================================================
// HISTORY
// ============================================================
window.renderInvoiceHistory = function() {
    const container = document.getElementById('invoiceHistoryList');
    if (!container) return;
    const history = getInvoiceHistory();
    if (!history.length) {
        container.innerHTML = `<div class="history-empty"><i class="fas fa-file-invoice"></i><p>Belum ada invoice</p></div>`;
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
        return `
            <div class="history-item" onclick="window.openInvoiceDetail('${item.invoice_id}')">
                <div class="history-info">
                    <span class="history-id">#${item.invoice_id}</span>
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
    if (!invoice) { showToast('Error', 'Invoice tidak ditemukan', 'error'); return; }

    const expiryDate = invoice.expired_at ? new Date(invoice.expired_at) : new Date(Date.now() + 30 * 60000);
    window.currentInvoiceId = invoiceId;
    window.showQrisDisplay({
        invoiceId: invoice.invoice_id,
        amount: invoice.amount,
        fee: invoice.fee,
        total: invoice.total,
        qrisImage: invoice.qris_image,
        paymentLink: invoice.payment_link,
        status: invoice.status
    }, expiryDate);

    const overlay = document.getElementById('paymentOverlay');
    if (overlay) overlay.classList.add('open');

    if (invoice.status === 'pending' && expiryDate > new Date()) {
        window.startPaymentTimer(expiryDate);
        window.startAutoCheckStatus(invoiceId);
    }

    const btnCreate = document.getElementById('createInvoiceBtn');
    if (btnCreate) btnCreate.style.display = 'none';
};

// ============================================================
// OPEN PAYMENT MODAL - QRIS AUTO GENERATE
// ============================================================
window.openPaymentModal = function(orderData) {
    const overlay = document.getElementById('paymentOverlay');
    if (!overlay) { showToast('Error', 'Modal tidak ditemukan', 'error'); return; }

    const itemsContainer = document.getElementById('paymentOrderItems');
    const totalEl = document.getElementById('paymentOrderTotal');
    const qrisContainer = document.getElementById('qrisDisplayContainer');

    let total = 0;
    let orderId = null;
    if (orderData && orderData.items) {
        if (itemsContainer) itemsContainer.innerHTML = orderData.items.map(i => `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price*i.qty).toLocaleString('id-ID')}</div>`).join('');
        total = orderData.total || orderData.items.reduce((s,i)=>s+i.price*i.qty,0);
        orderId = orderData.id;
    } else {
        const cart = JSON.parse(localStorage.getItem('joellCart')) || [];
        if (itemsContainer) itemsContainer.innerHTML = cart.map(i => `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price*i.qty).toLocaleString('id-ID')}</div>`).join('');
        total = cart.reduce((s,i)=>s+i.price*i.qty,0);
    }
    if (totalEl) totalEl.textContent = 'Total: Rp ' + total.toLocaleString('id-ID');

    if (qrisContainer && total > 0) {
        qrisContainer.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Membuat QRIS...</p>
            </div>
        `;
        
        setTimeout(() => {
            window.createInvoice(total);
            if (orderId) {
                const order = window.orders ? window.orders.find(o => o.id === orderId) : null;
                if (order) {
                    order.invoiceId = window.currentInvoiceId;
                    localStorage.setItem('joellOrders', JSON.stringify(window.orders || []));
                    if (typeof syncOrdersToCloud === 'function') syncOrdersToCloud();
                }
            }
        }, 300);
    }

    const btnCreate = document.getElementById('createInvoiceBtn');
    if (btnCreate) btnCreate.style.display = 'none';

    if (window.timerInterval) clearInterval(window.timerInterval);
    if (window.autoCheckInterval) { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
    window.currentInvoiceId = null;

    overlay.classList.add('open');
    window.renderInvoiceHistory();
};

window.copyBankInfo = function() {
    navigator.clipboard.writeText('Bank: BCA\nNo Rek: 1234567890\nAtas Nama: JOELL SHOP').then(() => {
        showToast('Berhasil', 'Info bank disalin', 'success');
    }).catch(() => showToast('Error', 'Gagal menyalin', 'error'));
};

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Payment System v5.0 Loaded');

    const createBtn = document.getElementById('createInvoiceBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            const totalEl = document.getElementById('paymentOrderTotal');
            if (totalEl) {
                const total = parseInt(totalEl.textContent.replace(/[^0-9]/g, ''));
                if (total > 0) window.createInvoice(total);
                else showToast('Error', 'Total tidak valid', 'error');
            }
        });
    }

    const closeBtn = document.getElementById('paymentCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const overlay = document.getElementById('paymentOverlay');
            if (overlay) overlay.classList.remove('open');
            if (window.timerInterval) clearInterval(window.timerInterval);
            if (window.autoCheckInterval) { clearInterval(window.autoCheckInterval); window.autoCheckInterval = null; }
        });
    }

    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const method = this.dataset.method;
            const qrisSection = document.getElementById('paymentQrisSection');
            const bankSection = document.getElementById('paymentBankSection');
            if (qrisSection) qrisSection.style.display = method === 'qris' ? 'block' : 'none';
            if (bankSection) bankSection.style.display = method === 'bank' ? 'block' : 'none';
        });
    });

    const bankTotalEl = document.getElementById('bankTotal');
    if (bankTotalEl) {
        const totalEl = document.getElementById('paymentOrderTotal');
        if (totalEl) bankTotalEl.textContent = totalEl.textContent;
    }

    window.renderInvoiceHistory();
});

console.log('✅ payment-api.js v5.0 Loaded!');
