// ========== THEO DÕI TƯ VẤN KHÁCH ==========
// Dynamic consult types — loaded from API, auto-syncs with admin config
let CONSULT_TYPES_HH = {};

// System-generated types (not in DB but appear in consultation_logs)
const CONSULT_TYPES_FALLBACK = {
    khong_xu_ly: { icon: '⚠️', label: 'Không Xử Lý', color: '#f59e0b', textColor: 'white' },
    chuyen_doi_crm: { icon: '🔀', label: 'Chuyển Đổi CRM', color: '#6366f1', textColor: 'white' }
};

async function hhLoadConsultTypes() {
    try {
        // Load ALL CRM modules in parallel so buttons match any source
        const modules = ['nhu_cau', 'ctv', 'affiliate', 'koc_kol'];
        const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('token') };
        const results = await Promise.all(
            modules.map(m => fetch('/api/consult-types?crm_menu=' + m, { headers }).then(r => r.json()))
        );
        const map = {};
        results.forEach(data => {
            (data.types || []).forEach(t => {
                // First module wins for duplicates — nhu_cau has priority
                if (!map[t.key]) {
                    map[t.key] = { icon: t.icon || '📝', label: t.label, color: t.color || '#6b7280', textColor: t.text_color || 'white' };
                }
            });
        });
        // Merge fallbacks for system-generated types
        Object.assign(map, CONSULT_TYPES_FALLBACK);
        CONSULT_TYPES_HH = map;
    } catch (e) {
        console.warn('[HH] Failed to load consult types, using fallback');
        CONSULT_TYPES_HH = { ...CONSULT_TYPES_FALLBACK };
    }
}

function hhFormatMoney(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
}

async function hhViewOrders(customerId, customerName) {
    // Remove existing popup
    const existing = document.getElementById('hhOrderPopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hhOrderPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:16px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;font-weight:700;font-size:15px;">📦 Mã Đơn — ${customerName}</div>
            <span onclick="document.getElementById('hhOrderPopup').remove()" style="color:white;cursor:pointer;font-size:22px;line-height:1;">✕</span>
        </div>
        <div style="padding:20px;" id="hhOrderPopupBody">
            <div style="text-align:center;padding:30px;color:#9ca3af;">Đang tải...</div>
        </div>
    </div>`;
    document.body.appendChild(overlay);

    try {
        const data = await apiCall('/api/customers/' + customerId + '/order-codes');
        const codes = data.codes || [];
        if (codes.length === 0) {
            document.getElementById('hhOrderPopupBody').innerHTML = '<div style="text-align:center;padding:30px;color:#9ca3af;">Chưa có đơn hàng nào</div>';
            return;
        }

        const statusMap = { active: { label: 'Đang xử lý', color: '#3b82f6', icon: '⏳' }, completed: { label: 'Hoàn thành', color: '#10b981', icon: '✅' }, cancelled: { label: 'Đã hủy', color: '#ef4444', icon: '❌' } };
        let grandTotal = 0;

        let html = codes.map(code => {
            const st = statusMap[code.status] || statusMap.active;
            const orderTotal = (code.items || []).reduce((s, it) => s + (it.total || 0), 0);
            if (code.status !== 'cancelled') grandTotal += orderTotal;
            const deposit = code.deposit || 0;
            const remaining = orderTotal - deposit;

            return `<div style="border:2px solid ${st.color}22;border-radius:12px;margin-bottom:14px;overflow:hidden;">
                <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;background:${st.color}08;">
                    <div>
                        <span style="font-weight:800;font-size:15px;color:#1e3a5f;">${code.order_code}</span>
                        <span style="font-size:11px;color:#6b7280;margin-left:8px;">NV: ${code.user_name || '-'}</span>
                        <span style="font-size:11px;color:#6b7280;margin-left:8px;">Ngày: ${code.created_at ? new Date(code.created_at).toLocaleDateString('vi-VN') : '-'}</span>
                    </div>
                    <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:${st.color};color:white;font-weight:600;">${st.icon} ${st.label}</span>
                </div>
                ${(code.items && code.items.length > 0) ? `
                <table style="width:100%;font-size:12px;margin:0;">
                    <thead><tr style="background:#f1f5f9;">
                        <th style="padding:6px 10px;text-align:left;">Tên SP</th>
                        <th style="padding:6px 10px;text-align:center;">SL</th>
                        <th style="padding:6px 10px;text-align:right;">Giá</th>
                        <th style="padding:6px 10px;text-align:right;">Thành Tiền</th>
                    </tr></thead>
                    <tbody>${code.items.map(it => `<tr>
                        <td style="padding:5px 10px;">${it.description || '-'}</td>
                        <td style="padding:5px 10px;text-align:center;">${it.quantity}</td>
                        <td style="padding:5px 10px;text-align:right;">${hhFormatMoney(it.unit_price)}</td>
                        <td style="padding:5px 10px;text-align:right;font-weight:600;">${hhFormatMoney(it.total)}</td>
                    </tr>`).join('')}</tbody>
                </table>
                <div style="padding:8px 14px;font-size:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:16px;">
                    <span>Tổng đơn: <strong style="color:#1e3a5f;">${hhFormatMoney(orderTotal)}</strong></span>
                    ${deposit > 0 ? `<span>Cọc: <strong style="color:#f97316;">${hhFormatMoney(deposit)}</strong></span>` : ''}
                    ${deposit > 0 ? `<span>Còn lại: <strong style="color:#dc2626;">${hhFormatMoney(remaining)}</strong></span>` : ''}
                </div>` : '<div style="padding:12px 14px;font-size:12px;color:#9ca3af;">Chưa có sản phẩm</div>'}
            </div>`;
        }).join('');

        html += `<div style="text-align:right;padding:10px 0;border-top:2px solid #e5e7eb;margin-top:4px;">
            <span style="font-size:15px;font-weight:800;color:#1e3a5f;">Tổng doanh số: <span style="color:#10b981;">${hhFormatMoney(grandTotal)}</span></span>
        </div>`;

        document.getElementById('hhOrderPopupBody').innerHTML = html;
    } catch (e) {
        document.getElementById('hhOrderPopupBody').innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">Lỗi: ${e.message}</div>`;
    }
}

async function hhShowCustomerPopup(customerId) {
    const existing = document.getElementById('hhCustomerPopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hhCustomerPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;color:#6b7280;font-size:14px;">⏳ Đang tải...</div>';
    document.body.appendChild(overlay);

    try {
        // Get revenue from already-loaded data
        const hhItem = (window._hhData?.items || []).find(x => x.id === customerId);
        const totalRevenue = hhItem ? (hhItem.total_revenue || 0) : 0;
        const commission = hhItem ? (hhItem.commission || 0) : 0;
        const rate = hhItem ? (hhItem.rate || 0) : 0;
        const orderCount = hhItem ? (hhItem.order_count || 0) : 0;

        const logData = await fetch('/api/customers/' + customerId + '/consult-logs', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        }).then(r => r.json());
        const logs = logData.logs || [];

        // Show all logs (including khong_xu_ly)
        const visibleLogs = logs;

        const logRows = visibleLogs.length > 0 ? visibleLogs.map((l, idx) => {
            const ct = CONSULT_TYPES_HH[l.log_type] || { icon: '📝', label: l.log_type, color: '#6b7280', textColor: 'white' };
            const date = l.created_at ? new Date(l.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            const by = l.logged_by_name || '';
            const content = l.content || '';
            const isLast = idx === visibleLogs.length - 1;
            return `<div style="display:flex;gap:12px;position:relative;">
                <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
                    <div style="width:36px;height:36px;border-radius:50%;background:${ct.color};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px ${ct.color}40;border:2px solid white;">${ct.icon}</div>
                    ${!isLast ? '<div style="width:2px;flex:1;background:linear-gradient(to bottom,#e2e8f0,#f1f5f9);margin:4px 0;"></div>' : ''}
                </div>
                <div style="flex:1;min-width:0;padding-bottom:${isLast ? '8' : '16'}px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                        <span style="font-size:12px;font-weight:700;color:${ct.color};letter-spacing:0.2px;">${ct.label}</span>
                    </div>
                    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">${date}${by ? ' — ' + by : ''}</div>
                    ${content ? `<div style="font-size:12px;color:#374151;line-height:1.6;word-break:break-word;background:#f8fafc;padding:8px 12px;border-radius:8px;border-left:3px solid ${ct.color};">${content}</div>` : ''}
                    ${l.image_path ? `<img src="${l.image_path}" style="max-width:140px;max-height:100px;border-radius:8px;margin-top:6px;cursor:pointer;border:1px solid #e2e8f0;" onclick="window.open('${l.image_path}','_blank')">` : ''}
                </div>
            </div>`;
        }).join('') : '<div style="padding:30px;text-align:center;color:#9ca3af;font-size:13px;">Chưa có lịch sử tư vấn</div>';

        const custName = hhItem?.customer_name || 'Khách hàng';
        const phone = hhItem?.phone || '';
        const refLabel = hhItem?.is_direct ? '🎯 Trực tiếp' : '👥 ' + (hhItem?.referrer_name || '');
        const createdAt = hhItem?.last_contact_date ? new Date(hhItem.last_contact_date).toLocaleDateString('vi-VN') : '—';

        overlay.innerHTML = `<div style="background:white;border-radius:20px;width:100%;max-width:580px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f,#2d5a8e);padding:20px 24px;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <div style="color:#fad24c;font-size:18px;font-weight:800;letter-spacing:0.3px;">${custName}</div>
                        <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;">${phone} ${refLabel ? '· ' + refLabel : ''}</div>
                    </div>
                    <span onclick="document.getElementById('hhCustomerPopup').remove()" style="cursor:pointer;color:rgba(255,255,255,0.5);font-size:22px;padding:0 4px;transition:color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">✕</span>
                </div>
                <div style="display:flex;gap:10px;margin-top:16px;">
                    <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;padding:10px;text-align:center;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Doanh số</div>
                        <div style="font-size:16px;font-weight:800;color:#f87171;margin-top:2px;">${hhFormatMoney(totalRevenue)}</div>
                    </div>
                    <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;padding:10px;text-align:center;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Hoa hồng ${rate}%</div>
                        <div style="font-size:16px;font-weight:800;color:#34d399;margin-top:2px;">${hhFormatMoney(commission)}</div>
                    </div>
                    <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;padding:10px;text-align:center;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Đơn hàng</div>
                        <div style="font-size:16px;font-weight:800;color:#60a5fa;margin-top:2px;">${orderCount}</div>
                    </div>
                </div>
            </div>
            <div style="padding:12px 24px;background:linear-gradient(90deg,#fefce8,#fffbeb);border-bottom:1px solid #fde68a;display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;">📜</span>
                <span style="font-size:13px;font-weight:700;color:#92400e;">Lịch Sử Tư Vấn</span>
                <span style="font-size:11px;color:#b45309;font-weight:600;background:#fde68a;padding:2px 8px;border-radius:10px;">${visibleLogs.length}</span>
            </div>
            <div style="overflow-y:auto;flex:1;padding:16px 24px;">${logRows}</div>
        </div>`;
    } catch (e) {
        overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;color:#ef4444;font-size:14px;">❌ Lỗi tải dữ liệu</div>';
    }
}

async function renderBaoCaoHoaHongPage(container, crmFilter) {
    // Store filter for use in popups
    window._hhCrmFilter = crmFilter || '';
    const pageTitle = crmFilter === 'ctv_hoa_hong' ? '🤝 Theo Dõi Tư Vấn Affiliate' : '📋 Theo Dõi Tư Vấn Khách';
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>${pageTitle}</h3>
            </div>
            <div class="card-body" style="overflow-x:auto;">
                <div id="hhSummary" style="margin-bottom:20px;"></div>
                <div id="hhSearchFilter" style="margin-bottom:14px;"></div>
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
                    <table style="min-width:800px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th style="width:30px;text-align:center;padding:4px 2px;" title="Tài Khoản Affiliate">🔑</th>
                                <th>Tên KH</th>
                                <th>Người GT</th>
                                <th>SĐT</th>
                                <th style="text-align:center;">Xem Đơn</th>
                                <th>Nút Tư Vấn</th>
                                <th>Nội Dung TV</th>
                                <th>Doanh Thu</th>
                                <th>Tỷ Lệ HH</th>
                                <th>Hoa Hồng</th>
                                <th>Ngày Hẹn</th>
                                <th>Ngày Liên Hệ</th>
                            </tr>
                        </thead>
                        <tbody id="hhTableBody">
                            <tr><td colspan="13" class="text-center text-muted" style="padding:40px;">Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="hhPagination" style="margin-top:12px;"></div>
            </div>
        </div>
    `;

    try {
        // Load consult button types from admin config (auto-sync)
        await hhLoadConsultTypes();
        const apiUrl = '/api/affiliate/commission' + (crmFilter ? '?crm_filter=' + crmFilter : '');
        const data = await apiCall(apiUrl);
        if (!data.success) {
            document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="13" class="text-center text-muted">Lỗi tải dữ liệu</td></tr>`;
            return;
        }

        // Store data globally for filtering
        window._hhData = data;

        // Fetch affiliate account statuses for badge display
        try {
            const affStatus = await apiCall('/api/affiliate-account/batch-status');
            window._hhAffApprovedIds = affStatus.approvedCustomerIds || [];
            window._hhAffLockedIds = affStatus.lockedCustomerIds || [];
            window._hhAffPendingIds = affStatus.pendingCustomerIds || [];
            window._hhAffApprovedMap = affStatus.approvedMap || {};
        } catch(e) { window._hhAffApprovedIds = []; window._hhAffLockedIds = []; window._hhAffPendingIds = []; window._hhAffApprovedMap = {}; }


        // Summary cards (clickable)
        const directCommission = data.items.filter(i => i.is_direct).reduce((s, i) => s + (i.commission || 0), 0);
        const childCommission = data.items.filter(i => !i.is_direct).reduce((s, i) => s + (i.commission || 0), 0);
        const directRate = data.items.find(i => i.is_direct)?.rate || 10;
        const childRate = data.items.find(i => !i.is_direct)?.rate || 5;

        document.getElementById('hhSummary').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div onclick="hhShowCommissionPopup()" style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#f59e0b'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:18px;font-weight:800;color:#92400e;word-break:break-all;">${hhFormatMoney(data.totalCommission)}</div>
                    <div style="font-size:11px;color:#78350f;margin-top:4px;">💰 Tổng Hoa Hồng (Trực Tiếp ${directRate}%, Gián Tiếp ${childRate}%)</div>
                    <div style="font-size:9px;color:#92400e;opacity:0.6;margin-top:2px;">▶ Xem chi tiết</div>
                </div>
                <div onclick="hhShowAllOrdersPopup()" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#3b82f6'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:24px;font-weight:800;color:#1e40af;">${data.totalOrders || 0}</div>
                    <div style="font-size:11px;color:#1e3a8a;margin-top:4px;">📦 Tổng Đơn Đặt Hàng</div>
                    <div style="font-size:9px;color:#1e40af;opacity:0.6;margin-top:2px;">▶ Xem chi tiết</div>
                </div>
                ${crmFilter === 'ctv_hoa_hong' ? `<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:14px 10px;border-radius:12px;text-align:center;border:2px solid transparent;">
                    <div style="font-size:24px;font-weight:800;color:#065f46;">${data.items.length}</div>
                    <div style="font-size:11px;color:#064e3b;margin-top:4px;">👥 Tổng Số Lượng Affiliate</div>
                </div>
                <div onclick="hhShowAffAccountList()" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#8b5cf6'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:24px;font-weight:800;color:#5b21b6;">${(() => { const _ids = data.items.map(i => i.id); return (window._hhAffApprovedIds||[]).filter(id => _ids.includes(id)).length; })()}</div>
                    <div style="font-size:11px;color:#4c1d95;margin-top:4px;">🔑 Tổng Số Affiliate Có TK</div>
                    <div style="font-size:9px;color:#5b21b6;opacity:0.6;margin-top:2px;">▶ Xem danh sách</div>
                </div>` : `<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:14px 10px;border-radius:12px;text-align:center;border:2px solid transparent;">
                    <div style="font-size:24px;font-weight:800;color:#065f46;">${data.items.length}</div>
                    <div style="font-size:11px;color:#064e3b;margin-top:4px;">👥 Tổng Số Lượng Khách Hàng</div>
                </div>
                <div onclick="hhShowCancelledList()" style="background:linear-gradient(135deg,#fee2e2,#fecaca);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#ef4444'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:24px;font-weight:800;color:#dc2626;">${data.items.filter(i => i.cancel_approved === 1).length}</div>
                    <div style="font-size:11px;color:#991b1b;margin-top:4px;">❌ Tổng Số Hủy Khách Hàng</div>
                    <div style="font-size:9px;color:#dc2626;opacity:0.6;margin-top:2px;">▶ Xem danh sách</div>
                </div>`}
            </div>
        `;

        // Search and Filter bar
        const referrerOptions = (data.referrerNames || []).map(n => `<option value="${n}">${n}</option>`).join('');
        document.getElementById('hhSearchFilter').innerHTML = `
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <div style="position:relative;flex:1;min-width:200px;">
                    <input type="text" id="hhSearch" placeholder="🔍 Tìm tên KH, SĐT, Người GT..." 
                        style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;outline:none;"
                        oninput="hhFilterTable()">
                </div>
                <select id="hhFilterGT" onchange="hhFilterTable()" style="padding:9px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;min-width:140px;outline:none;cursor:pointer;">
                    <option value="">Tất cả Người GT</option>
                    ${referrerOptions}
                </select>
            </div>
        `;

        // Render table
        hhRenderTable(data.items);
    } catch (e) {
        document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="13" class="text-center text-muted">Lỗi: ${e.message}</td></tr>`;
    }
}

function _hhIsMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

const HH_PAGE_SIZE = 50;
let _hhPage = 1;

function hhRenderTable(items) {
    // Store filtered items for pagination
    window._hhFilteredItems = items;

    const paginationEl = document.getElementById('hhPagination');

    if (items.length === 0) {
        document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="13" class="text-center text-muted" style="padding:40px;">Không có khách hàng phù hợp</td></tr>`;
        document.getElementById('hhTableBody').className = '';
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    // Pagination calc
    const totalPages = Math.ceil(items.length / HH_PAGE_SIZE);
    if (_hhPage > totalPages) _hhPage = totalPages;
    if (_hhPage < 1) _hhPage = 1;
    const startIdx = (_hhPage - 1) * HH_PAGE_SIZE;
    const pageItems = items.slice(startIdx, startIdx + HH_PAGE_SIZE);

    // Mobile: compact list + tap for detail
    if (_hhIsMobile()) {
        // Hide table header + kill table width overflow
        var table = document.querySelector('#hhTableBody')?.closest('table');
        var thead = table?.querySelector('thead');
        if (thead) thead.classList.add('hh-mobile-table-hide');
        if (table) { table.style.minWidth = 'auto'; table.style.width = '100%'; }
        // Kill overflow on parent wrapper
        var wrapper = table?.parentElement;
        if (wrapper) wrapper.style.overflow = 'hidden';

        var tbody = document.getElementById('hhTableBody');
        tbody.className = 'hh-mobile-cards';

        tbody.innerHTML = pageItems.map((item, i) => {
            const globalIdx = startIdx + i;
            const commAmt = item.commission > 0 ? hhFormatMoney(item.commission) : '0₫';
            const revenueAmt = hhFormatMoney(item.total_revenue);
            const refLabel = item.is_direct ? '🎯 Trực tiếp' : '👥 ' + (item.referrer_name || '-');
            const borderColor = item.is_direct ? '#10b981' : '#8b5cf6';
            const bgColor = item.is_direct ? '#fefce8' : '#f5f3ff';
            const hasRevenue = item.total_revenue > 0;

            return `<div class="hh-card" style="border-left:4px solid ${borderColor};background:${bgColor};padding:12px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;" onclick="hhShowMobileDetail(${globalIdx})">
                <div style="flex:1;min-width:0;">
                    <div style="display:inline-flex;align-items:center;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fad24c;padding:4px 12px;border-radius:10px;font-size:12px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:0.2px;">${(() => { if ((window._hhAffLockedIds||[]).includes(item.id)) return '🔒 '; if ((window._hhAffApprovedIds||[]).includes(item.id)) return '🔑 '; if ((window._hhAffPendingIds||[]).includes(item.id)) return '⏳ '; return ''; })()}${item.customer_name}</div>
                    <div style="font-size:11px;color:${item.is_direct ? '#059669' : '#7c3aed'};font-weight:600;margin-top:5px;letter-spacing:0.1px;">${refLabel}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;background:${hasRevenue ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : '#f8fafc'};padding:8px 12px;border-radius:10px;min-width:105px;border:1px solid ${hasRevenue ? '#fecaca' : '#e2e8f0'};">
                    <div style="font-size:13px;font-weight:800;color:${hasRevenue ? '#dc2626' : '#94a3b8'};letter-spacing:-0.3px;">${revenueAmt}</div>
                    <div style="font-size:11px;font-weight:700;color:${item.commission > 0 ? '#059669' : '#94a3b8'};margin-top:2px;">HH: ${commAmt}</div>
                </div>
            </div>`;
        }).join('');
    } else {
        // Desktop: original table
        var thead = document.querySelector('#hhTableBody')?.closest('table')?.querySelector('thead');
        if (thead) thead.classList.remove('hh-mobile-table-hide');
        document.getElementById('hhTableBody').className = '';

        document.getElementById('hhTableBody').innerHTML = pageItems.map((item, i) => {
            const globalIdx = startIdx + i;
            const commissionDisplay = item.commission > 0 
                ? `<span style="color:#10b981;font-weight:700;">${hhFormatMoney(item.commission)}</span>` 
                : `<span style="color:#9ca3af;">—</span>`;
            
            // Determine button type: sync with CRM modules — prioritize last_log_type (consultation_logs)
            // Only override with order_status for special statuses (tu_van_lai, cho_duyet_huy, duyet_huy)
            const OVERRIDE_STATUSES_HH = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
            let ct = null;
            if (item.last_log_type && CONSULT_TYPES_HH[item.last_log_type]) ct = CONSULT_TYPES_HH[item.last_log_type];
            if (OVERRIDE_STATUSES_HH.includes(item.order_status) && CONSULT_TYPES_HH[item.order_status]) ct = CONSULT_TYPES_HH[item.order_status];
            const consultBtn = ct 
                ? `<span onclick="hhShowCustomerPopup(${item.id})" style="cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${ct.color};color:${ct.textColor};font-weight:600;white-space:nowrap;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${ct.icon} ${ct.label}</span>`
                : `<span onclick="hhShowCustomerPopup(${item.id})" style="cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-600);color:white;font-weight:600;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">📋 Tư Vấn</span>`;

            let contentShort = item.last_log_content || '';
            if (contentShort.length > 30) contentShort = contentShort.substring(0, 30) + '...';
            
            const referrerDisplay = item.is_direct 
                ? `<span style="font-size:11px;color:#10b981;font-weight:600;">🎯 Trực tiếp</span>` 
                : `<span style="font-size:11px;color:#8b5cf6;font-weight:600;">👥 ${item.referrer_name}</span>`;

            const contactDate = item.last_contact_date ? new Date(item.last_contact_date).toLocaleDateString('vi-VN') : '-';

            return `<tr style="background:${item.is_direct ? '#fefce8' : '#f5f3ff'};">
                <td>${globalIdx + 1}</td>
                <td style="text-align:center;padding:4px 2px;font-size:14px;">${(() => { if ((window._hhAffLockedIds||[]).includes(item.id)) return '<span title="TK Affiliate bị khóa" style="cursor:help;">🔒</span>'; if ((window._hhAffApprovedIds||[]).includes(item.id)) return '<span title="Có TK Affiliate" style="cursor:help;">🔑</span>'; if ((window._hhAffPendingIds||[]).includes(item.id)) return '<span title="Đang chờ duyệt TK" style="cursor:help;">⏳</span>'; return ''; })()}</td>
                <td><span onclick="hhShowCustomerPopup(${item.id})" style="cursor:pointer;display:inline-flex;align-items:center;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fad24c;padding:4px 12px;border-radius:16px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid rgba(212,168,67,0.3);transition:all 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(212,168,67,0.3)';this.style.borderColor='#fad24c'" onmouseout="this.style.boxShadow='none';this.style.borderColor='rgba(212,168,67,0.3)'">${item.customer_name}</span></td>
                <td>${referrerDisplay}</td>
                <td>${item.phone || '-'}</td>
                <td style="text-align:center;">${item.order_count > 0 ? `<span onclick="hhViewOrders(${item.id}, '${item.customer_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" style="cursor:pointer;font-size:12px;padding:4px 10px;border-radius:6px;background:#3b82f6;color:white;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;" title="Xem đơn hàng">📋 Xem Đơn</span>` : '<span style="color:#9ca3af;">—</span>'}</td>
                <td>${consultBtn}</td>
                <td style="font-size:12px;color:#e65100;font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;text-decoration:underline;" title="${(item.last_log_content || '').replace(/"/g, '&quot;')}" onclick="hhShowCustomerPopup(${item.id})">${contentShort || '<span style="color:var(--gray-400)">—</span>'}</td>
                <td>${hhFormatMoney(item.total_revenue)}</td>
                <td>${item.rate}%</td>
                <td>${commissionDisplay}</td>
                <td>${item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('vi-VN') : '<span style="color:#9ca3af">—</span>'}</td>
                <td>${contactDate}</td>
            </tr>`;
        }).join('');
    }

    // Render pagination
    if (paginationEl) {
        if (totalPages <= 1) {
            paginationEl.innerHTML = `<div style="text-align:center;font-size:12px;color:#9ca3af;padding:8px;">Hiển thị ${items.length} khách hàng</div>`;
        } else {
            const prevDisabled = _hhPage <= 1 ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
            const nextDisabled = _hhPage >= totalPages ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
            paginationEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 0;">
                <span onclick="hhGoPage(_hhPage - 1)" style="padding:6px 14px;border-radius:8px;background:#3b82f6;color:white;font-size:13px;font-weight:600;${prevDisabled}transition:opacity 0.2s;">◀ Trước</span>
                <span style="font-size:13px;font-weight:700;color:#1e293b;">Trang ${_hhPage} / ${totalPages}</span>
                <span onclick="hhGoPage(_hhPage + 1)" style="padding:6px 14px;border-radius:8px;background:#3b82f6;color:white;font-size:13px;font-weight:600;${nextDisabled}transition:opacity 0.2s;">Sau ▶</span>
                <span style="font-size:11px;color:#9ca3af;">(${items.length} KH)</span>
            </div>`;
        }
    }
}

function hhGoPage(page) {
    _hhPage = page;
    hhRenderTable(window._hhFilteredItems || []);
    // Scroll to top of table
    document.getElementById('hhTableBody')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hhFilterTable() {
    const search = (document.getElementById('hhSearch')?.value || '').toLowerCase().trim();
    const filterGT = document.getElementById('hhFilterGT')?.value || '';
    const items = (window._hhData?.items || []).filter(item => {
        if (filterGT && item.referrer_name !== filterGT) return false;
        if (search) {
            const name = (item.customer_name || '').toLowerCase();
            const phone = (item.phone || '').toLowerCase();
            const gt = (item.referrer_name || '').toLowerCase();
            if (!name.includes(search) && !phone.includes(search) && !gt.includes(search)) return false;
        }
        return true;
    });
    _hhPage = 1; // Reset to page 1 on search/filter
    hhRenderTable(items);
}

function hhShowMobileDetail(index) {
    const data = window._hhData;
    if (!data) return;
    // Get filtered items (same logic as hhFilterTable)
    const search = (document.getElementById('hhSearch')?.value || '').toLowerCase().trim();
    const filterGT = document.getElementById('hhFilterGT')?.value || '';
    let items = data.items;
    if (search || filterGT) {
        items = items.filter(item => {
            if (filterGT && item.referrer_name !== filterGT) return false;
            if (search) {
                const n = (item.customer_name || '').toLowerCase();
                const p = (item.phone || '').toLowerCase();
                const g = (item.referrer_name || '').toLowerCase();
                if (!n.includes(search) && !p.includes(search) && !g.includes(search)) return false;
            }
            return true;
        });
    }
    const item = items[index];
    if (!item) return;

    const existing = document.getElementById('hhMobileDetail');
    if (existing) existing.remove();

    const ct = item.last_log_type ? CONSULT_TYPES_HH[item.last_log_type] : null;
    const consultLabel = ct ? `${ct.icon} ${ct.label}` : '📋 Tư Vấn';
    const consultColor = ct ? ct.color : '#6b7280';
    const consultTextColor = ct ? ct.textColor : 'white';
    const refLabel = item.is_direct ? '🎯 Trực tiếp' : '👥 ' + (item.referrer_name || '-');
    const refColor = item.is_direct ? '#10b981' : '#8b5cf6';
    const contactDate = item.last_contact_date ? new Date(item.last_contact_date).toLocaleDateString('vi-VN') : '—';
    const appointDate = item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('vi-VN') : '—';
    let contentShort = item.last_log_content || '—';

    const overlay = document.createElement('div');
    overlay.id = 'hhMobileDetail';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:0;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:20px 20px 0 0;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 -10px 40px rgba(0,0,0,0.2);animation:hhSlideUp 0.25s ease-out;">
        <style>@keyframes hhSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div style="padding:14px 20px 0;display:flex;justify-content:space-between;align-items:center;">
            <span style="display:inline-flex;align-items:center;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fad24c;padding:5px 14px;border-radius:14px;font-size:13px;font-weight:700;">${item.customer_name}</span>
            <span onclick="document.getElementById('hhMobileDetail').remove()" style="cursor:pointer;font-size:22px;color:#9ca3af;line-height:1;padding:4px;">✕</span>
        </div>
        <div style="padding:12px 20px 20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div style="background:#f8fafc;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">SĐT</div>
                    <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:2px;">${item.phone || '—'}</div>
                </div>
                <div style="background:#f8fafc;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Người GT</div>
                    <div style="font-size:12px;font-weight:700;color:${refColor};margin-top:2px;">${refLabel}</div>
                </div>
                <div style="background:#fefce8;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Doanh Thu</div>
                    <div style="font-size:14px;font-weight:800;color:#1e3a5f;margin-top:2px;">${hhFormatMoney(item.total_revenue)}</div>
                </div>
                <div style="background:#f0fdf4;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Hoa Hồng (${item.rate}%)</div>
                    <div style="font-size:14px;font-weight:800;color:${item.commission > 0 ? '#10b981' : '#9ca3af'};margin-top:2px;">${item.commission > 0 ? hhFormatMoney(item.commission) : '—'}</div>
                </div>
                <div style="background:#f8fafc;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Ngày Hẹn</div>
                    <div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">${appointDate}</div>
                </div>
                <div style="background:#f8fafc;padding:10px;border-radius:10px;">
                    <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Liên Hệ Gần Nhất</div>
                    <div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">${contactDate}</div>
                </div>
            </div>
            ${contentShort !== '—' ? `<div style="background:#fff7ed;padding:10px;border-radius:10px;margin-bottom:14px;">
                <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Nội Dung TV</div>
                <div style="font-size:12px;font-weight:600;color:#e65100;margin-top:2px;">${contentShort}</div>
            </div>` : ''}
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('hhMobileDetail').remove();hhViewOrders(${item.id}, '${item.customer_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" style="flex:1;padding:12px;border:none;border-radius:10px;background:#3b82f6;color:white;font-size:13px;font-weight:700;cursor:pointer;">📋 Xem Đơn</button>
                <button onclick="document.getElementById('hhMobileDetail').remove();openCustomerDetail(${item.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))" style="flex:1;padding:12px;border:none;border-radius:10px;background:${consultColor};color:${consultTextColor};font-size:13px;font-weight:700;cursor:pointer;">${consultLabel}</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

async function hhShowAllOrdersPopup() {
    const existing = document.getElementById('hhAllOrdersPopup');
    if (existing) existing.remove();

    // Show loading
    const overlay = document.createElement('div');
    overlay.id = 'hhAllOrdersPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;color:#6b7280;font-size:14px;">⏳ Đang tải đơn hàng...</div>';
    document.body.appendChild(overlay);

    try {
        const crmFilterParam = window._hhCrmFilter ? '?crm_filter=' + window._hhCrmFilter : '';
        const res = await fetch('/api/affiliate/all-orders' + crmFilterParam, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const json = await res.json();
        if (!json.success) throw new Error('API error');

        const allOrders = json.orders || [];
        const statusColors = {
            'completed': { bg: '#d1fae5', color: '#065f46', label: '✅ Hoàn thành' },
            'processing': { bg: '#dbeafe', color: '#1e40af', label: '⏳ Đang xử lý' },
            'pending': { bg: '#fef3c7', color: '#92400e', label: '🕐 Chờ' },
            'cancelled': { bg: '#fee2e2', color: '#991b1b', label: '❌ Đã hủy' }
        };

        const totalRevenue = allOrders.reduce((s, o) => s + (o.revenue || 0), 0);
        const totalCommission = allOrders.reduce((s, o) => s + (o.commission || 0), 0);

        const rows = allOrders.length > 0 ? allOrders.map(o => {
            const st = statusColors[o.status] || statusColors['pending'];
            const rev = Number(o.revenue || 0).toLocaleString('vi-VN') + '₫';
            const comm = Number(o.commission || 0).toLocaleString('vi-VN') + '₫';
            const date = o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—';
            const srcBg = o.is_direct ? 'linear-gradient(135deg,#065f46,#10b981)' : 'linear-gradient(135deg,#92400e,#f59e0b)';
            const srcLabel = o.is_direct ? '🎯 ' + o.referrer_name : '👥 ' + o.referrer_name;

            return `<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o.customer_name}</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${o.order_code || 'Đơn hàng'} · ${date}</div>
                    </div>
                    <div style="display:inline-block;font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;color:white;background:${srcBg};white-space:nowrap;margin-left:8px;">${srcLabel}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:${st.bg};color:${st.color};">${st.label}</div>
                    <div style="display:flex;gap:12px;align-items:center;">
                        <div style="text-align:right;">
                            <div style="font-size:10px;color:#9ca3af;">Doanh số</div>
                            <div style="font-size:12px;font-weight:700;color:#dc2626;">${rev}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;color:#9ca3af;">HH ${o.rate}%</div>
                            <div style="font-size:12px;font-weight:700;color:#059669;">${comm}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div style="padding:30px;text-align:center;color:#9ca3af;">Chưa có đơn hàng</div>';

        overlay.innerHTML = `<div style="background:white;border-radius:16px;width:100%;max-width:650px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.25);">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:white;font-size:16px;font-weight:700;">📦 Tổng Đơn Đặt Hàng (${allOrders.length})</span>
                <span onclick="document.getElementById('hhAllOrdersPopup').remove()" style="cursor:pointer;color:white;font-size:20px;opacity:0.7;padding:4px;">✕</span>
            </div>
            <div style="overflow-y:auto;flex:1;">${rows}</div>
            ${allOrders.length > 0 ? `<div style="padding:12px 16px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:0 0 16px 16px;">
                <span style="font-size:12px;font-weight:700;color:#475569;">Tổng cộng</span>
                <div style="display:flex;gap:16px;">
                    <div style="text-align:right;">
                        <div style="font-size:10px;color:#9ca3af;">Doanh số</div>
                        <div style="font-size:13px;font-weight:800;color:#dc2626;">${totalRevenue.toLocaleString('vi-VN')}₫</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px;color:#9ca3af;">Hoa hồng</div>
                        <div style="font-size:13px;font-weight:800;color:#059669;">${totalCommission.toLocaleString('vi-VN')}₫</div>
                    </div>
                </div>
            </div>` : ''}
        </div>`;
    } catch (e) {
        overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;color:#ef4444;font-size:14px;">❌ Lỗi tải dữ liệu</div>';
    }
}

function hhShowCommissionPopup(filter) {
    const data = window._hhData;
    if (!data) return;
    const existing = document.getElementById('hhCommPopup');
    if (existing) existing.remove();

    let itemsWithCommission = data.items.filter(i => i.commission > 0);
    let title = '💰 Chi Tiết Hoa Hồng';
    let gradient = 'linear-gradient(135deg,#92400e,#b45309)';
    let footerLabel = 'Tổng Hoa Hồng';

    if (filter === 'direct') {
        itemsWithCommission = itemsWithCommission.filter(i => i.is_direct);
        title = '🎯 Hoa Hồng Trực Tiếp';
        gradient = 'linear-gradient(135deg,#065f46,#10b981)';
        footerLabel = 'Tổng HH Trực Tiếp';
    } else if (filter === 'indirect') {
        itemsWithCommission = itemsWithCommission.filter(i => !i.is_direct);
        title = '🏅 Hoa Hồng Gián Tiếp';
        gradient = 'linear-gradient(135deg,#4c1d95,#8b5cf6)';
        footerLabel = 'Tổng HH Gián Tiếp';
    }

    let totalComm = itemsWithCommission.reduce((s, i) => s + i.commission, 0);

    const rows = itemsWithCommission.map(item => `
        <tr style="background:${item.is_direct ? '#fefce8' : '#f5f3ff'};">
            <td style="padding:8px 10px;font-weight:600;">${item.customer_name}</td>
            <td style="padding:8px 10px;font-size:11px;color:${item.is_direct ? '#10b981' : '#8b5cf6'};">${item.is_direct ? '🎯 Trực tiếp' : '👥 ' + item.referrer_name}</td>
            <td style="padding:8px 10px;text-align:right;">${hhFormatMoney(item.completed_revenue)}</td>
            <td style="padding:8px 10px;text-align:center;">${item.rate}%</td>
            <td style="padding:8px 10px;text-align:right;font-weight:700;color:#10b981;">${hhFormatMoney(item.commission)}</td>
        </tr>
    `).join('');

    const overlay = document.createElement('div');
    overlay.id = 'hhCommPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:16px;max-width:650px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="background:${gradient};padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;font-weight:700;font-size:15px;">${title}</div>
            <span onclick="document.getElementById('hhCommPopup').remove()" style="color:white;cursor:pointer;font-size:22px;line-height:1;">✕</span>
        </div>
        <div style="padding:16px;">
            ${itemsWithCommission.length === 0 ? '<div style="text-align:center;padding:30px;color:#9ca3af;">Chưa có hoa hồng nào</div>' : `
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead><tr style="background:#f1f5f9;">
                    <th style="padding:8px 10px;text-align:left;">Tên KH</th>
                    <th style="padding:8px 10px;text-align:left;">Người GT</th>
                    <th style="padding:8px 10px;text-align:right;">Doanh Thu HT</th>
                    <th style="padding:8px 10px;text-align:center;">Tỷ Lệ</th>
                    <th style="padding:8px 10px;text-align:right;">Hoa Hồng</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr style="background:#fef3c7;font-weight:800;">
                    <td colspan="4" style="padding:10px;text-align:right;color:#92400e;">${footerLabel}:</td>
                    <td style="padding:10px;text-align:right;color:#10b981;font-size:14px;">${hhFormatMoney(totalComm)}</td>
                </tr></tfoot>
            </table>`}
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function hhShowCustomerListPopup() {
    const data = window._hhData;
    if (!data) return;
    const existing = document.getElementById('hhCustPopup');
    if (existing) existing.remove();

    const rows = data.items.map((item, i) => `
        <tr style="background:${item.is_direct ? '#fefce8' : '#f5f3ff'};">
            <td style="padding:8px 10px;">${i + 1}</td>
            <td style="padding:8px 10px;font-weight:600;">${item.customer_name}</td>
            <td style="padding:8px 10px;">${item.phone || '-'}</td>
            <td style="padding:8px 10px;font-size:11px;color:${item.is_direct ? '#10b981' : '#8b5cf6'};">${item.is_direct ? '🎯 Trực tiếp' : '👥 ' + item.referrer_name}</td>
            <td style="padding:8px 10px;">${item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '-'}</td>
        </tr>
    `).join('');

    const overlay = document.createElement('div');
    overlay.id = 'hhCustPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:16px;max-width:650px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;font-weight:700;font-size:15px;">👥 Danh Sách KH Giới Thiệu (${data.items.length})</div>
            <span onclick="document.getElementById('hhCustPopup').remove()" style="color:white;cursor:pointer;font-size:22px;line-height:1;">✕</span>
        </div>
        <div style="padding:16px;">
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead><tr style="background:#f1f5f9;">
                    <th style="padding:8px 10px;text-align:left;">#</th>
                    <th style="padding:8px 10px;text-align:left;">Tên KH</th>
                    <th style="padding:8px 10px;text-align:left;">SĐT</th>
                    <th style="padding:8px 10px;text-align:left;">Người GT</th>
                    <th style="padding:8px 10px;text-align:left;">Ngày Tạo</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

// ========== AFFILIATE ACCOUNT LIST POPUP ==========
let _hhAffListPage = 1;
const _hhAffListSize = 25;

function hhShowAffAccountList(page) {
    if (page) _hhAffListPage = page;
    else _hhAffListPage = 1;

    const data = window._hhData;
    if (!data) return;

    const itemIds = data.items.map(i => i.id);
    const approvedIds = (window._hhAffApprovedIds || []).filter(id => itemIds.includes(id));
    const lockedIds = window._hhAffLockedIds || [];
    const affItems = data.items.filter(i => approvedIds.includes(i.id));

    const totalPages = Math.ceil(affItems.length / _hhAffListSize) || 1;
    if (_hhAffListPage > totalPages) _hhAffListPage = totalPages;
    const startIdx = (_hhAffListPage - 1) * _hhAffListSize;
    const pageItems = affItems.slice(startIdx, startIdx + _hhAffListSize);

    const rows = pageItems.map((item, i) => {
        const idx = startIdx + i + 1;
        const isLocked = lockedIds.includes(item.id);
        const statusBadge = isLocked
            ? '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fef2f2;color:#dc2626;font-weight:600;border:1px solid #fecaca;">🔒 Đã Khóa</span>'
            : '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#f0fdf4;color:#16a34a;font-weight:600;border:1px solid #bbf7d0;">✅ Hoạt Động</span>';
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 10px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">${idx}</td>
            <td style="padding:8px 10px;"><span onclick="closeModal();hhShowCustomerPopup(${item.id})" style="cursor:pointer;font-weight:700;color:#1e3a5f;text-decoration:underline;font-size:13px;">${item.customer_name}</span></td>
            <td style="padding:8px 10px;font-size:12px;color:#475569;">${item.phone || '—'}</td>
            <td style="padding:8px 10px;font-size:12px;">${item.referrer_name ? '<span style="color:#8b5cf6;font-weight:600;">👥 ' + item.referrer_name + '</span>' : '<span style="color:#10b981;font-weight:600;">🎯 Trực tiếp</span>'}</td>
            <td style="padding:8px 10px;text-align:center;">${statusBadge}</td>
        </tr>`;
    }).join('');

    let pagination = '';
    if (totalPages > 1) {
        const prevDis = _hhAffListPage <= 1 ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        const nextDis = _hhAffListPage >= totalPages ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        pagination = `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0;margin-top:8px;">
            <span onclick="hhShowAffAccountList(${_hhAffListPage - 1})" style="padding:5px 12px;border-radius:8px;background:#8b5cf6;color:white;font-size:12px;font-weight:600;${prevDis}">◀ Trước</span>
            <span style="font-size:12px;font-weight:700;color:#1e293b;">Trang ${_hhAffListPage} / ${totalPages}</span>
            <span onclick="hhShowAffAccountList(${_hhAffListPage + 1})" style="padding:5px 12px;border-radius:8px;background:#8b5cf6;color:white;font-size:12px;font-weight:600;${nextDis}">Sau ▶</span>
        </div>`;
    }

    const bodyHTML = `
        <div style="margin-bottom:10px;font-size:13px;color:#475569;">Tổng: <strong style="color:#5b21b6;">${affItems.length}</strong> khách hàng có TK Affiliate</div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#1e293b;border-bottom:2px solid #334155;">
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#fff;font-weight:700;width:40px;">#</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Tên KH</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">SĐT</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Người GT</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#fff;font-weight:700;">Trạng Thái</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${pagination}`;

    openModal('🔑 Danh Sách Affiliate Có TK', bodyHTML, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}

// ========== CANCELLED CUSTOMER LIST POPUP ==========
let _hhCancelListPage = 1;
const _hhCancelListSize = 25;

function hhShowCancelledList(page) {
    if (page) _hhCancelListPage = page;
    else _hhCancelListPage = 1;

    const data = window._hhData;
    if (!data) return;

    const cancelledItems = data.items.filter(i => i.cancel_approved === 1);

    const totalPages = Math.ceil(cancelledItems.length / _hhCancelListSize) || 1;
    if (_hhCancelListPage > totalPages) _hhCancelListPage = totalPages;
    const startIdx = (_hhCancelListPage - 1) * _hhCancelListSize;
    const pageItems = cancelledItems.slice(startIdx, startIdx + _hhCancelListSize);

    const rows = pageItems.map((item, i) => {
        const idx = startIdx + i + 1;
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 10px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">${idx}</td>
            <td style="padding:8px 10px;"><span onclick="closeModal();hhShowCustomerPopup(${item.id})" style="cursor:pointer;font-weight:700;color:#1e3a5f;text-decoration:underline;font-size:13px;">${item.customer_name}</span></td>
            <td style="padding:8px 10px;font-size:12px;color:#475569;">${item.phone || '—'}</td>
            <td style="padding:8px 10px;font-size:12px;">${item.referrer_name ? '<span style="color:#8b5cf6;font-weight:600;">👥 ' + item.referrer_name + '</span>' : '<span style="color:#10b981;font-weight:600;">🎯 Trực tiếp</span>'}</td>
            <td style="padding:8px 10px;text-align:center;"><span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fef2f2;color:#dc2626;font-weight:600;border:1px solid #fecaca;">❌ Đã Hủy</span></td>
        </tr>`;
    }).join('');

    let pagination = '';
    if (totalPages > 1) {
        const prevDis = _hhCancelListPage <= 1 ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        const nextDis = _hhCancelListPage >= totalPages ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        pagination = `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0;margin-top:8px;">
            <span onclick="hhShowCancelledList(${_hhCancelListPage - 1})" style="padding:5px 12px;border-radius:8px;background:#ef4444;color:white;font-size:12px;font-weight:600;${prevDis}">◀ Trước</span>
            <span style="font-size:12px;font-weight:700;color:#1e293b;">Trang ${_hhCancelListPage} / ${totalPages}</span>
            <span onclick="hhShowCancelledList(${_hhCancelListPage + 1})" style="padding:5px 12px;border-radius:8px;background:#ef4444;color:white;font-size:12px;font-weight:600;${nextDis}">Sau ▶</span>
        </div>`;
    }

    const bodyHTML = `
        <div style="margin-bottom:10px;font-size:13px;color:#475569;">Tổng: <strong style="color:#dc2626;">${cancelledItems.length}</strong> khách hàng đã bị hủy</div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#1e293b;border-bottom:2px solid #334155;">
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#fff;font-weight:700;width:40px;">#</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Tên KH</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">SĐT</th>
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Người GT</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#fff;font-weight:700;">Trạng Thái</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${pagination}`;

    openModal('❌ Danh Sách Khách Hàng Đã Hủy', bodyHTML, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}
