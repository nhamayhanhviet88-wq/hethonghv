// ========== CHẤP NHẬN CTV / AFFILIATE ==========
const CNCA_CRM_LABELS = { nhu_cau:'Chăm Sóc KH Nhu Cầu', ctv:'Chăm Sóc CTV', ctv_hoa_hong:'Chăm Sóc Affiliate', koc_tiktok:'Chăm Sóc KOL/KOC Tiktok' };
const CNCA_ROLE_LABELS = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', thu_viec:'Thử Việc' };
var _cncaActiveStatCard = ''; // active stat card filter
var _cncaStatsYear = new Date().getFullYear();
const CNCA_VN_PROVINCES = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hồ Chí Minh','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];

function _cncaFormatCountdown(expiresAt) {
    const now = new Date();
    const diff = expiresAt - now;
    if (diff <= 0) return '<span class="cnca-countdown cnca-cd-red">⏰ Hết hạn!</span>';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    let colorClass = 'cnca-cd-green';
    if (hours < 6) colorClass = 'cnca-cd-red';
    else if (hours < 12) colorClass = 'cnca-cd-yellow';
    const icon = hours < 6 ? '🔴' : hours < 12 ? '🟡' : '🟢';
    return `<span class="cnca-countdown ${colorClass}">${icon} ${hours}h ${String(mins).padStart(2,'0')}p</span>`;
}
async function renderChapNhanCTVAffiliatePage(container) {
    const curYear = new Date().getFullYear();
    _cncaStatsYear = curYear;
    container.innerHTML = `
        <style>
            .cnca-tabs { display:flex; gap:4px; margin-bottom:0; }
            .cnca-tab { padding:10px 22px; border-radius:10px 10px 0 0; cursor:pointer; font-weight:700; font-size:13px;
                background:#1e293b; color:#94a3b8; border:1px solid #334155; border-bottom:none; transition:all .2s; }
            .cnca-tab.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; }
            .cnca-tab:hover:not(.active) { background:#334155; color:white; }
            .cnca-badge { display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:20px;
                background:#ef4444; color:white; border-radius:10px; font-size:11px; font-weight:800; margin-left:6px; padding:0 5px; }
            .cnca-card { background:var(--card-bg); border-radius:0 0 12px 12px; border:1px solid var(--border); border-top:none; overflow:hidden; }
            .cnca-table { width:100%; border-collapse:collapse; font-size:13px; }
            .cnca-table th { background:#0f172a; color:#94a3b8; padding:10px 12px; font-size:11px; font-weight:700;
                text-transform:uppercase; letter-spacing:.5px; text-align:left; white-space:nowrap; }
            .cnca-table td { padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
            .cnca-table tr:hover td { background:rgba(59,130,246,.04); }
            .cnca-btn { padding:6px 14px; border:none; border-radius:8px; font-size:12px; font-weight:700;
                cursor:pointer; transition:all .2s; font-family:inherit; }
            .cnca-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.2); }
            .cnca-btn-approve { background:linear-gradient(135deg,#10b981,#059669); color:white; }
            .cnca-btn-reject { background:linear-gradient(135deg,#ef4444,#dc2626); color:white; }
            .cnca-empty { text-align:center; padding:60px 20px; color:#64748b; }
            .cnca-empty .icon { font-size:48px; margin-bottom:12px; }
            .cnca-status { padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; display:inline-block; }
            .cnca-status-approved { background:#dcfce7; color:#166534; }
            .cnca-status-rejected { background:#fee2e2; color:#991b1b; }
            .cnca-status-pending { background:#fef3c7; color:#92400e; }
            .cnca-status-expired { background:#fde68a; color:#92400e; }
            .cnca-countdown { font-weight:700; font-size:13px; font-variant-numeric:tabular-nums; }
            .cnca-cd-green { color:#059669; }
            .cnca-cd-yellow { color:#d97706; }
            .cnca-cd-red { color:#dc2626; animation:cncaPulse 1.5s infinite; }
            @keyframes cncaPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
            .cnca-stat-card { flex:1; min-width:140px; padding:16px 14px; border-radius:14px; cursor:pointer; transition:all .25s; position:relative; overflow:hidden; border:2px solid transparent; }
            .cnca-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.15); }
            .cnca-stat-card.active { border-color:#fff; box-shadow:0 0 0 3px rgba(59,130,246,.5), 0 8px 24px rgba(0,0,0,.2); transform:translateY(-3px); }
            .cnca-stat-num { font-size:28px; font-weight:900; color:white; line-height:1; }
            .cnca-stat-label { font-size:11px; font-weight:600; color:rgba(255,255,255,.85); margin-top:4px; }
            .cnca-date-bar { display:flex; gap:6px; align-items:center; padding:10px 14px; flex-wrap:wrap; }
            .cnca-date-btn { padding:6px 14px; border:1px solid #334155; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; background:#1e293b; color:#94a3b8; transition:all .2s; }
            .cnca-date-btn.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; }
            .cnca-date-btn:hover:not(.active) { background:#334155; color:white; }
            .cnca-name-link { cursor:pointer; color:var(--navy); font-weight:700; transition:opacity .2s; }
            .cnca-name-link:hover { opacity:.7; text-decoration:underline; }
            .cnca-user-link { cursor:pointer; color:#8b5cf6; font-weight:700; font-family:'Courier New',monospace; transition:opacity .2s; }
            .cnca-user-link:hover { opacity:.7; text-decoration:underline; }
        </style>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;color:var(--text-primary);">✅ Chấp Nhận CTV / Affiliate</h2>
            ${currentUser.role === 'giam_doc' ? '<button class="cnca-btn" style="background:#374151;color:white;padding:8px 18px;" onclick="_cncaShowSettings()">⚙️ Cài Đặt</button>' : ''}
        </div>
        <!-- STAT CARDS -->
        <div id="cncaStatCards" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;"></div>
        <div class="cnca-tabs" id="cncaTabs">
            <div class="cnca-tab active" data-tab="pending" onclick="_cncaSwitchTab('pending')">📋 Chờ Duyệt <span class="cnca-badge" id="cncaPendingBadge">0</span></div>
            <div class="cnca-tab" data-tab="affaccount" onclick="_cncaSwitchTab('affaccount')">🔑 Tạo TK Affiliate <span class="cnca-badge" id="cncaAffAccBadge" style="background:#8b5cf6;">0</span></div>
            <div class="cnca-tab" data-tab="history" onclick="_cncaSwitchTab('history')">📊 Lịch Sử</div>
        </div>
        <!-- DATE FILTER (history only) -->
        <div id="cncaDateFilterBar" style="display:none;background:#0f172a;border:1px solid var(--border);border-bottom:none;border-radius:0;padding:0;"></div>
        <div class="cnca-card">
            <div style="overflow-x:auto;padding:4px;">
                <table class="cnca-table"><thead id="cncaThead"></thead><tbody id="cncaTbody"></tbody></table>
            </div>
        </div>
    `;
    _cncaCurrentTab = 'pending';
    _cncaActiveStatCard = '';
    _cncaLoadStats();
    await _cncaLoadData();
    if (window._cncaCountdownInterval) clearInterval(window._cncaCountdownInterval);
    window._cncaCountdownInterval = setInterval(() => {
        document.querySelectorAll('[data-expires-at]').forEach(el => {
            const expiresAt = new Date(el.dataset.expiresAt);
            el.innerHTML = _cncaFormatCountdown(expiresAt);
        });
    }, 60000);
}

var _cncaCurrentTab = 'pending';

function _cncaSwitchTab(tab, keepStatFilter) {
    _cncaCurrentTab = tab;
    if (!keepStatFilter) {
        _cncaActiveStatCard = '';
        document.querySelectorAll('.cnca-stat-card').forEach(c => c.classList.remove('active'));
    }
    document.querySelectorAll('.cnca-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    // Show date filter only for history tab
    const dateBar = document.getElementById('cncaDateFilterBar');
    if (dateBar) {
        if (tab === 'history') {
            dateBar.style.display = '';
            _cncaBuildDateFilterBar();
        } else {
            dateBar.style.display = 'none';
        }
    }
    _cncaLoadData();
}

async function _cncaLoadData() {
    try {
        const affData = await apiCall('/api/affiliate-account/pending-count');
        const affBadge = document.getElementById('cncaAffAccBadge');
        if (affBadge) affBadge.textContent = affData.count || 0;
    } catch(e) {}

    if (_cncaCurrentTab === 'affaccount') { return _cncaLoadAffAccountData(); }

    const status = _cncaCurrentTab === 'pending' ? 'pending' : 'all';
    const yearParam = _cncaCurrentTab === 'history' ? `&year=${_cncaStatsYear}` : '';
    const data = await apiCall(`/api/crm-conversion/list?status=${status}${yearParam}`);
    let requests = data.requests || [];
    const badge = document.getElementById('cncaPendingBadge');
    if (badge) badge.textContent = data.pendingCount || 0;

    // Apply stat card filter for history tab
    if (_cncaCurrentTab === 'history' && _cncaActiveStatCard) {
        const f = _cncaActiveStatCard;
        if (f === 'conv_affiliate') requests = requests.filter(r => r.to_crm_type === 'ctv_hoa_hong' && r.status === 'approved');
        else if (f === 'conv_ctv') requests = requests.filter(r => r.to_crm_type === 'ctv' && r.status === 'approved');
        else if (f === 'conv_nhucau') requests = requests.filter(r => r.to_crm_type === 'nhu_cau' && r.status === 'approved');
        else if (f === 'conv_koctiktok') requests = requests.filter(r => r.to_crm_type === 'koc_tiktok' && r.status === 'approved');
    }
    // Apply date filter for history
    if (_cncaCurrentTab === 'history') {
        requests = _cncaApplyDateFilter(requests);
    }

    const thead = document.getElementById('cncaThead');
    const tbody = document.getElementById('cncaTbody');

    if (_cncaCurrentTab === 'pending') {
        thead.innerHTML = `<tr>
            <th>STT</th><th>Tên KH</th><th>SĐT</th><th>Link KH</th>
            <th>CRM Hiện Tại</th><th>→ Chuyển Sang</th><th>Lý Do</th>
            <th>NV Đề Xuất</th><th>NV Phụ Trách</th><th>Ngày Tạo</th><th>⏱ Thời Hạn</th><th style="text-align:center">Hành Động</th>
        </tr>`;
        const pending = requests.filter(r => r.status === 'pending');
        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12"><div class="cnca-empty"><div class="icon">✅</div><h3>Không có yêu cầu chờ duyệt</h3></div></td></tr>`;
            return;
        }
        tbody.innerHTML = pending.map((r, i) => `<tr>
            <td style="text-align:center;font-weight:700;color:#64748b;">${i+1}</td>
            <td><span class="cnca-name-link" onclick="_cncaEditCustomer(${r.customer_id})">${r.customer_name || '—'}</span></td>
            <td>${r.phone ? '<a href="tel:'+r.phone+'" style="color:var(--info)">'+r.phone+'</a>' : '—'}</td>
            <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${r.facebook_link ? '<a href="'+r.facebook_link+'" target="_blank" style="color:#1877F2;font-weight:600;">🔗 Link</a>' : '—'}
            </td>
            <td><span class="cnca-status" style="background:rgba(59,130,246,.12);color:#2563eb;">${CNCA_CRM_LABELS[r.from_crm_type] || r.from_crm_type}</span></td>
            <td><span class="cnca-status" style="background:rgba(16,185,129,.12);color:#059669;">${CNCA_CRM_LABELS[r.to_crm_type] || r.to_crm_type}</span></td>
            <td style="max-width:200px;font-size:12px;color:#e65100;font-weight:600;">${r.reason || '—'}</td>
            <td style="font-size:12px;">${r.requested_by_name || '—'} <span style="color:#94a3b8;font-size:10px;">(${CNCA_ROLE_LABELS[r.requested_by_role] || ''})</span></td>
            <td style="font-size:12px;font-weight:600;">${r.assigned_to_name || '—'}</td>
            <td style="font-size:12px;color:#64748b;">${r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'}</td>
            <td style="text-align:center;" data-expires-at="${r.expires_at || ''}">${r.expires_at ? _cncaFormatCountdown(new Date(r.expires_at)) : '—'}</td>
            <td style="text-align:center;white-space:nowrap;">
                <button class="cnca-btn cnca-btn-approve" onclick="_cncaApprove(${r.id})">✅ Duyệt</button>
                <button class="cnca-btn cnca-btn-reject" onclick="_cncaReject(${r.id})" style="margin-left:4px;">❌ Từ chối</button>
            </td>
        </tr>`).join('');
    } else {
        thead.innerHTML = `<tr>
            <th>STT</th><th>Tên KH</th><th>SĐT</th><th>CRM Cũ</th><th>→ CRM Mới</th>
            <th>Lý Do</th><th>NV Đề Xuất</th><th>Trạng Thái</th><th>Người Duyệt</th><th>Lý Do Từ Chối</th><th>Ngày XL</th>
        </tr>`;
        const history = requests.filter(r => r.status !== 'pending');
        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11"><div class="cnca-empty"><div class="icon">📭</div><h3>Chưa có lịch sử</h3></div></td></tr>`;
            return;
        }
        tbody.innerHTML = history.map((r, i) => `<tr>
            <td style="text-align:center;color:#64748b;">${i+1}</td>
            <td><span class="cnca-name-link" onclick="_cncaEditCustomer(${r.customer_id})">${r.customer_name || '—'}</span></td>
            <td>${r.phone || '—'}</td>
            <td style="font-size:12px;">${CNCA_CRM_LABELS[r.from_crm_type] || r.from_crm_type}</td>
            <td style="font-size:12px;">${CNCA_CRM_LABELS[r.to_crm_type] || r.to_crm_type}</td>
            <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(r.reason||'').replace(/"/g,'&quot;')}">${r.reason || '—'}</td>
            <td style="font-size:12px;">${r.requested_by_name || '—'}</td>
            <td><span class="cnca-status cnca-status-${r.status}">${r.status === 'approved' ? '✅ Đã duyệt' : r.status === 'expired' ? '⏰ Hết hạn' : '❌ Từ chối'}</span></td>
            <td style="font-size:12px;">${r.approved_by_name || '—'}</td>
            <td style="font-size:12px;color:#dc2626;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(r.reject_reason||'').replace(/"/g,'&quot;')}">${r.reject_reason || '—'}</td>
            <td style="font-size:12px;color:#64748b;">${r.processed_at ? new Date(r.processed_at).toLocaleString('vi-VN') : '—'}</td>
        </tr>`).join('');
    }
}

async function _cncaApprove(id) {
    if (!confirm('Xác nhận DUYỆT chuyển đổi CRM cho khách hàng này?')) return;
    try {
        const data = await apiCall(`/api/crm-conversion/${id}/approve`, 'POST');
        if (data.success) { showToast(data.message); _cncaLoadData(); }
        else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cncaReject(id) {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason || !reason.trim()) return;
    try {
        const data = await apiCall(`/api/crm-conversion/${id}/reject`, 'POST', { reject_reason: reason.trim() });
        if (data.success) { showToast(data.message); _cncaLoadData(); }
        else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

let _cncaApproverIds = [];
let _cncaAllUsers = [];
let _cncaApprovers = [];
let _cncaDeptMap = {};

async function _cncaShowSettings() {
    const [data, usersData, deptsData] = await Promise.all([
        apiCall('/api/crm-conversion/settings'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments')
    ]);
    const tgGroup = data.telegram_group || '';
    _cncaApproverIds = data.approver_ids || [];
    _cncaApprovers = data.approvers || [];
    _cncaAllUsers = usersData.users || [];
    const depts = deptsData.departments || [];
    _cncaDeptMap = {};
    depts.forEach(d => _cncaDeptMap[d.id] = d.name);

    // Find GĐ users (always have access, shown locked)
    const gdUsers = _cncaAllUsers.filter(u => u.role === 'giam_doc');

    const overlay = document.createElement('div');
    overlay.id = 'cncaSettingsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:28px;width:580px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="margin:0;color:#122546;">⚙️ Cài Đặt Chấp Nhận CTV/Affiliate</h3>
                <span onclick="document.getElementById('cncaSettingsOverlay').remove()" style="cursor:pointer;font-size:22px;color:#6b7280;">✕</span>
            </div>

            <div style="margin-bottom:20px;">
                <div style="font-weight:700;font-size:14px;color:#122546;margin-bottom:10px;">🔐 Quyền Duyệt</div>
                <div style="margin-bottom:10px;padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
                    <div style="font-size:11px;color:#3b82f6;">ℹ️ Chọn <strong>cụ thể từng người</strong> được phép duyệt. Giám Đốc luôn có quyền.</div>
                </div>

                <!-- GĐ (locked) -->
                ${gdUsers.map(gd => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:6px;">
                    <span style="font-size:16px;">🏆</span>
                    <div style="flex:1;">
                        <span style="font-size:13px;font-weight:700;color:#92400e;">${gd.full_name}</span>
                        <span style="font-size:11px;color:#6b7280;margin-left:4px;">(${gd.username})</span>
                        <span style="font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px;background:#fef3c7;color:#92400e;font-weight:600;">GĐ</span>
                    </div>
                    <span style="font-size:10px;color:#6b7280;">🔒 Luôn có</span>
                </div>`).join('')}

                <!-- Dynamic approvers list -->
                <div id="cncaApproversList"></div>

                <!-- Add dropdown -->
                <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
                    <select id="cncaAddApproverSelect" style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#334155;outline:none;">
                        <option value="">-- Chọn người duyệt --</option>
                    </select>
                    <button onclick="_cncaAddApprover()" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;cursor:pointer;font-weight:700;white-space:nowrap;">+ Thêm</button>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <div style="font-weight:700;font-size:14px;color:#122546;margin-bottom:10px;">📢 Nhóm Telegram</div>
                <input type="text" id="cncaTelegramGroup" class="form-control" value="${tgGroup}" placeholder="Nhập Telegram Group ID (VD: -100xxxxxxxxxx)">
                <small style="color:#6b7280;font-size:11px;">Nhóm Telegram nhận thông báo khi có yêu cầu mới, duyệt, hoặc từ chối. Để trống = chỉ gửi nhóm chung.</small>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="document.getElementById('cncaSettingsOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">Hủy</button>
                <button onclick="_cncaSaveSettings()" class="btn btn-primary" style="width:auto;">💾 Lưu Cài Đặt</button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    _cncaRenderApprovers();
}

function _cncaRenderApprovers() {
    const listDiv = document.getElementById('cncaApproversList');
    if (!listDiv) return;
    const ROLE_SHORT = { giam_doc:'GĐ', quan_ly_cap_cao:'QLCC', quan_ly:'QL', truong_phong:'TP', nhan_vien:'NV', thu_viec:'TV', part_time:'PT', hoa_hong:'HH', tkaffiliate:'AFF' };
    const ROLE_COLORS = { quan_ly_cap_cao:'#92400e', quan_ly:'#1e40af', truong_phong:'#6d28d9', nhan_vien:'#0369a1', thu_viec:'#166534' };

    const approvers = _cncaApproverIds.map(id =>
        _cncaApprovers.find(a => a.id === id) || _cncaAllUsers.find(u => u.id === id) || { id, full_name: 'ID: ' + id, role: '?', username: '?' }
    );

    if (approvers.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:10px;font-size:12px;">Chưa thêm ai. Chỉ GĐ được duyệt.</div>';
    } else {
        listDiv.innerHTML = approvers.map(u => {
            const deptName = u.dept_name || _cncaDeptMap[u.department_id] || '';
            const roleColor = ROLE_COLORS[u.role] || '#6b7280';
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:6px;">
                <span style="font-size:16px;">👤</span>
                <div style="flex:1;">
                    <span style="font-size:13px;font-weight:700;color:#166534;">${u.full_name}</span>
                    <span style="font-size:11px;color:#6b7280;margin-left:4px;">(${u.username})</span>
                    <span style="font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px;background:#e0f2fe;color:${roleColor};font-weight:600;">${ROLE_SHORT[u.role] || u.role}</span>
                    ${deptName ? `<span style="font-size:9px;padding:1px 6px;border-radius:4px;margin-left:4px;background:#f0fdf4;color:#166534;font-weight:600;">📁 ${deptName}</span>` : ''}
                </div>
                <span style="font-size:11px;color:#6b7280;">${u.phone || ''}</span>
                <button onclick="_cncaRemoveApprover(${u.id})" style="padding:3px 8px;font-size:11px;border:1px solid #fca5a5;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-weight:600;">✕</button>
            </div>`;
        }).join('');
    }

    // Update dropdown (exclude GĐ + already selected)
    const select = document.getElementById('cncaAddApproverSelect');
    if (select) {
        const existing = new Set([..._cncaApproverIds]);
        select.innerHTML = '<option value="">-- Chọn người duyệt --</option>' +
            _cncaAllUsers
                .filter(u => ['quan_ly_cap_cao', 'quan_ly'].includes(u.role) && !existing.has(u.id))
                .map(u => {
                    const rl = { quan_ly_cap_cao:'QLCC', quan_ly:'QL', truong_phong:'TP', nhan_vien:'NV', thu_viec:'TV', part_time:'PT' };
                    const deptName = _cncaDeptMap[u.department_id] || '';
                    return `<option value="${u.id}">${u.full_name} (${u.username}) — ${rl[u.role] || u.role}${deptName ? ' — ' + deptName : ''}</option>`;
                }).join('');
    }
}

function _cncaAddApprover() {
    const select = document.getElementById('cncaAddApproverSelect');
    const val = Number(select?.value);
    if (!val) return;
    if (!_cncaApproverIds.includes(val)) {
        _cncaApproverIds.push(val);
        _cncaRenderApprovers();
    }
}

function _cncaRemoveApprover(id) {
    _cncaApproverIds = _cncaApproverIds.filter(i => i !== id);
    _cncaRenderApprovers();
}

async function _cncaSaveSettings() {
    const telegram_group = document.getElementById('cncaTelegramGroup')?.value?.trim() || '';
    console.log('[CTV-SAVE] Saving:', JSON.stringify(_cncaApproverIds), 'tg:', telegram_group);
    try {
        const data = await apiCall('/api/crm-conversion/settings', 'PUT', { approver_ids: _cncaApproverIds, telegram_group });
        console.log('[CTV-SAVE] Response:', JSON.stringify(data));
        if (data.success) {
            showToast('✅ ' + data.message);
            document.getElementById('cncaSettingsOverlay')?.remove();
        } else showToast(data.error || data.message || 'Lỗi', 'error');
    } catch(e) {
        console.error('[CTV-SAVE] Error:', e);
        showToast('Lỗi lưu cài đặt: ' + e.message, 'error');
    }
}

// ========== GLOBAL: Popup đề xuất chuyển CRM (dùng chung cho tất cả CRM modules) ==========
const _CRM_TRANSFER_MAP = {
    nhu_cau: { label: 'Chăm Sóc KH Nhu Cầu', color: '#dc2626', bg: '#fee2e2', icon: '❤️' },
    ctv: { label: 'Chăm Sóc CTV', color: '#d97706', bg: '#fef3c7', icon: '🤝' },
    ctv_hoa_hong: { label: 'Chăm Sóc Affiliate', color: '#7c3aed', bg: '#f3e8ff', icon: '💎' },
    koc_tiktok: { label: 'Chăm Sóc KOL/KOC Tiktok', color: '#0891b2', bg: '#cffafe', icon: '🎬' }
};

async function openCrmTransferPopup(customerId) {
    const check = await apiCall(`/api/crm-conversion/check/${customerId}`);
    if (check.hasPending) { showToast('⚠️ Khách này đã có yêu cầu đang chờ duyệt!', 'error'); return; }

    const cust = await apiCall(`/api/customers/${customerId}`);
    const c = cust.customer || {};
    if (c.cancel_approved === 1) { showToast('Không thể đề xuất khách đã bị hủy', 'error'); return; }

    const currentCrm = c.crm_type;
    const currentInfo = _CRM_TRANSFER_MAP[currentCrm] || { label: currentCrm, color: '#64748b', bg: '#f1f5f9' };

    // Build target CRM buttons (exclude current)
    const targets = Object.entries(_CRM_TRANSFER_MAP)
        .filter(([key]) => key !== currentCrm)
        .map(([key, info]) =>
            `<div class="crm-tf-opt" data-crm="${key}" onclick="_crmTfSelect(this,'${key}')"
                 style="padding:10px 14px;border-radius:10px;border:2px solid #e2e8f0;cursor:pointer;text-align:center;transition:all .2s;background:white;">
                <div style="font-size:20px;margin-bottom:2px;">${info.icon}</div>
                <div style="font-size:11px;font-weight:700;color:#374151;">${info.label}</div>
            </div>`
        ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'crmTransferOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;width:500px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden;animation:emPopBounce .4s ease;">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:22px 24px;text-align:center;">
                <div style="font-size:36px;margin-bottom:6px;">🔄</div>
                <div style="color:#fad24c;font-size:17px;font-weight:800;">Đề Xuất Chuyển CRM</div>
            </div>
            <div style="padding:24px;">
                <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #e2e8f0;">
                    <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Khách hàng</div>
                    <div style="font-size:16px;font-weight:700;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">${c.phone || ''} ${c.facebook_link ? '· 🔗 Link' : ''}</div>
                </div>
                <div style="background:${currentInfo.bg};padding:10px 14px;border-radius:8px;text-align:center;margin-bottom:16px;border:2px solid ${currentInfo.color}30;">
                    <div style="font-size:10px;color:${currentInfo.color};font-weight:600;">CRM HIỆN TẠI</div>
                    <div style="font-size:13px;font-weight:700;color:${currentInfo.color};margin-top:2px;">${currentInfo.label}</div>
                </div>
                <div style="margin-bottom:4px;font-weight:700;font-size:13px;color:#122546;">→ Chuyển sang <span style="color:#dc2626;">*</span></div>
                <div id="crmTfTargets" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                    ${targets}
                </div>
                <input type="hidden" id="crmTfSelectedCrm" value="">
                <div style="margin-bottom:4px;font-weight:700;font-size:13px;color:#122546;">Lý do đề xuất <span style="color:#dc2626;">*</span></div>
                <textarea id="crmTfReason" class="form-control" rows="3" placeholder="VD: Khách muốn chuyển sang hợp tác..."></textarea>
                <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
                    <button onclick="document.getElementById('crmTransferOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">❌ Hủy</button>
                    <button onclick="_crmTfSubmit(${c.id})" class="btn btn-primary" style="width:auto;padding:10px 24px;">✅ Gửi Đề Xuất</button>
                </div>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

function _crmTfSelect(el, crmType) {
    // Clear all selections
    document.querySelectorAll('#crmTfTargets .crm-tf-opt').forEach(opt => {
        opt.style.border = '2px solid #e2e8f0';
        opt.style.background = 'white';
        opt.style.transform = '';
    });
    // Highlight selected
    const info = _CRM_TRANSFER_MAP[crmType];
    if (info) {
        el.style.border = `2px solid ${info.color}`;
        el.style.background = info.bg;
        el.style.transform = 'scale(1.05)';
    }
    document.getElementById('crmTfSelectedCrm').value = crmType;
}

async function _crmTfSubmit(customerId) {
    const toCrm = document.getElementById('crmTfSelectedCrm')?.value;
    const reason = document.getElementById('crmTfReason')?.value?.trim();
    if (!toCrm) { showToast('Vui lòng chọn CRM muốn chuyển sang', 'error'); return; }
    if (!reason) { showToast('Vui lòng nhập lý do đề xuất', 'error'); return; }
    try {
        const data = await apiCall('/api/crm-conversion/request', 'POST', { customer_id: customerId, to_crm_type: toCrm, reason });
        if (data.success) {
            showToast('✅ ' + data.message);
            document.getElementById('crmTransferOverlay')?.remove();
            // Auto-reload CRM page data so customer disappears immediately
            if (typeof window._crmReloadCurrentPage === 'function') window._crmReloadCurrentPage();
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// Legacy aliases for backward compatibility
function openCTVProposalPopup(customerId) { openCrmTransferPopup(customerId); }
function openAffiliateProposalPopup(customerId) { openCrmTransferPopup(customerId); }

// ========== TAB: Tạo TK Affiliate ==========
async function _cncaLoadAffAccountData() {
    const yearParam = `&year=${_cncaStatsYear}`;
    const data = await apiCall(`/api/affiliate-account/list?status=all${yearParam}`);
    const requests = data.requests || [];
    const badge = document.getElementById('cncaAffAccBadge');
    if (badge) badge.textContent = data.pendingCount || 0;

    const thead = document.getElementById('cncaThead');
    const tbody = document.getElementById('cncaTbody');

    const pending = requests.filter(r => r.status === 'pending');
    const processed = requests.filter(r => r.status !== 'pending');

    thead.innerHTML = `<tr>
        <th>STT</th><th>Tên KH</th><th>SĐT</th><th>Username</th>
        <th>Chi Tiết TK</th><th>Lý Do</th><th>NV Yêu Cầu</th><th>Ngày Tạo</th><th>Trạng Thái</th><th style="text-align:center">Hành Động</th>
    </tr>`;

    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="cnca-empty"><div class="icon">🔑</div><h3>Chưa có yêu cầu tạo TK Affiliate</h3></div></td></tr>`;
        return;
    }

    let allRows = [...pending, ...processed];
    // Apply stat card filter
    if (_cncaActiveStatCard === 'aff_approved') allRows = allRows.filter(r => r.status === 'approved');
    else if (_cncaActiveStatCard === 'aff_rejected') allRows = allRows.filter(r => r.status === 'rejected');
    tbody.innerHTML = allRows.map((r, i) => {
        const isPending = r.status === 'pending';
        const statusHtml = isPending
            ? '<span class="cnca-status cnca-status-pending">⏳ Chờ duyệt</span>'
            : r.status === 'approved'
                ? `<span class="cnca-status cnca-status-approved">✅ Đã tạo TK</span>`
                : `<span class="cnca-status cnca-status-rejected">❌ Từ chối</span>`;

        const actionHtml = isPending
            ? `<button class="cnca-btn cnca-btn-approve" onclick="_cncaApproveAffAcc(${r.id})">✅ Duyệt & Tạo TK</button>
               <button class="cnca-btn cnca-btn-reject" onclick="_cncaRejectAffAcc(${r.id})" style="margin-left:4px;">❌</button>`
            : r.status === 'approved'
                ? `<span style="font-size:11px;color:#059669;font-weight:600;">👤 ${r.created_username || '—'}</span>`
                : `<span style="font-size:11px;color:#dc2626;" title="${(r.reject_reason||'').replace(/"/g,'&quot;')}">${r.reject_reason ? '💬 ' + r.reject_reason.substring(0,30) + (r.reject_reason.length > 30 ? '...' : '') : '—'}</span>`;

        // Parse proposed_data for detail display
        let pd = {};
        try { pd = r.proposed_data ? (typeof r.proposed_data === 'string' ? JSON.parse(r.proposed_data) : r.proposed_data) : {}; } catch(e) {}
        const detailBadges = [];
        if (pd.commission_tier_id) detailBadges.push(`<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:10px;">💰 Tầng #${pd.commission_tier_id}</span>`);
        if (pd.department_id) detailBadges.push(`<span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:10px;">📁 PB</span>`);
        if (pd.bank_name) detailBadges.push(`<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;">🏦 ${pd.bank_name}</span>`);
        if (pd.assigned_to_user_id) detailBadges.push(`<span style="background:#f3e8ff;color:#7c3aed;padding:2px 6px;border-radius:4px;font-size:10px;">👥 Cha</span>`);
        const detailHtml = detailBadges.length > 0 ? detailBadges.join(' ') : '<span style="color:#9ca3af;font-size:11px;">—</span>';

        return `<tr style="${isPending ? 'background:rgba(139,92,246,.04);' : ''}">
            <td style="text-align:center;font-weight:700;color:#64748b;">${i+1}</td>
            <td><span class="cnca-name-link" onclick="_cncaEditCustomer(${r.customer_id})">${r.customer_name || '—'}</span></td>
            <td>${r.phone ? '<a href="tel:'+r.phone+'" style="color:var(--info)">'+r.phone+'</a>' : '—'}</td>
            <td>${r.status === 'approved' && r.created_user_id ? `<span class="cnca-user-link" onclick="_cncaEditAffUser(${r.created_user_id})">🔑 ${r.proposed_username}</span>` : `<span style="font-weight:700;color:#8b5cf6;font-family:'Courier New',monospace;font-size:13px;">🔑 ${r.proposed_username}</span>`}</td>
            <td style="font-size:11px;">${detailHtml}</td>
            <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e65100;font-weight:600;" title="${(r.reason||'').replace(/"/g,'&quot;')}">${r.reason || '—'}</td>
            <td style="font-size:12px;">${r.requested_by_name || '—'} <span style="color:#94a3b8;font-size:10px;">(${CNCA_ROLE_LABELS[r.requested_by_role] || ''})</span></td>
            <td style="font-size:12px;color:#64748b;">${r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'}</td>
            <td>${statusHtml}</td>
            <td style="text-align:center;white-space:nowrap;">${actionHtml}</td>
        </tr>`;
    }).join('');
}

async function _cncaApproveAffAcc(id) {
    if (!confirm('Xác nhận DUYỆT & TẠO TK Affiliate cho khách này?\n\nHệ thống sẽ tự động tạo tài khoản ngay lập tức.')) return;
    try {
        const data = await apiCall(`/api/affiliate-account/${id}/approve`, 'POST');
        if (data.success) { showToast(data.message); _cncaLoadData(); }
        else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _cncaRejectAffAcc(id) {
    const reason = prompt('Nhập lý do từ chối tạo TK:');
    if (!reason || !reason.trim()) return;
    try {
        const data = await apiCall(`/api/affiliate-account/${id}/reject`, 'POST', { reject_reason: reason.trim() });
        if (data.success) { showToast(data.message); _cncaLoadData(); }
        else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== GLOBAL: Popup xin tạo TK Affiliate ĐẦY ĐỦ (dùng cho CRM Affiliate/KOC) ==========
function _generateUsername(name) {
    if (!name) return '';
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
        .toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').substring(0, 20);
}

// Local helper: build affiliate dept options
function _reqAffDeptOptions(depts) {
    const affParent = depts.find(d => !d.parent_id && d.name.toUpperCase().includes('AFFILIATE'));
    if (!affParent) return '';
    const children = depts.filter(d => d.parent_id === affParent.id);
    let first = true;
    return children.map(c => {
        const sel = first ? (first = false, 'selected') : '';
        return `<option value="${c.id}" ${sel}>📁 ${c.name}</option>`;
    }).join('');
}

// Local helper: province list
const _REQ_AFF_PROVINCES = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hồ Chí Minh','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];



async function openAffiliateAccountPopup(customerId) {
    // Pre-check
    const check = await apiCall(`/api/affiliate-account/check/${customerId}`);
    if (check.hasAccount) { showToast(`⚠️ KH đã có TK Affiliate: ${check.account.username}`, 'error'); return; }
    if (check.hasPending) { showToast('⚠️ KH đã có yêu cầu đang chờ duyệt!', 'error'); return; }

    // Fetch all data in parallel
    const [custRes, tiers, staffList, deptData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall('/api/settings/commission-tiers'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments')
    ]);
    const c = custRes.customer || {};
    if (c.cancel_approved === 1) { showToast('Không thể xin TK cho khách đã bị hủy', 'error'); return; }

    const depts = deptData.departments || [];
    const suggestedUsername = _generateUsername(c.customer_name);
    const managedById = c.assigned_to_id || currentUser.id;
    const CRM_L = {nhu_cau:'Chăm Sóc KH Nhu Cầu', ctv:'Chăm Sóc CTV', ctv_hoa_hong:'Chăm Sóc Affiliate', koc_tiktok:'Chăm Sóc KOL/KOC Tiktok'};

    // Auto-detect affiliate parent from referrer (AFFILIATE GIỚI THIỆU AFFILIATE)
    let autoParentId = null;
    let autoParentLabel = '';
    if (c.referrer_id) {
        try {
            const refUser = (staffList.users || []).find(u => u.id === c.referrer_id && u.role === 'tkaffiliate');
            if (!refUser) {
                const refData = await apiCall(`/api/users/${c.referrer_id}`);
                const ru = refData.user || {};
                if (ru.role === 'tkaffiliate') {
                    autoParentId = ru.id;
                    autoParentLabel = `${ru.full_name} (${ru.username})`;
                }
            } else {
                autoParentId = refUser.id;
                autoParentLabel = `${refUser.full_name} (TK Affiliate)`;
            }
        } catch(e) { /* skip */ }
    }

    // Find managed-by employee name
    const staffUsers = staffList.users || [];
    const managedByUser = staffUsers.find(u => u.id === managedById);
    const managedByLabel = managedByUser ? `${managedByUser.full_name} (${ROLE_LABELS[managedByUser.role] || managedByUser.role})` : currentUser.full_name;

    // Province options
    const provValue = c.province || '';
    const provOptions = _REQ_AFF_PROVINCES.map(p => `<option value="${p}" ${p === provValue ? 'selected' : ''}>${p}</option>`).join('');

    const bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập <span style="color:var(--danger)">*</span></label>
                <input type="text" id="reqAffUsername" class="form-control" value="${suggestedUsername}" placeholder="Tên đăng nhập"
                    style="font-family:'Courier New',monospace;font-weight:700;color:#7c3aed;">
            </div>
            <div class="form-group">
                <label>Mật khẩu <span style="color:var(--danger)">*</span></label>
                <input type="text" id="reqAffPassword" class="form-control" value="123456" placeholder="Mật khẩu">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên</label>
                <input type="text" class="form-control" value="${c.customer_name || ''}" readonly style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
            </div>
            <div class="form-group">
                <label>Vai trò</label>
                <input type="text" class="form-control" value="TK Affiliate" disabled style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>👤 Nhân viên quản lý</label>
                <input type="text" class="form-control" value="${managedByLabel}" readonly style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
                <input type="hidden" id="reqAffManagedBy" value="${managedById}">
            </div>
            <div class="form-group">
                <label>📋 Khách hàng nguồn</label>
                <input type="text" class="form-control" value="${c.customer_name} - ${c.phone || 'N/A'}" readonly style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
                <input type="hidden" id="reqAffSourceCrmType" value="${c.crm_type || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>📌 Khách CRM từ đâu?</label>
            <input type="text" class="form-control" disabled value="${CRM_L[c.crm_type] || c.crm_type || ''}" style="background:#e5e7eb;cursor:not-allowed;color:#374151;font-weight:600;">
        </div>
        <div class="form-group">
            <label>👔 Chức Danh</label>
            <input type="text" class="form-control" disabled value="${c.job || ''}" style="background:#e5e7eb;cursor:not-allowed;color:#374151;font-weight:600;">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" id="reqAffPhone" class="form-control" value="${c.phone || ''}" placeholder="10 chữ số" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            <div class="form-group">
                <label>🎂 Sinh nhật</label>
                <input type="date" id="reqAffBirthDate" class="form-control" value="${c.birthday ? c.birthday.split('T')[0] : ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Địa chỉ</label>
                <input type="text" id="reqAffAddress" class="form-control" value="${c.address || ''}" placeholder="Địa chỉ">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành phố</label>
                <select id="reqAffProvince" class="form-control">
                    <option value="">— Chọn tỉnh thành —</option>
                    ${provOptions}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban</label>
            <select id="reqAffDepartment" class="form-control">
                <option value="">— Chọn phòng ban —</option>
                ${_reqAffDeptOptions(depts)}
            </select>
        </div>
        <div>
            <hr style="margin: 15px 0; border-color: var(--gray-200);">
            <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
            <div class="form-group">
                <label>Tầng chiết khấu</label>
                <select id="reqAffTierId" class="form-control">
                    <option value="">Chọn tầng</option>
                    ${(tiers.items || []).map(t => `<option value="${t.id}">${t.name} (TT: ${t.percentage}% / CT: ${t.parent_percentage || 0}%)</option>`).join('')}
                </select>
            </div>
            <div style="background:#f0f4ff;border-radius:8px;padding:8px 12px;font-size:11px;color:#3b82f6;margin-bottom:10px;">
                ${autoParentId
                    ? `🔗 <b>Affiliate cha (tự động):</b> <span style="color:#7c3aed;font-weight:700;">${autoParentLabel}</span>
                       <br><span style="color:#6b7280;">Hệ thống tự phát hiện KH được giới thiệu bởi affiliate này → tự động gán cha.</span>
                       <input type="hidden" id="reqAffAutoParentId" value="${autoParentId}">`
                    : `ℹ️ <b>Gán Affiliate cha</b> sẽ do GĐ/QL thiết lập sau khi duyệt (tại Tài Khoản Affiliate → ✏️ Sửa).
                       <input type="hidden" id="reqAffAutoParentId" value="">`
                }
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ngân hàng</label>
                    <input type="text" id="reqAffBankName" class="form-control" placeholder="VD: Vietcombank">
                </div>
                <div class="form-group">
                    <label>Số tài khoản</label>
                    <input type="text" id="reqAffBankAccount" class="form-control" placeholder="Số TK ngân hàng">
                </div>
            </div>
            <div class="form-group">
                <label>Chủ tài khoản</label>
                <input type="text" id="reqAffBankHolder" class="form-control" placeholder="Tên chủ tài khoản">
            </div>
        </div>
        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <div class="form-group">
            <label>📝 Lý do xin tạo TK <span style="color:var(--danger)">*</span></label>
            <textarea id="reqAffReason" class="form-control" rows="2" placeholder="VD: KH muốn đăng nhập hệ thống để theo dõi đơn hàng, hoa hồng..."></textarea>
        </div>
        <div style="background:#fef3c7;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400e;">
            ⚠️ Sau khi gửi, GĐ/QL sẽ duyệt. Nếu được duyệt, TK sẽ <b>tự động kích hoạt</b> ngay lập tức với đầy đủ thông tin.
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">❌ Hủy</button>
        <button class="btn" onclick="_affAccSubmit(${c.id})" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;font-weight:700;">🔑 Gửi Yêu Cầu</button>
    `;
    openModal('🔑 Xin Tạo TK Affiliate', bodyHTML, footerHTML);
}

async function _affAccSubmit(customerId) {
    const username = document.getElementById('reqAffUsername')?.value?.trim();
    const password = document.getElementById('reqAffPassword')?.value;
    const reason = document.getElementById('reqAffReason')?.value?.trim();
    if (!username) { showToast('Vui lòng nhập tên đăng nhập', 'error'); return; }
    if (!password || password.length < 4) { showToast('Mật khẩu phải ít nhất 4 ký tự', 'error'); return; }
    if (!reason) { showToast('Vui lòng nhập lý do', 'error'); return; }

    const phone = document.getElementById('reqAffPhone')?.value || '';
    if (phone && !/^\d{10}$/.test(phone)) { showToast('Số điện thoại phải đúng 10 chữ số', 'error'); return; }

    // Collect all proposed data for complete account creation on approve
    const proposed_data = {
        phone: phone || null,
        address: document.getElementById('reqAffAddress')?.value || null,
        province: document.getElementById('reqAffProvince')?.value || null,
        birth_date: document.getElementById('reqAffBirthDate')?.value || null,
        department_id: document.getElementById('reqAffDepartment')?.value || null,
        commission_tier_id: document.getElementById('reqAffTierId')?.value || null,
        assigned_to_user_id: document.getElementById('reqAffAutoParentId')?.value || null,
        bank_name: document.getElementById('reqAffBankName')?.value || null,
        bank_account: document.getElementById('reqAffBankAccount')?.value || null,
        bank_holder: document.getElementById('reqAffBankHolder')?.value || null,
        managed_by_user_id: document.getElementById('reqAffManagedBy')?.value || null,
        source_crm_type: document.getElementById('reqAffSourceCrmType')?.value || null,
    };

    try {
        const data = await apiCall('/api/affiliate-account/request', 'POST', {
            customer_id: customerId, proposed_username: username, proposed_password: password, reason, proposed_data
        });
        if (data.success) {
            showToast('✅ ' + data.message);
            closeModal();
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== STAT CARDS ==========
async function _cncaLoadStats() {
    try {
        const stats = await apiCall(`/api/crm-conversion/stats?year=${_cncaStatsYear}`);
        const cards = [
            { key:'conv_affiliate', icon:'🔄', label:'→ Affiliate', num: stats.conv_to_affiliate, bg:'linear-gradient(135deg,#ef4444,#dc2626)' },
            { key:'conv_ctv', icon:'🤝', label:'→ CTV', num: stats.conv_to_ctv, bg:'linear-gradient(135deg,#22c55e,#16a34a)' },
            { key:'conv_nhucau', icon:'❤️', label:'→ Nhu Cầu', num: stats.conv_to_nhucau, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
            { key:'conv_koctiktok', icon:'🎬', label:'→ KOL/KOC', num: stats.conv_to_koctiktok, bg:'linear-gradient(135deg,#f97316,#ea580c)' },
            { key:'aff_approved', icon:'🔑', label:'Đã Tạo TK Aff', num: stats.aff_account_approved, bg:'linear-gradient(135deg,#475569,#334155)' },
            { key:'aff_rejected', icon:'❌', label:'Không Duyệt TK', num: stats.aff_account_rejected, bg:'linear-gradient(135deg,#3b82f6,#2563eb)' }
        ];
        const el = document.getElementById('cncaStatCards');
        if (!el) return;
        el.innerHTML = cards.map(c => `
            <div class="cnca-stat-card ${_cncaActiveStatCard === c.key ? 'active' : ''}" data-card="${c.key}" onclick="_cncaClickStat('${c.key}')" style="background:${c.bg};">
                <div style="font-size:20px;margin-bottom:4px;">${c.icon}</div>
                <div class="cnca-stat-num">${c.num}</div>
                <div class="cnca-stat-label">${c.label}</div>
            </div>
        `).join('');
    } catch(e) { console.error('Stats load error:', e); }
}

function _cncaClickStat(key) {
    if (_cncaActiveStatCard === key) {
        _cncaActiveStatCard = '';
    } else {
        _cncaActiveStatCard = key;
    }
    // Highlight active card
    document.querySelectorAll('.cnca-stat-card').forEach(c => c.classList.toggle('active', c.dataset.card === _cncaActiveStatCard));
    // Switch to appropriate tab (keepStatFilter = true to prevent reset)
    if (['aff_approved','aff_rejected'].includes(key)) {
        if (_cncaCurrentTab !== 'affaccount') _cncaSwitchTab('affaccount', true);
        else _cncaLoadData();
    } else {
        if (_cncaCurrentTab !== 'history') _cncaSwitchTab('history', true);
        else _cncaLoadData();
    }
}

// ========== DATE FILTER BAR ==========
var _cncaDateFilter = 'all';
var _cncaDateCustomFrom = '';
var _cncaDateCustomTo = '';

function _cncaBuildDateFilterBar() {
    const bar = document.getElementById('cncaDateFilterBar');
    if (!bar) return;
    const yearOpts = [2025,2026].map(y => `<option value="${y}" ${y === _cncaStatsYear ? 'selected' : ''}>${y}</option>`).join('');
    bar.innerHTML = `<div class="cnca-date-bar">
        <button class="cnca-date-btn ${_cncaDateFilter==='today'?'active':''}" onclick="_cncaSetDateFilter('today')">Hôm nay</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='yesterday'?'active':''}" onclick="_cncaSetDateFilter('yesterday')">Hôm qua</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='7days'?'active':''}" onclick="_cncaSetDateFilter('7days')">7 ngày</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='thismonth'?'active':''}" onclick="_cncaSetDateFilter('thismonth')">Tháng này</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='lastmonth'?'active':''}" onclick="_cncaSetDateFilter('lastmonth')">Tháng trước</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='all'?'active':''}" onclick="_cncaSetDateFilter('all')">Tất cả</button>
        <button class="cnca-date-btn ${_cncaDateFilter==='custom'?'active':''}" onclick="_cncaSetDateFilter('custom')">Tùy chọn</button>
        <select class="cnca-date-btn" style="padding:5px 10px;" onchange="_cncaChangeYear(this.value)">${yearOpts}</select>
        ${_cncaDateFilter === 'custom' ? `<input type="date" id="cncaDateFrom" class="form-control" value="${_cncaDateCustomFrom}" onchange="_cncaDateCustomFrom=this.value;_cncaLoadData()" style="width:140px;font-size:12px;padding:4px 8px;">
        <span style="color:#94a3b8;">→</span>
        <input type="date" id="cncaDateTo" class="form-control" value="${_cncaDateCustomTo}" onchange="_cncaDateCustomTo=this.value;_cncaLoadData()" style="width:140px;font-size:12px;padding:4px 8px;">` : ''}
    </div>`;
}

function _cncaSetDateFilter(f) {
    _cncaDateFilter = f;
    _cncaBuildDateFilterBar();
    _cncaLoadData();
}

function _cncaChangeYear(y) {
    _cncaStatsYear = Number(y);
    _cncaLoadStats();
    _cncaLoadData();
}

function _cncaApplyDateFilter(requests) {
    if (_cncaDateFilter === 'all') return requests;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from, to;
    if (_cncaDateFilter === 'today') { from = today; to = new Date(today.getTime() + 86400000); }
    else if (_cncaDateFilter === 'yesterday') { from = new Date(today.getTime() - 86400000); to = today; }
    else if (_cncaDateFilter === '7days') { from = new Date(today.getTime() - 7*86400000); to = new Date(today.getTime() + 86400000); }
    else if (_cncaDateFilter === 'thismonth') { from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(now.getFullYear(), now.getMonth()+1, 1); }
    else if (_cncaDateFilter === 'lastmonth') { from = new Date(now.getFullYear(), now.getMonth()-1, 1); to = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (_cncaDateFilter === 'custom') {
        from = _cncaDateCustomFrom ? new Date(_cncaDateCustomFrom) : new Date('2020-01-01');
        to = _cncaDateCustomTo ? new Date(new Date(_cncaDateCustomTo).getTime() + 86400000) : new Date('2030-01-01');
    } else return requests;
    return requests.filter(r => {
        const d = new Date(r.created_at || r.processed_at);
        return d >= from && d < to;
    });
}

// ========== EDIT CUSTOMER MODAL ==========
async function _cncaEditCustomer(customerId) {
    if (!customerId) return;
    const res = await apiCall(`/api/customers/${customerId}`);
    const c = res.customer;
    if (!c) { showToast('Không tìm thấy khách hàng', 'error'); return; }
    const provOpts = CNCA_VN_PROVINCES.map(p => `<option value="${p}" ${c.province===p?'selected':''}>${p}</option>`).join('');
    const bodyHTML = `<form id="cncaEditCustForm"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group"><label>Tên KH</label><input type="text" id="cncaCustName" class="form-control" value="${c.customer_name||''}"></div>
        <div class="form-group"><label>SĐT</label><input type="text" id="cncaCustPhone" class="form-control" value="${c.phone||''}" maxlength="10"></div>
        <div class="form-group"><label>Địa chỉ</label><input type="text" id="cncaCustAddress" class="form-control" value="${c.address||''}"></div>
        <div class="form-group"><label>Tỉnh/TP</label><select id="cncaCustProvince" class="form-control"><option value="">— Chọn —</option>${provOpts}</select></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Link KH (Facebook)</label><input type="text" id="cncaCustFbLink" class="form-control" value="${c.facebook_link||''}"></div>
    </div></form>`;
    openModal('✏️ Sửa KH: ' + (c.customer_name||''), bodyHTML,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
         <button class="btn btn-success" onclick="_cncaSubmitEditCust(${customerId})">💾 Lưu</button>`);
}

async function _cncaSubmitEditCust(id) {
    const body = {
        customer_name: document.getElementById('cncaCustName').value,
        phone: document.getElementById('cncaCustPhone').value,
        address: document.getElementById('cncaCustAddress').value,
        province: document.getElementById('cncaCustProvince').value,
        facebook_link: document.getElementById('cncaCustFbLink').value
    };
    if (body.phone && !/^\d{10}$/.test(body.phone)) { showToast('SĐT phải 10 chữ số','error'); return; }
    const data = await apiCall(`/api/customers/${id}`, 'PUT', body);
    if (data.success || data.customer) {
        showToast('✅ Cập nhật KH thành công!');
        closeModal();
        _cncaLoadData();
    } else showToast(data.error || 'Lỗi', 'error');
}

// ========== EDIT AFFILIATE USER MODAL ==========
async function _cncaEditAffUser(userId) {
    if (!userId) return;
    const [userData, tiersData] = await Promise.all([apiCall(`/api/users/${userId}`), apiCall('/api/settings/commission-tiers')]);
    const u = userData.user;
    if (!u) { showToast('Không tìm thấy TK', 'error'); return; }
    const tiers = tiersData.items || [];
    const provOpts = CNCA_VN_PROVINCES.map(p => `<option value="${p}" ${u.province===p?'selected':''}>${p}</option>`).join('');
    const tierOpts = tiers.map(t => `<option value="${t.id}" ${u.commission_tier_id==t.id?'selected':''}>${t.name} (${t.percentage}%)</option>`).join('');
    const bodyHTML = `<form id="cncaEditAffForm">
        <div class="form-group" style="margin-bottom:14px;">
            <label>🔐 Tên tài khoản</label>
            <input type="text" class="form-control" value="${u.username||''}" disabled style="background:#f0ecff;cursor:not-allowed;color:#7c3aed;font-weight:700;font-family:'Courier New',monospace;border:1px solid #c4b5fd;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group"><label>Họ tên</label><input type="text" id="cncaAffName" class="form-control" value="${u.full_name||''}"></div>
        <div class="form-group"><label>SĐT</label><input type="text" id="cncaAffPhone" class="form-control" value="${u.phone||''}" maxlength="10"></div>
        <div class="form-group"><label>🔑 Mật khẩu mới <small style="color:#94a3b8;">(trống = không đổi)</small></label><input type="password" id="cncaAffPass" class="form-control" placeholder="••••••"></div>
        <div class="form-group"><label>🎂 Sinh nhật</label><input type="date" id="cncaAffBirth" class="form-control" value="${u.birth_date?u.birth_date.split('T')[0]:''}"></div>
        <div class="form-group"><label>Địa chỉ</label><input type="text" id="cncaAffAddr" class="form-control" value="${u.address||''}"></div>
        <div class="form-group"><label>Tỉnh/TP</label><select id="cncaAffProv" class="form-control"><option value="">— Chọn —</option>${provOpts}</select></div>
        <div class="form-group"><label>💰 Tầng chiết khấu</label><select id="cncaAffTier" class="form-control"><option value="">— Chưa gán —</option>${tierOpts}</select></div>
        <div class="form-group"><label>🏦 Ngân hàng</label><input type="text" id="cncaAffBank" class="form-control" value="${u.bank_name||''}"></div>
        <div class="form-group"><label>Số TK</label><input type="text" id="cncaAffBankAcc" class="form-control" value="${u.bank_account||''}"></div>
        <div class="form-group"><label>Chủ TK</label><input type="text" id="cncaAffBankHolder" class="form-control" value="${u.bank_holder||''}"></div>
    </div></form>`;
    openModal('✏️ Sửa TK Affiliate: ' + u.full_name, bodyHTML,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
         <button class="btn btn-success" onclick="_cncaSubmitEditAffUser(${userId})">💾 Lưu</button>`);
}

async function _cncaSubmitEditAffUser(userId) {
    const newPass = document.getElementById('cncaAffPass')?.value?.trim();
    const body = {
        full_name: document.getElementById('cncaAffName').value,
        phone: document.getElementById('cncaAffPhone').value,
        address: document.getElementById('cncaAffAddr').value,
        province: document.getElementById('cncaAffProv').value,
        birth_date: document.getElementById('cncaAffBirth').value || null,
        commission_tier_id: document.getElementById('cncaAffTier').value || null,
        bank_name: document.getElementById('cncaAffBank').value,
        bank_account: document.getElementById('cncaAffBankAcc').value,
        bank_holder: document.getElementById('cncaAffBankHolder').value,
        sync_source: true
    };
    if (body.phone && !/^\d{10}$/.test(body.phone)) { showToast('SĐT phải 10 chữ số','error'); return; }
    const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
    if (!data.success) { showToast(data.error,'error'); return; }
    if (newPass) {
        if (newPass.length < 4) { showToast('Mật khẩu tối thiểu 4 ký tự','error'); return; }
        const pwData = await apiCall(`/api/users/${userId}/change-password`, 'PUT', { newPassword: newPass });
        if (!pwData.success) { showToast(pwData.error||'Lỗi đổi MK','error'); return; }
    }
    showToast('✅ Cập nhật thành công!' + (newPass ? ' Đã đổi mật khẩu.' : ''));
    closeModal();
    _cncaLoadData();
}
