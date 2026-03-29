// ========== KHÁCH HÀNG CỦA TÔI (CTV Hoa Hồng) ==========
async function renderMyCustomersPage(container) {
    container.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-body" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                <div style="font-size:14px;">
                    💰 Số dư hiện tại: <strong id="myBalance" style="color:var(--gold); font-size:20px;">...</strong> VNĐ
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>👤 Khách Hàng Tôi Giới Thiệu</h3></div>
            <div class="card-body" style="overflow-x:auto;" id="myCustomersList">
                <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
            </div>
        </div>
    `;

    // Get balance and customers in parallel
    const [me, data] = await Promise.all([
        apiCall('/api/auth/me'),
        apiCall('/api/customers')
    ]);
    const balanceEl = document.getElementById('myBalance');
    if (me.user) {
        balanceEl.textContent = formatCurrency(0);
    }

    const area = document.getElementById('myCustomersList');

    if (!data.customers || data.customers.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>Chưa có khách hàng</h3><p>Chuyển số để bắt đầu giới thiệu khách</p></div>`;
        return;
    }

    area.innerHTML = `<table class="table"><thead><tr>
        <th>Mã</th><th>Khách Hàng</th><th>SĐT</th><th>Người Nhận</th><th>Trạng Thái</th><th>Ngày</th>
    </tr></thead><tbody>
        ${data.customers.map(c => `<tr>
            <td><strong style="color:var(--gold)">${getCustomerCode(c)}</strong></td>
            <td>${c.customer_name}</td>
            <td>${c.phone}</td>
            <td>${c.assigned_to_name || '-'}</td>
            <td>${getStatusBadge(c.order_status)}</td>
            <td>${formatDate(c.created_at)}</td>
        </tr>`).join('')}
    </tbody></table>`;
}

// ========== RÚT TIỀN HOA HỒNG ==========
async function renderWithdrawPage(container) {
    container.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-header"><h3>💰 Rút Tiền Hoa Hồng</h3></div>
            <div class="card-body">
                <div style="background: rgba(212,168,67,0.1); border: 1px solid var(--gold); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <div style="font-size: 13px; color: var(--gray-400);">⏰ Thời gian rút tiền: <strong>9:00 - 18:00</strong></div>
                    <div style="font-size: 13px; color: var(--gray-400);">💵 Số tiền tối thiểu: <strong>100.000 VNĐ</strong></div>
                    <div style="font-size: 13px; color: var(--gray-400);">🔄 Lệnh sẽ chuyển sau: <strong>1 tiếng làm việc</strong></div>
                </div>
                <form id="withdrawForm" style="max-width:500px;">
                    <div class="form-group">
                        <label>Số tiền rút (VNĐ) <span style="color:var(--danger)">*</span></label>
                        <input type="number" id="wdAmount" class="form-control" placeholder="Nhập số tiền..." min="100000" step="10000" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:auto; padding: 12px 40px;">💰 RÚT TIỀN</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>📜 Lịch Sử Rút Tiền</h3></div>
            <div class="card-body" style="overflow-x:auto;" id="withdrawHistory">
                <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
            </div>
        </div>
    `;

    // Load history
    const data = await apiCall('/api/withdrawals');
    const area = document.getElementById('withdrawHistory');

    if (!data.withdrawals || data.withdrawals.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">💰</div><h3>Chưa có lịch sử rút tiền</h3></div>`;
    } else {
        area.innerHTML = `<table class="table"><thead><tr>
            <th>Ngày</th><th>Số tiền</th><th>Trạng thái</th>
        </tr></thead><tbody>
            ${data.withdrawals.map(w => {
                const statusColor = w.status === 'pending' ? 'var(--warning)' : w.status === 'approved' ? 'var(--success)' : 'var(--danger)';
                const statusText = w.status === 'pending' ? '⏳ Chờ duyệt' : w.status === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối';
                return `<tr>
                    <td>${formatDateTime(w.created_at)}</td>
                    <td style="font-weight:700;color:var(--gold)">${formatCurrency(w.amount)} VNĐ</td>
                    <td style="color:${statusColor}">${statusText}</td>
                </tr>`;
            }).join('')}
        </tbody></table>`;
    }

    // Form submit
    document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('wdAmount').value;
        const data = await apiCall('/api/withdrawals', 'POST', { amount: Number(amount) });
        if (data.success) {
            showToast('💰 ' + data.message);
            handleRoute(); // reload
        } else {
            showToast(data.error, 'error');
        }
    });
}

// ========== QUẢN LÝ DUYỆT RÚT TIỀN (GĐ/TRINH) ==========
async function renderWithdrawManagePage(container) {
    // Current month defaults
    const now = new Date();
    const curMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const y = now.getFullYear(), m = now.getMonth();
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0);
    const lastDayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <style>
            .wm-split { display:grid; grid-template-columns:1fr 3px 1fr; gap:0; }
            .wm-split-divider { background:#ef4444; }
            .wm-filter-input { padding:8px 14px; border-radius:10px; border:1px solid #d1d5db; font-size:13px; background:white; font-weight:600; color:#1e3a5f; box-shadow:0 1px 3px rgba(0,0,0,0.08); transition:border-color 0.2s,box-shadow 0.2s; }
            .wm-filter-input:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
            .wm-filter-label { font-size:11px; color:#6b7280; font-weight:600; margin-bottom:2px; }
            @media (max-width:900px) {
                .wm-split { grid-template-columns:1fr; }
                .wm-split-divider { height:3px; width:100%; }
            }
        </style>
        <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
            <div>
                <div class="wm-filter-label">📅 Chọn tháng</div>
                <input type="month" class="wm-filter-input" id="wmMonthPicker" value="${curMonth}" onchange="wmApplyMonth()">
            </div>
            <div>
                <div class="wm-filter-label">Từ ngày</div>
                <input type="date" class="wm-filter-input" id="wmDateFrom" value="${firstDay}" onchange="wmLoadStats()">
            </div>
            <div style="display:flex;align-items:center;padding-bottom:6px;">
                <span style="color:#3b82f6;font-size:18px;font-weight:700;">→</span>
            </div>
            <div>
                <div class="wm-filter-label">Đến ngày</div>
                <input type="date" class="wm-filter-input" id="wmDateTo" value="${lastDayStr}" onchange="wmLoadStats()">
            </div>
        </div>
        <div id="wmStatsArea" style="margin-bottom:20px;">
            <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải thống kê...</h3></div>
        </div>
        <div class="wm-split">
            <div class="card" style="border-radius:14px 0 0 14px;">
                <div class="card-header"><h3>🏦 Duyệt Yêu Cầu Rút Tiền</h3></div>
                <div class="card-body" style="overflow-x:auto;max-height:70vh;overflow-y:auto;" id="withdrawManageList">
                    <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
                </div>
            </div>
            <div class="wm-split-divider"></div>
            <div class="card" style="border-radius:0 14px 14px 0;">
                <div class="card-header"><h3>👥 Số Dư Từng Affiliate</h3></div>
                <div class="card-body" style="overflow-x:auto;max-height:70vh;overflow-y:auto;" id="wmAffArea">
                    <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
                </div>
            </div>
        </div>
    `;

    // Load stats + affiliate table
    wmLoadStats();

    // Load withdrawals
    const data = await apiCall('/api/withdrawals');
    const area = document.getElementById('withdrawManageList');

    if (!data.withdrawals || data.withdrawals.length === 0) {
        area.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Không có yêu cầu nào</h3></div>`;
        return;
    }

    const pending = data.withdrawals.filter(w => w.status === 'pending');
    const processed = data.withdrawals.filter(w => w.status !== 'pending');

    let html = '';
    if (pending.length > 0) {
        html += `<div style="margin-bottom:20px;">
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:10px 16px;border-radius:10px;margin-bottom:12px;font-weight:700;color:#92400e;">
                ⏳ Đang chờ duyệt (${pending.length})
            </div>
            ${pending.map(w => wmRenderCard(w)).join('')}
        </div>`;
    }
    if (processed.length > 0) {
        html += `<div>
            <div style="background:#f1f5f9;padding:10px 16px;border-radius:10px;margin-bottom:12px;font-weight:700;color:#475569;">
                📋 Đã xử lý (${processed.length})
            </div>
            ${processed.map(w => wmRenderCard(w)).join('')}
        </div>`;
    }
    area.innerHTML = html;
}

// Apply month picker → set dateFrom/dateTo accordingly
function wmApplyMonth() {
    const val = document.getElementById('wmMonthPicker')?.value;
    if (!val) return;
    const [y, m] = val.split('-').map(Number);
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastD = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`;
    document.getElementById('wmDateFrom').value = first;
    document.getElementById('wmDateTo').value = last;
    wmLoadStats();
}

async function wmLoadStats() {
    const statsArea = document.getElementById('wmStatsArea');
    const affArea = document.getElementById('wmAffArea');
    const dateFrom = document.getElementById('wmDateFrom')?.value || '';
    const dateTo = document.getElementById('wmDateTo')?.value || '';

    try {
        let url = '/api/affiliate/stats-all';
        if (dateFrom && dateTo) url += `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
        const data = await apiCall(url);
        if (!data.success) {
            statsArea.innerHTML = '<div style="color:#ef4444;">Lỗi tải thống kê</div>';
            if (affArea) affArea.innerHTML = '<div style="color:#ef4444;">Lỗi tải</div>';
            return;
        }

        const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';

        // Get filter label
        const monthPicker = document.getElementById('wmMonthPicker');
        let filterLabel = 'Tháng này';
        if (monthPicker?.value) {
            const [fy, fm] = monthPicker.value.split('-');
            filterLabel = `T${fm}/${fy}`;
        }

        // 4 cards in 2x2 grid
        statsArea.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:18px;border-radius:14px;text-align:center;color:white;">
                    <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">💰 Tổng Hoa Hồng (Toàn bộ)</div>
                    <div style="font-size:22px;font-weight:700;">${fmt(data.grandTotalCommission)}</div>
                </div>
                <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:18px;border-radius:14px;text-align:center;color:white;">
                    <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">💰 Hoa Hồng ${filterLabel}</div>
                    <div style="font-size:22px;font-weight:700;">${fmt(data.filteredCommission)}</div>
                </div>
                <div style="background:linear-gradient(135deg,#92400e,#f59e0b);padding:18px;border-radius:14px;text-align:center;color:white;">
                    <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">💵 Còn Lại Chưa Rút (Toàn bộ)</div>
                    <div style="font-size:22px;font-weight:700;">${fmt(data.grandTotalBalance)}</div>
                </div>
                <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:18px;border-radius:14px;text-align:center;color:white;">
                    <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">✅ Đã Chuyển ${filterLabel}</div>
                    <div style="font-size:22px;font-weight:700;">${fmt(data.filteredWithdrawn)}</div>
                </div>
            </div>
        `;

        // Affiliate table (right panel)
        const withCommission = (data.affiliates || []).filter(a => a.totalCommission > 0);
        if (withCommission.length > 0) {
            const SHOW_LIMIT = 5;
            const renderRow = (a) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px 8px;font-weight:600;">${a.name || '-'}</td>
                    <td style="padding:10px 8px;text-align:right;">
                        <a href="#" onclick="wmShowOrders(${a.id}, '${(a.name || '').replace(/'/g, "\\'")}'); return false;" style="color:#2563eb;text-decoration:underline;cursor:pointer;">
                            ${fmt(a.totalCommission)}
                        </a>
                    </td>
                    <td style="padding:10px 8px;text-align:right;color:#065f46;">${fmt(a.totalWithdrawn)}</td>
                    <td style="padding:10px 8px;text-align:right;font-weight:700;color:#1e3a5f;">${fmt(a.balance)}</td>
                </tr>`;

            const visibleRows = withCommission.slice(0, SHOW_LIMIT).map(renderRow).join('');
            const hiddenRows = withCommission.slice(SHOW_LIMIT).map(renderRow).join('');
            const hasMore = withCommission.length > SHOW_LIMIT;

            affArea.innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e2e8f0;">Tên</th>
                            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #e2e8f0;">Tổng HH</th>
                            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #e2e8f0;">Đã Rút</th>
                            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #e2e8f0;">Số Dư</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleRows}
                        ${hasMore ? `<tr id="wmAffHiddenRows" style="display:none;"><td colspan="4" style="padding:0;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>${hiddenRows}</tbody></table></td></tr>` : ''}
                    </tbody>
                </table>
                ${hasMore ? `
                    <div style="text-align:center;margin-top:10px;">
                        <button id="wmAffShowMore" onclick="document.getElementById('wmAffHiddenRows').style.display='';this.style.display='none';"
                            style="background:none;border:1px solid #2563eb;color:#2563eb;padding:8px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
                            XEM THÊM (${withCommission.length - SHOW_LIMIT})
                        </button>
                    </div>
                ` : ''}
            `;
        } else {
            affArea.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;">Chưa có affiliate nào có hoa hồng</div>';
        }
    } catch (e) {
        statsArea.innerHTML = '<div style="color:#ef4444;">Lỗi tải thống kê</div>';
        if (affArea) affArea.innerHTML = '<div style="color:#ef4444;">Lỗi tải</div>';
    }
}

async function wmShowOrders(affId, affName) {
    const old = document.getElementById('wmOrdersPopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wmOrdersPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
        <div style="background:white;border-radius:20px;max-width:700px;width:100%;max-height:80vh;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.3);display:flex;flex-direction:column;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:white;font-weight:700;">📋 Đơn hàng HH — ${affName}</div>
                <span onclick="document.getElementById('wmOrdersPopup').remove()" style="color:white;cursor:pointer;font-size:20px;">✕</span>
            </div>
            <div style="padding:16px;overflow-y:auto;flex:1;" id="wmOrdersBody">
                <div style="text-align:center;padding:20px;color:#6b7280;">⏳ Đang tải...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        const data = await apiCall('/api/affiliate/' + affId + '/commission-orders');
        const body = document.getElementById('wmOrdersBody');
        if (!data.orders || data.orders.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;">Chưa có đơn hàng nào</div>';
            return;
        }
        const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
        body.innerHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">Mã Đơn</th>
                        <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">Khách Hàng</th>
                        <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">NV Quản Lý</th>
                        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Doanh Thu</th>
                        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Hoa Hồng</th>
                        <th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;">Hoàn Thành</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.orders.map(o => `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:8px;font-weight:600;">${o.order_code || '-'}</td>
                            <td style="padding:8px;">${o.customer_name}</td>
                            <td style="padding:8px;color:#6b7280;">${o.nv_quan_ly || '—'}</td>
                            <td style="padding:8px;text-align:right;">${fmt(o.revenue)} đ</td>
                            <td style="padding:8px;text-align:right;font-weight:700;color:#065f46;">${fmt(o.commission)} đ</td>
                            <td style="padding:8px;text-align:center;color:#6b7280;font-size:11px;">${fmtDate(o.completed_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top:12px;text-align:right;font-weight:700;color:#1e3a5f;font-size:14px;">
                Tổng HH: ${fmt(data.orders.reduce((s, o) => s + o.commission, 0))} đ
            </div>
        `;
    } catch (e) {
        document.getElementById('wmOrdersBody').innerHTML = '<div style="color:#ef4444;">Lỗi tải dữ liệu</div>';
    }
}

function wmRenderCard(w) {
    const isPending = w.status === 'pending';
    const isApproved = w.status === 'approved';
    const borderColor = isPending ? '#f59e0b' : isApproved ? '#10b981' : '#ef4444';
    const statusHtml = isPending 
        ? '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">⏳ Chờ duyệt</span>'
        : isApproved
        ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ Đã chuyển</span>'
        : '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">❌ Từ chối</span>';

    let actionsHtml = '';
    if (isPending) {
        actionsHtml = `
            <div style="display:flex;gap:8px;margin-top:12px;">
                <button onclick="wmOpenApprovePopup(${w.id}, '${(w.user_name || '').replace(/'/g, "\\'")}', ${w.amount})" 
                    style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#065f46,#10b981);color:white;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px;">
                    ✅ Duyệt & Chuyển Tiền
                </button>
                <button onclick="wmOpenRejectPopup(${w.id}, '${(w.user_name || '').replace(/'/g, "\\'")}', ${w.amount})" 
                    style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#991b1b,#ef4444);color:white;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px;">
                    ❌ Từ Chối
                </button>
            </div>`;
    }

    let extraInfo = '';
    if (isApproved && w.transfer_image) {
        extraInfo = `<div style="margin-top:8px;"><span onclick="wdShowTransferImage('${w.transfer_image.replace(/'/g, "\\'")}')" style="cursor:pointer;color:#3b82f6;text-decoration:underline;font-size:11px;">📸 Xem ảnh chuyển khoản</span></div>`;
    }
    if (!isApproved && w.reject_reason) {
        extraInfo = `<div style="margin-top:8px;background:#fee2e2;padding:8px;border-radius:6px;font-size:11px;color:#991b1b;">Lý do: ${w.reject_reason}</div>`;
    }

    return `<div style="border:2px solid ${borderColor};border-radius:14px;padding:16px;margin-bottom:12px;background:white;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
                <div style="font-weight:800;font-size:15px;color:#1e3a5f;">${w.user_name || '-'}</div>
                <div style="font-size:11px;color:#6b7280;">SĐT: ${w.user_phone || '-'} • ${w.created_at ? new Date(w.created_at).toLocaleDateString('vi-VN') + ' ' + new Date(w.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'}) : '-'}</div>
            </div>
            ${statusHtml}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="background:#f8fafc;padding:8px;border-radius:8px;">
                <div style="font-size:10px;color:#6b7280;">Số tiền rút</div>
                <div style="font-weight:800;color:#f59e0b;font-size:14px;">${formatCurrency(w.amount)} đ</div>
            </div>
            <div style="background:#f8fafc;padding:8px;border-radius:8px;">
                <div style="font-size:10px;color:#6b7280;">Ngân hàng</div>
                <div style="font-weight:600;font-size:12px;">${w.bank_name || '-'}</div>
            </div>
            <div style="background:#f8fafc;padding:8px;border-radius:8px;">
                <div style="font-size:10px;color:#6b7280;">STK</div>
                <div style="font-weight:600;font-size:12px;">${w.bank_account || '-'}</div>
            </div>
        </div>
        <div style="background:#f8fafc;padding:8px;border-radius:8px;margin-bottom:4px;">
            <div style="font-size:10px;color:#6b7280;">Chủ tài khoản</div>
            <div style="font-weight:700;font-size:13px;">${w.bank_holder || '-'}</div>
        </div>
        ${extraInfo}
        ${actionsHtml}
    </div>`;
}

function wmOpenApprovePopup(id, userName, amount) {
    const old = document.getElementById('wmApprovePopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wmApprovePopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:20px;max-width:480px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.3);">
        <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:18px 20px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;font-weight:700;font-size:15px;">✅ Xác Nhận Chuyển Tiền</div>
            <span onclick="document.getElementById('wmApprovePopup').remove()" style="color:white;cursor:pointer;font-size:20px;">✕</span>
        </div>
        <div style="padding:20px;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:12px;color:#6b7280;">Chuyển tiền cho <strong>${userName}</strong></div>
                <div style="font-size:24px;font-weight:900;color:#065f46;">${formatCurrency(amount)} đ</div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">📸 Ảnh chuyển khoản <span style="color:#ef4444;">*</span></label>
                <div id="wmPasteArea" style="border:2px dashed #d1d5db;border-radius:12px;padding:20px;text-align:center;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:border-color 0.2s;">
                    <div style="font-size:13px;color:#6b7280;">📋 Paste (Ctrl+V) ảnh chuyển khoản vào đây</div>
                </div>
                <div id="wmImagePreview" style="margin-top:8px;display:none;">
                    <img id="wmPreviewImg" style="max-width:100%;max-height:200px;border-radius:8px;">
                </div>
            </div>
            <button onclick="wmDoApprove(${id})" id="wmApproveBtn"
                style="width:100%;padding:12px;border:none;background:linear-gradient(135deg,#065f46,#10b981);color:white;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
                ✅ Xác Nhận Đã Chuyển Tiền
            </button>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    // Ctrl+V paste only
    document.addEventListener('paste', wmHandlePaste);
    
    // Clean up paste listener when popup closes
    const observer = new MutationObserver(() => {
        if (!document.getElementById('wmApprovePopup')) {
            document.removeEventListener('paste', wmHandlePaste);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true });
}

function wmHandlePaste(e) {
    if (!document.getElementById('wmApprovePopup')) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            wmProcessImage(file);
            break;
        }
    }
}

function wmHandleFile(e) {
    const file = e.target.files?.[0];
    if (file) wmProcessImage(file);
}

function wmProcessImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        window._wmTransferImage = e.target.result;
        document.getElementById('wmPreviewImg').src = e.target.result;
        document.getElementById('wmImagePreview').style.display = 'block';
        document.getElementById('wmPasteArea').innerHTML = '<div style="color:#10b981;font-weight:600;">✅ Ảnh đã tải lên! Click để thay đổi</div>';
        document.getElementById('wmPasteArea').style.borderColor = '#10b981';
    };
    reader.readAsDataURL(file);
}

async function wmDoApprove(id) {
    const img = window._wmTransferImage;
    if (!img) return showToast('Vui lòng paste ảnh chuyển khoản', 'error');

    const btn = document.getElementById('wmApproveBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';

    try {
        const data = await apiCall(`/api/withdrawals/${id}/approve`, 'PUT', { approve: true, transfer_image: img });
        if (data.success) {
            document.getElementById('wmApprovePopup')?.remove();
            window._wmTransferImage = null;
            wmShowApprovedPopup();
        } else {
            showToast(data.error || 'Lỗi', 'error');
            btn.disabled = false;
            btn.textContent = '✅ Xác Nhận Đã Chuyển Tiền';
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
        btn.disabled = false;
        btn.textContent = '✅ Xác Nhận Đã Chuyển Tiền';
    }
}

function wmShowApprovedPopup() {
    const old = document.getElementById('wmDonePopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wmDonePopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

    overlay.innerHTML = `
        <div style="background:white;border-radius:20px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.3);animation:wdPopIn 0.4s ease;">
            <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:24px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:26px;">✅</div>
                <div style="color:white;font-size:17px;font-weight:800;">Đã Chuyển Tiền Thành Công!</div>
            </div>
            <div style="padding:20px;text-align:center;">
                <div style="font-size:13px;color:#6b7280;margin-bottom:16px;">Ảnh chuyển khoản đã được lưu lại.</div>
                <button onclick="document.getElementById('wmDonePopup').remove(); handleRoute();"
                    style="padding:12px 28px;border:none;background:linear-gradient(135deg,#065f46,#10b981);color:white;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
                    Hoàn tất ✨
                </button>
            </div>
        </div>
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes wdPopIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }';
    overlay.appendChild(style);
    document.body.appendChild(overlay);
}

function wmOpenRejectPopup(id, userName, amount) {
    const old = document.getElementById('wmRejectPopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wmRejectPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `<div style="background:white;border-radius:20px;max-width:420px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.3);">
        <div style="background:linear-gradient(135deg,#991b1b,#ef4444);padding:18px 20px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:white;font-weight:700;font-size:15px;">❌ Từ Chối Rút Tiền</div>
            <span onclick="document.getElementById('wmRejectPopup').remove()" style="color:white;cursor:pointer;font-size:20px;">✕</span>
        </div>
        <div style="padding:20px;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:12px;color:#6b7280;">Từ chối yêu cầu của <strong>${userName}</strong></div>
                <div style="font-size:20px;font-weight:900;color:#991b1b;">${formatCurrency(amount)} đ</div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Lý do từ chối <span style="color:#ef4444;">*</span></label>
                <textarea id="wmRejectReason" rows="3" placeholder="Nhập lý do từ chối..."
                    style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
            </div>
            <button onclick="wmDoReject(${id})" id="wmRejectBtn"
                style="width:100%;padding:12px;border:none;background:linear-gradient(135deg,#991b1b,#ef4444);color:white;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
                ❌ Xác Nhận Từ Chối
            </button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

async function wmDoReject(id) {
    const reason = document.getElementById('wmRejectReason')?.value?.trim();
    if (!reason) return showToast('Vui lòng nhập lý do từ chối', 'error');

    const btn = document.getElementById('wmRejectBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';

    try {
        const data = await apiCall(`/api/withdrawals/${id}/approve`, 'PUT', { approve: false, reject_reason: reason });
        if (data.success) {
            document.getElementById('wmRejectPopup')?.remove();
            showToast('❌ Đã từ chối yêu cầu rút tiền');
            handleRoute();
        } else {
            showToast(data.error || 'Lỗi', 'error');
            btn.disabled = false;
            btn.textContent = '❌ Xác Nhận Từ Chối';
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
        btn.disabled = false;
        btn.textContent = '❌ Xác Nhận Từ Chối';
    }
}
