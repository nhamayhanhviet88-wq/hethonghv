// ========== SETTINGS PAGE ==========

let currentSettingTab = 'commission-tiers';

async function renderSettingsPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>⚙️ Cài Đặt Quản Trị Phân Tầng</h3>
            </div>
            <div class="card-body">
                <div class="tabs" style="flex-wrap:wrap;">
                    <div class="tab active" data-tab="commission-tiers" onclick="switchSettingTab('commission-tiers', this)">💰 Tầng Hoa Hồng</div>
                    <div class="tab" data-tab="sources" onclick="switchSettingTab('sources', this)">📍 Nguồn Khách</div>
                    <div class="tab" data-tab="promotions" onclick="switchSettingTab('promotions', this)">🎁 Khuyến Mãi</div>
                    <div class="tab" data-tab="industries" onclick="switchSettingTab('industries', this)">🏭 Lĩnh Vực</div>
                    <div class="tab" data-tab="emergency-popup" onclick="switchSettingTab('emergency-popup', this)">🚨 Cấp Cứu</div>
                    <div class="tab" data-tab="job-titles" onclick="switchSettingTab('job-titles', this)">👔 Chức Danh</div>
                    <div class="tab" data-tab="leaderboard-roles" onclick="switchSettingTab('leaderboard-roles', this)">🏆 BXH Affiliate</div>
                    <div class="tab" data-tab="prize-popup" onclick="switchSettingTab('prize-popup', this)">🎉 Giải Thưởng</div>
                    <div class="tab" data-tab="roles-positions" onclick="switchSettingTab('roles-positions', this)">🏷️ Vai Trò & Vị Trí</div>
                    <div class="tab" data-tab="telesale-statuses" onclick="switchSettingTab('telesale-statuses', this)">📱 Tình Trạng Bắt Máy</div>
                </div>
                <div id="settingsContent">
                    <div class="text-center text-muted" style="padding:30px;">Đang tải...</div>
                </div>
            </div>
        </div>
    `;
    var savedTab = localStorage.getItem('settingsActiveTab') || 'commission-tiers';
    currentSettingTab = savedTab;
    var tabEl = document.querySelector('.tab[data-tab="' + savedTab + '"]');
    if (tabEl) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
    }
    switchSettingTab(savedTab, tabEl || document.querySelector('.tab'));
}

function switchSettingTab(tab, el) {
    currentSettingTab = tab;
    localStorage.setItem('settingsActiveTab', tab);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (tab === 'emergency-popup') {
        loadEmergencyPopupSettings();
    } else if (tab === 'job-titles') {
        loadJobTitlesSettings();
    } else if (tab === 'leaderboard-roles') {
        loadLeaderboardRolesSettings();
    } else if (tab === 'prize-popup') {
        loadPrizePopupSettings();
    } else if (tab === 'roles-positions') {
        loadRolesPositionsSettings();
    } else if (tab === 'telesale-statuses') {
        loadTelesaleStatusesSettings();
    } else {
        loadSettingsTab(tab);
    }
}

async function loadSettingsTab(type) {
    const data = await apiCall(`/api/settings/${type}`);
    const contentDiv = document.getElementById('settingsContent');
    const isCommission = type === 'commission-tiers';

    let html = `<ul class="setting-list">`;

    if (!data.items || data.items.length === 0) {
        html += `<li class="setting-item"><div class="text-muted" style="padding: 20px; text-align:center; width:100%;">Chưa có mục nào. Thêm mới bên dưới.</div></li>`;
    } else {
        data.items.forEach(item => {
            html += `
                <li class="setting-item" id="setting-item-${item.id}">
                    <div class="item-info">
                        <span class="fw-600">${item.name}</span>
                        ${isCommission ? `<span class="badge badge-info" style="margin-left: 8px;">TT: ${item.percentage}%</span><span class="badge" style="margin-left: 4px;background:#d1fae5;color:#065f46;">CT: ${item.parent_percentage || 0}%</span>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-xs btn-secondary" onclick="editSettingItem('${type}', ${item.id}, '${item.name.replace(/'/g, "\\'")}', ${isCommission ? item.percentage : 0}, ${isCommission ? (item.parent_percentage || 0) : 0})">✏️</button>
                        <button class="btn btn-xs btn-danger" onclick="deleteSettingItem('${type}', ${item.id}, '${item.name.replace(/'/g, "\\'")}')">🗑️</button>
                    </div>
                </li>
            `;
        });
    }

    html += `</ul>`;

    // Add new form
    html += `
        <div class="setting-add">
            <input type="text" id="newSettingName" placeholder="Tên mới..." onkeypress="if(event.key==='Enter') addSettingItem('${type}')">
            ${isCommission ? `<input type="number" id="newSettingPercentage" placeholder="% Trực Tiếp" style="width:100px;" step="0.01" onkeypress="if(event.key==='Enter') addSettingItem('${type}')">
            <input type="number" id="newSettingParentPercentage" placeholder="% Cấp Trên" style="width:100px;" step="0.01" onkeypress="if(event.key==='Enter') addSettingItem('${type}')">` : ''}
            <button class="btn btn-sm btn-success" onclick="addSettingItem('${type}')">➕ Thêm</button>
        </div>
    `;

    contentDiv.innerHTML = html;
}

async function addSettingItem(type) {
    const nameInput = document.getElementById('newSettingName');
    const name = nameInput.value.trim();
    if (!name) { showToast('Vui lòng nhập tên', 'error'); return; }

    const body = { name };
    if (type === 'commission-tiers') {
        body.percentage = parseFloat(document.getElementById('newSettingPercentage')?.value) || 0;
        body.parent_percentage = parseFloat(document.getElementById('newSettingParentPercentage')?.value) || 0;
    }

    const data = await apiCall(`/api/settings/${type}`, 'POST', body);
    if (data.success) {
        showToast(data.message);
        await loadSettingsTab(type);
    } else {
        showToast(data.error, 'error');
    }
}

function editSettingItem(type, id, currentName, currentPercentage, currentParentPercentage) {
    const isCommission = type === 'commission-tiers';
    const bodyHTML = `
        <div class="form-group">
            <label>Tên</label>
            <input type="text" id="editSettingName" class="form-control" value="${currentName}">
        </div>
        ${isCommission ? `
            <div class="form-group">
                <label>% Hoa Hồng Trực Tiếp</label>
                <input type="number" id="editSettingPercentage" class="form-control" value="${currentPercentage}" step="0.01">
            </div>
            <div class="form-group">
                <label>% Hoa Hồng Cấp Trên</label>
                <input type="number" id="editSettingParentPercentage" class="form-control" value="${currentParentPercentage || 0}" step="0.01">
            </div>
        ` : ''}
    `;
    openModal('✏️ Sửa: ' + currentName, bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditSetting('${type}', ${id})">Lưu</button>
    `);
}

async function submitEditSetting(type, id) {
    const body = { name: document.getElementById('editSettingName').value };
    if (type === 'commission-tiers') {
        body.percentage = parseFloat(document.getElementById('editSettingPercentage').value) || 0;
        body.parent_percentage = parseFloat(document.getElementById('editSettingParentPercentage')?.value) || 0;
    }
    const data = await apiCall(`/api/settings/${type}/${id}`, 'PUT', body);
    if (data.success) {
        showToast(data.message);
        // Refresh list and re-open edit with fresh data
        await loadSettingsTab(type);
        editSettingItem(type, id, body.name, body.percentage || 0, body.parent_percentage || 0);
    } else {
        showToast(data.error, 'error');
    }
}

async function deleteSettingItem(type, id, name) {
    if (!window.confirm(`Xóa "${name}"?`)) return;
    const data = await apiCall(`/api/settings/${type}/${id}`, 'DELETE');
    if (data.success) {
        showToast(data.message);
        await loadSettingsTab(type);
    } else {
        showToast(data.error, 'error');
    }
}

// ========== POPUP SETTINGS ==========
async function loadEmergencyPopupSettings() {
    const contentDiv = document.getElementById('settingsContent');
    const [t1, t2, cn1, cn2, cm] = await Promise.all([
        apiCall('/api/app-config/emergency_popup_time_1'),
        apiCall('/api/app-config/emergency_popup_time_2'),
        apiCall('/api/app-config/cancel_nv_popup_time_1'),
        apiCall('/api/app-config/cancel_nv_popup_time_2'),
        apiCall('/api/app-config/cancel_mgr_popup_time'),
    ]);

    contentDiv.innerHTML = `
        <div style="max-width:600px;">
            <!-- CẤP CỨU SẾP -->
            <div style="margin-bottom:28px;padding:20px;background:rgba(220,38,38,0.04);border:1px solid #fca5a5;border-radius:12px;">
                <h4 style="margin-bottom:12px;color:#dc2626;">🚨 Pop-up Cấp Cứu Sếp</h4>
                <p style="font-size:12px;color:#64748b;margin-bottom:16px;">
                    Nhắc <strong>Quản Lý & Trưởng Phòng</strong> xử lý khách cấp cứu.
                </p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-weight:700;color:#334155;font-size:13px;">⏰ Buổi sáng</label>
                        <input type="time" id="emPopupTime1" class="form-control" value="${t1?.value || '11:00'}" style="max-width:180px;">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-weight:700;color:#334155;font-size:13px;">⏰ Buổi chiều</label>
                        <input type="time" id="emPopupTime2" class="form-control" value="${t2?.value || '16:00'}" style="max-width:180px;">
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="saveEmergencyPopupSettings()" style="width:auto;font-size:12px;">💾 Lưu</button>
                    <button class="btn btn-secondary" onclick="emShowPopup(3, 1)" style="width:auto;font-size:12px;">👁️ Xem Thử</button>
                </div>
            </div>

            <!-- HỦY KHÁCH — NV -->
            <div style="margin-bottom:28px;padding:20px;background:rgba(245,158,11,0.04);border:1px solid #fbbf24;border-radius:12px;">
                <h4 style="margin-bottom:12px;color:#d97706;">⚠️ Pop-up Nhắc NV Chăm Sóc Lại</h4>
                <p style="font-size:12px;color:#64748b;margin-bottom:16px;">
                    Nhắc <strong>Nhân Viên & Trưởng Phòng</strong> chăm sóc lại khách bị từ chối hủy hoặc hết hạn 24h.
                </p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-weight:700;color:#334155;font-size:13px;">⏰ Buổi sáng</label>
                        <input type="time" id="cancelNVTime1" class="form-control" value="${cn1?.value || '09:30'}" style="max-width:180px;">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-weight:700;color:#334155;font-size:13px;">⏰ Buổi chiều</label>
                        <input type="time" id="cancelNVTime2" class="form-control" value="${cn2?.value || '15:00'}" style="max-width:180px;">
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn" onclick="saveCancelNVPopupSettings()" style="width:auto;font-size:12px;background:#d97706;color:white;">💾 Lưu</button>
                    <button class="btn btn-secondary" onclick="cancelNVShowPopup(3, [{customer_name:'Khách Test 1', phone:'0901234567'},{customer_name:'Khách Test 2', phone:'0912345678'}])" style="width:auto;font-size:12px;">👁️ Xem Thử</button>
                </div>
            </div>

            <!-- HỦY KHÁCH — QL/GĐ -->
            <div style="margin-bottom:20px;padding:20px;background:rgba(59,130,246,0.04);border:1px solid #93c5fd;border-radius:12px;">
                <h4 style="margin-bottom:12px;color:#1d4ed8;">📋 Pop-up Nhắc QL/GĐ Duyệt Hủy</h4>
                <p style="font-size:12px;color:#64748b;margin-bottom:16px;">
                    Nhắc <strong>Quản Lý & Giám Đốc</strong> duyệt hoặc từ chối yêu cầu hủy khách. 
                </p>
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-weight:700;color:#334155;font-size:13px;">⏰ Thời gian nhắc</label>
                    <input type="time" id="cancelMgrTime" class="form-control" value="${cm?.value || '17:00'}" style="max-width:180px;">
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn" onclick="saveCancelMgrPopupSettings()" style="width:auto;font-size:12px;background:#1d4ed8;color:white;">💾 Lưu</button>
                    <button class="btn btn-secondary" onclick="cancelManagerShowPopup(5)" style="width:auto;font-size:12px;">👁️ Xem Thử</button>
                </div>
            </div>

            <div style="padding:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:12px;color:#0369a1;">
                <strong>📌 Lưu ý:</strong> Mỗi pop-up chỉ hiện <strong>1 lần/ngày</strong> mỗi khung giờ. Nhấn <strong>"Xem Thử"</strong> để xem trước giao diện.
            </div>
        </div>
    `;
}

async function saveEmergencyPopupSettings() {
    const time1 = document.getElementById('emPopupTime1')?.value;
    const time2 = document.getElementById('emPopupTime2')?.value;
    if (!time1 || !time2) { showToast('Vui lòng nhập đủ giờ', 'error'); return; }
    await Promise.all([
        apiCall('/api/app-config/emergency_popup_time_1', 'PUT', { value: time1 }),
        apiCall('/api/app-config/emergency_popup_time_2', 'PUT', { value: time2 })
    ]);
    showToast('✅ Đã lưu cài đặt pop-up cấp cứu!');
}

async function saveCancelNVPopupSettings() {
    const time1 = document.getElementById('cancelNVTime1')?.value;
    const time2 = document.getElementById('cancelNVTime2')?.value;
    if (!time1 || !time2) { showToast('Vui lòng nhập đủ giờ', 'error'); return; }
    await Promise.all([
        apiCall('/api/app-config/cancel_nv_popup_time_1', 'PUT', { value: time1 }),
        apiCall('/api/app-config/cancel_nv_popup_time_2', 'PUT', { value: time2 })
    ]);
    showToast('✅ Đã lưu cài đặt pop-up hủy khách (NV)!');
}

async function saveCancelMgrPopupSettings() {
    const time = document.getElementById('cancelMgrTime')?.value;
    if (!time) { showToast('Vui lòng nhập giờ', 'error'); return; }
    await apiCall('/api/app-config/cancel_mgr_popup_time', 'PUT', { value: time });
    showToast('✅ Đã lưu cài đặt pop-up hủy khách (QL/GĐ)!');
}

// ========== JOB TITLES PER CRM (synced from telesale_sources) ==========
const JOB_CRM_OPTIONS = [
    { value: 'tu_tim_kiem', label: 'CRM Tự Tìm Kiếm' },
    { value: 'goi_hop_tac', label: 'CRM Gọi Điện Hợp Tác' },
    { value: 'goi_ban_hang', label: 'CRM Gọi Điện Bán Hàng' },
];

let currentJobCrm = '';

async function loadJobTitlesSettings() {
    const contentDiv = document.getElementById('settingsContent');
    const crmOpts = JOB_CRM_OPTIONS.map(o => `<option value="${o.value}" ${o.value === currentJobCrm ? 'selected' : ''}>${o.label}</option>`).join('');

    let listHtml = '';
    if (currentJobCrm) {
        const data = await apiCall(`/api/telesale/sources?crm_type=${currentJobCrm}`);
        const sources = data.sources || [];
        if (sources.length === 0) {
            listHtml = `<div class="text-muted" style="padding:20px;text-align:center;">Chưa có chức danh nào cho CRM này.<br><span style="font-size:11px;color:#6b7280;">Thêm nguồn tại <strong>📊 Hệ Thống Phân Chia Gọi Điện → Cài Đặt</strong></span></div>`;
        } else {
            listHtml = `<ul class="setting-list">${sources.map(item => `
                <li class="setting-item">
                    <div class="item-info">
                        <span style="font-size:18px;margin-right:8px;">${item.icon || '📁'}</span>
                        <span class="fw-600">${item.name}</span>
                    </div>
                </li>`).join('')}</ul>`;
        }
    }

    contentDiv.innerHTML = `
        <div style="max-width:600px;">
            <div class="form-group" style="margin-bottom:20px;">
                <label style="font-weight:700;color:#334155;font-size:13px;">📋 Chọn CRM</label>
                <select id="jobCrmSelect" class="form-control" onchange="currentJobCrm=this.value;loadJobTitlesSettings()">
                    <option value="">-- Chọn CRM --</option>
                    ${crmOpts}
                </select>
            </div>
            ${currentJobCrm ? `<div style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <h4 style="margin-bottom:12px;color:#122546;">👔 Danh sách Chức Danh</h4>
                <div style="margin-bottom:10px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12px;color:#1e40af;">
                    📌 Chức danh được đồng bộ từ <strong>Nguồn Gọi Điện</strong> tại Hệ Thống Phân Chia Gọi Điện. Thêm/xóa nguồn tại đó sẽ tự động cập nhật ở đây.
                </div>
                ${listHtml}
            </div>` : '<div class="text-muted" style="text-align:center;padding:30px;">Chọn CRM để xem chức danh</div>'}
        </div>
    `;
}

// ========== LEADERBOARD ROLES SETTINGS ==========
const ALL_ROLES_BXH = [
    { value: 'giam_doc', label: 'Giám Đốc' },
    { value: 'quan_ly_cap_cao', label: 'Quản Lý Cấp Cao' },
    { value: 'quan_ly', label: 'Quản Lý' },
    { value: 'truong_phong', label: 'Trưởng Phòng' },
    { value: 'nhan_vien', label: 'Nhân Viên' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'tkaffiliate', label: 'TK Affiliate' },
];

const BXH_PAGES = [
    { key: 'leaderboard_allowed_roles', label: '🏆 BXH Affiliate', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
    { key: 'bxh_kinhdoanh_allowed_roles', label: '📊 BXH Kinh Doanh', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
    { key: 'bxh_sale_allowed_roles', label: '💼 BXH Sale', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
    { key: 'bxh_ctv_allowed_roles', label: '🤝 BXH CTV', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
    { key: 'bxh_sanxuat_allowed_roles', label: '🏭 BXH Khối Sản Xuất', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
    { key: 'bxh_vanphong_allowed_roles', label: '🏢 BXH Khối Văn Phòng', defaults: ['giam_doc','quan_ly','quan_ly_cap_cao'] },
];

async function loadLeaderboardRolesSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    // Load all configs in parallel
    const results = await Promise.all(BXH_PAGES.map(p => apiCall(`/api/app-config/${p.key}`)));
    const configs = {};
    BXH_PAGES.forEach((p, i) => {
        configs[p.key] = results[i].value ? JSON.parse(results[i].value) : p.defaults;
    });

    el.innerHTML = `
        <h4 style="color:var(--navy);margin-bottom:16px;">🏆 Quyền xem các trang Bảng Xếp Hạng</h4>
        <p style="color:var(--gray-500);font-size:13px;margin-bottom:20px;">Chọn vai trò được phép xem từng trang BXH:</p>
        ${BXH_PAGES.map(page => {
            const allowed = configs[page.key];
            return `
                <div style="border:1px solid var(--gray-200);border-radius:12px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <h5 style="margin:0;color:var(--navy);font-size:14px;">${page.label}</h5>
                        <button class="btn btn-success" onclick="saveLeaderboardRoles('${page.key}')" style="padding:6px 16px;font-size:12px;">💾 Lưu</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;" id="bxhRoles_${page.key}">
                        ${ALL_ROLES_BXH.map(r => `
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;border:1px solid var(--gray-200);cursor:pointer;font-size:12px;background:${allowed.includes(r.value)?'rgba(34,197,94,0.1)':'white'};"
                                onmouseover="this.style.borderColor='var(--info)'" onmouseout="this.style.borderColor='var(--gray-200)'">
                                <input type="checkbox" value="${r.value}" ${allowed.includes(r.value)?'checked':''}
                                    onchange="this.parentElement.style.background=this.checked?'rgba(34,197,94,0.1)':'white'">
                                <span style="font-weight:600;color:var(--navy);">${r.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

async function saveLeaderboardRoles(configKey) {
    const checks = document.querySelectorAll(`#bxhRoles_${configKey} input[type=checkbox]:checked`);
    const roles = Array.from(checks).map(cb => cb.value);
    if (roles.length === 0) { showToast('Phải chọn ít nhất 1 vai trò', 'error'); return; }
    const res = await apiCall(`/api/app-config/${configKey}`, 'PUT', { value: JSON.stringify(roles) });
    if (res.success) showToast('Đã lưu cài đặt quyền xem');
    else showToast('Lỗi lưu cài đặt', 'error');
}

// ===== PRIZE POPUP SETTINGS =====
async function loadPrizePopupSettings() {
    const content = document.getElementById('settingsContent');
    content.innerHTML = '<div class="text-center text-muted" style="padding:30px;">Đang tải...</div>';

    // Load current values
    const [hourRes, minuteRes, daysRes, intervalRes] = await Promise.all([
        apiCall('/api/app-config/prize_popup_start_hour'),
        apiCall('/api/app-config/prize_popup_start_minute'),
        apiCall('/api/app-config/prize_popup_days'),
        apiCall('/api/app-config/prize_popup_interval_minutes')
    ]);

    const startHour = hourRes.value || '10';
    const startMinute = minuteRes.value || '0';
    const days = daysRes.value || '3';
    const interval = intervalRes.value || '10';

    content.innerHTML = `
        <div style="max-width:500px;">
            <h4 style="color:var(--navy);margin:0 0 16px;">🎉 Cài Đặt Pop-up Chúc Mừng Giải Thưởng</h4>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:20px;">
                Khi trao giải, hệ thống sẽ hiện pop-up chúc mừng cho tất cả nhân viên.
            </p>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;">⏰ Giờ bắt đầu hiển thị</label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="number" id="ppStartHour" value="${startHour}" min="0" max="23" class="form-control" style="width:80px;">
                    <span style="font-weight:700;">giờ</span>
                    <input type="number" id="ppStartMinute" value="${startMinute}" min="0" max="59" class="form-control" style="width:80px;">
                    <span style="font-weight:700;">phút</span>
                </div>
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">Mặc định: 10 giờ 00 phút</div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;">📅 Số ngày hiển thị liên tiếp</label>
                <input type="number" id="ppDays" value="${days}" min="1" max="30"
                    class="form-control" style="width:120px;">
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">Mặc định: 3 ngày</div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px;">⏱️ Khoảng cách giữa các pop-up (phút)</label>
                <input type="number" id="ppInterval" value="${interval}" min="1" max="120"
                    class="form-control" style="width:120px;">
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">Mặc định: 10 phút</div>
            </div>
            <button class="btn btn-success" onclick="savePrizePopupSettings()">💾 Lưu Cài Đặt</button>
            <button class="btn" style="margin-left:8px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;" onclick="previewPrizePopup()">👁 Xem Thử Pop-up</button>
        </div>
    `;
}

async function savePrizePopupSettings() {
    const hour = document.getElementById('ppStartHour').value;
    const minute = document.getElementById('ppStartMinute').value;
    const days = document.getElementById('ppDays').value;
    const interval = document.getElementById('ppInterval').value;

    await Promise.all([
        apiCall('/api/app-config/prize_popup_start_hour', 'PUT', { value: hour }),
        apiCall('/api/app-config/prize_popup_start_minute', 'PUT', { value: minute }),
        apiCall('/api/app-config/prize_popup_days', 'PUT', { value: days }),
        apiCall('/api/app-config/prize_popup_interval_minutes', 'PUT', { value: interval })
    ]);

    showToast('✅ Đã lưu cài đặt pop-up giải thưởng!');
}

// ========== ROLES & POSITIONS SETTINGS ==========
async function loadRolesPositionsSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const data = await apiCall('/api/roles-positions');
    const roles = data.roles || [];
    const positions = data.positions || [];

    const CORE_ROLES = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'];

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <!-- VAI TRÒ -->
            <div style="border:1px solid var(--gray-200);border-radius:14px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:16px 20px;color:white;">
                    <h4 style="margin:0;font-size:15px;">🛡️ Vai Trò (System Roles)</h4>
                    <p style="margin:4px 0 0;font-size:11px;opacity:0.7;">Quyền hạn hệ thống — quyết định chức năng truy cập</p>
                </div>
                <div style="padding:16px;">
                    <ul class="setting-list" style="margin-bottom:12px;">
                        ${roles.map(r => `
                            <li class="setting-item" style="padding:10px 14px;border-radius:10px;border:1px solid ${CORE_ROLES.includes(r.slug)?'#dbeafe':'var(--gray-200)'};background:${CORE_ROLES.includes(r.slug)?'#eff6ff':'white'};margin-bottom:8px;">
                                <div class="item-info" style="flex:1;">
                                    <span class="fw-600" style="color:var(--navy);">${r.name}</span>
                                    <span style="font-size:11px;color:var(--gray-400);margin-left:8px;">slug: ${r.slug}</span>
                                    <span class="badge" style="margin-left:8px;background:#dbeafe;color:#1e40af;font-size:10px;">Level ${r.level}</span>
                                    ${CORE_ROLES.includes(r.slug) ? '<span style="font-size:10px;color:#6b7280;margin-left:6px;">🔒 Mặc định</span>' : ''}
                                </div>
                                <div class="item-actions">
                                    ${!CORE_ROLES.includes(r.slug) ? `<button class="btn btn-xs btn-danger" onclick="deleteSystemRole(${r.id}, '${r.name.replace(/'/g,"\\\\'")}')">🗑️</button>` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <div style="border-top:1px solid var(--gray-200);padding-top:12px;">
                        <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">➕ Thêm Vai Trò Mới</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <input type="text" id="newRoleName" placeholder="Tên vai trò" class="form-control" style="flex:1;min-width:120px;">
                            <input type="text" id="newRoleSlug" placeholder="slug_key" class="form-control" style="width:120px;">
                            <input type="number" id="newRoleLevel" placeholder="Level" class="form-control" style="width:80px;" value="1">
                            <button class="btn btn-sm btn-success" onclick="addSystemRole()">➕</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VỊ TRÍ -->
            <div style="border:1px solid var(--gray-200);border-radius:14px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#059669,#047857);padding:16px 20px;color:white;">
                    <h4 style="margin:0;font-size:15px;">📋 Vị Trí (Positions)</h4>
                    <p style="margin:4px 0 0;font-size:11px;opacity:0.7;">Chức danh công việc — tên vị trí thực tế trong công ty</p>
                </div>
                <div style="padding:16px;">
                    <ul class="setting-list" style="margin-bottom:12px;">
                        ${positions.length === 0 ? '<li class="setting-item"><div class="text-muted" style="padding:16px;text-align:center;width:100%;">Chưa có vị trí nào</div></li>' : positions.map(p => `
                            <li class="setting-item" style="padding:10px 14px;border-radius:10px;border:1px solid var(--gray-200);margin-bottom:8px;">
                                <div class="item-info"><span class="fw-600" style="color:var(--navy);">${p.name}</span></div>
                                <div class="item-actions">
                                    <button class="btn btn-xs btn-danger" onclick="deletePosition(${p.id}, '${p.name.replace(/'/g,"\\\\'")}')" title="Xóa">🗑️</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <div style="border-top:1px solid var(--gray-200);padding-top:12px;">
                        <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">➕ Thêm Vị Trí Mới</div>
                        <div class="setting-add" style="margin:0;">
                            <input type="text" id="newPositionName" placeholder="Tên vị trí mới..." onkeypress="if(event.key==='Enter') addPosition()">
                            <button class="btn btn-sm btn-success" onclick="addPosition()">➕ Thêm</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div style="margin-top:20px;padding:14px;background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;font-size:12px;color:#92400e;">
            <strong>📌 Lưu ý:</strong>
            <ul style="margin:6px 0 0;padding-left:20px;line-height:1.8;">
                <li><strong>Vai trò</strong> = quyền hạn trên hệ thống (VD: Quản Lý Cấp Cao có level 4, được duyệt công việc của Trưởng Phòng level 2)</li>
                <li><strong>Vị trí</strong> = chức danh công việc (VD: Kế Toán, Kinh Doanh, Thủ Kho)</li>
                <li>Khi tạo tài khoản, bắt buộc chọn <strong>cả Vai trò VÀ Vị trí</strong></li>
                <li>Vai trò mặc định (🔒) không thể xóa</li>
            </ul>
        </div>
    `;
}

async function addSystemRole() {
    const name = document.getElementById('newRoleName')?.value?.trim();
    const slug = document.getElementById('newRoleSlug')?.value?.trim();
    const level = parseInt(document.getElementById('newRoleLevel')?.value) || 1;
    if (!name || !slug) { showToast('Vui lòng nhập tên và slug', 'error'); return; }
    const data = await apiCall('/api/system-roles', 'POST', { name, slug, level });
    if (data.success) { showToast('Đã thêm vai trò!'); await loadRolesPositionsSettings(); }
    else showToast(data.error, 'error');
}

async function deleteSystemRole(id, name) {
    if (!confirm(`Xóa vai trò "${name}"? Hành động này không thể hoàn tác.`)) return;
    const data = await apiCall(`/api/system-roles/${id}`, 'DELETE');
    if (data.success) { showToast('Đã xóa vai trò!'); await loadRolesPositionsSettings(); }
    else showToast(data.error, 'error');
}

async function addPosition() {
    const name = document.getElementById('newPositionName')?.value?.trim();
    if (!name) { showToast('Vui lòng nhập tên vị trí', 'error'); return; }
    const data = await apiCall('/api/positions', 'POST', { name });
    if (data.success) { showToast('Đã thêm vị trí!'); await loadRolesPositionsSettings(); }
    else showToast(data.error, 'error');
}

async function deletePosition(id, name) {
    if (!confirm(`Xóa vị trí "${name}"?`)) return;
    const data = await apiCall(`/api/positions/${id}`, 'DELETE');
    if (data.success) { showToast('Đã xóa vị trí!'); await loadRolesPositionsSettings(); }
    else showToast(data.error, 'error');
}

// ========== TELESALE SOURCES SETTINGS ==========
const CRM_TYPE_OPTIONS_TS = [
    { value: 'tu_tim_kiem', label: 'CRM Tự Tìm Kiếm', icon: '🔍', color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { value: 'goi_hop_tac', label: 'CRM GĐ Hợp Tác', icon: '🤝', color: '#059669', bg: 'linear-gradient(135deg,#059669,#14b8a6)' },
    { value: 'goi_ban_hang', label: 'CRM GĐ Bán Hàng', icon: '📞', color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
];
let _settings_activeCrm = 'tu_tim_kiem';

async function loadTelesaleSourcesSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const [srcRes, configRes1, configRes2, configRes3, configRes4, tsSettings] = await Promise.all([
        apiCall(`/api/telesale/sources?crm_type=${_settings_activeCrm}`),
        apiCall('/api/app-config/telesale_default_quota'),
        apiCall('/api/app-config/telesale_cold_months'),
        apiCall('/api/app-config/telesale_followup_canhnhac'),
        apiCall('/api/app-config/telesale_followup_ncc'),
        apiCall('/api/telesale/settings')
    ]);
    const sources = srcRes.sources || [];
    const defaultQuota = configRes1.value || '250';
    const coldMonths = configRes2.value || '4';
    const followupCN = configRes3.value || '3';
    const followupNCC = configRes4.value || '30';
    const coldNoRepump = tsSettings.cold_no_repump || false;
    const nccNoRepump = tsSettings.ncc_no_repump || false;

    const totalQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
    const activeCfg = CRM_TYPE_OPTIONS_TS.find(o => o.value === _settings_activeCrm);

    // CRM tabs
    const crmTabsHtml = CRM_TYPE_OPTIONS_TS.map(ct => {
        const isActive = ct.value === _settings_activeCrm;
        return `<button class="htgd-crm-tab ${isActive ? 'active' : ''}" data-crm="${ct.value}"
            onclick="_settings_switchCrm('${ct.value}')"
            style="padding:7px 16px;border:1.5px solid ${isActive ? ct.color : '#e2e8f0'};
            border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.25s ease;
            background:${isActive ? ct.bg : 'linear-gradient(135deg,#f8fafc,#ffffff)'};
            color:${isActive ? 'white' : '#475569'};
            box-shadow:${isActive ? '0 4px 14px ' + ct.color + '30' : '0 1px 3px rgba(0,0,0,0.04)'};
            display:inline-flex;align-items:center;gap:5px;">
            ${ct.icon} ${ct.label}
        </button>`;
    }).join('');

    el.innerHTML = `
        <div style="margin-bottom:20px;">
            <h4 style="color:#122546;margin:0 0 8px;font-size:16px;font-weight:800;">📞 Nguồn Gọi Điện Telesale</h4>
            <p style="font-size:12px;color:#6b7280;margin:0;">Quản lý các nguồn data gọi điện. Mỗi nguồn = 1 danh mục SĐT khách hàng.</p>
        </div>

        <!-- CRM Tabs -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            ${crmTabsHtml}
        </div>

        <!-- Global Config -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
            <div class="ts-stat-card" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;padding:14px;text-align:left;">
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">📊 Quota mặc định/NV/ngày</label>
                <input type="number" id="tsDefaultQuota" value="${defaultQuota}" style="width:100%;padding:6px 8px;border:1.5px solid #93c5fd;border-radius:8px;font-size:14px;font-weight:700;background:white;" onchange="saveTsConfig('telesale_default_quota',this.value)">
            </div>
            <div class="ts-stat-card" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);color:#92400e;padding:14px;text-align:left;">
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">❄️ Kho lạnh — K. Nhu Cầu</label>
                <div style="display:flex;align-items:center;gap:6px;">
                    <input type="number" id="tsColdMonths" value="${coldMonths}" ${coldNoRepump ? 'disabled' : ''} style="flex:1;padding:6px 8px;border:1.5px solid #fcd34d;border-radius:8px;font-size:14px;font-weight:700;background:${coldNoRepump ? '#f3f4f6' : 'white'};opacity:${coldNoRepump ? '0.5' : '1'};" onchange="saveTsConfig('telesale_cold_months',this.value)">
                    <span style="font-size:10px;white-space:nowrap;">tháng</span>
                </div>
                <label style="display:flex;align-items:center;gap:4px;margin-top:6px;cursor:pointer;font-size:10px;font-weight:600;">
                    <input type="checkbox" id="tsColdNoRepump" ${coldNoRepump ? 'checked' : ''} onchange="_toggleColdNoRepump('cold', this.checked)" style="cursor:pointer;">
                    🚫 Không bơm lại
                </label>
            </div>
            <div class="ts-stat-card" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;padding:14px;text-align:left;">
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">🤔 Hẹn lại (Cân nhắc)</label>
                <input type="number" id="tsFollowupCN" value="${followupCN}" style="width:100%;padding:6px 8px;border:1.5px solid #6ee7b7;border-radius:8px;font-size:14px;font-weight:700;background:white;" onchange="saveTsConfig('telesale_followup_canhnhac',this.value)"> <span style="font-size:10px;">ngày</span>
            </div>
            <div class="ts-stat-card" style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);color:#9d174d;padding:14px;text-align:left;">
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">🏪 Đã Có NCC</label>
                <div style="display:flex;align-items:center;gap:6px;">
                    <input type="number" id="tsFollowupNCC" value="${followupNCC}" ${nccNoRepump ? 'disabled' : ''} style="flex:1;padding:6px 8px;border:1.5px solid #f9a8d4;border-radius:8px;font-size:14px;font-weight:700;background:${nccNoRepump ? '#f3f4f6' : 'white'};opacity:${nccNoRepump ? '0.5' : '1'};" onchange="saveTsConfig('telesale_followup_ncc',this.value)">
                    <span style="font-size:10px;white-space:nowrap;">tháng</span>
                </div>
                <label style="display:flex;align-items:center;gap:4px;margin-top:6px;cursor:pointer;font-size:10px;font-weight:600;">
                    <input type="checkbox" id="tsNccNoRepump" ${nccNoRepump ? 'checked' : ''} onchange="_toggleColdNoRepump('ncc', this.checked)" style="cursor:pointer;">
                    🚫 Không bơm lại
                </label>
            </div>
        </div>

        <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <span style="font-size:12px;color:#6b7280;">Tổng quota <strong style="color:${activeCfg?.color || '#122546'}">${activeCfg?.label || ''}</strong>: <strong style="color:#122546;font-size:14px;">${totalQuota} SĐT/NV/ngày</strong></span>
            <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:10px;">
                <span style="font-size:11px;font-weight:700;color:#0369a1;">🔄 Đồng bộ quota:</span>
                <input type="number" id="tsSyncQuotaVal" value="${sources.length > 0 ? sources[0].daily_quota : 15}" min="0" style="width:70px;padding:4px 8px;border:1.5px solid #93c5fd;border-radius:8px;text-align:center;font-weight:700;font-size:13px;">
                <button class="ts-btn ts-btn-blue ts-btn-xs" onclick="syncTsSourceQuota()" style="white-space:nowrap;">Đồng bộ tất cả</button>
            </div>
        </div>

        <!-- Sources List -->
        <div style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <table class="ts-table">
                <thead><tr>
                    <th style="text-align:left;">Icon</th>
                    <th style="text-align:left;">Tên Nguồn</th>
                    <th style="text-align:center;">Quota/NV/Ngày</th>
                    <th style="text-align:center;">Thao Tác</th>
                </tr></thead>
                <tbody>
                    ${sources.map(s => `
                    <tr id="tsRow_${s.id}">
                        <td style="font-size:20px;">${s.icon || '📁'}</td>
                        <td style="font-weight:700;color:#122546;">${s.name}</td>
                        <td style="text-align:center;"><span class="ts-badge" style="background:#dbeafe;color:#1e40af;">${s.daily_quota}</span></td>
                        <td style="text-align:center;">
                            <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="editTsSource(${s.id})">✏️ Sửa</button>
                            <button class="ts-btn ts-btn-xs" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;" onclick="deleteTsSource(${s.id},'${s.name.replace(/'/g,"\\\\'")}')">🗑️</button>
                        </td>
                    </tr>`).join('')}
                    ${sources.length === 0 ? '<tr><td colspan="4" class="ts-empty" style="padding:20px;">Chưa có nguồn nào cho CRM này</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <!-- Add New Source -->
        <div style="margin-top:16px;padding:16px;background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:12px;">➕ Thêm Nguồn Mới vào <span style="color:${activeCfg?.color || '#122546'}">${activeCfg?.icon || ''} ${activeCfg?.label || ''}</span></div>
            <div style="display:grid;grid-template-columns:60px 1fr 80px auto;gap:10px;align-items:end;">
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Icon</label>
                    <input type="text" id="newTsIcon" value="📁" class="ts-select" style="width:100%;text-align:center;font-size:18px;padding:6px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Tên Nguồn</label>
                    <input type="text" id="newTsName" placeholder="VD: NHÂN SỰ" class="ts-search" style="padding:8px 12px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Quota</label>
                    <input type="number" id="newTsQuota" value="15" class="ts-select" style="width:100%;">
                </div>
                <button class="ts-btn ts-btn-green" onclick="addTsSource()" style="height:38px;">➕ Thêm</button>
            </div>
        </div>
    `;
}

async function saveTsConfig(key, value) {
    await apiCall(`/api/app-config/${key}`, 'PUT', { value: String(value) });
    showToast('✅ Đã lưu');
}

async function _toggleColdNoRepump(type, checked) {
    const key = type === 'cold' ? 'cold_no_repump' : 'ncc_no_repump';
    const inputId = type === 'cold' ? 'tsColdMonths' : 'tsFollowupNCC';
    const input = document.getElementById(inputId);
    if (input) {
        input.disabled = checked;
        input.style.opacity = checked ? '0.5' : '1';
        input.style.background = checked ? '#f3f4f6' : 'white';
    }
    await apiCall('/api/telesale/settings', 'PUT', { [key]: checked });
    showToast(checked ? '🚫 Đã tắt bơm lại' : '✅ Sẽ bơm lại sau số tháng đã cài');
}

async function _settings_switchCrm(crmType) {
    _settings_activeCrm = crmType;
    await loadTelesaleSourcesSettings();
}

async function syncTsSourceQuota() {
    const quota = parseInt(document.getElementById('tsSyncQuotaVal')?.value);
    if (isNaN(quota) || quota < 0) return showToast('Nhập quota hợp lệ (≥ 0)', 'error');
    if (!confirm(`Đồng bộ TẤT CẢ nguồn trong CRM này → quota = ${quota}?`)) return;
    const res = await apiCall('/api/telesale/sources/sync-quota', 'PUT', { crm_type: _settings_activeCrm, daily_quota: quota });
    if (res.success) { showToast(res.message); await loadTelesaleSourcesSettings(); }
    else showToast(res.error, 'error');
}

async function addTsSource() {
    const name = document.getElementById('newTsName')?.value?.trim();
    if (!name) return showToast('Nhập tên nguồn', 'error');
    const data = await apiCall('/api/telesale/sources', 'POST', {
        name, icon: document.getElementById('newTsIcon').value,
        daily_quota: parseInt(document.getElementById('newTsQuota').value) || 15,
        crm_type: _settings_activeCrm
    });
    if (data.success) { showToast(data.message); await loadTelesaleSourcesSettings(); }
    else showToast(data.error, 'error');
}

async function editTsSource(id) {
    const srcRes = await apiCall(`/api/telesale/sources?crm_type=${_settings_activeCrm}`);
    const src = (srcRes.sources || []).find(s => s.id === id);
    if (!src) return;
    openModal('✏️ Sửa Nguồn: ' + src.name, `
        <div class="form-group"><label>Tên</label><input type="text" id="editTsName" class="form-control" value="${src.name}"></div>
        <div style="display:grid;grid-template-columns:80px 1fr;gap:12px;">
            <div class="form-group"><label>Icon</label><input type="text" id="editTsIcon" class="form-control" value="${src.icon || '📁'}" style="text-align:center;font-size:18px;"></div>
            <div class="form-group"><label>Quota/NV/Ngày</label><input type="number" id="editTsQuota" class="form-control" value="${src.daily_quota}"></div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditTsSource(${id})">💾 Lưu</button>`);
}

async function submitEditTsSource(id) {
    const data = await apiCall(`/api/telesale/sources/${id}`, 'PUT', {
        name: document.getElementById('editTsName').value,
        icon: document.getElementById('editTsIcon').value,
        daily_quota: parseInt(document.getElementById('editTsQuota').value) || 0,
        crm_type: _settings_activeCrm
    });
    if (data.success) { showToast(data.message); closeModal(); await loadTelesaleSourcesSettings(); }
    else showToast(data.error, 'error');
}

async function deleteTsSource(id, name) {
    if (!confirm(`Xóa nguồn "${name}"?`)) return;
    const data = await apiCall(`/api/telesale/sources/${id}`, 'DELETE');
    if (data.success) { showToast(data.message); await loadTelesaleSourcesSettings(); }
    else showToast(data.error, 'error');
}

// ========== TELESALE ANSWER STATUSES SETTINGS ==========
const TS_ACTION_TYPES = [
    { value: 'transfer', label: '🔥 Chuyển Số CRM', color: '#dc2626' },
    { value: 'followup', label: '⏰ Hẹn Gọi Lại', color: '#d97706' },
    { value: 'cold', label: '❄️ Kho Lạnh', color: '#6366f1' },
    { value: 'none', label: '— Không hành động', color: '#6b7280' },
];

async function loadTelesaleStatusesSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const res = await apiCall('/api/telesale/answer-statuses');
    const statuses = res.statuses || [];

    el.innerHTML = `
        <div style="margin-bottom:20px;">
            <h4 style="color:#122546;margin:0 0 8px;font-size:16px;font-weight:800;">📱 Tình Trạng Khi Khách Bắt Máy</h4>
            <p style="font-size:12px;color:#6b7280;margin:0;">Cấu hình tình trạng kết quả khi khách hàng bắt máy. Mỗi tình trạng có hành động tự động riêng.</p>
        </div>

        <div style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <table class="ts-table">
                <thead><tr>
                    <th style="text-align:left;">Icon</th>
                    <th style="text-align:left;">Tình Trạng</th>
                    <th style="text-align:center;">Hành Động</th>
                    <th style="text-align:center;">Follow-up</th>
                    <th style="text-align:center;">Đếm Bắt Máy</th>
                    <th style="text-align:center;">Thao Tác</th>
                </tr></thead>
                <tbody>
                    ${statuses.map(s => {
                        const act = TS_ACTION_TYPES.find(a => a.value === s.action_type) || TS_ACTION_TYPES[3];
                        return `
                        <tr>
                            <td style="font-size:20px;">${s.icon || '📞'}</td>
                            <td style="font-weight:700;color:#122546;">${s.name}</td>
                            <td style="text-align:center;">
                                <span class="ts-badge" style="background:${act.color}15;color:${act.color};">${act.label}</span>
                            </td>
                            <td style="text-align:center;">
                                ${s.default_followup_days > 0 ? `<span class="ts-badge" style="background:#fef3c7;color:#92400e;">${s.default_followup_days} ngày</span>` : '<span style="color:#d1d5db;">—</span>'}
                            </td>
                            <td style="text-align:center;">
                                ${s.counts_as_answered ? '<span style="color:#16a34a;font-weight:700;">✅</span>' : '<span style="color:#dc2626;">❌</span>'}
                            </td>
                            <td style="text-align:center;">
                                <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="editTsStatus(${s.id})">✏️ Sửa</button>
                                <button class="ts-btn ts-btn-xs" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;" onclick="deleteTsStatus(${s.id},'${s.name.replace(/'/g,"\\\\'")}')">🗑️</button>
                            </td>
                        </tr>`;
                    }).join('')}
                    ${statuses.length === 0 ? '<tr><td colspan="6" class="ts-empty" style="padding:20px;">Chưa có tình trạng nào</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <!-- Add New Status -->
        <div style="margin-top:16px;padding:16px;background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:12px;">➕ Thêm Tình Trạng Mới</div>
            <div style="display:grid;grid-template-columns:60px 1fr 150px 80px 80px;gap:10px;align-items:end;">
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Icon</label>
                    <input type="text" id="newTsStatusIcon" value="📞" class="ts-select" style="width:100%;text-align:center;font-size:18px;padding:6px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Tên Tình Trạng</label>
                    <input type="text" id="newTsStatusName" placeholder="VD: Hẹn gọi lại" class="ts-search" style="padding:8px 12px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Loại Hành Động</label>
                    <select id="newTsStatusAction" class="ts-select" style="width:100%;">${TS_ACTION_TYPES.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}</select>
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Follow-up</label>
                    <input type="number" id="newTsStatusFollowup" value="0" class="ts-select" style="width:100%;">
                </div>
                <button class="ts-btn ts-btn-green" onclick="addTsStatus()" style="height:38px;">➕</button>
            </div>
        </div>

        <div style="margin-top:16px;padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:14px;font-size:12px;color:#0369a1;">
            <strong>📌 Hướng dẫn Loại Hành Động:</strong>
            <ul style="margin:6px 0 0;padding-left:20px;line-height:1.8;">
                <li><strong>🔥 Chuyển Số CRM</strong>: Tự mở form Chuyển Số, điền sẵn SĐT + Tên KH</li>
                <li><strong>⏰ Hẹn Gọi Lại</strong>: Tự hẹn ngày gọi lại (theo số ngày mặc định)</li>
                <li><strong>❄️ Kho Lạnh</strong>: Lưu kho lạnh, GĐ có thể gọi lại sau X tháng</li>
                <li><strong>— Không hành động</strong>: Chỉ ghi nhận, không xử lý thêm</li>
            </ul>
        </div>
    `;
}

async function addTsStatus() {
    const name = document.getElementById('newTsStatusName')?.value?.trim();
    if (!name) return showToast('Nhập tên tình trạng', 'error');
    const data = await apiCall('/api/telesale/answer-statuses', 'POST', {
        name, icon: document.getElementById('newTsStatusIcon').value,
        action_type: document.getElementById('newTsStatusAction').value,
        default_followup_days: parseInt(document.getElementById('newTsStatusFollowup').value) || 0
    });
    if (data.success) { showToast(data.message); await loadTelesaleStatusesSettings(); }
    else showToast(data.error, 'error');
}

async function editTsStatus(id) {
    const res = await apiCall('/api/telesale/answer-statuses');
    const s = (res.statuses || []).find(x => x.id === id);
    if (!s) return;
    const actionOpts = TS_ACTION_TYPES.map(a => `<option value="${a.value}" ${a.value === s.action_type ? 'selected' : ''}>${a.label}</option>`).join('');
    openModal('✏️ Sửa: ' + s.name, `
        <div style="display:grid;grid-template-columns:80px 1fr;gap:12px;">
            <div class="form-group"><label>Icon</label><input type="text" id="editTsStatusIcon" class="form-control" value="${s.icon || '📞'}" style="text-align:center;font-size:18px;"></div>
            <div class="form-group"><label>Tên Tình Trạng</label><input type="text" id="editTsStatusName" class="form-control" value="${s.name}"></div>
        </div>
        <div class="form-group"><label>Loại Hành Động</label><select id="editTsStatusAction" class="form-control">${actionOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label>Follow-up (ngày)</label><input type="number" id="editTsStatusFollowup" class="form-control" value="${s.default_followup_days}"></div>
            <div class="form-group"><label>Đếm vào Bắt Máy</label><select id="editTsStatusCounts" class="form-control"><option value="true" ${s.counts_as_answered ? 'selected' : ''}>✅ Có</option><option value="false" ${!s.counts_as_answered ? 'selected' : ''}>❌ Không</option></select></div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditTsStatus(${id})">💾 Lưu</button>`);
}

async function submitEditTsStatus(id) {
    const data = await apiCall(`/api/telesale/answer-statuses/${id}`, 'PUT', {
        name: document.getElementById('editTsStatusName').value,
        icon: document.getElementById('editTsStatusIcon').value,
        action_type: document.getElementById('editTsStatusAction').value,
        default_followup_days: parseInt(document.getElementById('editTsStatusFollowup').value) || 0,
        counts_as_answered: document.getElementById('editTsStatusCounts').value === 'true'
    });
    if (data.success) { showToast(data.message); closeModal(); await loadTelesaleStatusesSettings(); }
    else showToast(data.error, 'error');
}

async function deleteTsStatus(id, name) {
    if (!confirm(`Xóa tình trạng "${name}"?`)) return;
    const data = await apiCall(`/api/telesale/answer-statuses/${id}`, 'DELETE');
    if (data.success) { showToast(data.message); await loadTelesaleStatusesSettings(); }
    else showToast(data.error, 'error');
}
