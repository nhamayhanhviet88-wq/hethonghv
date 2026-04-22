// ========== BÁO CÁO HOA HỒNG ==========
const CONSULT_TYPES_HH = {
    lam_quen_tuong_tac: { icon: '👋', label: 'Làm Quen Tương Tác', color: '#14b8a6', textColor: 'white' },
    goi_dien: { icon: '📞', label: 'Gọi Điện', color: '#3b82f6', textColor: 'white' },
    nhan_tin: { icon: '💬', label: 'Nhắn Tin', color: '#8b5cf6', textColor: 'white' },
    tuong_tac_ket_noi: { icon: '🔗', label: 'Tương Tác Kết Nối Lại', color: '#6366f1', textColor: 'white' },
    gap_truc_tiep: { icon: '🤝', label: 'Gặp Trực Tiếp', color: '#10b981', textColor: 'white' },
    gui_bao_gia: { icon: '📄', label: 'Gửi Báo Giá', color: '#f59e0b', textColor: 'white' },
    gui_mau: { icon: '👔', label: 'Gửi Mẫu Vải/Áo', color: '#ec4899', textColor: 'white' },
    thiet_ke: { icon: '🎨', label: 'Thiết Kế', color: '#6366f1', textColor: 'white' },
    bao_sua: { icon: '🔧', label: 'Sửa Thiết Kế', color: '#ef4444', textColor: 'white' },
    gui_stk_coc: { icon: '🏦', label: 'Gửi STK Cọc', color: '#f59e0b', textColor: 'white' },
    giuc_coc: { icon: '⏰', label: 'Giục Cọc', color: '#ea580c', textColor: 'white' },
    dat_coc: { icon: '💵', label: 'Đặt Cọc', color: '#f97316', textColor: 'white' },
    chot_don: { icon: '✅', label: 'Chốt Đơn', color: '#22c55e', textColor: 'white' },
    dang_san_xuat: { icon: '🏭', label: 'Đang Sản Xuất', color: '#8b5cf6', textColor: 'white' },
    hoan_thanh: { icon: '🏆', label: 'Hoàn Thành Đơn', color: '#0d9488', textColor: 'white' },
    sau_ban_hang: { icon: '📦', label: 'Chăm Sóc Sau Bán', color: '#0ea5e9', textColor: 'white' },
    cap_cuu_sep: { icon: '🚨', label: 'Cấp Cứu Sếp', color: '#ef4444', textColor: 'white' },
    huy_coc: { icon: '🚫', label: 'Hủy Cọc', color: '#dc2626', textColor: 'white' },
    hoan_thanh_cap_cuu: { icon: '🏥', label: 'Hoàn Thành Cấp Cứu', color: '#122546', textColor: '#fad24c' },
    huy: { icon: '❌', label: 'Hủy Khách', color: '#dc2626', textColor: 'white' },
    giam_gia: { icon: '🎁', label: 'Giảm Giá', color: '#e11d48', textColor: 'white' },
    tu_van_lai: { icon: '🔄', label: 'Tư Vấn Lại', color: '#0891b2', textColor: 'white' },
    gui_ct_kh_cu: { icon: '🎟️', label: 'Gửi Chương Trình KH Cũ', color: '#7c3aed', textColor: 'white' }
};

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

async function renderBaoCaoHoaHongPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>💰 Báo Cáo Hoa Hồng</h3>
            </div>
            <div class="card-body" style="overflow-x:auto;">
                <div id="hhSummary" style="margin-bottom:20px;"></div>
                <div id="hhSearchFilter" style="margin-bottom:14px;"></div>
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
                    <table style="min-width:800px;">
                        <thead>
                            <tr>
                                <th>#</th>
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
                            <tr><td colspan="12" class="text-center text-muted" style="padding:40px;">Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        const data = await apiCall('/api/affiliate/commission');
        if (!data.success) {
            document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="12" class="text-center text-muted">Lỗi tải dữ liệu</td></tr>`;
            return;
        }

        // Store data globally for filtering
        window._hhData = data;

        // Summary cards (clickable)
        const directCommission = data.items.filter(i => i.is_direct).reduce((s, i) => s + (i.commission || 0), 0);
        const childCommission = data.items.filter(i => !i.is_direct).reduce((s, i) => s + (i.commission || 0), 0);
        const directRate = data.items.find(i => i.is_direct)?.rate || 10;
        const childRate = data.items.find(i => !i.is_direct)?.rate || 5;

        document.getElementById('hhSummary').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div onclick="hhShowCommissionPopup()" style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#f59e0b'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:18px;font-weight:800;color:#92400e;word-break:break-all;">${hhFormatMoney(data.totalCommission)}</div>
                    <div style="font-size:11px;color:#78350f;margin-top:4px;">💰 Tổng Hoa Hồng <span style="font-size:9px;opacity:0.7;">▶ Xem chi tiết</span></div>
                </div>
                <div onclick="hhShowCustomerListPopup()" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#3b82f6'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:24px;font-weight:800;color:#1e40af;">${data.items.length}</div>
                    <div style="font-size:11px;color:#1e3a8a;margin-top:4px;">👥 Tổng KH Giới Thiệu <span style="font-size:9px;opacity:0.7;">▶ Xem chi tiết</span></div>
                </div>
                <div onclick="hhShowCommissionPopup('direct')" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#10b981'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:18px;font-weight:800;color:#065f46;word-break:break-all;">${hhFormatMoney(directCommission)}</div>
                    <div style="font-size:11px;color:#064e3b;margin-top:4px;">🎯 Trực Tiếp (${directRate}%) <span style="font-size:9px;opacity:0.7;">▶ Xem chi tiết</span></div>
                </div>
                <div onclick="hhShowCommissionPopup('indirect')" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;" onmouseover="this.style.transform='scale(1.02)';this.style.borderColor='#8b5cf6'" onmouseout="this.style.transform='';this.style.borderColor='transparent'">
                    <div style="font-size:18px;font-weight:800;color:#5b21b6;word-break:break-all;">${hhFormatMoney(childCommission)}</div>
                    <div style="font-size:11px;color:#4c1d95;margin-top:4px;">🏅 HH Gián Tiếp (${childRate}%) <span style="font-size:9px;opacity:0.7;">▶ Xem chi tiết</span></div>
                </div>
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

        // Debug: log appointment_date values
        console.log('=== COMMISSION DEBUG ===');
        data.items.forEach(i => console.log(i.customer_name, '→ apt:', i.appointment_date, '| log:', i.last_log_type));

        // Render table
        hhRenderTable(data.items);
    } catch (e) {
        document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="12" class="text-center text-muted">Lỗi: ${e.message}</td></tr>`;
    }
}

function hhRenderTable(items) {
    if (items.length === 0) {
        document.getElementById('hhTableBody').innerHTML = `<tr><td colspan="12" class="text-center text-muted" style="padding:40px;">Không có khách hàng phù hợp</td></tr>`;
        return;
    }

    document.getElementById('hhTableBody').innerHTML = items.map((item, i) => {
        const commissionDisplay = item.commission > 0 
            ? `<span style="color:#10b981;font-weight:700;">${hhFormatMoney(item.commission)}</span>` 
            : `<span style="color:#9ca3af;">—</span>`;
        
        const ct = item.last_log_type ? CONSULT_TYPES_HH[item.last_log_type] : null;
        const consultBtn = ct 
            ? `<span onclick="openCustomerDetail(${item.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))" style="cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${ct.color};color:${ct.textColor};font-weight:600;white-space:nowrap;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${ct.icon} ${ct.label}</span>`
            : `<span onclick="openCustomerDetail(${item.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))" style="cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-600);color:white;font-weight:600;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">📋 Tư Vấn</span>`;

        let contentShort = item.last_log_content || '';
        if (contentShort.length > 30) contentShort = contentShort.substring(0, 30) + '...';
        
        const referrerDisplay = item.is_direct 
            ? `<span style="font-size:11px;color:#10b981;font-weight:600;">🎯 Trực tiếp</span>` 
            : `<span style="font-size:11px;color:#8b5cf6;font-weight:600;">👥 ${item.referrer_name}</span>`;

        const contactDate = item.last_contact_date ? new Date(item.last_contact_date).toLocaleDateString('vi-VN') : '-';

        return `<tr style="background:${item.is_direct ? '#fefce8' : '#f5f3ff'};">
            <td>${i + 1}</td>
            <td><span onclick="openCustomerDetail(${item.id})" style="cursor:pointer;display:inline-flex;align-items:center;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fad24c;padding:4px 12px;border-radius:16px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid rgba(212,168,67,0.3);transition:all 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(212,168,67,0.3)';this.style.borderColor='#fad24c'" onmouseout="this.style.boxShadow='none';this.style.borderColor='rgba(212,168,67,0.3)'">${item.customer_name}</span></td>
            <td>${referrerDisplay}</td>
            <td>${item.phone || '-'}</td>
            <td style="text-align:center;"><span onclick="hhViewOrders(${item.id}, '${item.customer_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" style="cursor:pointer;font-size:12px;padding:4px 10px;border-radius:6px;background:#3b82f6;color:white;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;" title="Xem đơn hàng">📋 Xem Đơn</span></td>
            <td>${consultBtn}</td>
            <td style="font-size:12px;color:#e65100;font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;text-decoration:underline;" title="${(item.last_log_content || '').replace(/"/g, '&quot;')}" onclick="openCustomerDetail(${item.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))">${contentShort || '<span style="color:var(--gray-400)">—</span>'}</td>
            <td>${hhFormatMoney(item.total_revenue)}</td>
            <td>${item.rate}%</td>
            <td>${commissionDisplay}</td>
            <td>${item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('vi-VN') : '<span style="color:#9ca3af">—</span>'}</td>
            <td>${contactDate}</td>
        </tr>`;
    }).join('');
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
    hhRenderTable(items);
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
