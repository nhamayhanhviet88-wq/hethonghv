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
                    <div class="tab" data-tab="sources" onclick="switchSettingTab('sources', this)">📍 Nguồn Khách NV Kinh Doanh</div>
                    <div class="tab" data-tab="promotions" onclick="switchSettingTab('promotions', this)">🎁 Khuyến Mãi</div>
                    <div class="tab" data-tab="industries" onclick="switchSettingTab('industries', this)">🏭 Lĩnh Vực</div>
                    <div class="tab" data-tab="dht-carriers" onclick="switchSettingTab('dht-carriers', this)">🚚 Nhà Vận Chuyển</div>
                    <div class="tab" data-tab="emergency-popup" onclick="switchSettingTab('emergency-popup', this)">🚨 Cấp Cứu</div>
                    <div class="tab" data-tab="job-titles" onclick="switchSettingTab('job-titles', this)">👔 Lĩnh Vực</div>
                    <div class="tab" data-tab="leaderboard-roles" onclick="switchSettingTab('leaderboard-roles', this)">🏆 BXH Affiliate</div>
                    <div class="tab" data-tab="prize-popup" onclick="switchSettingTab('prize-popup', this)">🎉 Giải Thưởng</div>
                    <div class="tab" data-tab="roles-positions" onclick="switchSettingTab('roles-positions', this)">🏷️ Vai Trò & Vị Trí</div>
                    <div class="tab" data-tab="telesale-statuses" onclick="switchSettingTab('telesale-statuses', this)">📱 Tình Trạng Bắt Máy</div>
                    <div class="tab" data-tab="partner-reg-telegram" onclick="switchSettingTab('partner-reg-telegram', this)">📲 Đăng Ký Đối Tác</div>
                    <div class="tab" data-tab="telegram-notify" onclick="switchSettingTab('telegram-notify', this)">🔔 Telegram Thông Báo</div>
                    <div class="tab" data-tab="production-mode" onclick="switchSettingTab('production-mode', this)" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e;font-weight:700;">🚀 Thực Chiến</div>
                    <div class="tab" data-tab="master-key" onclick="switchSettingTab('master-key', this)">🔐 Mã Khóa Tổng</div>
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
    } else if (tab === 'partner-reg-telegram') {
        loadPartnerRegTelegramSettings();
    } else if (tab === 'telegram-notify') {
        loadTelegramNotifySettings();
    } else if (tab === 'master-key') {
        loadMasterKeySettings();
    } else if (tab === 'production-mode') {
        loadProductionModeSettings();
    } else if (tab === 'dht-carriers') {
        loadCarriersSettings();
    } else {
        loadSettingsTab(tab);
    }
}

async function loadSettingsTab(type) {
    const data = await apiCall(`/api/settings/${type}`);
    const contentDiv = document.getElementById('settingsContent');
    const isCommission = type === 'commission-tiers';
    const isSources = type === 'sources';

    let html = `<ul class="setting-list">`;

    if (!data.items || data.items.length === 0) {
        html += `<li class="setting-item"><div class="text-muted" style="padding: 20px; text-align:center; width:100%;">Chưa có mục nào. Thêm mới bên dưới.</div></li>`;
    } else {
        data.items.forEach((item, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === data.items.length - 1;
            html += `
                <li class="setting-item" id="setting-item-${item.id}">
                    <div class="item-info" style="flex:1;display:flex;align-items:center;gap:8px;">
                        ${isSources ? `<span style="color:#9ca3af;font-size:11px;font-weight:700;min-width:22px;">#${idx+1}</span>` : ''}
                        <span class="fw-600">${item.name}</span>
                        ${isCommission ? `<span class="badge badge-info" style="margin-left: 8px;">TT: ${item.percentage}%</span><span class="badge" style="margin-left: 4px;background:#d1fae5;color:#065f46;">CT: ${item.parent_percentage || 0}%</span>` : ''}
                    </div>
                    <div class="item-actions" style="display:flex;gap:4px;align-items:center;">
                        ${isSources ? `
                            <button class="btn btn-xs" onclick="toggleChuyenSo(${item.id})" style="background:${item.show_in_chuyenso ? '#dbeafe' : '#f3f4f6'};color:${item.show_in_chuyenso ? '#1e40af' : '#9ca3af'};border:1px solid ${item.show_in_chuyenso ? '#93c5fd' : '#e5e7eb'};padding:3px 7px;font-size:11px;cursor:pointer;" title="${item.show_in_chuyenso ? 'Đang hiện ở Chuyển Số — Bấm để ẩn' : 'Đang ẩn ở Chuyển Số — Bấm để hiện'}">📱${item.show_in_chuyenso ? '✅' : ''}</button>
                            <button class="btn btn-xs" onclick="reorderSettingItem('${type}', ${item.id}, 'up')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:3px 7px;font-size:13px;${isFirst ? 'opacity:0.3;pointer-events:none;' : 'cursor:pointer;'}" title="Di chuyển lên">⬆️</button>
                            <button class="btn btn-xs" onclick="reorderSettingItem('${type}', ${item.id}, 'down')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:3px 7px;font-size:13px;${isLast ? 'opacity:0.3;pointer-events:none;' : 'cursor:pointer;'}" title="Di chuyển xuống">⬇️</button>
                        ` : ''}
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

async function reorderSettingItem(type, id, direction) {
    const res = await apiCall(`/api/settings/${type}/reorder`, 'PUT', { id, direction });
    if (res.error) { showToast(res.error, 'error'); return; }
    showToast('✅ Đã sắp xếp lại');
    await loadSettingsTab(type);
}

async function toggleChuyenSo(id) {
    const res = await apiCall(`/api/source-chuyenso-toggle/${id}`, 'PUT');
    if (res.success) {
        showToast(res.message);
        await loadSettingsTab('sources');
    } else {
        showToast(res.error || 'Lỗi', 'error');
    }
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

            <!-- CAM KẾT CUỘC HỌP POPUP -->
            <div style="margin-bottom:28px;padding:20px;background:rgba(124,58,237,0.04);border:1px solid #c4b5fd;border-radius:12px;">
                <h4 style="margin-bottom:12px;color:#7c3aed;">📋 Pop-up Cam Kết Cuộc Họp</h4>
                <p style="font-size:12px;color:#64748b;margin-bottom:16px;">
                    Sau đăng nhập <strong>1 phút</strong>, hệ thống sẽ hiện popup cam kết mới nhất cho nhân viên.<br>
                    Chỉ hiện <strong>1 lần/session</strong> mỗi cuộc họp. Cuộc họp mới → popup hiện lại.
                </p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn" onclick="_showCommitPopup(true)" style="width:auto;font-size:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">👁️ Xem Thử Popup</button>
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
    { value: 'nhu_cau', label: 'CRM Chăm Sóc KH Nhu Cầu' },
    { value: 'ctv', label: 'CRM Chăm Sóc CTV' },
    { value: 'ctv_hoa_hong', label: 'CRM Chăm Sóc Affiliate' },
    { value: 'koc_tiktok', label: 'CRM KOL/KOC Tiktok' },
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
            listHtml = `<div class="text-muted" style="padding:20px;text-align:center;">Chưa có lĩnh vực nào cho CRM này.<br><span style="font-size:11px;color:#6b7280;">Thêm nguồn tại <strong>📊 Hệ Thống Phân Chia Gọi Điện → Cài Đặt</strong></span></div>`;
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
                <h4 style="margin-bottom:12px;color:#122546;">👔 Danh sách Lĩnh Vực</h4>
                <div style="margin-bottom:10px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12px;color:#1e40af;">
                    📌 Lĩnh vực được đồng bộ từ <strong>Nguồn Gọi Điện</strong> tại Hệ Thống Phân Chia Gọi Điện. Thêm/xóa nguồn tại đó sẽ tự động cập nhật ở đây.
                </div>
                ${listHtml}
            </div>` : '<div class="text-muted" style="text-align:center;padding:30px;">Chọn CRM để xem lĩnh vực</div>'}
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
    { key: 'dashboard_kdoanh_allowed_roles', label: '📈 Dashboard P.Kinh Doanh', defaults: ['giam_doc'] },
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

    const CORE_ROLES = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'];

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
    { value: 'nhu_cau', label: 'CRM KH Nhu Cầu', icon: '📋', color: '#2563eb', bg: 'linear-gradient(135deg,#2563eb,#3b82f6)' },
    { value: 'ctv', label: 'CRM CTV', icon: '🤝', color: '#059669', bg: 'linear-gradient(135deg,#059669,#14b8a6)' },
    { value: 'ctv_hoa_hong', label: 'CRM Affiliate', icon: '💎', color: '#ec4899', bg: 'linear-gradient(135deg,#ec4899,#f472b6)' },
    { value: 'koc_tiktok', label: 'CRM KOL/KOC', icon: '🎬', color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
];
let _settings_activeCrm = 'nhu_cau';

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

// ========== PARTNER REGISTRATION TELEGRAM SETTINGS ==========
async function loadPartnerRegTelegramSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const res = await apiCall('/api/partner-registration/settings');
    const botToken = res.bot_token || '';
    const chatId = res.chat_id || '';
    const counter = res.counter || '0';
    const isConfigured = botToken && chatId;

    el.innerHTML = `
        <div style="max-width:650px;">
            <div style="margin-bottom:24px;">
                <h4 style="color:#122546;margin:0 0 8px;font-size:16px;font-weight:800;">📲 Cấu Hình Telegram — Đăng Ký Đối Tác</h4>
                <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">
                    Khi khách hàng điền form <strong>Đăng Ký Đối Tác</strong> tại trang <code>/doitac</code>, 
                    hệ thống sẽ gửi thông tin vào nhóm Telegram của bạn.
                </p>
            </div>

            <!-- Status Badge -->
            <div style="margin-bottom:20px;padding:14px 18px;border-radius:12px;
                background:${isConfigured ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)'};
                border:1.5px solid ${isConfigured ? '#6ee7b7' : '#fca5a5'};
                display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">${isConfigured ? '✅' : '⚠️'}</span>
                <div>
                    <div style="font-size:13px;font-weight:700;color:${isConfigured ? '#065f46' : '#991b1b'};">
                        ${isConfigured ? 'Đã cấu hình — Sẵn sàng nhận thông báo' : 'Chưa cấu hình — Đăng ký sẽ không gửi Telegram'}
                    </div>
                    <div style="font-size:11px;color:${isConfigured ? '#047857' : '#b91c1c'};margin-top:2px;">
                        ${isConfigured ? 'Số đăng ký đã nhận: <strong>' + counter + '</strong>' : 'Vui lòng nhập Bot Token và Chat ID bên dưới'}
                    </div>
                </div>
            </div>

            <!-- Form -->
            <div style="padding:24px;background:linear-gradient(165deg,#f8fafc,#ffffff);border:1.5px solid #e2e8f0;border-radius:16px;">
                <!-- Bot Token -->
                <div style="margin-bottom:20px;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;">
                        🤖 Bot Token
                    </label>
                    <input type="text" id="prSettingBotToken" class="form-control" 
                        value="${botToken}" 
                        placeholder="Dán Bot Token từ @BotFather"
                        style="font-family:monospace;font-size:13px;padding:10px 14px;border-radius:10px;">
                    <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
                        Lấy từ <strong>@BotFather</strong> trên Telegram → <code>/newbot</code> → copy token
                    </div>
                </div>

                <!-- Chat ID -->
                <div style="margin-bottom:20px;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;">
                        💬 Chat ID (Nhóm/Cá nhân)
                    </label>
                    <input type="text" id="prSettingChatId" class="form-control" 
                        value="${chatId}" 
                        placeholder="VD: -1001234567890 hoặc 123456789"
                        style="font-family:monospace;font-size:13px;padding:10px 14px;border-radius:10px;">
                    <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
                        ID nhóm Telegram (bắt đầu bằng <code>-100...</code>) hoặc ID cá nhân
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn btn-success" onclick="savePartnerRegTelegram()" 
                        style="padding:10px 24px;font-size:13px;font-weight:700;border-radius:10px;">
                        💾 Lưu Cấu Hình
                    </button>
                    <button class="btn" onclick="testPartnerRegTelegram()" 
                        style="padding:10px 24px;font-size:13px;font-weight:700;border-radius:10px;
                        background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;border:none;cursor:pointer;">
                        🧪 Gửi Tin Nhắn Test
                    </button>
                </div>
            </div>

            <!-- Hướng dẫn -->
            <div style="margin-top:20px;padding:16px;background:#fffbeb;border:1.5px solid #fbbf24;border-radius:14px;font-size:12px;color:#92400e;">
                <strong>📌 Hướng dẫn tạo Bot Telegram:</strong>
                <ol style="margin:8px 0 0;padding-left:20px;line-height:2;">
                    <li>Mở Telegram, tìm <strong>@BotFather</strong></li>
                    <li>Gửi <code>/newbot</code> → đặt tên bot → nhận <strong>Bot Token</strong></li>
                    <li>Thêm bot vào <strong>nhóm Telegram</strong> của bạn</li>
                    <li>Lấy <strong>Chat ID</strong> bằng cách gửi tin nhắn trong nhóm, rồi mở:<br>
                        <code style="background:#fef3c7;padding:2px 6px;border-radius:4px;">https://api.telegram.org/bot{TOKEN}/getUpdates</code>
                    </li>
                    <li>Dán Bot Token + Chat ID vào ô trên → <strong>Lưu</strong> → <strong>Test</strong></li>
                </ol>
            </div>

            <!-- STT Counter -->
            <div style="margin-top:16px;padding:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;font-size:12px;color:#0369a1;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <strong>📊 Số thứ tự hiện tại:</strong> <span style="font-family:monospace;font-weight:700;font-size:14px;">${counter}</span>
                    <span style="color:#6b7280;margin-left:8px;">(đơn tiếp theo sẽ là #${String(parseInt(counter)+1).padStart(3,'0')})</span>
                </div>
            </div>
        </div>
    `;
}

async function savePartnerRegTelegram() {
    const botToken = document.getElementById('prSettingBotToken')?.value?.trim();
    const chatId = document.getElementById('prSettingChatId')?.value?.trim();

    const res = await apiCall('/api/partner-registration/settings', 'PUT', {
        bot_token: botToken || '',
        chat_id: chatId || ''
    });

    if (res.success) {
        showToast('✅ ' + res.message);
        await loadPartnerRegTelegramSettings();
    } else {
        showToast(res.error || 'Lỗi lưu cấu hình', 'error');
    }
}

async function testPartnerRegTelegram() {
    const res = await apiCall('/api/partner-registration/test-telegram', 'POST');
    if (res.success) {
        showToast('✅ ' + res.message);
    } else {
        showToast('❌ ' + (res.error || 'Gửi test thất bại'), 'error');
    }
}

// ========== MASTER LOGIN KEY (MÃ KHÓA TỔNG) ==========
async function loadMasterKeySettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const res = await apiCall('/api/master-key/status');
    const hasKey = res.has_key || false;
    const updatedAt = res.updated_at ? new Date(res.updated_at).toLocaleString('vi-VN') : null;

    el.innerHTML = `
        <div style="max-width:600px;">
            <div style="margin-bottom:24px;">
                <h4 style="color:#122546;margin:0 0 8px;font-size:16px;font-weight:800;">🔐 Mã Khóa Tổng (Master Key)</h4>
                <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">
                    Mã khóa tổng cho phép <strong>Giám Đốc</strong> đăng nhập vào <strong>bất kỳ tài khoản Nhân Viên hoặc Affiliate</strong> 
                    mà không cần biết mật khẩu riêng của tài khoản đó.
                </p>
            </div>

            <!-- Status Badge -->
            <div style="margin-bottom:20px;padding:16px 20px;border-radius:14px;
                background:${hasKey ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)'};
                border:1.5px solid ${hasKey ? '#6ee7b7' : '#fcd34d'};
                display:flex;align-items:center;gap:12px;">
                <span style="font-size:28px;">${hasKey ? '✅' : '⚠️'}</span>
                <div style="flex:1;">
                    <div style="font-size:14px;font-weight:700;color:${hasKey ? '#065f46' : '#92400e'};">
                        ${hasKey ? 'Đã kích hoạt Mã Khóa Tổng' : 'Chưa đặt Mã Khóa Tổng'}
                    </div>
                    <div style="font-size:11px;color:${hasKey ? '#047857' : '#b45309'};margin-top:3px;">
                        ${hasKey 
                            ? 'Cập nhật lần cuối: <strong>' + updatedAt + '</strong>' 
                            : 'Đặt mã khóa để có thể đăng nhập vào mọi tài khoản trong hệ thống'}
                    </div>
                </div>
                ${hasKey ? `<button onclick="deleteMasterKey()" 
                    style="background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5;
                    padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700;
                    cursor:pointer;white-space:nowrap;transition:all .2s;"
                    onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                    🗑️ Xóa Mã Khóa
                </button>` : ''}
            </div>

            <!-- Form -->
            <div style="padding:24px;background:linear-gradient(165deg,#f8fafc,#ffffff);border:1.5px solid #e2e8f0;border-radius:16px;">
                <h5 style="color:#122546;margin:0 0 16px;font-size:14px;font-weight:700;">
                    ${hasKey ? '🔄 Cập Nhật Mã Khóa Mới' : '🆕 Đặt Mã Khóa Tổng'}
                </h5>
                
                <!-- Mã khóa -->
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">
                        🔑 Mã khóa
                    </label>
                    <div style="position:relative;">
                        <input type="password" id="mkNewKey" class="form-control" 
                            placeholder="Nhập mã khóa tổng..."
                            style="padding:10px 44px 10px 14px;border-radius:10px;font-size:14px;">
                        <button type="button" onclick="_toggleMkVisibility('mkNewKey', this)"
                            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
                            background:none;border:none;cursor:pointer;font-size:16px;padding:4px;opacity:0.6;">
                            👁️
                        </button>
                    </div>
                </div>

                <!-- Xác nhận mã khóa -->
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">
                        🔑 Xác nhận mã khóa
                    </label>
                    <div style="position:relative;">
                        <input type="password" id="mkConfirmKey" class="form-control" 
                            placeholder="Nhập lại mã khóa..."
                            style="padding:10px 44px 10px 14px;border-radius:10px;font-size:14px;"
                            onkeypress="if(event.key==='Enter') saveMasterKey()">
                        <button type="button" onclick="_toggleMkVisibility('mkConfirmKey', this)"
                            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
                            background:none;border:none;cursor:pointer;font-size:16px;padding:4px;opacity:0.6;">
                            👁️
                        </button>
                    </div>
                </div>

                <button class="btn btn-success" onclick="saveMasterKey()" 
                    style="padding:10px 28px;font-size:13px;font-weight:700;border-radius:10px;">
                    💾 ${hasKey ? 'Cập Nhật Mã Khóa' : 'Lưu Mã Khóa Tổng'}
                </button>
            </div>

            <!-- Hướng dẫn -->
            <div style="margin-top:20px;padding:16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:14px;font-size:12px;color:#0369a1;">
                <strong>📌 Cách sử dụng:</strong>
                <ol style="margin:8px 0 0;padding-left:20px;line-height:2;">
                    <li>Đặt mã khóa tổng tại đây (chỉ Giám Đốc mới có quyền)</li>
                    <li>Khi muốn truy cập tài khoản bất kỳ, nhập <strong>username</strong> của tài khoản đó</li>
                    <li>Nhập <strong>mã khóa tổng</strong> thay vì mật khẩu riêng</li>
                    <li>Hệ thống sẽ cho đăng nhập vào tài khoản đó ngay lập tức</li>
                </ol>
            </div>

            <!-- Lưu ý bảo mật -->
            <div style="margin-top:16px;padding:14px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;font-size:12px;color:#991b1b;">
                <strong>⚠️ Lưu ý bảo mật:</strong>
                <ul style="margin:6px 0 0;padding-left:20px;line-height:1.8;">
                    <li>Mã khóa được <strong>mã hóa bcrypt</strong> trước khi lưu — không ai đọc được</li>
                    <li>Mã khóa <strong>KHÔNG</strong> dùng được để đăng nhập tài khoản Giám Đốc</li>
                    <li>Chỉ Giám Đốc mới được đặt/thay đổi/xóa mã khóa</li>
                    <li>Hãy sử dụng mã khóa <strong>mạnh</strong> và <strong>không chia sẻ</strong> cho ai</li>
                </ul>
            </div>
        </div>
    `;
}

function _toggleMkVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

async function saveMasterKey() {
    const key = document.getElementById('mkNewKey')?.value;
    const confirm = document.getElementById('mkConfirmKey')?.value;

    if (!key || key.length < 4) {
        showToast('Mã khóa phải ít nhất 4 ký tự', 'error');
        return;
    }
    if (key !== confirm) {
        showToast('Mã khóa xác nhận không khớp', 'error');
        return;
    }

    const res = await apiCall('/api/master-key', 'PUT', { master_key: key });
    if (res.success) {
        showToast('✅ ' + res.message);
        await loadMasterKeySettings();
    } else {
        showToast(res.error || 'Lỗi lưu mã khóa', 'error');
    }
}

async function deleteMasterKey() {
    if (!window.confirm('⚠️ Xóa mã khóa tổng?\n\nSau khi xóa, bạn sẽ KHÔNG thể dùng mã khóa tổng để đăng nhập các tài khoản khác nữa.\n\nBạn có chắc chắn?')) return;

    const res = await apiCall('/api/master-key', 'DELETE');
    if (res.success) {
        showToast('✅ ' + res.message);
        await loadMasterKeySettings();
    } else {
        showToast(res.error || 'Lỗi xóa mã khóa', 'error');
    }
}

// ========== TELEGRAM NOTIFY SETTINGS (🔔) ==========

let _tgCachedConfig = null; // cache config data for reuse

async function loadTelegramNotifySettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const [configRes, staffRes, rmWeekday, rmSaturday, rmSunday, rmCapCuu, rmHuyKhach, rmHuyDon, rmChuyenSo] = await Promise.all([
        apiCall('/api/telegram/config'),
        apiCall('/api/telegram/staff'),
        apiCall('/api/app-config/reminder_hours_weekday'),
        apiCall('/api/app-config/reminder_hours_saturday'),
        apiCall('/api/app-config/reminder_hours_sunday'),
        apiCall('/api/app-config/reminder_minutes_cap_cuu_sep'),
        apiCall('/api/app-config/reminder_minutes_huy_khach'),
        apiCall('/api/app-config/reminder_minutes_huy_don'),
        apiCall('/api/app-config/reminder_minutes_chuyen_so')
    ]);
    const _rmMinutes = {
        cap_cuu_sep: rmCapCuu.value || '10',
        huy_khach: rmHuyKhach.value || '15',
        huy_don_tra_coc: rmHuyDon.value || '15',
        chuyen_so: rmChuyenSo.value || '5'
    };

    _tgCachedConfig = configRes;
    const botToken = configRes.bot_token || '';
    const globalConfigs = configRes.global_configs || {};
    const events = configRes.events || [];
    const globalEvents = events.filter(e => e.scope === 'global');
    const perStaffEvents = events.filter(e => e.scope === 'per_staff');
    const staff = staffRes.staff || [];
    const totalPerStaff = staffRes.total_per_staff_events || 0;
    const isConfigured = !!botToken;

    // ===== Build HTML =====
    el.innerHTML = `
        <div style="max-width:900px;">
            <!-- KHU A: Bot Token -->
            <div style="margin-bottom:24px;padding:20px;background:linear-gradient(165deg,#f8fafc,#ffffff);border:1.5px solid #e2e8f0;border-radius:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:24px;">🤖</span>
                    <div>
                        <h4 style="color:#122546;margin:0;font-size:15px;font-weight:800;">Bot Token Telegram</h4>
                        <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Token duy nhất dùng cho tất cả thông báo.</p>
                    </div>
                </div>
                <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
                    <div style="flex:1;min-width:250px;">
                        <input type="text" id="tgBotToken" class="form-control"
                            value="${botToken}"
                            placeholder="Dán Bot Token từ @BotFather"
                            style="font-family:monospace;font-size:13px;padding:10px 14px;border-radius:10px;">
                    </div>
                    <button class="btn btn-success" onclick="saveTelegramConfig()" style="padding:10px 20px;font-size:12px;font-weight:700;border-radius:10px;">
                        💾 Lưu
                    </button>
                </div>
                <!-- Status -->
                <div style="margin-top:12px;padding:10px 14px;border-radius:10px;
                    background:${isConfigured ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)'};
                    border:1px solid ${isConfigured ? '#6ee7b7' : '#fca5a5'};
                    font-size:12px;color:${isConfigured ? '#065f46' : '#991b1b'};display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">${isConfigured ? '✅' : '⚠️'}</span>
                    ${isConfigured ? 'Bot đã được cấu hình' : 'Chưa có Bot Token — thông báo sẽ không gửi được'}
                </div>
            </div>

            <!-- KHU B: Nhóm Chung -->
            <div style="margin-bottom:24px;padding:20px;background:linear-gradient(165deg,#eff6ff,#f0f9ff);border:1.5px solid #93c5fd;border-radius:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:24px;">🌐</span>
                    <div>
                        <h4 style="color:#1e40af;margin:0;font-size:15px;font-weight:800;">Nhóm Chung — Áp dụng TẤT CẢ nhân viên</h4>
                        <p style="margin:2px 0 0;font-size:11px;color:#3b82f6;">Mỗi sự kiện có thể gửi vào nhóm khác nhau, hoặc cùng 1 nhóm.</p>
                    </div>
                </div>
                <div style="border:1.5px solid #bfdbfe;border-radius:12px;overflow:hidden;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;">
                                <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;">Sự kiện</th>
                                <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;">Group ID</th>
                                <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;width:100px;">⏱ Nhắc (phút)</th>
                                <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;width:80px;">Test</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${globalEvents.map((evt, i) => `
                            <tr style="border-bottom:1px solid #e5e7eb;background:${i % 2 === 0 ? 'white' : '#f8fafc'};">
                                <td style="padding:10px 14px;font-weight:600;color:#122546;font-size:13px;">
                                    ${evt.icon} ${evt.label}
                                </td>
                                <td style="padding:8px 14px;">
                                    <input type="text" id="tgGlobal_${evt.key}" class="form-control"
                                        value="${globalConfigs[evt.key] || ''}"
                                        placeholder="-100..."
                                        style="font-family:monospace;font-size:12px;padding:7px 10px;border-radius:8px;">
                                </td>
                                <td style="padding:8px 14px;text-align:center;">
                                    <input type="number" id="rmMinutes_${evt.key}" class="form-control"
                                        value="${_rmMinutes[evt.key] || '10'}"
                                        min="1" max="60"
                                        style="width:70px;margin:0 auto;font-size:13px;font-weight:700;text-align:center;padding:6px;border-radius:8px;border:1.5px solid #34d399;">
                                </td>
                                <td style="padding:8px 14px;text-align:center;">
                                    <button class="btn btn-xs" onclick="testTelegramGroup('tgGlobal_${evt.key}')"
                                        style="background:#eff6ff;color:#2563eb;border:1px solid #93c5fd;padding:5px 10px;font-size:11px;cursor:pointer;border-radius:8px;">
                                        🧪
                                    </button>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="btn btn-success" onclick="saveTelegramConfig()" style="padding:8px 20px;font-size:12px;font-weight:700;border-radius:10px;">
                        💾 Lưu Tất Cả
                    </button>
                </div>
            </div>

            <!-- KHU C: Nhóm Riêng Từng NV -->
            <div style="padding:20px;background:linear-gradient(165deg,#fefce8,#fffbeb);border:1.5px solid #fbbf24;border-radius:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:24px;">👤</span>
                        <div>
                            <h4 style="color:#92400e;margin:0;font-size:15px;font-weight:800;">Nhóm Riêng — Cài đặt từng nhân viên</h4>
                            <p style="margin:2px 0 0;font-size:11px;color:#b45309;">Bấm ⚙️ để cài Group ID riêng cho từng loại công việc.</p>
                        </div>
                    </div>
                    ${perStaffEvents.length > 0 ? `
                    <button class="btn" onclick="tgBulkAssignModal()"
                        style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;padding:8px 16px;font-size:12px;font-weight:700;border-radius:10px;cursor:pointer;">
                        📋 Gán Nhanh Tất Cả NV
                    </button>` : ''}
                </div>

                <div style="border:1.5px solid #fcd34d;border-radius:12px;overflow:hidden;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:linear-gradient(135deg,#b45309,#d97706);color:white;">
                                <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;">Nhân Viên</th>
                                <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;">Phòng</th>
                                <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;">Đã cài</th>
                                <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;width:90px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${staff.length === 0 ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">Không có nhân viên nào</td></tr>' : ''}
                            ${staff.map((s, i) => {
                                const cfgCount = Number(s.configured_count) || 0;
                                const hasCfg = cfgCount > 0;
                                return `
                                <tr style="border-bottom:1px solid #fef3c7;background:${i % 2 === 0 ? 'white' : '#fffbeb'};">
                                    <td style="padding:10px 14px;">
                                        <div style="font-weight:700;color:#122546;font-size:13px;">${s.full_name}</div>
                                        <div style="font-size:10px;color:#9ca3af;">${s.username}</div>
                                    </td>
                                    <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${s.department_name || '—'}</td>
                                    <td style="padding:10px 14px;text-align:center;">
                                        <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
                                            background:${hasCfg ? '#d1fae5' : '#f3f4f6'};color:${hasCfg ? '#065f46' : '#9ca3af'};">
                                            ${cfgCount}/${totalPerStaff}
                                        </span>
                                    </td>
                                    <td style="padding:10px 14px;text-align:center;">
                                        <button class="btn btn-xs" onclick="tgOpenStaffModal(${s.id})"
                                            style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:8px;">
                                            ⚙️ Cài Đặt
                                        </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- KHU D: Nhắc Xử Lý Số — Khung Giờ -->
            <div style="padding:20px;background:linear-gradient(165deg,#f0fdf4,#ecfdf5);border:1.5px solid #34d399;border-radius:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:24px;">⏰</span>
                    <div>
                        <h4 style="color:#065f46;margin:0;font-size:15px;font-weight:800;">Nhắc Xử Lý Số — Khung Giờ Hoạt Động</h4>
                        <p style="margin:2px 0 0;font-size:11px;color:#047857;">Thêm nhiều khung giờ để chỉ nhắc trong giờ làm, bỏ qua giờ nghỉ trưa/nghỉ giữa buổi.</p>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;" id="rmSlotsGrid">
                    ${_rmBuildDayCard('weekday', '📅 Thứ 2 → Thứ 6', rmWeekday.value, '08:00-18:15')}
                    ${_rmBuildDayCard('saturday', '📅 Thứ 7', rmSaturday.value, '08:00-17:15')}
                    ${_rmBuildDayCard('sunday', '📅 Chủ Nhật', rmSunday.value, 'off', true)}
                </div>

                <!-- Nhắc Chuyển Số + Gửi Lại Số -->
                <div style="margin-top:16px;background:white;border:1.5px solid #a7f3d0;border-radius:12px;padding:14px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <div style="font-size:13px;font-weight:700;color:#065f46;">📱🔄 Nhắc Xử Lý Số (Chuyển + Gửi Lại)</div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:12px;color:#065f46;font-weight:600;">Sau</span>
                            <input type="number" id="rmMinutes_chuyen_so" class="form-control"
                                value="${_rmMinutes.chuyen_so || '5'}"
                                min="1" max="60"
                                style="width:70px;font-size:14px;font-weight:700;text-align:center;padding:6px;border-radius:8px;border:1.5px solid #34d399;">
                            <span style="font-size:12px;color:#065f46;font-weight:600;">phút</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="btn btn-success" onclick="saveReminderHours()" style="padding:8px 20px;font-size:12px;font-weight:700;border-radius:10px;">
                        💾 Lưu Khung Giờ & Phút Nhắc
                    </button>
                </div>
            </div>

            <!-- Hướng dẫn -->
            <div style="margin-top:20px;padding:16px;background:#fffbeb;border:1.5px solid #fbbf24;border-radius:14px;font-size:12px;color:#92400e;">
                <strong>📌 Hướng dẫn:</strong>
                <ol style="margin:8px 0 0;padding-left:20px;line-height:2;">
                    <li>Mở Telegram → tìm <strong>@BotFather</strong> → gửi <code>/newbot</code> → nhận <strong>Bot Token</strong></li>
                    <li>Thêm bot vào <strong>nhóm Telegram</strong></li>
                    <li>Lấy <strong>Chat ID</strong>: gửi tin nhắn trong nhóm, mở <code>https://api.telegram.org/bot{TOKEN}/getUpdates</code></li>
                    <li>Dán Token + Chat ID vào ô trên → <strong>Lưu</strong> → <strong>Test</strong></li>
                </ol>
            </div>
        </div>
    `;
}

async function saveTelegramConfig() {
    const botToken = document.getElementById('tgBotToken')?.value?.trim() || '';

    // Collect global configs
    const globalConfigs = {};
    const events = _tgCachedConfig?.events || [];
    const globalEvents = events.filter(e => e.scope === 'global');
    for (const evt of globalEvents) {
        const input = document.getElementById(`tgGlobal_${evt.key}`);
        if (input) globalConfigs[evt.key] = input.value.trim();
    }

    // Save reminder minutes from global events table
    const minuteKeys = ['cap_cuu_sep', 'huy_khach', 'huy_don_tra_coc'];
    const _rmKeyMap = { huy_don_tra_coc: 'huy_don' }; // input key → DB key
    const minutePromises = minuteKeys.map(key => {
        const el = document.getElementById(`rmMinutes_${key}`);
        const dbKey = _rmKeyMap[key] || key;
        const val = el ? String(Math.max(1, Math.min(60, Number(el.value) || 10))) : null;
        return val ? apiCall(`/api/app-config/reminder_minutes_${dbKey}`, 'PUT', { value: val }) : Promise.resolve();
    });

    const [res] = await Promise.all([
        apiCall('/api/telegram/config', 'PUT', {
            bot_token: botToken,
            global_configs: globalConfigs
        }),
        ...minutePromises
    ]);

    if (res.success) {
        showToast('✅ Đã lưu cấu hình & phút nhắc nhở');
        await loadTelegramNotifySettings();
    } else {
        showToast(res.error || 'Lỗi lưu cấu hình', 'error');
    }
}

// ========== MULTI-SLOT SCHEDULE HELPERS ==========

/** Parse config value → array of {start, end} strings. Handles old "HH:MM-HH:MM" and new JSON array */
function _rmParseSlots(value, defaultVal) {
    const raw = value || defaultVal;
    if (!raw || raw === 'off') return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
    // Old format: "HH:MM-HH:MM"
    const parts = raw.split('-');
    if (parts.length === 2) return [{ start: parts[0], end: parts[1] }];
    return [];
}

/** Build a day card with multiple time slots */
function _rmBuildDayCard(dayKey, label, value, defaultVal, hasSundayToggle) {
    const isOff = hasSundayToggle && (!value || value === 'off');
    const slots = _rmParseSlots(value, defaultVal);

    let slotsHtml = '';
    if (hasSundayToggle) {
        slotsHtml += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:700;color:#065f46;">${label}</div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;font-weight:700;color:${isOff ? '#dc2626' : '#059669'};">
                <input type="checkbox" class="rmDayToggle" data-day="${dayKey}" ${!isOff ? 'checked' : ''}
                    onchange="_rmToggleSunday(this)"
                    style="width:16px;height:16px;">
                <span>${isOff ? 'TẮT' : 'BẬT'}</span>
            </label>
        </div>`;
    } else {
        slotsHtml += `<div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:8px;">${label}</div>`;
    }

    slotsHtml += `<div class="rmSlotsContainer" data-day="${dayKey}" style="${isOff ? 'display:none;' : ''}">`;

    const slotsToRender = slots.length > 0 ? slots : [{ start: '08:00', end: '18:00' }];
    slotsToRender.forEach((slot, i) => {
        slotsHtml += _rmSlotRow(dayKey, slot.start, slot.end, slotsToRender.length > 1);
    });

    slotsHtml += `</div>`;
    slotsHtml += `<div class="rmAddBtnWrap" data-day="${dayKey}" style="${isOff ? 'display:none;' : ''}margin-top:8px;text-align:center;">
        <button type="button" onclick="_rmAddSlot('${dayKey}')"
            style="background:none;border:1.5px dashed #34d399;color:#059669;font-size:11px;font-weight:700;padding:5px 14px;border-radius:8px;cursor:pointer;transition:all .2s;"
            onmouseover="this.style.background='#ecfdf5'" onmouseout="this.style.background='none'">
            ➕ Thêm khung giờ
        </button>
    </div>`;

    if (isOff) {
        slotsHtml += `<div class="rmOffLabel" data-day="${dayKey}" style="text-align:center;padding:6px;color:#dc2626;font-weight:700;font-size:12px;">🔴 Không nhắc Chủ Nhật</div>`;
    }

    return `<div style="background:white;border:1.5px solid #a7f3d0;border-radius:12px;padding:14px;">${slotsHtml}</div>`;
}

/** Build a single slot row HTML */
function _rmSlotRow(dayKey, startVal, endVal, canRemove) {
    return `<div class="rmSlotRow" style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
        <input type="time" value="${startVal}" class="form-control rmSlotStart"
            style="font-size:13px;font-weight:700;text-align:center;padding:5px;border-radius:8px;border:1.5px solid #34d399;flex:1;min-width:0;">
        <span style="font-weight:700;color:#065f46;font-size:12px;">→</span>
        <input type="time" value="${endVal}" class="form-control rmSlotEnd"
            style="font-size:13px;font-weight:700;text-align:center;padding:5px;border-radius:8px;border:1.5px solid #34d399;flex:1;min-width:0;">
        <button type="button" onclick="_rmRemoveSlot(this)" title="Xóa khung giờ"
            style="background:none;border:none;color:#dc2626;font-size:14px;cursor:pointer;padding:2px 4px;flex-shrink:0;opacity:${canRemove ? '1' : '0.3'};pointer-events:${canRemove ? 'auto' : 'none'};"
            >✕</button>
    </div>`;
}

/** Add a new slot to a day */
function _rmAddSlot(dayKey) {
    const container = document.querySelector(`.rmSlotsContainer[data-day="${dayKey}"]`);
    if (!container) return;
    const rows = container.querySelectorAll('.rmSlotRow');
    // Default: 13:00-17:00 for new afternoon slot
    const div = document.createElement('div');
    div.innerHTML = _rmSlotRow(dayKey, '13:00', '17:00', true);
    container.appendChild(div.firstElementChild);
    // Enable all remove buttons now that there are multiple
    _rmUpdateRemoveButtons(container);
}

/** Remove a slot row */
function _rmRemoveSlot(btn) {
    const row = btn.closest('.rmSlotRow');
    const container = row.closest('.rmSlotsContainer');
    if (container.querySelectorAll('.rmSlotRow').length <= 1) return; // keep at least 1
    row.remove();
    _rmUpdateRemoveButtons(container);
}

/** Update remove button visibility based on slot count */
function _rmUpdateRemoveButtons(container) {
    const rows = container.querySelectorAll('.rmSlotRow');
    const canRemove = rows.length > 1;
    rows.forEach(row => {
        const btn = row.querySelector('button');
        if (btn) {
            btn.style.opacity = canRemove ? '1' : '0.3';
            btn.style.pointerEvents = canRemove ? 'auto' : 'none';
        }
    });
}

/** Toggle Sunday on/off */
function _rmToggleSunday(checkbox) {
    const dayKey = checkbox.dataset.day;
    const isOn = checkbox.checked;
    const container = document.querySelector(`.rmSlotsContainer[data-day="${dayKey}"]`);
    const addBtn = document.querySelector(`.rmAddBtnWrap[data-day="${dayKey}"]`);
    const offLabel = document.querySelector(`.rmOffLabel[data-day="${dayKey}"]`);
    if (container) container.style.display = isOn ? '' : 'none';
    if (addBtn) addBtn.style.display = isOn ? '' : 'none';
    if (offLabel) offLabel.style.display = isOn ? 'none' : '';
    const label = checkbox.parentElement;
    label.style.color = isOn ? '#059669' : '#dc2626';
    label.querySelector('span').textContent = isOn ? 'BẬT' : 'TẮT';
}

/** Collect slots from a day container → JSON array string */
function _rmCollectSlots(dayKey) {
    const container = document.querySelector(`.rmSlotsContainer[data-day="${dayKey}"]`);
    if (!container) return '[]';
    const rows = container.querySelectorAll('.rmSlotRow');
    const slots = [];
    rows.forEach(row => {
        const start = row.querySelector('.rmSlotStart')?.value;
        const end = row.querySelector('.rmSlotEnd')?.value;
        if (start && end) slots.push({ start, end });
    });
    return JSON.stringify(slots);
}

async function saveReminderHours() {
    // Collect multi-slot data as JSON arrays
    const weekdaySlots = _rmCollectSlots('weekday');
    const saturdaySlots = _rmCollectSlots('saturday');

    // Sunday: check toggle
    const sundayToggle = document.querySelector('.rmDayToggle[data-day="sunday"]');
    const sundayVal = sundayToggle?.checked ? _rmCollectSlots('sunday') : 'off';

    // Collect reminder minutes
    const minuteKeys = ['cap_cuu_sep', 'huy_khach', 'huy_don_tra_coc', 'chuyen_so'];
    const _rmKeyMap2 = { huy_don_tra_coc: 'huy_don' }; // input key → DB key
    const minutePromises = minuteKeys.map(key => {
        const el = document.getElementById(`rmMinutes_${key}`);
        const dbKey = _rmKeyMap2[key] || key;
        const val = el ? String(Math.max(1, Math.min(60, Number(el.value) || 5))) : null;
        return val ? apiCall(`/api/app-config/reminder_minutes_${dbKey}`, 'PUT', { value: val }) : Promise.resolve();
    });

    try {
        await Promise.all([
            apiCall('/api/app-config/reminder_hours_weekday', 'PUT', { value: weekdaySlots }),
            apiCall('/api/app-config/reminder_hours_saturday', 'PUT', { value: saturdaySlots }),
            apiCall('/api/app-config/reminder_hours_sunday', 'PUT', { value: sundayVal }),
            ...minutePromises
        ]);
        showToast('✅ Đã lưu khung giờ & phút nhắc nhở');
    } catch (err) {
        showToast('Lỗi lưu cấu hình', 'error');
    }
}

async function testTelegramGroup(inputId) {
    const chatId = document.getElementById(inputId)?.value?.trim();
    if (!chatId) { showToast('Vui lòng nhập Group ID trước', 'error'); return; }

    const botToken = document.getElementById('tgBotToken')?.value?.trim();
    const res = await apiCall('/api/telegram/test', 'POST', {
        chat_id: chatId,
        bot_token: botToken || undefined
    });

    if (res.success) showToast('✅ ' + res.message);
    else showToast('❌ ' + (res.error || 'Gửi test thất bại'), 'error');
}

async function tgOpenStaffModal(userId) {
    const res = await apiCall(`/api/telegram/staff/${userId}`);
    if (!res.user) { showToast('Không tìm thấy nhân viên', 'error'); return; }

    const user = res.user;
    const events = res.events || [];
    const configs = res.configs || {};

    let bodyHTML = `
        <div style="margin-bottom:16px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e40af;">
            ℹ️ Chỉ hiện sự kiện <strong>Nhóm Riêng</strong>. Sự kiện <strong>Nhóm Chung</strong> (Cấp Cứu, Hủy Khách...) đã cài ở phần trên.
        </div>
        <!-- Gán nhanh tất cả cùng 1 group -->
        <div style="margin-bottom:16px;padding:12px;background:#fefce8;border:1px solid #fcd34d;border-radius:10px;">
            <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;">📋 Gán tất cả cùng 1 nhóm:</div>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="tgStaffQuickGroup" class="form-control"
                    placeholder="-100..." style="flex:1;font-family:monospace;font-size:12px;padding:7px 10px;border-radius:8px;">
                <button class="btn btn-xs" onclick="tgApplyQuickGroup()"
                    style="background:#d97706;color:white;border:none;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;border-radius:8px;white-space:nowrap;">
                    ✅ Áp dụng
                </button>
            </div>
        </div>
    `;

    for (const evt of events) {
        const cfg = configs[evt.key] || { chat_id: '', enabled: true };
        bodyHTML += `
        <div style="padding:12px;margin-bottom:10px;background:white;border:1.5px solid #e5e7eb;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;color:#122546;font-size:13px;">${evt.icon} ${evt.label}</span>
                <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;font-weight:600;color:#6b7280;">
                    <input type="checkbox" id="tgStaffEn_${evt.key}" ${cfg.enabled ? 'checked' : ''}> Bật
                </label>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="tgStaffCid_${evt.key}" class="form-control tg-staff-cid"
                    value="${cfg.chat_id}" placeholder="-100..."
                    style="flex:1;font-family:monospace;font-size:12px;padding:7px 10px;border-radius:8px;">
                <button class="btn btn-xs" onclick="testTelegramGroup('tgStaffCid_${evt.key}')"
                    style="background:#eff6ff;color:#2563eb;border:1px solid #93c5fd;padding:5px 10px;font-size:11px;cursor:pointer;border-radius:8px;">
                    🧪
                </button>
            </div>
        </div>`;
    }

    openModal(`⚙️ Telegram — ${user.full_name}`, bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-success" onclick="tgSaveStaffConfig(${userId})">💾 Lưu</button>
    `);
}

function tgApplyQuickGroup() {
    const groupId = document.getElementById('tgStaffQuickGroup')?.value?.trim();
    if (!groupId) { showToast('Nhập Group ID', 'error'); return; }
    document.querySelectorAll('.tg-staff-cid').forEach(input => {
        input.value = groupId;
    });
    showToast('✅ Đã gán Group ID cho tất cả sự kiện');
}

async function tgSaveStaffConfig(userId) {
    const events = (_tgCachedConfig?.events || []).filter(e => e.scope === 'per_staff');
    const configs = {};

    for (const evt of events) {
        const chatId = document.getElementById(`tgStaffCid_${evt.key}`)?.value?.trim() || '';
        const enabled = document.getElementById(`tgStaffEn_${evt.key}`)?.checked !== false;
        configs[evt.key] = { chat_id: chatId, enabled };
    }

    const res = await apiCall(`/api/telegram/staff/${userId}`, 'PUT', { configs });
    if (res.success) {
        showToast('✅ ' + res.message);
        closeModal();
        await loadTelegramNotifySettings();
    } else {
        showToast(res.error || 'Lỗi lưu', 'error');
    }
}

function tgBulkAssignModal() {
    const events = (_tgCachedConfig?.events || []).filter(e => e.scope === 'per_staff');
    if (events.length === 0) { showToast('Chưa có sự kiện Per-Staff nào', 'error'); return; }

    const evtOptions = events.map(e => `<option value="${e.key}">${e.icon} ${e.label}</option>`).join('');

    openModal('📋 Gán Nhanh Tất Cả NV', `
        <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:#6b7280;margin:0 0 16px;">
                Gán cùng 1 Group ID cho <strong>tất cả nhân viên nội bộ</strong> đang hoạt động.
            </p>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-weight:700;font-size:12px;color:#122546;">Loại sự kiện:</label>
                <select id="tgBulkEvt" class="form-control">${evtOptions}</select>
            </div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#122546;">Group ID:</label>
                <input type="text" id="tgBulkCid" class="form-control"
                    placeholder="-100..." style="font-family:monospace;">
            </div>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="tgBulkAssignSave()">📋 Gán Tất Cả</button>
    `);
}

async function tgBulkAssignSave() {
    const eventType = document.getElementById('tgBulkEvt')?.value;
    const chatId = document.getElementById('tgBulkCid')?.value?.trim();
    if (!chatId) { showToast('Nhập Group ID', 'error'); return; }
    if (!confirm(`Gán Group ID "${chatId}" cho TẤT CẢ nhân viên?\n\nSự kiện: ${eventType}`)) return;

    const res = await apiCall('/api/telegram/staff-bulk', 'PUT', {
        event_type: eventType,
        chat_id: chatId
    });

    if (res.success) {
        showToast('✅ ' + res.message);
        closeModal();
        await loadTelegramNotifySettings();
    } else {
        showToast(res.error || 'Lỗi gán', 'error');
    }
}

// ========== 🚀 CHẾ ĐỘ THỰC CHIẾN (PRODUCTION MODE) ==========
let _prodModeAllUsers = [];
const _vnStr = (d) => { const vn = new Date(d.toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'})); return vn.getFullYear()+'-'+String(vn.getMonth()+1).padStart(2,'0')+'-'+String(vn.getDate()).padStart(2,'0')+'T'+String(vn.getHours()).padStart(2,'0')+':'+String(vn.getMinutes()).padStart(2,'0'); };
async function loadProductionModeSettings() {
    const contentDiv = document.getElementById('settingsContent');
    contentDiv.innerHTML = '<div class="text-center text-muted" style="padding:30px;">Đang tải...</div>';

    try {
        const [data, usersRes] = await Promise.all([
            apiCall('/api/production-mode'),
            apiCall('/api/users')
        ]);
        const enabled = data.enabled;
        const cutoffDate = data.production_start_date ? new Date(data.production_start_date) : null;
        const testIds = data.test_account_ids || [];
        const testUsers = data.test_account_users || [];
        // Merge: active users from /api/users + test_hidden users from production-mode API
        const activeUsers = (usersRes.users || usersRes || []);
        const activeIds = new Set(activeUsers.map(u => u.id));
        // Add test_hidden users that aren't in the active list
        const mergedUsers = [...activeUsers];
        testUsers.forEach(tu => { if (!activeIds.has(tu.id)) mergedUsers.push(tu); });
        _prodModeAllUsers = mergedUsers;

        const fmtD = (d) => d ? d.toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

        const testTagsHTML = testIds.length > 0
            ? testIds.map(id => { const u=_prodModeAllUsers.find(u2=>u2.id===id); return u ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:3px 10px;font-size:12px;color:#991b1b;font-weight:600;">🧪 '+u.full_name+' <small style=opacity:0.6>('+u.username+')</small></span>' : ''; }).filter(Boolean).join(' ')
            : '<span style="color:#9ca3af;font-size:13px;">Chưa có</span>';

        let html = '<div style="max-width:720px;margin:0 auto;padding:24px 0;">';

        // Header
        html += '<div style="background:'+(enabled?'linear-gradient(135deg,#065f46,#059669)':'linear-gradient(135deg,#1e293b,#475569)')+';border-radius:16px;padding:24px 28px;margin-bottom:20px;color:#fff;position:relative;overflow:hidden;">';
        html += '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>';
        html += '<div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">';
        html += '<div style="font-size:44px;">'+(enabled?'🚀':'🧪')+'</div>';
        html += '<div><h2 style="margin:0;font-size:20px;font-weight:800;">'+(enabled?'THỰC CHIẾN — ĐANG BẬT':'CHẾ ĐỘ THỬ NGHIỆM')+'</h2>';
        html += '<p style="margin:3px 0 0;opacity:0.85;font-size:13px;">';
        if (enabled) {
            html += (cutoffDate ? 'Cutoff: <b>'+fmtD(cutoffDate)+'</b>. ' : '');
            html += (testIds.length > 0 ? '<b>'+testIds.length+'</b> TK test bị chặn.' : '');
        } else {
            html += 'Đang hiển thị <b>tất cả dữ liệu</b>.';
        }
        html += '</p></div></div></div>';

        // Status cards
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">';
        html += '<div style="background:'+(enabled?'#ecfdf5':'#fef3c7')+';border:1px solid '+(enabled?'#a7f3d0':'#fde68a')+';border-radius:10px;padding:12px;">';
        html += '<div style="font-size:10px;text-transform:uppercase;color:'+(enabled?'#047857':'#92400e')+';font-weight:700;">Trạng thái</div>';
        html += '<div style="font-size:15px;font-weight:800;margin-top:2px;color:'+(enabled?'#065f46':'#78350f')+';">'+(enabled?'✅ Bật':'⚠️ Tắt')+'</div></div>';
        html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;">';
        html += '<div style="font-size:10px;text-transform:uppercase;color:#0369a1;font-weight:700;">Cutoff</div>';
        html += '<div style="font-size:15px;font-weight:800;margin-top:2px;color:#0c4a6e;">'+(cutoffDate?fmtD(cutoffDate):'—')+'</div></div>';
        html += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;">';
        html += '<div style="font-size:10px;text-transform:uppercase;color:#991b1b;font-weight:700;">TK Test</div>';
        html += '<div style="font-size:15px;font-weight:800;margin-top:2px;color:#7f1d1d;">'+testIds.length+' TK</div></div></div>';

        // Test accounts box
        html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<h3 style="margin:0;font-size:14px;color:#1e293b;">🧪 Tài Khoản Test</h3>';
        html += '<button class="btn btn-xs btn-secondary" onclick="_openTestAccountPicker()" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:600;">✏️ Chỉnh Sửa</button>';
        html += '</div><div style="display:flex;flex-wrap:wrap;gap:5px;">'+testTagsHTML+'</div>';
        html += '<p style="margin:8px 0 0;font-size:11px;color:#64748b;">Dữ liệu KH do TK test tạo luôn bị ẩn <b>bất kể thời gian</b>.</p></div>';

        // Action card
        html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">';
        if (cutoffDate) {
            html += '<h3 style="margin:0 0 10px;font-size:14px;color:#1e293b;">⚙️ Quản Lý Cutoff</h3>';
            html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
            html += '<button class="btn btn-danger" onclick="_toggleProductionMode(false)" style="padding:8px 18px;border-radius:10px;font-weight:700;font-size:12px;">🔓 Tắt Thực Chiến</button>';
            html += '<button class="btn btn-secondary" onclick="_changeProductionDate()" style="padding:8px 18px;border-radius:10px;font-weight:600;font-size:12px;">📅 Đổi Cutoff</button>';
            html += '</div>';
        } else {
            html += '<h3 style="margin:0 0 10px;font-size:14px;color:#1e293b;">🚀 Bật Cutoff (Tùy Chọn)</h3>';
            html += '<p style="color:#64748b;font-size:11px;margin:0 0 10px;">Ẩn dữ liệu trước ngày chọn. Kết hợp với TK test để lọc kép.</p>';
            html += '<div style="display:flex;align-items:end;gap:10px;flex-wrap:wrap;">';
            html += '<div><label style="font-size:11px;font-weight:700;color:#334155;display:block;margin-bottom:3px;">📅 Ngày cutoff</label>';
            html += '<input type="datetime-local" id="prodCutoffInput" value="'+_vnStr(new Date())+'" style="padding:8px 10px;border:2px solid #cbd5e1;border-radius:8px;font-size:12px;width:220px;"></div>';
            html += '<button class="btn btn-primary" onclick="_toggleProductionMode(true)" style="padding:8px 20px;border-radius:10px;font-weight:700;font-size:12px;background:linear-gradient(135deg,#059669,#047857);border:none;color:#fff;">🚀 Bật</button>';
            html += '</div>';
        }
        html += '</div>';

        // Info
        html += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-top:14px;">';
        html += '<h4 style="margin:0 0 4px;font-size:12px;color:#1e40af;">ℹ️ Cách hoạt động</h4>';
        html += '<ul style="margin:0;padding-left:14px;font-size:11px;color:#1e40af;line-height:1.7;">';
        html += '<li><b>TK Test</b>: Dữ liệu do TK test tạo luôn bị ẩn (bất kể thời gian).</li>';
        html += '<li><b>Cutoff</b>: Dữ liệu trước ngày cutoff bị ẩn (mọi TK).</li>';
        html += '<li>Hai bộ lọc hoạt động <b>đồng thời</b>. Dữ liệu <b>KHÔNG bị xóa</b>.</li>';
        html += '</ul></div></div>';

        contentDiv.innerHTML = html;
    } catch (e) {
        contentDiv.innerHTML = '<div class="text-center text-danger" style="padding:30px;">❌ Lỗi: '+e.message+'</div>';
    }
}

let _testPresets = [];

function _openTestAccountPicker() {
    const users = _prodModeAllUsers;
    const roleLabels = {giam_doc:'GĐ',quan_ly_cap_cao:'QLCC',quan_ly:'QL',truong_phong:'TP',nhan_vien:'NV',tkaffiliate:'AFF'};

    let listHTML = users.map(u => {
        const rl = roleLabels[u.role] || u.role;
        return '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;">'
            + '<input type="checkbox" class="test-acct-cb" value="'+u.id+'" style="width:16px;height:16px;">'
            + '<span style="font-weight:600;font-size:13px;">'+u.full_name+'</span>'
            + '<span style="font-size:11px;color:#9ca3af;">('+u.username+')</span>'
            + '<span style="font-size:10px;background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;margin-left:auto;">'+rl+'</span>'
            + '</label>';
    }).join('');

    openModal('🧪 Chọn Tài Khoản Test', ''
        + '<div style="margin-bottom:10px;">'
        + '<input type="text" id="testAcctSearch" placeholder="🔍 Tìm tên..." oninput="_filterTestAcctList(this.value)" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">'
        + '</div>'
        // Quick actions row
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;">'
        + '<button onclick="_testAcctSelectAll(true)" style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;cursor:pointer;">☑ Chọn tất cả</button>'
        + '<button onclick="_testAcctSelectAll(false)" style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fef2f2;color:#991b1b;font-size:11px;font-weight:700;cursor:pointer;">☐ Bỏ chọn</button>'
        + '<span style="width:1px;height:18px;background:#e2e8f0;margin:0 2px;"></span>'
        + '<button onclick="_savePresetPrompt()" style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#eff6ff;color:#1e40af;font-size:11px;font-weight:700;cursor:pointer;">💾 Lưu Mẫu</button>'
        + '</div>'
        // Preset chips
        + '<div id="testPresetChips" style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;"></div>'
        // User list
        + '<div id="testAcctList" style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;">' + listHTML + '</div>'
        // Counter
        + '<div style="margin-top:8px;text-align:right;font-size:11px;color:#94a3b8;" id="testAcctCounter">0 đã chọn</div>'
        // Buttons
        + '<div style="margin-top:10px;display:flex;gap:10px;">'
        + '<button class="btn btn-primary" onclick="_saveTestAccounts()" style="flex:1;padding:10px;border-radius:10px;font-weight:700;font-size:14px;color:#fff;">💾 LƯU</button>'
        + '<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 20px;border-radius:10px;color:#fff;">Hủy</button>'
        + '</div>'
    );

    // Load current test IDs, check them, and render presets
    setTimeout(async () => {
        try {
            const d = await apiCall('/api/production-mode');
            const ids = d.test_account_ids || [];
            _testPresets = d.test_account_presets || [];
            document.querySelectorAll('.test-acct-cb').forEach(cb => {
                cb.checked = ids.includes(parseInt(cb.value));
                cb.addEventListener('change', _updateTestAcctCounter);
            });
            _updateTestAcctCounter();
            _renderPresetChips();
        } catch(e) {}
    }, 150);
}

function _testAcctSelectAll(select) {
    document.querySelectorAll('#testAcctList label').forEach(l => {
        if (l.style.display !== 'none') {
            const cb = l.querySelector('.test-acct-cb');
            if (cb) cb.checked = select;
        }
    });
    _updateTestAcctCounter();
}

function _updateTestAcctCounter() {
    const cnt = document.querySelectorAll('.test-acct-cb:checked').length;
    const el = document.getElementById('testAcctCounter');
    if (el) el.textContent = cnt + ' đã chọn';
}

function _renderPresetChips() {
    const container = document.getElementById('testPresetChips');
    if (!container) return;
    if (_testPresets.length === 0) {
        container.innerHTML = '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Chưa có mẫu nào</span>';
        return;
    }
    container.innerHTML = _testPresets.map(p =>
        '<div style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#dbeafe,#ede9fe);border:1px solid #93c5fd;border-radius:8px;padding:4px 10px;cursor:pointer;" title="Click để chọn ' + p.ids.length + ' TK">'
        + '<span onclick="_applyPreset(\'' + p.name.replace(/'/g, "\\'") + '\')" style="font-size:12px;font-weight:700;color:#1e40af;cursor:pointer;">🏷 ' + p.name + ' <small style="opacity:0.6;">(' + p.ids.length + ')</small></span>'
        + '<span onclick="event.stopPropagation();_deletePreset(\'' + p.name.replace(/'/g, "\\'") + '\')" style="cursor:pointer;font-size:14px;color:#ef4444;margin-left:4px;" title="Xóa mẫu">✕</span>'
        + '</div>'
    ).join('');
}

function _applyPreset(name) {
    const preset = _testPresets.find(p => p.name === name);
    if (!preset) return;
    // Uncheck all first, then check only preset IDs
    document.querySelectorAll('.test-acct-cb').forEach(cb => {
        cb.checked = preset.ids.includes(parseInt(cb.value));
    });
    _updateTestAcctCounter();
    showToast('🏷 Đã áp dụng mẫu "' + name + '" (' + preset.ids.length + ' TK)', 'success');
}

async function _savePresetPrompt() {
    const checkedIds = [];
    document.querySelectorAll('.test-acct-cb:checked').forEach(cb => checkedIds.push(parseInt(cb.value)));
    if (checkedIds.length === 0) { showToast('Chọn ít nhất 1 tài khoản trước!', 'error'); return; }
    const name = prompt('Đặt tên mẫu (VD: "TK Test Chính"):');
    if (!name || !name.trim()) return;
    const res = await apiCall('/api/production-mode', 'PUT', { save_preset: { name: name.trim(), ids: checkedIds } });
    if (res.success) {
        showToast('💾 Đã lưu mẫu "' + name.trim() + '" (' + checkedIds.length + ' TK)', 'success');
        // Reload presets
        const d = await apiCall('/api/production-mode');
        _testPresets = d.test_account_presets || [];
        _renderPresetChips();
    } else {
        showToast(res.error || 'Lỗi', 'error');
    }
}

async function _deletePreset(name) {
    if (!confirm('Xóa mẫu "' + name + '"?')) return;
    const res = await apiCall('/api/production-mode', 'PUT', { delete_preset: name });
    if (res.success) {
        showToast('🗑 Đã xóa mẫu "' + name + '"', 'success');
        const d = await apiCall('/api/production-mode');
        _testPresets = d.test_account_presets || [];
        _renderPresetChips();
    }
}

function _filterTestAcctList(q) {
    const s = q.toLowerCase();
    document.querySelectorAll('#testAcctList label').forEach(l => {
        l.style.display = l.textContent.toLowerCase().includes(s) ? '' : 'none';
    });
}

async function _saveTestAccounts() {
    const ids = [];
    document.querySelectorAll('.test-acct-cb:checked').forEach(cb => ids.push(parseInt(cb.value)));
    const res = await apiCall('/api/production-mode', 'PUT', { test_account_ids: ids });
    if (res.success) {
        showToast('✅ Đã lưu ' + ids.length + ' tài khoản test!', 'success');
        closeModal();
        loadProductionModeSettings();
    } else {
        showToast(res.error || 'Lỗi lưu', 'error');
    }
}

async function _toggleProductionMode(enable) {
    if (enable) {
        const input = document.getElementById('prodCutoffInput');
        if (!input || !input.value) { showToast('Vui lòng chọn ngày!', 'error'); return; }
        if (!confirm('🚀 Bật cutoff: ' + new Date(input.value).toLocaleString('vi-VN') + '?\n\nDữ liệu trước ngày này sẽ bị ẩn.')) return;
        const res = await apiCall('/api/production-mode', 'PUT', { production_start_date: input.value });
        if (res.success) { showToast('🚀 ' + res.message, 'success'); loadProductionModeSettings(); }
        else showToast(res.error || 'Lỗi', 'error');
    } else {
        if (!confirm('⚠️ Tắt Thực Chiến?\n\nCutoff + TK test sẽ bị xóa.\nMọi dữ liệu hiển thị lại.')) return;
        const res = await apiCall('/api/production-mode', 'DELETE');
        if (res.success) { showToast('⚠️ ' + res.message, 'success'); loadProductionModeSettings(); }
        else showToast(res.error || 'Lỗi', 'error');
    }
}

async function _changeProductionDate() {
    const curVN = _vnStr(new Date());
    const newDate = prompt('Nhập cutoff mới (YYYY-MM-DDTHH:MM):', curVN);
    if (!newDate) return;
    const d = new Date(newDate);
    if (isNaN(d.getTime())) { showToast('Ngày không hợp lệ!', 'error'); return; }
    if (!confirm('Đổi cutoff: ' + d.toLocaleString('vi-VN') + '?')) return;
    const res = await apiCall('/api/production-mode', 'PUT', { production_start_date: newDate });
    if (res.success) { showToast('✅ ' + res.message, 'success'); loadProductionModeSettings(); }
    else showToast(res.error || 'Lỗi', 'error');
}

// ========== NHÀ VẬN CHUYỂN (DHT Carriers) in Settings ==========
async function loadCarriersSettings() {
    const el = document.getElementById('settingsContent');
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const data = await apiCall('/api/dht/carriers');
    const carriers = data.carriers || [];

    let listHtml = '';
    if (carriers.length === 0) {
        listHtml = '<div class="text-muted" style="padding:20px;text-align:center;">Chưa có nhà vận chuyển nào. Thêm mới bên dưới.</div>';
    } else {
        listHtml = '<ul class="setting-list">' + carriers.map((c, idx) => `
            <li class="setting-item" style="padding:10px 14px;border-radius:10px;border:1px solid var(--gray-200);margin-bottom:8px;">
                <div class="item-info" style="flex:1;display:flex;align-items:center;gap:8px;">
                    <span style="color:#9ca3af;font-size:11px;font-weight:700;min-width:22px;">#${idx + 1}</span>
                    <span style="font-size:18px;">🚚</span>
                    <span class="fw-600" style="color:var(--navy);">${c.name}</span>
                </div>
                <div class="item-actions" style="display:flex;gap:4px;align-items:center;">
                    <button class="btn btn-xs btn-secondary" onclick="editCarrierItem(${c.id}, '${c.name.replace(/'/g, "\\\\'")}')" title="Sửa">✏️</button>
                    <button class="btn btn-xs btn-danger" onclick="deleteCarrierItem(${c.id}, '${c.name.replace(/'/g, "\\\\'")}')" title="Xóa">🗑️</button>
                </div>
            </li>
        `).join('') + '</ul>';
    }

    el.innerHTML = `
        <div style="max-width:600px;">
            <div style="margin-bottom:16px;">
                <h4 style="color:var(--navy);margin:0 0 8px;font-size:16px;font-weight:800;">🚚 Nhà Vận Chuyển</h4>
                <p style="font-size:12px;color:var(--gray-500);margin:0;">Quản lý danh sách nhà vận chuyển cho Đơn Hàng Tổng. Giám đốc mới có quyền thêm/xóa.</p>
            </div>
            <div style="border:1.5px solid var(--gray-200);border-radius:14px;padding:16px;">
                ${listHtml}
                <div style="border-top:1px solid var(--gray-200);padding-top:12px;margin-top:8px;">
                    <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">➕ Thêm Nhà Vận Chuyển Mới</div>
                    <div class="setting-add" style="margin:0;">
                        <input type="text" id="newCarrierName" placeholder="Tên NVC mới..." onkeypress="if(event.key==='Enter') addCarrierItem()">
                        <button class="btn btn-sm btn-success" onclick="addCarrierItem()">➕ Thêm</button>
                    </div>
                </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:12px;color:#0369a1;">
                <strong>📌 Lưu ý:</strong> Danh sách này được sử dụng trong form <strong>Tạo Đơn Hàng Tổng</strong> ở dropdown "Nhà Vận Chuyển". Khi thêm/xóa ở đây sẽ tự động cập nhật.
            </div>
        </div>
    `;
}

async function addCarrierItem() {
    const input = document.getElementById('newCarrierName');
    const name = (input?.value || '').trim();
    if (!name) { showToast('Vui lòng nhập tên nhà vận chuyển', 'error'); return; }
    const data = await apiCall('/api/dht/carriers', 'POST', { name });
    if (data.success) {
        showToast('✅ Đã thêm nhà vận chuyển "' + name + '"');
        await loadCarriersSettings();
    } else {
        showToast(data.error || 'Lỗi thêm', 'error');
    }
}

function editCarrierItem(id, currentName) {
    const bodyHTML = `
        <div class="form-group">
            <label>Tên Nhà Vận Chuyển</label>
            <input type="text" id="editCarrierName" class="form-control" value="${currentName}">
        </div>
    `;
    openModal('✏️ Sửa NVC: ' + currentName, bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditCarrier(${id})">💾 Lưu</button>
    `);
}

async function submitEditCarrier(id) {
    const name = document.getElementById('editCarrierName')?.value?.trim();
    if (!name) { showToast('Tên không được trống', 'error'); return; }
    const data = await apiCall(`/api/dht/carriers/${id}`, 'PUT', { name });
    if (data.success) {
        showToast('✅ Đã cập nhật');
        closeModal();
        await loadCarriersSettings();
    } else {
        showToast(data.error || 'Lỗi', 'error');
    }
}

async function deleteCarrierItem(id, name) {
    if (!confirm('Xóa nhà vận chuyển "' + name + '"?')) return;
    const data = await apiCall(`/api/dht/carriers/${id}`, 'DELETE');
    if (data.success) {
        showToast('✅ Đã xóa "' + name + '"');
        await loadCarriersSettings();
    } else {
        showToast(data.error || 'Lỗi xóa', 'error');
    }
}

