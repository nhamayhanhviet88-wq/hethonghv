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

// ========== GLOBAL: Popup đề xuất chuyển CTV (dùng chung cho 3 CRM) ==========
async function openCTVProposalPopup(customerId) {
    const check = await apiCall(`/api/crm-conversion/check/${customerId}`);
    if (check.hasPending) { showToast('⚠️ Khách này đã có yêu cầu đang chờ duyệt!', 'error'); return; }

    const cust = await apiCall(`/api/customers/${customerId}`);
    const c = cust.customer || {};
    if (c.crm_type === 'ctv') { showToast('Khách đã thuộc Chăm Sóc CTV', 'error'); return; }
    if (c.cancel_approved === 1) { showToast('Không thể đề xuất khách đã bị hủy', 'error'); return; }

    const overlay = document.createElement('div');
    overlay.id = 'ctvProposalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden;animation:emPopBounce .4s ease;">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:22px 24px;text-align:center;">
                <div style="font-size:36px;margin-bottom:6px;">🔄</div>
                <div style="color:#fad24c;font-size:17px;font-weight:800;">Đề Xuất Chuyển Sang CTV</div>
            </div>
            <div style="padding:24px;">
                <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #e2e8f0;">
                    <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Khách hàng</div>
                    <div style="font-size:16px;font-weight:700;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">${c.phone || ''} ${c.facebook_link ? '· 🔗 Link' : ''}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                    <div style="background:#fee2e2;padding:10px;border-radius:8px;text-align:center;">
                        <div style="font-size:10px;color:#991b1b;font-weight:600;">CRM HIỆN TẠI</div>
                        <div style="font-size:12px;font-weight:700;color:#dc2626;margin-top:2px;">${CNCA_CRM_LABELS[c.crm_type] || c.crm_type}</div>
                    </div>
                    <div style="background:#dcfce7;padding:10px;border-radius:8px;text-align:center;">
                        <div style="font-size:10px;color:#166534;font-weight:600;">→ CHUYỂN SANG</div>
                        <div style="font-size:12px;font-weight:700;color:#16a34a;margin-top:2px;">Chăm Sóc CTV</div>
                    </div>
                </div>
                <div style="margin-bottom:4px;font-weight:700;font-size:13px;color:#122546;">Lý do đề xuất <span style="color:#dc2626;">*</span></div>
                <textarea id="ctvProposalReason" class="form-control" rows="3" placeholder="VD: Khách muốn hợp tác làm CTV bán hàng..."></textarea>
                <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
                    <button onclick="document.getElementById('ctvProposalOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">❌ Hủy</button>
                    <button onclick="_ctvSubmitProposal(${c.id})" class="btn btn-primary" style="width:auto;padding:10px 24px;">✅ Gửi Đề Xuất</button>
                </div>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

async function _ctvSubmitProposal(customerId) {
    const reason = document.getElementById('ctvProposalReason')?.value?.trim();
    if (!reason) { showToast('Vui lòng nhập lý do đề xuất', 'error'); return; }
    try {
        const data = await apiCall('/api/crm-conversion/request', 'POST', { customer_id: customerId, to_crm_type: 'ctv', reason });
        if (data.success) {
            showToast('✅ ' + data.message);
            document.getElementById('ctvProposalOverlay')?.remove();
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ========== GLOBAL: Popup đề xuất chuyển AFFILIATE (dùng cho CRM CTV) ==========
async function openAffiliateProposalPopup(customerId) {
    const check = await apiCall(`/api/crm-conversion/check/${customerId}`);
    if (check.hasPending) { showToast('⚠️ Khách này đã có yêu cầu đang chờ duyệt!', 'error'); return; }

    const cust = await apiCall(`/api/customers/${customerId}`);
    const c = cust.customer || {};
    if (c.crm_type === 'ctv_hoa_hong') { showToast('Khách đã thuộc Chăm Sóc Affiliate', 'error'); return; }
    if (c.cancel_approved === 1) { showToast('Không thể đề xuất khách đã bị hủy', 'error'); return; }

    const overlay = document.createElement('div');
    overlay.id = 'affProposalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden;animation:emPopBounce .4s ease;">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:22px 24px;text-align:center;">
                <div style="font-size:36px;margin-bottom:6px;">🔄</div>
                <div style="color:#fad24c;font-size:17px;font-weight:800;">Đề Xuất Chuyển Sang Affiliate</div>
            </div>
            <div style="padding:24px;">
                <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #e2e8f0;">
                    <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Khách hàng</div>
                    <div style="font-size:16px;font-weight:700;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">${c.phone || ''} ${c.facebook_link ? '· 🔗 Link' : ''}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                    <div style="background:#fee2e2;padding:10px;border-radius:8px;text-align:center;">
                        <div style="font-size:10px;color:#991b1b;font-weight:600;">CRM HIỆN TẠI</div>
                        <div style="font-size:12px;font-weight:700;color:#dc2626;margin-top:2px;">${CNCA_CRM_LABELS[c.crm_type] || c.crm_type}</div>
                    </div>
                    <div style="background:#dcfce7;padding:10px;border-radius:8px;text-align:center;">
                        <div style="font-size:10px;color:#166534;font-weight:600;">→ CHUYỂN SANG</div>
                        <div style="font-size:12px;font-weight:700;color:#16a34a;margin-top:2px;">Chăm Sóc Affiliate</div>
                    </div>
                </div>
                <div style="margin-bottom:4px;font-weight:700;font-size:13px;color:#122546;">Lý do đề xuất <span style="color:#dc2626;">*</span></div>
                <textarea id="affProposalReason" class="form-control" rows="3" placeholder="VD: Khách muốn chuyển sang hợp tác Affiliate hoa hồng..."></textarea>
                <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
                    <button onclick="document.getElementById('affProposalOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">❌ Hủy</button>
                    <button onclick="_affSubmitProposal(${c.id})" class="btn btn-primary" style="width:auto;padding:10px 24px;">✅ Gửi Đề Xuất</button>
                </div>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

async function _affSubmitProposal(customerId) {
    const reason = document.getElementById('affProposalReason')?.value?.trim();
    if (!reason) { showToast('Vui lòng nhập lý do đề xuất', 'error'); return; }
    try {
        const data = await apiCall('/api/crm-conversion/request', 'POST', { customer_id: customerId, to_crm_type: 'ctv_hoa_hong', reason });
        if (data.success) {
            showToast('✅ ' + data.message);
            document.getElementById('affProposalOverlay')?.remove();
        } else showToast(data.error, 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}
