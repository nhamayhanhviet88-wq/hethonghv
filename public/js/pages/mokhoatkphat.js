// ========== MỞ KHÓA PHẠT TÀI KHOẢN ==========

const _ROLE_SHORT_MK = { giam_doc: 'GĐ', quan_ly_cap_cao: 'QLCC', quan_ly: 'QL', truong_phong: 'TP', nhan_vien: 'NV', thu_viec: 'TV', part_time: 'PT' };
const _ROLE_COLORS_MK = {
    quan_ly_cap_cao: { bg: '#fef3c7', color: '#92400e' },
    quan_ly: { bg: '#fef3c7', color: '#92400e' },
    truong_phong: { bg: '#ede9fe', color: '#6d28d9' },
    nhan_vien: { bg: '#e0f2fe', color: '#0369a1' },
    thu_viec: { bg: '#f0fdf4', color: '#166534' },
    part_time: { bg: '#fdf2f8', color: '#9d174d' }
};

async function renderMoKhoaTKPhatPage(container) {
    const isGD = currentUser.role === 'giam_doc';

    container.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;">🔓 Mở Khóa Phạt Tài Khoản</h2>
            <div id="mkBlockedCount" style="background:#fecaca;color:#dc2626;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:800;">0 người bị chặn</div>
        </div>

        ${isGD ? `
        <!-- SECTION 1: CÀI ĐẶT NGƯỜI MỞ KHÓA -->
        <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div onclick="_mkToggleSettings()" style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                <span style="color:white;font-weight:800;font-size:15px;">⚙️ CÀI ĐẶT NHÂN SỰ TOÀN QUYỀN</span>
                <span id="mkSettingsToggle" style="color:white;font-size:18px;transition:transform .2s;">▼</span>
            </div>
            <div id="mkSettingsBody" style="display:none;padding:16px;">
                <div style="margin-bottom:12px;padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
                    <div style="font-size:12px;color:#1e40af;font-weight:600;">ℹ️ Chỉ định Nhân Sự Toàn Quyền</div>
                    <div style="font-size:11px;color:#3b82f6;margin-top:4px;">Người được chọn sẽ có quyền <strong>mở khóa TOÀN BỘ hệ thống</strong> như Giám Đốc, nhưng vẫn bị chặn nếu vi phạm và không được tự mở cho mình.</div>
                </div>
                <div id="mkCurrentManagers" style="margin-bottom:12px;">Đang tải...</div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                    <select id="mkAddManagerSelect" style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#334155;outline:none;">
                        <option value="">-- Chọn tài khoản --</option>
                    </select>
                    <button onclick="_mkAddManager()" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;cursor:pointer;font-weight:700;white-space:nowrap;">+ Thêm</button>
                </div>
                <div style="text-align:right;">
                    <button onclick="_mkSaveSettings()" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(5,150,105,0.3);">💾 Lưu cài đặt</button>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- SECTION 2: NHÂN SỰ BỊ CHẶN -->
        <div style="background:white;border:2px solid #fca5a5;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 8px rgba(220,38,38,0.1);">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:800;font-size:15px;">🚫 NHÂN SỰ BỊ CHẶN TRUY CẬP</span>
                <button onclick="_mkUnblockAll()" id="mkUnblockAllBtn" style="padding:6px 16px;font-size:12px;border:1px solid rgba(255,255,255,0.5);border-radius:8px;background:rgba(255,255,255,0.15);color:white;cursor:pointer;font-weight:700;display:none;">🔓 Mở khóa tất cả</button>
            </div>
            <div id="mkBlockedList" style="padding:16px;">
                <div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">⏳ Đang tải...</div>
            </div>
        </div>

        <!-- SECTION 3: LỊCH SỬ MỞ KHÓA HÔM NAY -->
        <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:14px 18px;">
                <span style="color:white;font-weight:800;font-size:15px;">📜 LỊCH SỬ MỞ KHÓA HÔM NAY</span>
            </div>
            <div id="mkLogsBody" style="padding:16px;">
                <div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">⏳ Đang tải...</div>
            </div>
        </div>
    </div>`;

    if (isGD) _mkLoadSettings();
    _mkLoadBlockedList();
    _mkLoadLogs();

    // Auto-refresh mỗi 30s
    window._mkRefreshInterval = setInterval(() => {
        _mkLoadBlockedList();
        _mkLoadLogs();
    }, 30000);
}

// ===== SETTINGS =====
let _mkSettingsOpen = false;
let _mkManagerIds = [];

function _mkToggleSettings() {
    _mkSettingsOpen = !_mkSettingsOpen;
    const body = document.getElementById('mkSettingsBody');
    const toggle = document.getElementById('mkSettingsToggle');
    if (body) body.style.display = _mkSettingsOpen ? 'block' : 'none';
    if (toggle) toggle.style.transform = _mkSettingsOpen ? 'rotate(180deg)' : '';
    if (_mkSettingsOpen) _mkLoadSettings();
}

let _mkAllUsers = [];
let _mkAllManagers = [];

async function _mkLoadSettings() {
    try {
        const [settingsData, usersData] = await Promise.all([
            apiCall('/api/access-block/settings'),
            apiCall('/api/access-block/user-list')
        ]);
        _mkManagerIds = settingsData.manager_ids || [];
        _mkAllManagers = settingsData.managers || [];
        _mkAllUsers = usersData.users || [];
        _mkRenderSettingsUI();
    } catch(e) {
        const mgDiv = document.getElementById('mkCurrentManagers');
        if (mgDiv) mgDiv.innerHTML = '<div style="color:#dc2626;">Lỗi tải cài đặt</div>';
    }
}

function _mkRenderSettingsUI() {
    const mgDiv = document.getElementById('mkCurrentManagers');
    if (!mgDiv) return;
    const managers = _mkManagerIds.map(id =>
        _mkAllManagers.find(m => m.id === id) || _mkAllUsers.find(u => u.id === id) || { id, full_name: 'ID: ' + id, role: '?', username: '?' }
    );
    if (managers.length === 0) {
        mgDiv.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:10px;font-size:12px;">Chưa có Nhân Sự Toàn Quyền. QL/QLCC tự động mở theo cơ cấu tổ chức.</div>';
    } else {
        mgDiv.innerHTML = managers.map(m => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:6px;">
                <span style="font-size:16px;">👤</span>
                <div style="flex:1;">
                    <span style="font-size:13px;font-weight:700;color:#166534;">${m.full_name}</span>
                    <span style="font-size:11px;color:#6b7280;margin-left:6px;">(${m.username})</span>
                    <span style="font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px;background:#e0f2fe;color:#0369a1;font-weight:600;">${_ROLE_SHORT_MK[m.role] || m.role}</span>
                </div>
                <span style="font-size:11px;color:#6b7280;">${m.phone || ''}</span>
                <button onclick="_mkRemoveManager(${m.id})" style="padding:3px 8px;font-size:11px;border:1px solid #fca5a5;border-radius:6px;background:white;color:#dc2626;cursor:pointer;font-weight:600;">✕</button>
            </div>
        `).join('');
    }
    const select = document.getElementById('mkAddManagerSelect');
    if (select) {
        const existing = new Set(_mkManagerIds);
        select.innerHTML = '<option value="">-- Chọn tài khoản --</option>' +
            _mkAllUsers.filter(u => !existing.has(u.id)).map(u =>
                `<option value="${u.id}">${u.full_name} (${u.username}) — ${_ROLE_SHORT_MK[u.role] || u.role}</option>`
            ).join('');
    }
}

function _mkAddManager() {
    const select = document.getElementById('mkAddManagerSelect');
    const val = Number(select?.value);
    if (!val) return;
    if (!_mkManagerIds.includes(val)) {
        _mkManagerIds.push(val);
        _mkRenderSettingsUI();
    }
}

function _mkRemoveManager(id) {
    _mkManagerIds = _mkManagerIds.filter(i => i !== id);
    _mkRenderSettingsUI();
}

async function _mkSaveSettings() {
    try {
        const res = await apiCall('/api/access-block/settings', 'POST', { manager_ids: _mkManagerIds });
        if (res.error) { alert(res.error); return; }
        showToast('✅ Đã lưu cài đặt Nhân Sự Toàn Quyền');
        _mkLoadSettings();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== BLOCKED LIST =====
async function _mkLoadBlockedList() {
    const listDiv = document.getElementById('mkBlockedList');
    const countDiv = document.getElementById('mkBlockedCount');
    const unblockAllBtn = document.getElementById('mkUnblockAllBtn');
    if (!listDiv) return;

    try {
        const [blockData, deptData] = await Promise.all([
            apiCall('/api/access-block/blocked-list'),
            apiCall('/api/departments')
        ]);

        const blocked = blockData.blocked || [];
        const departments = deptData.departments || [];

        if (countDiv) countDiv.textContent = `${blocked.length} người bị chặn`;
        if (unblockAllBtn) unblockAllBtn.style.display = blocked.length > 0 ? 'inline-block' : 'none';

        if (blocked.length === 0) {
            listDiv.innerHTML = `<div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:8px;">✅</div>
                <div style="color:#059669;font-weight:700;font-size:15px;">Không có nhân sự nào bị chặn</div>
                <div style="color:#9ca3af;font-size:12px;margin-top:4px;">Tất cả đang hoạt động bình thường</div>
            </div>`;
            return;
        }

        // Group by department
        const byDept = {};
        const noDept = [];
        blocked.forEach(u => {
            if (u.department_id) {
                if (!byDept[u.department_id]) byDept[u.department_id] = { name: u.dept_name || 'Unknown', users: [] };
                byDept[u.department_id].users.push(u);
            } else {
                noDept.push(u);
            }
        });

        let html = '';

        // Build by department
        Object.entries(byDept).forEach(([deptId, group]) => {
            html += `<div style="border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px;">
                <div style="background:#f8fafc;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;">
                    <span style="font-size:13px;font-weight:700;color:#334155;">📁 ${group.name}</span>
                    <span style="background:#fecaca;color:#dc2626;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;">${group.users.length} người</span>
                </div>`;

            group.users.forEach(u => {
                html += _mkRenderBlockedUser(u);
            });

            html += '</div>';
        });

        // No department
        if (noDept.length > 0) {
            html += `<div style="border:1.5px solid #fde68a;border-radius:10px;overflow:hidden;margin-bottom:10px;">
                <div style="background:#fffbeb;padding:10px 16px;border-bottom:1px solid #fde68a;">
                    <span style="font-size:13px;font-weight:700;color:#92400e;">⚠️ Chưa phân phòng ban</span>
                </div>`;
            noDept.forEach(u => { html += _mkRenderBlockedUser(u); });
            html += '</div>';
        }

        listDiv.innerHTML = html;
    } catch(e) {
        listDiv.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

function _mkRenderBlockedUser(u) {
    const roleColors = _ROLE_COLORS_MK[u.role] || { bg: '#f3f4f6', color: '#6b7280' };
    const roleLabel = _ROLE_SHORT_MK[u.role] || u.role;
    const blockedTime = u.blocked_at ? new Date(u.blocked_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '---';

    const penaltiesHtml = u.penalties.map(p => `
        <div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;">
            <span style="color:#ef4444;">•</span>
            <span style="color:#475569;flex:1;">${p.task_name || 'Vi phạm'}${p.task_date ? ' (' + p.task_date.split('-').reverse().join('/') + ')' : ''}</span>
            <span style="color:#dc2626;font-weight:700;">${(p.penalty_amount || 0).toLocaleString()}đ</span>
        </div>
    `).join('');

    return `
    <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-size:14px;font-weight:700;color:#1e293b;">${u.full_name}</span>
                <span style="font-size:10px;color:#9ca3af;">(${u.username})</span>
                <span style="background:${roleColors.bg};color:${roleColors.color};padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">${roleLabel}</span>
                <span style="font-size:10px;color:#94a3b8;">⏰ ${blockedTime}</span>
            </div>
            <div style="margin-top:4px;padding-left:4px;">
                ${penaltiesHtml}
            </div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                <span style="font-size:12px;font-weight:700;color:#dc2626;">💰 Tổng: ${u.penalty_total.toLocaleString()}đ</span>
            </div>
        </div>
        <button onclick="_mkUnblock(${u.id},'${u.full_name.replace(/'/g, "\\'")}')" style="padding:8px 16px;font-size:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(5,150,105,0.3);transition:all 0.2s;"
            onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔓 Mở khóa
        </button>
    </div>`;
}

async function _mkUnblock(userId, userName) {
    if (!confirm(`Mở khóa truy cập cho ${userName}?\n\n(Phạt tiền vẫn được giữ nguyên, chỉ mở lại quyền truy cập)`)) return;

    try {
        const res = await apiCall('/api/access-block/unblock', 'POST', { user_id: userId });
        if (res.error) { alert(res.error); return; }
        showToast(`✅ ${res.message}`);
        _mkLoadBlockedList();
        _mkLoadLogs();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

async function _mkUnblockAll() {
    const countDiv = document.getElementById('mkBlockedCount');
    const count = countDiv ? countDiv.textContent : '';
    if (!confirm(`Mở khóa TẤT CẢ nhân sự bị chặn?\n\n(${count})\nPhạt tiền vẫn được giữ nguyên.`)) return;

    try {
        const res = await apiCall('/api/access-block/unblock-all', 'POST');
        if (res.error) { alert(res.error); return; }
        showToast(`✅ ${res.message}`);
        _mkLoadBlockedList();
        _mkLoadLogs();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== LOGS =====
async function _mkLoadLogs() {
    const logsDiv = document.getElementById('mkLogsBody');
    if (!logsDiv) return;

    try {
        const data = await apiCall('/api/access-block/logs');
        const logs = data.logs || [];

        if (logs.length === 0) {
            logsDiv.innerHTML = '<div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px;">Chưa có lịch sử mở khóa hôm nay</div>';
            return;
        }

        logsDiv.innerHTML = logs.map(log => {
            const time = new Date(log.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:10px;color:#059669;font-weight:700;min-width:42px;">✅ ${time}</span>
                <span style="font-size:12px;color:#334155;">Mở khóa <strong>${log.user_name || 'Unknown'}</strong> (${log.user_username || ''})</span>
                <span style="font-size:11px;color:#9ca3af;">bởi ${log.unblocked_by_name || 'Unknown'}</span>
                ${log.penalty_total > 0 ? `<span style="font-size:10px;color:#dc2626;font-weight:600;">${log.penalty_total.toLocaleString()}đ</span>` : ''}
            </div>`;
        }).join('');
    } catch(e) {
        logsDiv.innerHTML = '<div style="color:#dc2626;">Lỗi tải lịch sử</div>';
    }
}
