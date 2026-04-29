// ========== QUẢN LÝ HỆ THỐNG AFFILIATE ==========
let _affSysSearch = '';

async function renderQuanLyHTAffPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h3 style="margin:0;">📊 Quản Lý Hệ Thống Affiliate</h3>
            </div>
            <div class="card-body" id="affSysArea">
                <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
            </div>
        </div>
    `;
    _affSysSearch = '';
    await _affSysLoad();
}

async function _affSysLoad() {
    const area = document.getElementById('affSysArea');
    if (!area) return;

    try {
        const data = await apiCall('/api/affiliate/my-system');
        if (!data.success) {
            area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Lỗi tải dữ liệu</h3></div>`;
            return;
        }

        const { children, selfStats, stats } = data;

        // ★ Stats tiles
        let html = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
            <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:14px;padding:20px;color:white;box-shadow:0 4px 20px rgba(99,102,241,0.3);">
                <div style="font-size:28px;font-weight:900;">${stats.totalChildren}</div>
                <div style="font-size:12px;opacity:0.85;margin-top:4px;">👥 Affiliate Con</div>
            </div>
            <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:14px;padding:20px;color:white;box-shadow:0 4px 20px rgba(59,130,246,0.3);">
                <div style="font-size:28px;font-weight:900;">${stats.totalCustomers}</div>
                <div style="font-size:12px;opacity:0.85;margin-top:4px;">📋 Tổng KH Giới Thiệu</div>
            </div>
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:14px;padding:20px;color:white;box-shadow:0 4px 20px rgba(245,158,11,0.3);">
                <div style="font-size:28px;font-weight:900;">${Number(stats.totalRevenue).toLocaleString('vi-VN')} đ</div>
                <div style="font-size:12px;opacity:0.85;margin-top:4px;">💰 Tổng Doanh Số</div>
            </div>
            <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;padding:20px;color:white;box-shadow:0 4px 20px rgba(16,185,129,0.3);">
                <div style="font-size:28px;font-weight:900;">${stats.closedCount}</div>
                <div style="font-size:12px;opacity:0.85;margin-top:4px;">✅ KH Chốt Đơn</div>
            </div>
        </div>`;

        // ★ Self stats card
        html += `
        <div style="margin-bottom:20px;padding:16px 20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;border-left:4px solid #f59e0b;">
            <div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:6px;">🌟 Khách Hàng Trực Tiếp Của Bạn</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:#78350f;">
                <span>📋 KH: <strong>${selfStats.total_customers}</strong></span>
                <span>✅ Chốt: <strong>${selfStats.closed_count}</strong></span>
                <span>💰 Doanh số: <strong>${Number(selfStats.total_revenue).toLocaleString('vi-VN')} đ</strong></span>
            </div>
        </div>`;

        // ★ Search bar
        html += `
        <div style="margin-bottom:16px;">
            <input type="text" id="affSysSearchInput" class="form-control" placeholder="🔍 Tìm theo tên, SĐT..."
                value="${_affSysSearch}" oninput="_affSysFilter(this.value)"
                style="max-width:360px;font-size:13px;">
        </div>`;

        // ★ Table
        if (children.length === 0) {
            html += `<div class="empty-state"><div class="icon">👥</div><h3>Chưa có affiliate con nào</h3></div>`;
        } else {
            const ROLE_LABELS = { hoa_hong: 'Hoa Hồng', ctv: 'CTV', nuoi_duong: 'Nuôi Dưỡng', sinh_vien: 'Sinh Viên', tkaffiliate: 'TK Affiliate' };
            const ROLE_COLORS = { hoa_hong: '#f59e0b', ctv: '#3b82f6', nuoi_duong: '#8b5cf6', sinh_vien: '#10b981', tkaffiliate: '#ec4899' };

            const filtered = _affSysSearch
                ? children.filter(c => {
                    const q = _affSysSearch.toLowerCase();
                    return (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
                })
                : children;

            html += `
            <div style="overflow-x:auto;">
                <table class="table">
                    <thead><tr>
                        <th style="width:40px;">#</th>
                        <th>Tên</th>
                        <th>SĐT</th>
                        <th>Loại</th>
                        <th style="text-align:center;">KH Giới Thiệu</th>
                        <th style="text-align:center;">Chốt Đơn</th>
                        <th style="text-align:right;">Doanh Số</th>
                        <th style="text-align:center;">Trạng Thái</th>
                        <th>Ngày Tham Gia</th>
                    </tr></thead>
                    <tbody>`;

            filtered.forEach((c, i) => {
                const roleLabel = ROLE_LABELS[c.role] || c.role;
                const roleColor = ROLE_COLORS[c.role] || '#6b7280';
                const statusBadge = c.status === 'active'
                    ? '<span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">✅ Hoạt động</span>'
                    : '<span style="background:#fef2f2;color:#991b1b;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">🔒 Khóa</span>';

                html += `
                    <tr>
                        <td style="font-weight:600;color:#6b7280;">${i + 1}</td>
                        <td style="font-weight:700;color:#1e293b;">${c.full_name}</td>
                        <td style="font-weight:600;color:#334155;">${c.phone || '—'}</td>
                        <td><span style="background:${roleColor}20;color:${roleColor};padding:2px 10px;border-radius:8px;font-size:11px;font-weight:700;">${roleLabel}</span></td>
                        <td style="text-align:center;font-weight:700;color:#3b82f6;">${c.total_customers}</td>
                        <td style="text-align:center;font-weight:700;color:#16a34a;">${c.closed_count}</td>
                        <td style="text-align:right;font-weight:700;color:#d97706;">${Number(c.total_revenue).toLocaleString('vi-VN')} đ</td>
                        <td style="text-align:center;">${statusBadge}</td>
                        <td style="font-size:12px;color:#6b7280;">${c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                    </tr>`;
            });

            html += `</tbody></table></div>`;

            if (_affSysSearch && filtered.length === 0) {
                html += `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Không tìm thấy kết quả phù hợp</div>`;
            }
        }

        area.innerHTML = html;
    } catch (err) {
        area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Lỗi kết nối</h3></div>`;
    }
}

function _affSysFilter(q) {
    _affSysSearch = q;
    _affSysLoad();
}
