// ========== SETTINGS PAGE ==========

let currentSettingTab = 'commission-tiers';

async function renderSettingsPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>⚙️ Cài Đặt Quản Trị Phân Tầng</h3>
            </div>
            <div class="card-body">
                <div class="tabs">
                    <div class="tab active" data-tab="commission-tiers" onclick="switchSettingTab('commission-tiers', this)">💰 Tầng Hoa Hồng</div>
                    <div class="tab" data-tab="sources" onclick="switchSettingTab('sources', this)">📍 Nguồn Khách</div>
                    <div class="tab" data-tab="promotions" onclick="switchSettingTab('promotions', this)">🎁 Khuyến Mãi</div>
                    <div class="tab" data-tab="industries" onclick="switchSettingTab('industries', this)">🏭 Lĩnh Vực</div>
                    <div class="tab" data-tab="emergency-popup" onclick="switchSettingTab('emergency-popup', this)">🚨 Cấp Cứu</div>
                    <div class="tab" data-tab="job-titles" onclick="switchSettingTab('job-titles', this)">👔 Chức Danh</div>
                    <div class="tab" data-tab="leaderboard-roles" onclick="switchSettingTab('leaderboard-roles', this)">🏆 BXH Affiliate</div>
                    <div class="tab" data-tab="prize-popup" onclick="switchSettingTab('prize-popup', this)">🎉 Giải Thưởng</div>
                    <div class="tab" data-tab="roles-positions" onclick="switchSettingTab('roles-positions', this)">🏷️ Vai Trò & Vị Trí</div>
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

// ========== JOB TITLES PER CRM ==========
const JOB_CRM_OPTIONS = [
    { value: 'nuoi_duong', label: 'CRM Nhân Sự/Kế Toán/P.Mua Hàng' },
    { value: 'sinh_vien', label: 'CRM Thể Thao/Thời Trang Local' },
    { value: 'qua_tang', label: 'CRM Quà Tặng/Sự Kiện/Du Lịch' },
    { value: 'koc_tiktok', label: 'CRM KOL Tiktok/Mẹ Bỉm Sữa' },
    { value: 'hoa_hong_crm', label: 'CRM Giáo Viên/Học Sinh/Sinh Viên' },
    { value: 'nguoi_than', label: 'CRM Người Thân/Bạn Bè' },
    { value: 'affiliate', label: 'CRM Affiliate Giới Thiệu' },
];

let currentJobCrm = '';

async function loadJobTitlesSettings() {
    const contentDiv = document.getElementById('settingsContent');
    const crmOpts = JOB_CRM_OPTIONS.map(o => `<option value="${o.value}" ${o.value === currentJobCrm ? 'selected' : ''}>${o.label}</option>`).join('');

    let listHtml = '';
    if (currentJobCrm) {
        const data = await apiCall(`/api/settings/job-titles?crm_type=${currentJobCrm}`);
        if (!data.items || data.items.length === 0) {
            listHtml = `<div class="text-muted" style="padding:20px;text-align:center;">Chưa có chức danh nào cho CRM này. Thêm mới bên dưới.</div>`;
        } else {
            listHtml = `<ul class="setting-list">${data.items.map(item => `
                <li class="setting-item">
                    <div class="item-info"><span class="fw-600">${item.name}</span></div>
                    <div class="item-actions">
                        <button class="btn btn-xs btn-danger" onclick="deleteJobTitle(${item.id})">🗑️</button>
                    </div>
                </li>`).join('')}</ul>`;
        }
        listHtml += `
            <div class="setting-add">
                <input type="text" id="newJobTitleName" placeholder="Tên chức danh mới..." onkeypress="if(event.key==='Enter') addJobTitle()">
                <button class="btn btn-sm btn-success" onclick="addJobTitle()">➕ Thêm</button>
            </div>`;
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
                ${listHtml}
            </div>` : '<div class="text-muted" style="text-align:center;padding:30px;">Chọn CRM để quản lý chức danh</div>'}
        </div>
    `;
}

async function addJobTitle() {
    const name = document.getElementById('newJobTitleName')?.value?.trim();
    if (!name) { showToast('Vui lòng nhập tên chức danh', 'error'); return; }
    const data = await apiCall('/api/settings/job-titles', 'POST', { crm_type: currentJobCrm, name });
    if (data.success) { showToast(data.message); await loadJobTitlesSettings(); }
    else showToast(data.error, 'error');
}

async function deleteJobTitle(id) {
    if (!confirm('Xóa chức danh này?')) return;
    const data = await apiCall(`/api/settings/job-titles/${id}`, 'DELETE');
    if (data.success) { showToast(data.message); await loadJobTitlesSettings(); }
    else showToast(data.error, 'error');
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
