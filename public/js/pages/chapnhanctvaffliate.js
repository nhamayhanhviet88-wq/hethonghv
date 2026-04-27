// ========== CHẤP NHẬN CTV / AFFILIATE ==========
const CNCA_CRM_LABELS = { nhu_cau:'Chăm Sóc KH Nhu Cầu', ctv:'Chăm Sóc CTV', ctv_hoa_hong:'Chăm Sóc Affiliate', koc_tiktok:'Chăm Sóc KOL/KOC Tiktok' };
const CNCA_ROLE_LABELS = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', thu_viec:'Thử Việc' };

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
    container.innerHTML = `
        <style>
            .cnca-tabs { display:flex; gap:4px; margin-bottom:16px; }
            .cnca-tab { padding:10px 22px; border-radius:10px 10px 0 0; cursor:pointer; font-weight:700; font-size:13px;
                background:#1e293b; color:#94a3b8; border:1px solid #334155; border-bottom:none; transition:all .2s; }
            .cnca-tab.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; }
            .cnca-tab:hover:not(.active) { background:#334155; color:white; }
            .cnca-badge { display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:20px;
                background:#ef4444; color:white; border-radius:10px; font-size:11px; font-weight:800; margin-left:6px; padding:0 5px; }
            .cnca-card { background:var(--card-bg); border-radius:12px; border:1px solid var(--border); overflow:hidden; }
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
        </style>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;color:var(--text-primary);">✅ Chấp Nhận CTV / Affiliate</h2>
            ${currentUser.role === 'giam_doc' ? '<button class="cnca-btn" style="background:#374151;color:white;padding:8px 18px;" onclick="_cncaShowSettings()">⚙️ Cài Đặt</button>' : ''}
        </div>
        <div class="cnca-tabs" id="cncaTabs">
            <div class="cnca-tab active" data-tab="pending" onclick="_cncaSwitchTab('pending')">📋 Chờ Duyệt <span class="cnca-badge" id="cncaPendingBadge">0</span></div>
            <div class="cnca-tab" data-tab="affaccount" onclick="_cncaSwitchTab('affaccount')">🔑 Tạo TK Affiliate <span class="cnca-badge" id="cncaAffAccBadge" style="background:#8b5cf6;">0</span></div>
            <div class="cnca-tab" data-tab="history" onclick="_cncaSwitchTab('history')">📊 Lịch Sử</div>
        </div>
        <div class="cnca-card">
            <div style="overflow-x:auto;padding:4px;">
                <table class="cnca-table"><thead id="cncaThead"></thead><tbody id="cncaTbody"></tbody></table>
            </div>
        </div>
    `;
    _cncaCurrentTab = 'pending';
    await _cncaLoadData();
    // Start countdown timer (update every 60s)
    if (window._cncaCountdownInterval) clearInterval(window._cncaCountdownInterval);
    window._cncaCountdownInterval = setInterval(() => {
        document.querySelectorAll('[data-expires-at]').forEach(el => {
            const expiresAt = new Date(el.dataset.expiresAt);
            el.innerHTML = _cncaFormatCountdown(expiresAt);
        });
    }, 60000);
}

var _cncaCurrentTab = 'pending';

function _cncaSwitchTab(tab) {
    _cncaCurrentTab = tab;
    document.querySelectorAll('.cnca-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    _cncaLoadData();
}

async function _cncaLoadData() {
    // Load affiliate account pending count for badge
    try {
        const affData = await apiCall('/api/affiliate-account/pending-count');
        const affBadge = document.getElementById('cncaAffAccBadge');
        if (affBadge) affBadge.textContent = affData.count || 0;
    } catch(e) {}

    if (_cncaCurrentTab === 'affaccount') { return _cncaLoadAffAccountData(); }

    const status = _cncaCurrentTab === 'pending' ? 'pending' : 'all';
    const data = await apiCall(`/api/crm-conversion/list?status=${status}`);
    const requests = data.requests || [];
    const badge = document.getElementById('cncaPendingBadge');
    if (badge) badge.textContent = data.pendingCount || 0;

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
            <td style="font-weight:700;color:var(--navy);">${r.customer_name || '—'}</td>
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
            <td style="font-weight:700;">${r.customer_name || '—'}</td>
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
    if (!confirm('Xác nhận DUYỆT chuyển đổi khách hàng này sang CTV?')) return;
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

async function _cncaShowSettings() {
    const data = await apiCall('/api/crm-conversion/settings');
    const roles = data.approver_roles || ['giam_doc'];
    const tgGroup = data.telegram_group || '';
    const SETTABLE_ROLES = [
        { key:'giam_doc', label:'🏆 Giám Đốc', locked:true },
        { key:'quan_ly_cap_cao', label:'👔 Quản Lý Cấp Cao' },
        { key:'quan_ly', label:'📊 Quản Lý' },
        { key:'truong_phong', label:'📋 Trưởng Phòng' }
    ];
    const checksHtml = SETTABLE_ROLES.map(r => {
        const checked = roles.includes(r.key) ? 'checked' : '';
        const disabled = r.locked ? 'disabled' : '';
        const bg = checked ? '#eef2ff' : '#f9fafb';
        const border = checked ? '#6366f1' : '#e5e7eb';
        return `<label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;cursor:${r.locked?'not-allowed':'pointer'};background:${bg};border:1px solid ${border};">
            <input type="checkbox" class="cnca-role-cb" value="${r.key}" ${checked} ${disabled} style="width:18px;height:18px;">
            <span style="font-weight:600;color:#122546;">${r.label}</span>
            ${r.locked ? '<span style="font-size:10px;color:#6b7280;margin-left:auto;">🔒 Luôn có</span>' : ''}
        </label>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'cncaSettingsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:28px;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="margin:0;color:#122546;">⚙️ Cài Đặt Chấp Nhận CTV/Affiliate</h3>
                <span onclick="document.getElementById('cncaSettingsOverlay').remove()" style="cursor:pointer;font-size:22px;color:#6b7280;">✕</span>
            </div>
            <div style="margin-bottom:20px;">
                <div style="font-weight:700;font-size:14px;color:#122546;margin-bottom:10px;">🔐 Quyền Duyệt</div>
                <div style="display:flex;flex-direction:column;gap:6px;">${checksHtml}</div>
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
}

async function _cncaSaveSettings() {
    const roles = [...document.querySelectorAll('.cnca-role-cb:checked')].map(cb => cb.value);
    const telegram_group = document.getElementById('cncaTelegramGroup')?.value?.trim() || '';
    try {
        const data = await apiCall('/api/crm-conversion/settings', 'PUT', { approver_roles: roles, telegram_group });
        if (data.success) {
            showToast('✅ ' + data.message);
            document.getElementById('cncaSettingsOverlay')?.remove();
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi lưu cài đặt', 'error'); }
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
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// Legacy aliases for backward compatibility
function openCTVProposalPopup(customerId) { openCrmTransferPopup(customerId); }
function openAffiliateProposalPopup(customerId) { openCrmTransferPopup(customerId); }

// ========== TAB: Tạo TK Affiliate ==========
async function _cncaLoadAffAccountData() {
    const data = await apiCall('/api/affiliate-account/list?status=all');
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

    tbody.innerHTML = [...pending, ...processed].map((r, i) => {
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
            <td style="font-weight:700;color:var(--navy);">${r.customer_name || '—'}</td>
            <td>${r.phone ? '<a href="tel:'+r.phone+'" style="color:var(--info)">'+r.phone+'</a>' : '—'}</td>
            <td style="font-weight:700;color:#8b5cf6;font-family:'Courier New',monospace;font-size:13px;">🔑 ${r.proposed_username}</td>
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


