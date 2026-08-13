// ============================================================
// LZPEDIA PAYMENT GATEWAY - FRONTEND CLIENT
// VERSION 5.1 - CLEAN VERSION (USES BACKEND PROXY)
// ============================================================

const PAYMENT_API = {
    // API Key hanya untuk backend proxy (tidak diekspos ke client)
    // Semua request melalui backend proxy untuk menghindari CORS
    backendUrl: window.location.origin + '/api/lzpedia',
    
    // Fallback: gunakan proxy publik jika backend tidak tersedia
    corsProxies: [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ],

    // ============================================================
    // CREATE INVOICE - VIA BACKEND PROXY
    // ============================================================
    async createInvoice(amount, productName = 'Pesanan JOELL SHOP') {
        try {
            // PRIORITAS: Gunakan backend proxy (Vercel)
            console.log('📤 [METHOD 1] Backend Proxy...');
            let result = await this._tryBackendProxy(amount, productName);
            if (result && result.success) return result;

            // FALLBACK: CORS Proxy (jika backend gagal)
            console.log('📤 [METHOD 2] CORS Proxy...');
            const url = `https://app.lzpedia.my.id/api/invoice?apikey=LXZ_015d8a759df64d48&amount=${amount}&product=${encodeURIComponent(productName)}`;
            for (let proxy of this.corsProxies) {
                result = await this._tryCorsProxy(proxy, url);
                if (result && result.success) return result;
            }

            // FALLBACK: JSONP (jika semua gagal)
            console.log('📤 [METHOD 3] JSONP...');
            result = await this._tryJsonp(url);
            if (result && result.success) return result;

            return {
                success: false,
                error: 'Gagal terhubung ke server pembayaran.',
                debug: 'Coba deploy lzpedia.js di Vercel atau hubungi admin.'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ============================================================
    // CHECK INVOICE STATUS
    // ============================================================
    async checkInvoiceStatus(invoiceId) {
        try {
            // PRIORITAS: Backend proxy
            console.log('📤 Checking status via Backend Proxy...');
            let result = await this._tryBackendStatus(invoiceId);
            if (result && result.success) return result;

            // FALLBACK: Direct dengan CORS
            const url = `https://app.lzpedia.my.id/api/invoice/status?apikey=LXZ_015d8a759df64d48&invoice_id=${invoiceId}`;
            for (let proxy of this.corsProxies) {
                result = await this._tryCorsProxy(proxy, url);
                if (result && result.success) return result;
            }

            return { success: false, error: 'Gagal mengecek status' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ============================================================
    // PRIVATE METHODS
    // ============================================================

    // Backend Proxy - Create Invoice
    async _tryBackendProxy(amount, productName) {
        try {
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'create', 
                    amount: amount,
                    product: productName 
                })
            });
            const data = await response.json();
            if (data.success && data.invoice_id) {
                return this._formatResponse(data);
            }
            return null;
        } catch (e) {
            console.warn('Backend proxy failed:', e.message);
            return null;
        }
    },

    // Backend Proxy - Check Status
    async _tryBackendStatus(invoiceId) {
        try {
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'status', 
                    invoice_id: invoiceId 
                })
            });
            const data = await response.json();
            if (data.success) {
                return this._formatStatusResponse(data);
            }
            return null;
        } catch (e) {
            console.warn('Backend status check failed:', e.message);
            return null;
        }
    },

    // CORS Proxy
    async _tryCorsProxy(proxy, url) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const response = await fetch(proxyUrl, { 
                method: 'GET', 
                cache: 'no-cache',
                headers: { 'Accept': 'application/json' }
            });
            const text = await response.text();
            let data;
            try {
                const parsed = JSON.parse(text);
                data = parsed.contents ? JSON.parse(parsed.contents) : parsed;
            } catch (e) { 
                data = JSON.parse(text); 
            }
            if (data.success && data.invoice_id) {
                return this._formatResponse(data);
            }
            return null;
        } catch (e) { 
            console.warn('CORS proxy failed:', e.message);
            return null; 
        }
    },

    // JSONP (fallback terakhir)
    _tryJsonp(url) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            const cbName = 'lzpedia_cb_' + Date.now();
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    delete window[cbName];
                    if (script.parentNode) document.head.removeChild(script);
                    resolve(null);
                }
            }, 10000);

            window[cbName] = function(data) {
                resolved = true;
                clearTimeout(timeout);
                delete window[cbName];
                if (script.parentNode) document.head.removeChild(script);
                if (data && data.success && data.invoice_id) {
                    resolve(PAYMENT_API._formatResponse(data));
                } else {
                    resolve(null);
                }
            };
            
            script.src = url + '&callback=' + cbName;
            script.onerror = () => { 
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    delete window[cbName];
                    if (script.parentNode) document.head.removeChild(script);
                    resolve(null);
                }
            };
            document.head.appendChild(script);
        });
    },

    // Format Response
    _formatResponse(data) {
        return {
            success: true,
            invoiceId: data.invoice_id || data.invoiceId,
            amount: data.amount || 0,
            fee: data.fee || 0,
            total: data.total || data.amount || 0,
            qrisImage: data.qris_image || data.qr_image || data.qrisImage,
            paymentLink: data.payment_link || data.paymentLink,
            expiredAt: data.expired_at || data.expiredAt,
            status: data.status || 'pending',
            raw: data
        };
    },

    _formatStatusResponse(data) {
        const statusMap = { 
            'pending': 'pending', 
            'paid': 'paid', 
            'expired': 'expired' 
        };
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
// LOCAL STORAGE HELPERS
// ============================================================

function getInvoiceHistory() {
    return JSON.parse(localStorage.getItem('joellInvoiceHistory') || '[]');
}

function setInvoiceHistory(history) {
    localStorage.setItem('joellInvoiceHistory', JSON.stringify(history));
}

// ============================================================
// CREATE INVOICE
// ============================================================

window.createInvoice = async function(amount, productName = 'Pesanan JOELL SHOP') {
    const container = document.getElementById('qrisDisplayContainer');
    const createBtn = document.getElementById('createInvoiceBtn');

    if (!amount || amount <= 0) {
        showToast('Error', 'Jumlah tidak valid', 'error');
        return;
    }

    // Loading
    if (container) {
        container.innerHTML = `
            <div class="qris-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Membuat Invoice...</p>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">${productName}</p>
            </div>
        `;
    }
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat...';
    }

    try {
        const result = await PAYMENT_API.createInvoice(amount, productName);
        console.log('📄 Invoice Result:', result);

        if (result.success && result.invoiceId) {
            window.currentInvoiceId = result.invoiceId;

            let expiryDate;
            if (result.expiredAt) {
                expiryDate = new Date(result.expiredAt.replace(' ', 'T'));
            } else {
                expiryDate = new Date(Date.now() + 30 * 60000);
            }

            // Save to history
            const invoiceData = {
                invoice_id: result.invoiceId,
                total: result.total,
                amount: result.amount,
                fee: result.fee || 0,
                status: 'pending',
                created_at: new Date().toISOString(),
                expired_at: expiryDate.toISOString(),
                qris_image: result.qrisImage,
                payment_link: result.paymentLink,
                product: productName
            };
            
            let history = getInvoiceHistory();
            history.unshift(invoiceData);
            setInvoiceHistory(history);
            
            if (typeof window.renderInvoiceHistory === 'function') {
                window.renderInvoiceHistory();
            }

            // Show QRIS
            window.showQrisDisplay(result, expiryDate, productName);
            window.startPaymentTimer(expiryDate);
            window.startAutoCheckStatus(result.invoiceId);

            showToast('✅ Invoice Dibuat', 'Scan QRIS untuk bayar', 'success');

        } else {
            // Error
            if (container) {
                container.innerHTML = `
                    <div class="qris-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Gagal Membuat Invoice</h3>
                        <p>${result.error || 'Terjadi kesalahan'}</p>
                        <button onclick="window.createInvoice(${amount}, '${productName}')" class="btn-retry">
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
                    <h3>Error</h3>
                    <p>${error.message}</p>
                    <button onclick="window.createInvoice(${amount}, '${productName}')" class="btn-retry">
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

window.showQrisDisplay = function(result, expiryDate, productName = '') {
    const container = document.getElementById('qrisDisplayContainer');
    if (!container) return;

    const statusColor = result.status === 'pending' ? '#fbbf24' : 
                       (result.status === 'paid' ? '#10b981' : '#ef4444');
    const statusText = result.status === 'pending' ? 'Menunggu Pembayaran' : 
                      (result.status === 'paid' ? 'Lunas ✅' : 'Kadaluarsa ⏰');

    const formattedAmount = Number(result.amount || 0).toLocaleString('id-ID');
    const formattedTotal = Number(result.total || result.amount || 0).toLocaleString('id-ID');

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
                    <span class="label">Produk</span>
                    <span class="value">${productName || 'Pesanan JOELL SHOP'}</span>
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
                    <span class="value">Rp ${formattedAmount}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Biaya Admin</span>
                    <span class="value">Rp ${Number(result.fee || 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total Bayar</span>
                    <span class="value total-value">Rp ${formattedTotal}</span>
                </div>
                ${result.paymentLink ? `
                <div class="detail-row">
                    <span class="label">Link Pembayaran</span>
                    <a href="${result.paymentLink}" target="_blank" class="value link-value">Klik Disini</a>
                </div>
                ` : ''}
            </div>

            <div class="qris-timer" id="qrisTimerDisplay">30:00</div>

            <div class="qris-image-box">
                ${result.qrisImage ? `
                    <img id="qrisCodeImage" src="${result.qrisImage}" alt="QRIS Code" 
                         onload="this.style.display='block'" 
                         onerror="this.style.display='none';document.getElementById('qrisFallback').style.display='block'">
                    <div id="qrisFallback" class="qris-fallback" style="display:none;">
                        <i class="fas fa-qrcode"></i>
                        <p>Gagal memuat QRIS</p>
                        <a href="${result.qrisImage}" target="_blank">Buka QRIS di Tab Baru</a>
                    </div>
                ` : `
                    <div class="qris-fallback">
                        <i class="fas fa-qrcode"></i>
                        <p>QRIS tidak tersedia</p>
                    </div>
                `}
            </div>

            <p class="qris-hint">Scan QR Code Pembayaran Di Aplikasi Ewallet/M-Banking Kamu</p>

            <div class="qris-actions">
                <button id="checkStatusBtn" onclick="window.checkInvoiceStatus('${result.invoiceId}')" class="btn-check">
                    <i class="fas fa-sync-alt"></i> Cek Status
                </button>
                ${result.qrisImage ? `
                    <button onclick="window.downloadQris('${result.qrisImage}')" class="btn-download">
                        <i class="fas fa-download"></i> Simpan QRIS
                    </button>
                ` : ''}
            </div>
        </div>
    `;
};

// ============================================================
// CHECK INVOICE STATUS
// ============================================================

window.checkInvoiceStatus = async function(invoiceId) {
    if (!invoiceId) { 
        showToast('Error', 'Tidak ada invoice', 'error'); 
        return; 
    }

    const btn = document.getElementById('checkStatusBtn');
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengecek...'; 
    }

    try {
        const result = await PAYMENT_API.checkInvoiceStatus(invoiceId);
        if (result.success) {
            const statusEl = document.querySelector('.status-value');
            if (statusEl) {
                const colors = { 'pending': '#fbbf24', 'paid': '#10b981', 'expired': '#ef4444' };
                const texts = { 'pending': 'Menunggu Pembayaran', 'paid': 'Lunas ✅', 'expired': 'Kadaluarsa ⏰' };
                statusEl.style.color = colors[result.status] || '#fbbf24';
                statusEl.textContent = texts[result.status] || 'Menunggu';
            }

            let history = getInvoiceHistory();
            const item = history.find(i => i.invoice_id === invoiceId);
            if (item) { 
                item.status = result.status; 
                setInvoiceHistory(history); 
                if (typeof window.renderInvoiceHistory === 'function') {
                    window.renderInvoiceHistory();
                }
            }

            if (result.status === 'paid') {
                showToast('✅ Berhasil!', 'Pembayaran lunas', 'success', 5000);
                if (window.autoCheckInterval) { 
                    clearInterval(window.autoCheckInterval); 
                    window.autoCheckInterval = null; 
                }
                
                const orderId = window._currentPaymentOrder?.orderId;
                if (orderId) {
                    const allOrders = JSON.parse(localStorage.getItem('joellOrders') || '[]');
                    const order = allOrders.find(o => o.id === orderId);
                    if (order && (order.status === 'pending' || order.status === 'unpaid')) {
                        order.status = 'processing';
                        order.statusLabel = 'Diproses';
                        if (order.timeline) {
                            order.timeline[0] = { 
                                step: 'Pembayaran Diverifikasi', 
                                desc: 'Pembayaran berhasil dikonfirmasi', 
                                time: new Date().toLocaleString('id-ID'), 
                                completed: true 
                            };
                        }
                        localStorage.setItem('joellOrders', JSON.stringify(allOrders));
                        if (typeof syncOrdersToCloud === 'function') syncOrdersToCloud();
                        if (typeof renderOrdersList === 'function') renderOrdersList();
                        if (typeof renderAdminOrders === 'function') renderAdminOrders();
                    }
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
            showToast('Error', result.error || 'Gagal', 'error');
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
                statusEl.textContent = 'Kadaluarsa ⏰'; 
                statusEl.style.color = '#ef4444'; 
            }
            if (window.autoCheckInterval) { 
                clearInterval(window.autoCheckInterval); 
                window.autoCheckInterval = null; 
            }
            let history = getInvoiceHistory();
            const item = history.find(i => i.invoice_id === window.currentInvoiceId);
            if (item) { 
                item.status = 'expired'; 
                setInvoiceHistory(history); 
                if (typeof window.renderInvoiceHistory === 'function') {
                    window.renderInvoiceHistory();
                }
            }
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (displayEl) displayEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        
        // Warning jika kurang dari 2 menit
        if (diff < 120000) {
            displayEl.classList.add('warning');
        }
    }, 1000);
};

window.startAutoCheckStatus = function(invoiceId) {
    if (window.autoCheckInterval) clearInterval(window.autoCheckInterval);
    window.autoCheckInterval = setInterval(() => {
        if (window.currentInvoiceId) {
            window.checkInvoiceStatus(window.currentInvoiceId);
        } else {
            clearInterval(window.autoCheckInterval);
            window.autoCheckInterval = null;
        }
    }, 10000);
};

// ============================================================
// INVOICE HISTORY
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
            </div>`;
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
        const product = item.product || 'Pesanan';
        return `
            <div class="history-item" onclick="window.openInvoiceDetail('${item.invoice_id}')">
                <div class="history-info">
                    <span class="history-id">#${item.invoice_id}</span>
                    <span class="history-product">${product}</span>
                    <span class="history-amount">Rp ${Number(item.total || item.amount).toLocaleString('id-ID')}</span>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-status">
                    <span style="background:${s.bg};color:${s.color}">${s.label}</span>
                    ${item.status === 'pending' ? 
                        `<button onclick="event.stopPropagation(); window.checkInvoiceStatus('${item.invoice_id}')">
                            <i class="fas fa-sync-alt"></i>
                        </button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// ============================================================
// OPEN INVOICE DETAIL
// ============================================================

window.openInvoiceDetail = function(invoiceId) {
    const history = getInvoiceHistory();
    const invoice = history.find(i => i.invoice_id === invoiceId);
    if (!invoice) { 
        showToast('Error', 'Invoice tidak ditemukan', 'error'); 
        return; 
    }

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
    }, expiryDate, invoice.product || 'Pesanan');

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
// OPEN PAYMENT MODAL
// ============================================================

window.openPaymentModal = function(orderData) {
    const overlay = document.getElementById('paymentOverlay');
    if (!overlay) {
        showToast('Error', 'Modal pembayaran tidak ditemukan', 'error');
        return;
    }

    let order = null;
    let total = 0;
    let items = [];
    let productName = '';

    if (typeof orderData === 'string') {
        const allOrders = JSON.parse(localStorage.getItem('joellOrders')) || [];
        order = allOrders.find(o => o.id === orderData);
        if (!order) {
            showToast('Error', 'Pesanan tidak ditemukan', 'error');
            return;
        }
        total = order.total;
        items = order.items;
        productName = order.items.map(i => i.name).join(', ');
        if (productName.length > 30) productName = productName.substring(0, 30) + '...';
    } else if (orderData && orderData.items) {
        order = orderData;
        total = order.total || orderData.items.reduce((s, i) => s + i.price * i.qty, 0);
        items = orderData.items;
        productName = items.map(i => i.name).join(', ');
        if (productName.length > 30) productName = productName.substring(0, 30) + '...';
    } else {
        const cart = JSON.parse(localStorage.getItem('joellCart')) || [];
        if (!cart.length) {
            showToast('Error', 'Keranjang kosong', 'error');
            return;
        }
        total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        items = cart;
        productName = items.map(i => i.name).join(', ');
        if (productName.length > 30) productName = productName.substring(0, 30) + '...';
    }

    const itemsContainer = document.getElementById('paymentOrderItems');
    const totalEl = document.getElementById('paymentOrderTotal');
    
    if (itemsContainer) {
        itemsContainer.innerHTML = items.map(i => 
            `<div class="order-item-line">${i.name} (${i.variant}) x${i.qty} = Rp ${(i.price * i.qty).toLocaleString('id-ID')}</div>`
        ).join('');
    }
    if (totalEl) {
        totalEl.textContent = 'Total: Rp ' + total.toLocaleString('id-ID');
    }

    window._currentPaymentOrder = {
        items: items,
        total: total,
        orderId: order ? order.id : null,
        productName: productName || 'Pesanan JOELL SHOP'
    };

    const qrisContainer = document.getElementById('qrisDisplayContainer');
    if (qrisContainer) {
        qrisContainer.innerHTML = `
            <div class="qris-placeholder">
                <i class="fas fa-qrcode" style="font-size: 3rem; color: var(--accent-light); opacity: 0.5;"></i>
                <p style="color: var(--text-muted); margin-top: 12px;">Klik tombol di bawah untuk generate QRIS</p>
                <p style="color: var(--text-muted); font-size: 0.8rem;">${productName || 'Pesanan JOELL SHOP'}</p>
            </div>
        `;
    }

    if (window.timerInterval) clearInterval(window.timerInterval);
    if (window.autoCheckInterval) { 
        clearInterval(window.autoCheckInterval); 
        window.autoCheckInterval = null; 
    }
    window.currentInvoiceId = null;

    const createBtn = document.getElementById('createInvoiceBtn');
    if (createBtn) {
        createBtn.style.display = 'inline-flex';
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-qrcode"></i> Buat Invoice QRIS';
        
        // AUTO GENERATE QRIS
        setTimeout(() => {
            if (total > 0) {
                window.createInvoice(total, window._currentPaymentOrder.productName);
            }
        }, 500);
    }

    const bankTotalEl = document.getElementById('bankTotal');
    if (bankTotalEl) {
        bankTotalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
    }

    overlay.classList.add('open');
    
    if (typeof window.renderInvoiceHistory === 'function') {
        window.renderInvoiceHistory();
    }
};

// ============================================================
// DOWNLOAD QRIS
// ============================================================

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
// COPY BANK INFO
// ============================================================

window.copyBankInfo = function() {
    const text = `Bank: BCA\nNo Rek: 1234567890\nAtas Nama: JOELL SHOP`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Berhasil', 'Info bank disalin', 'success');
    }).catch(() => showToast('Error', 'Gagal menyalin', 'error'));
};

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Payment System v5.1 Loaded (Clean Version)');

    // Payment method toggle
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

    // Create invoice button
    const createBtn = document.getElementById('createInvoiceBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            const totalEl = document.getElementById('paymentOrderTotal');
            if (totalEl) {
                const total = parseInt(totalEl.textContent.replace(/[^0-9]/g, ''));
                const productName = window._currentPaymentOrder?.productName || 'Pesanan JOELL SHOP';
                if (total > 0) {
                    window.createInvoice(total, productName);
                } else {
                    showToast('Error', 'Total tidak valid', 'error');
                }
            }
        });
    }

    // Close button
    const closeBtn = document.getElementById('paymentCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const overlay = document.getElementById('paymentOverlay');
            if (overlay) overlay.classList.remove('open');
            if (window.timerInterval) clearInterval(window.timerInterval);
            if (window.autoCheckInterval) { 
                clearInterval(window.autoCheckInterval); 
                window.autoCheckInterval = null; 
            }
        });
    }

    // Render history
    window.renderInvoiceHistory();
    
    console.log('✅ Payment System v5.1 Ready - Support All Products');
});