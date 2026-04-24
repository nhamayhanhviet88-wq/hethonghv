// ========== TÌM KIẾM KHÁCH HÀNG HV ==========
async function renderTimKiemKhachHang(container) {
    container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:20px;">
        <div style="margin-bottom:24px;">
            <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#122546;">🔍 Tìm Kiếm Khách Hàng</h2>
            <p style="margin:0;font-size:13px;color:#6b7280;">Tra soát khách hàng xuyên suốt toàn bộ hệ thống — CRM, Telesale, Đơn hàng, Add/Cmt</p>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:24px;">
            <input id="tkkhInput" type="text" placeholder="Nhập tên KH, SĐT, mã đơn hàng, link MXH..." 
                style="flex:1;padding:14px 18px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;transition:border .2s;"
                onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e5e7eb'"
                onkeydown="if(event.key==='Enter')_tkkhSearch()">
            <button onclick="_tkkhSearch()" style="padding:14px 28px;border:none;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.3);transition:all .2s;white-space:nowrap;"
                onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">🔍 Tìm kiếm</button>
        </div>
        <div id="tkkhResults" style="min-height:200px;">
            <div style="text-align:center;padding:60px 20px;">
                <div style="font-size:64px;margin-bottom:16px;opacity:0.3;">🔍</div>
                <div style="font-size:16px;color:#9ca3af;font-weight:600;">Nhập từ khóa để bắt đầu tìm kiếm</div>
                <div style="font-size:12px;color:#d1d5db;margin-top:6px;">Hỗ trợ: Tên KH, SĐT, mã đơn, link Facebook/Zalo...</div>
            </div>
        </div>
    </div>`;
}

// Map crm_type → page ID for navigate()
const _TKKH_CRM_PAGE = {
    nhu_cau: 'crm-nhu-cau',
    ctv_hoa_hong: 'cham-soc-affiliate',
    ctv: 'crm-ctv',
    koc_tiktok: 'cham-soc-koc-kol'
};

function _tkkhGoTo(pageId, customerId) {
    if (customerId) sessionStorage.setItem('_tkkhTargetCustomer', customerId);
    navigate(pageId);
}

async function _tkkhSearch() {
    const input = document.getElementById('tkkhInput');
    const resultsEl = document.getElementById('tkkhResults');
    if (!input || !resultsEl) return;
    const q = input.value.trim();
    if (!q) { showToast('Vui lòng nhập từ khóa tìm kiếm', 'error'); return; }
    if (q.length < 2) { showToast('Từ khóa tối thiểu 2 ký tự', 'error'); return; }

    resultsEl.innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:32px;margin-bottom:8px;">⏳</div><div style="color:#6b7280;font-weight:600;">Đang tìm kiếm...</div></div>';

    try {
        const data = await apiCall('/api/search/customers?q=' + encodeURIComponent(q));
        _tkkhRenderResults(data, q);
    } catch(e) {
        resultsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;">❌ Lỗi tìm kiếm: ' + (e.message||'') + '</div>';
    }
}

function _tkkhRenderResults(data, query) {
    const el = document.getElementById('tkkhResults');
    if (!el) return;

    const crm = data.crm || [];
    const telesale = data.telesale || [];
    const orders = data.orders || [];
    const addcmt = data.addcmt || [];
    const total = crm.length + telesale.length + orders.length + addcmt.length;

    if (total === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:12px;">😕</div>
            <div style="font-size:16px;font-weight:700;color:#6b7280;">Không tìm thấy kết quả cho "${query}"</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:6px;">Thử tìm bằng SĐT, tên khách hàng hoặc mã đơn hàng</div>
        </div>`;
        return;
    }

    const fmtDate = (d) => { if(!d) return '—'; const p=(d||'').slice(0,10).split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d; };
    const highlight = (text) => {
        if (!text || !query) return text || '';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return String(text).replace(new RegExp('(' + escaped + ')', 'gi'), '<mark style="background:#fef08a;padding:1px 2px;border-radius:2px;">$1</mark>');
    };

    let html = `<div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#1d4ed8;">${total}</div>
            <div style="font-size:11px;color:#1e40af;font-weight:600;">Kết quả tìm thấy</div>
        </div>
        <div style="flex:1;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#166534;">${crm.length}</div>
            <div style="font-size:11px;color:#15803d;font-weight:600;">CRM</div>
        </div>
        <div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fecaca);border:2px solid #fca5a5;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#dc2626;">${telesale.length}</div>
            <div style="font-size:11px;color:#991b1b;font-weight:600;">Telesale</div>
        </div>
        <div style="flex:1;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#7c3aed;">${orders.length}</div>
            <div style="font-size:11px;color:#6d28d9;font-weight:600;">Đơn hàng</div>
        </div>
    </div>`;

    const CRM_LABELS = { nhu_cau:'Chăm Sóc KH Nhu Cầu', ctv_hoa_hong:'Chăm Sóc Affiliate', ctv:'Chăm Sóc CTV', koc_tiktok:'Chăm Sóc KOL/KOC Tiktok' };

    // CRM Results
    if (crm.length > 0) {
        html += `<div style="margin-bottom:20px;">
            <div style="font-size:15px;font-weight:800;color:#166534;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
                <span style="background:#dcfce7;padding:4px 8px;border-radius:8px;">🏷️</span> CRM 
                <span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:12px;">${crm.length}</span>
            </div>`;
        crm.forEach(c => {
            const crmLabel = CRM_LABELS[c.crm_type] || c.crm_type || '—';
            const targetPage = _TKKH_CRM_PAGE[c.crm_type] || 'crm-nhu-cau';
            html += `<div onclick="_tkkhGoTo('${targetPage}', ${c.id})" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:8px;background:white;transition:all .15s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.borderColor='#16a34a'" onmouseout="this.style.boxShadow='none';this.style.borderColor='#bbf7d0'">
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;flex-shrink:0;">👤</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1e293b;">${highlight(c.customer_name || '—')}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:3px;display:flex;flex-wrap:wrap;gap:8px;">
                        <span>📞 ${highlight(c.phone || '—')}</span>
                        ${c.phone2 ? '<span>📱 ' + highlight(c.phone2) + '</span>' : ''}
                        ${c.facebook_link ? '<span>🔗 ' + highlight(c.facebook_link).substring(0,40) + '...</span>' : ''}
                        <span>📅 ${fmtDate(c.created_at)}</span>
                    </div>
                    <div style="font-size:11px;margin-top:3px;display:flex;flex-wrap:wrap;gap:6px;">
                        <span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:6px;font-weight:600;">${crmLabel}</span>
                        ${c.order_status ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-weight:600;">' + c.order_status + '</span>' : ''}
                        <span style="color:#9ca3af;">👤 NV: ${c.created_by_name || '—'}</span>
                        ${c.consult_count > 0 ? '<span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:6px;font-weight:600;">💬 ' + c.consult_count + ' lần tư vấn</span>' : ''}
                        ${c.order_count > 0 ? '<span style="background:#fce7f3;color:#be185d;padding:2px 8px;border-radius:6px;font-weight:600;">📦 ' + c.order_count + ' đơn</span>' : ''}
                    </div>
                </div>
                <div style="flex-shrink:0;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#166534;">📋 Xem →</div>
            </div>`;
        });
        html += '</div>';
    }

    // Telesale Results
    if (telesale.length > 0) {
        html += `<div style="margin-bottom:20px;">
            <div style="font-size:15px;font-weight:800;color:#dc2626;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
                <span style="background:#fecaca;padding:4px 8px;border-radius:8px;">📞</span> Telesale 
                <span style="background:#fecaca;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:12px;">${telesale.length}</span>
            </div>`;
        telesale.forEach(t => {
            html += `<div onclick="navigate('goidien')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #fecaca;border-radius:12px;margin-bottom:8px;background:white;transition:all .15s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.borderColor='#ef4444'" onmouseout="this.style.boxShadow='none';this.style.borderColor='#fecaca'">
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;flex-shrink:0;">📞</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1e293b;">${highlight(t.customer_name || t.company_name || '—')}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:3px;display:flex;flex-wrap:wrap;gap:8px;">
                        <span>📞 ${highlight(t.phone || '—')}</span>
                        ${t.fb_link ? '<span>🔗 ' + highlight(t.fb_link).substring(0,40) + '</span>' : ''}
                        ${t.address ? '<span>📍 ' + t.address + '</span>' : ''}
                    </div>
                    <div style="font-size:11px;margin-top:3px;display:flex;flex-wrap:wrap;gap:6px;">
                        <span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:6px;font-weight:600;">Telesale</span>
                        <span style="color:#9ca3af;">Trạng thái: ${t.status || '—'}</span>
                        ${t.assigned_to_name ? '<span style="color:#9ca3af;">👤 NV: ' + t.assigned_to_name + '</span>' : ''}
                        <span style="color:#9ca3af;">📅 ${fmtDate(t.created_at)}</span>
                    </div>
                </div>
                <div style="flex-shrink:0;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#dc2626;">📞 Xem →</div>
            </div>`;
        });
        html += '</div>';
    }

    // Order Results
    if (orders.length > 0) {
        html += `<div style="margin-bottom:20px;">
            <div style="font-size:15px;font-weight:800;color:#7c3aed;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
                <span style="background:#ede9fe;padding:4px 8px;border-radius:8px;">📦</span> Đơn hàng 
                <span style="background:#ede9fe;color:#6d28d9;padding:2px 10px;border-radius:12px;font-size:12px;">${orders.length}</span>
            </div>`;
        orders.forEach(o => {
            const orderTargetPage = _TKKH_CRM_PAGE[o.crm_type] || 'crm-nhu-cau';
            html += `<div onclick="_tkkhGoTo('${orderTargetPage}', ${o.customer_id || 0})" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #c4b5fd;border-radius:12px;margin-bottom:8px;background:white;transition:all .15s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.borderColor='#7c3aed'" onmouseout="this.style.boxShadow='none';this.style.borderColor='#c4b5fd'">
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;flex-shrink:0;">📦</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1e293b;">Mã đơn: ${highlight(o.order_code)}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:3px;">
                        👤 KH: ${highlight(o.customer_name || '—')} · 📞 ${highlight(o.phone || '—')} · 📅 ${fmtDate(o.created_at)}
                    </div>
                    <div style="font-size:11px;margin-top:3px;">
                        <span style="background:#f5f3ff;color:#7c3aed;padding:2px 8px;border-radius:6px;font-weight:600;">Trạng thái: ${o.status || '—'}</span>
                        ${o.deposit_amount > 0 ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-weight:600;margin-left:4px;">💰 ' + Number(o.deposit_amount).toLocaleString() + 'đ</span>' : ''}
                        <span style="color:#9ca3af;margin-left:4px;">👤 NV: ${o.user_name || '—'}</span>
                    </div>
                </div>
                <div style="flex-shrink:0;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#7c3aed;">📦 Xem →</div>
            </div>`;
        });
        html += '</div>';
    }

    // Add/Cmt Results
    if (addcmt.length > 0) {
        html += `<div style="margin-bottom:20px;">
            <div style="font-size:15px;font-weight:800;color:#0891b2;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
                <span style="background:#cffafe;padding:4px 8px;border-radius:8px;">👥</span> Add/Cmt 
                <span style="background:#cffafe;color:#0e7490;padding:2px 10px;border-radius:12px;font-size:12px;">${addcmt.length}</span>
            </div>`;
        addcmt.forEach(a => {
            html += `<div onclick="navigate('addcmtdoitackh')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #a5f3fc;border-radius:12px;margin-bottom:8px;background:white;transition:all .15s;cursor:pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.borderColor='#06b6d4'" onmouseout="this.style.boxShadow='none';this.style.borderColor='#a5f3fc'">
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#06b6d4,#0891b2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;flex-shrink:0;">👥</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1e293b;">🔗 ${highlight(a.fb_link || '—')}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:3px;">
                        👤 NV: ${a.user_name || '—'} · 📅 ${fmtDate(a.entry_date)}
                    </div>
                </div>
                <div style="flex-shrink:0;background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;color:#0891b2;">👥 Xem →</div>
            </div>`;
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// ========== SCROLL TO TARGET ROW (shared utility for CRM pages) ==========
function _tkkhScrollToRow(customerId) {
    const row = document.querySelector(`tr[data-customer-id="${customerId}"]`);
    if (!row) {
        showToast('🔍 Khách hàng đã được tìm thấy nhưng không nằm trong trang hiện tại', 'info');
        return;
    }
    // Inject highlight animation CSS (once)
    if (!document.getElementById('_tkkhHighlightCSS')) {
        const style = document.createElement('style');
        style.id = '_tkkhHighlightCSS';
        style.textContent = `
            @keyframes _tkkhBlink {
                0%, 100% { background: transparent; }
                50% { background: linear-gradient(90deg, rgba(250,210,76,0.35), rgba(245,158,11,0.20), rgba(250,210,76,0.35)); }
            }
            tr._tkkh-highlight {
                animation: _tkkhBlink 0.8s ease-in-out 5;
                outline: 2px solid #f59e0b;
                outline-offset: -1px;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    // Scroll into center of viewport
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Apply highlight class
    row.classList.add('_tkkh-highlight');
    // Remove after animation completes (5 cycles × 0.8s = 4s)
    setTimeout(() => {
        row.classList.remove('_tkkh-highlight');
    }, 4500);
}
