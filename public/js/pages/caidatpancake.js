// ========== CÀI ĐẶT PANCAKE PAGE — Modern Integration Config ==========

let _pancakeConfig = {
    pancake_token: '',
    is_active: false,
    cutoff_time: '18:15',
    pages: []
};

let _kdSources = [];
let _saleSources = [];
let _allUsers = [];
let _pancakeMembersCache = {}; // Cache pancake members by pageId

async function renderCaidatpancakePage(container) {
    container.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 20px;">
            <!-- Header card -->
            <div class="card" style="border-radius: 16px; overflow: hidden; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px;">
                <div class="card-header" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); padding: 24px 30px; display: flex; align-items: center; justify-content: space-between; color: white;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 32px; background: rgba(255,255,255,0.2); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; backdrop-filter: blur(10px);">🥞</div>
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">Cài Đặt Đồng Bộ Pancake</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Kết nối và cấu hình chia số tự động từ Fanpage qua Pancake API</p>
                        </div>
                    </div>
                    <div>
                        <div class="custom-control custom-switch" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 30px; backdrop-filter: blur(5px);">
                            <label for="pancakeActiveSwitch" style="margin: 0; font-size: 13px; font-weight: 700; cursor: pointer;">Trạng thái:</label>
                            <input type="checkbox" id="pancakeActiveSwitch" style="cursor: pointer; width: 36px; height: 20px; accent-color: #FF7E5F;" onchange="togglePancakeActive(this.checked)">
                        </div>
                    </div>
                </div>
                
                <div class="card-body" style="padding: 30px; background: #fff;">
                    <!-- Settings Row -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                        <div>
                            <label style="display: block; font-weight: 800; font-size: 13px; color: var(--gray-700); margin-bottom: 8px;">🔑 Pancake API Access Token</label>
                            <div style="position: relative;">
                                <input type="password" id="pancakeTokenInput" class="form-control" placeholder="Nhập long-lived access token từ Pancake..." style="padding-right: 45px; height: 42px; border-radius: 10px; border: 1.5px solid var(--gray-200); font-family: monospace; font-size: 13px;">
                                <button type="button" onclick="toggleTokenVisibility()" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; color: var(--gray-400);">👁️</button>
                            </div>
                            <small style="color: var(--gray-400); display: block; margin-top: 6px; font-size: 11px;">Token này dùng để kết nối chung với Pancake.vn để đồng bộ hội thoại/leads.</small>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 800; font-size: 13px; color: var(--gray-700); margin-bottom: 8px;">⏰ Mốc Giờ Sang Ngày Mới</label>
                            <input type="time" id="pancakeCutoffInput" class="form-control" style="height: 42px; border-radius: 10px; border: 1.5px solid var(--gray-200); font-size: 13px; font-weight: 700;">
                            <small style="color: var(--gray-400); display: block; margin-top: 6px; font-size: 11px;">Sau mốc giờ này, số sẽ được chuyển sang danh sách phân công của ngày hôm sau (mặc định 18:15).</small>
                        </div>
                    </div>
                    
                    <div style="text-align: right; margin-bottom: 24px;">
                        <button onclick="saveGlobalPancakeSettings()" class="btn" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 0 24px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; height: 42px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">Lưu Cấu Hình Chung</button>
                    </div>

                    <!-- Tabs configuration -->
                    <div class="tabs" style="border-bottom: 2px solid var(--gray-100); display: flex; gap: 24px; margin-bottom: 24px;">
                        <div class="tab active" id="tabPagesBtn" onclick="switchPancakeTab('pages')" style="padding: 10px 4px; font-weight: 700; font-size: 14px; color: #FF7E5F; border-bottom: 3px solid #FF7E5F; cursor: pointer; transition: all 0.2s;">📋 Quản Lý Page & Chia Số</div>
                        <div class="tab" id="tabGuideBtn" onclick="switchPancakeTab('guide')" style="padding: 10px 4px; font-weight: 700; font-size: 14px; color: var(--gray-400); cursor: pointer; transition: all 0.2s;">📖 Hướng Dẫn Tích Hợp</div>
                    </div>

                    <!-- Content sections -->
                    <div id="pancakePagesSection">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--gray-800);">Danh sách Fanpage đang đồng bộ</h4>
                            <button onclick="showAddPageModal()" class="btn btn-sm" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;">
                                <span>➕</span> Thêm Cấu Hình Page
                            </button>
                        </div>
                        <div style="overflow-x: auto; border: 1px solid var(--gray-200); border-radius: 12px; background: #fff;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                                <thead>
                                    <tr style="background: #1e293b; border-bottom: 1px solid var(--gray-200);">
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 220px;">Page Name / ID</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 140px; text-align: center;">Phân Hệ CRM</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 200px;">Nguồn Mặc Định</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 120px; text-align: center;">Trạng Thái</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; text-align: center; width: 160px;">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody id="pancakePagesTableBody">
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-400);">Đang tải dữ liệu cấu hình...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div id="pancakeGuideSection" style="display: none;">
                        <div style="line-height: 1.6; color: var(--gray-700);">
                            <h5 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: var(--gray-800);">🔗 URL Webhook nhận thông tin từ Pancake</h5>
                            <div style="background: var(--gray-50); padding: 12px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border: 1.5px dashed var(--gray-300);">
                                <code id="pancakeWebhookUrl" style="font-family: monospace; font-size: 12px; font-weight: 700; color: #d01717;"></code>
                                <button onclick="copyWebhookUrl()" class="btn btn-sm" style="background: var(--gray-200); color: var(--gray-700); border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Sao Chép</button>
                            </div>

                            <h5 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: var(--gray-800);">📝 Các bước thiết lập trên Pancake:</h5>
                            <ol style="margin: 0; padding-left: 20px; font-size: 13px;">
                                <li style="margin-bottom: 8px;">Truy cập vào trang quản trị Pancake của bạn.</li>
                                <li style="margin-bottom: 8px;">Vào phần <b>Cài đặt cấu hình</b> → chọn mục <b>Webhook</b>.</li>
                                <li style="margin-bottom: 8px;">Dán URL Webhook ở trên vào mục Webhook nhận sự kiện của Pancake.</li>
                                <li style="margin-bottom: 8px;">Tích chọn các sự kiện: <code>customer_phone_detected</code> (khi phát hiện số điện thoại khách hàng) hoặc <code>new_chat_session</code>.</li>
                                <li style="margin-bottom: 8px;">Lưu lại cấu hình trên Pancake. Hệ thống sẽ tự động bắt số và tạo lead theo đúng Page cấu hình bên tab bên cạnh.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Display Webhook URL
    document.getElementById('pancakeWebhookUrl').textContent = `${window.location.origin}/api/webhooks/pancake`;

    // Load data
    await loadPancakeData();
}

async function loadPancakeData() {
    try {
        // Load sources first
        const kdRes = await apiCall('/api/settings/sources');
        _kdSources = kdRes.items || [];
        
        const saleRes = await apiCall('/api/settings/sources-sale');
        _saleSources = saleRes.items || [];

        // Load active users list
        const usersRes = await apiCall('/api/users/dropdown');
        _allUsers = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);

        // Load pancake settings
        const configRes = await apiCall('/api/app-config/pancake_settings');
        if (configRes && configRes.value) {
            try {
                _pancakeConfig = typeof configRes.value === 'string' ? JSON.parse(configRes.value) : configRes.value;
            } catch(e) {
                console.error('Error parsing pancake settings JSON:', e);
            }
        }

        // Set default values if empty
        if (!_pancakeConfig.cutoff_time) _pancakeConfig.cutoff_time = '18:15';
        if (!_pancakeConfig.pages) _pancakeConfig.pages = [];

        // Set inputs
        document.getElementById('pancakeTokenInput').value = _pancakeConfig.pancake_token || '';
        document.getElementById('pancakeCutoffInput').value = _pancakeConfig.cutoff_time || '18:15';
        document.getElementById('pancakeActiveSwitch').checked = !!_pancakeConfig.is_active;

        renderPagesTable();
    } catch(e) {
        console.error('Error loading Pancake configs:', e);
        showToast('Không thể tải cấu hình Pancake!', 'error');
    }
}

function renderPagesTable() {
    const tbody = document.getElementById('pancakePagesTableBody');
    if (!tbody) return;

    const pages = _pancakeConfig.pages || [];
    if (pages.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-400);">
                    <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
                    Chưa có cấu hình page nào. Bấm <b>"Thêm Cấu Hình Page"</b> để thiết lập.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pages.map((page, index) => {
        const crmLabel = page.crm_type === 'sale' 
            ? '<span style="background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">💼 SALE</span>'
            : '<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🏢 KINH DOANH</span>';
        
        const statusLabel = page.is_active
            ? '<span style="color: #10b981; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">● Hoạt động</span>'
            : '<span style="color: var(--gray-400); font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">○ Tắt</span>';

        // Find source name
        let sourceName = '—';
        const srcId = Number(page.source_id);
        const sourceList = page.crm_type === 'sale' ? _saleSources : _kdSources;
        const matchedSrc = sourceList.find(s => s.id === srcId);
        if (matchedSrc) sourceName = matchedSrc.name;

        const rosterCount = page.staff_assignments ? page.staff_assignments.length : 0;

        let adsManagerName = '—';
        if (page.ads_manager_id) {
            const matchedUser = _allUsers.find(u => u.id === Number(page.ads_manager_id));
            if (matchedUser) adsManagerName = matchedUser.full_name;
        }

        return `
            <tr style="border-bottom: 1px solid var(--gray-150); hover: background-color: var(--gray-50);">
                <td style="padding: 14px 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: var(--gray-800);">${page.name}</span>
                        ${page.page_link ? `<a href="${page.page_link}" target="_blank" title="Xem Trang" style="text-decoration: none; font-size: 12px;">🔗</a>` : ''}
                    </div>
                    <div style="font-size: 11px; color: var(--gray-400); font-family: monospace; margin-top: 2px;">ID: ${page.id}</div>
                    ${page.ads_manager_id ? `<div style="font-size: 11px; color: #4f46e5; font-weight: 600; margin-top: 4px;">📢 Ads: ${adsManagerName}</div>` : ''}
                </td>
                <td style="padding: 14px 16px; text-align: center;">${crmLabel}</td>
                <td style="padding: 14px 16px; font-weight: 600; color: var(--gray-700);">${sourceName}</td>
                <td style="padding: 14px 16px; text-align: center; cursor: pointer;" onclick="togglePageStatus(${index})">${statusLabel}</td>
                <td style="padding: 14px 16px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <button onclick="showRosterModal(${index})" class="btn btn-sm btn-info" style="border-radius: 6px; padding: 4px 10px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;" title="Cấu hình chia số Roster">
                        👥 Roster (${rosterCount})
                    </button>
                    <button onclick="showEditPageModal(${index})" class="btn btn-sm" style="background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px;" title="Sửa thông tin Page">✏️</button>
                    <button onclick="deletePageConfig(${index})" class="btn btn-sm" style="background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px;" title="Xóa cấu hình Page">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function switchPancakeTab(tab) {
    const tabPagesBtn = document.getElementById('tabPagesBtn');
    const tabGuideBtn = document.getElementById('tabGuideBtn');
    const pagesSection = document.getElementById('pancakePagesSection');
    const guideSection = document.getElementById('pancakeGuideSection');

    if (tab === 'pages') {
        tabPagesBtn.style.color = '#FF7E5F';
        tabPagesBtn.style.borderBottom = '3px solid #FF7E5F';
        tabGuideBtn.style.color = 'var(--gray-400)';
        tabGuideBtn.style.borderBottom = 'none';
        pagesSection.style.display = 'block';
        guideSection.style.display = 'none';
    } else {
        tabGuideBtn.style.color = '#FF7E5F';
        tabGuideBtn.style.borderBottom = '3px solid #FF7E5F';
        tabPagesBtn.style.color = 'var(--gray-400)';
        tabPagesBtn.style.borderBottom = 'none';
        pagesSection.style.display = 'none';
        guideSection.style.display = 'block';
    }
}

function toggleTokenVisibility() {
    const input = document.getElementById('pancakeTokenInput');
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

async function saveGlobalPancakeSettings() {
    const token = document.getElementById('pancakeTokenInput').value.trim();
    const cutoff = document.getElementById('pancakeCutoffInput').value.trim() || '18:15';
    
    _pancakeConfig.pancake_token = token;
    _pancakeConfig.cutoff_time = cutoff;
    
    await savePancakeConfigToDB();
    showToast('✅ Đã lưu cấu hình Pancake chung!');
}

async function togglePancakeActive(checked) {
    _pancakeConfig.is_active = checked;
    await savePancakeConfigToDB();
    showToast(checked ? '✅ Đã kích hoạt đồng bộ Pancake' : '⚠️ Đã tạm dừng đồng bộ Pancake');
}

async function togglePageStatus(index) {
    if (_pancakeConfig.pages[index]) {
        _pancakeConfig.pages[index].is_active = !_pancakeConfig.pages[index].is_active;
        await savePancakeConfigToDB();
        renderPagesTable();
        showToast('✅ Đã cập nhật trạng thái hoạt động của Page!');
    }
}

async function deletePageConfig(index) {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình đồng bộ của Page này?')) return;
    _pancakeConfig.pages.splice(index, 1);
    await savePancakeConfigToDB();
    renderPagesTable();
    showToast('🗑️ Đã xóa cấu hình Page thành công!');
}

async function savePancakeConfigToDB() {
    try {
        await apiCall('/api/app-config/pancake_settings', 'PUT', { value: _pancakeConfig });
    } catch(e) {
        console.error('Error saving pancake settings:', e);
        showToast('Lỗi khi lưu cấu hình lên máy chủ!', 'error');
    }
}

function showAddPageModal() {
    showPageConfigModal(null);
}

function showEditPageModal(index) {
    showPageConfigModal(index);
}

function showPageConfigModal(index = null) {
    const isEdit = index !== null;
    const pageData = isEdit ? _pancakeConfig.pages[index] : { 
        id: '', 
        name: '', 
        crm_type: 'nhu_cau', 
        source_id: '', 
        is_active: true,
        page_access_token: '',
        bot_tele: '',
        fallback_user_id: '',
        page_link: '',
        ads_manager_id: ''
    };

    const modalBody = `
        <div style="display: grid; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Pancake Page ID *</label>
                    <input type="text" id="modalPageId" class="form-control" value="${pageData.id || ''}" placeholder="VD: 104728372382173" ${isEdit ? 'disabled' : ''} style="height: 38px; border-radius: 8px;">
                </div>
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Tên Trang (Page Name) *</label>
                    <input type="text" id="modalPageName" class="form-control" value="${pageData.name || ''}" placeholder="VD: Fanpage Đồng Phục HV" style="height: 38px; border-radius: 8px;">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Link trang Page</label>
                    <input type="text" id="modalPageLink" class="form-control" value="${pageData.page_link || ''}" placeholder="VD: https://facebook.com/page-id" style="height: 38px; border-radius: 8px;">
                </div>
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Người phụ trách Ads</label>
                    <select id="modalPageAdsManager" class="form-control" style="height: 38px; border-radius: 8px; padding: 0 35px 0 16px;">
                        <option value="">-- Chọn người phụ trách Ads --</option>
                        ${_allUsers.map(u => `<option value="${u.id}" ${Number(pageData.ads_manager_id) === u.id ? 'selected' : ''}>${u.full_name} (${u.username})</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Page Access Token (Riêng cho Page này)</label>
                <input type="password" id="modalPageAccessToken" class="form-control" value="${pageData.page_access_token || ''}" placeholder="Bỏ trống nếu dùng token chung..." style="height: 38px; border-radius: 8px; font-family: monospace;">
                <small style="color: var(--gray-400); font-size: 10px; display: block; margin-top: 4px;">Dùng token này để tự động gán nhân viên trực Pancake ở hội thoại.</small>
            </div>
            
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Bot Telegram Token báo ảnh 4 (Riêng cho Page này)</label>
                <input type="password" id="modalPageBotTele" class="form-control" value="${pageData.bot_tele || ''}" placeholder="Nhập bot token báo riêng cho nhân viên..." style="height: 38px; border-radius: 8px; font-family: monospace;">
                <small style="color: var(--gray-400); font-size: 10px; display: block; margin-top: 4px;">Token Telegram Bot dùng để gửi báo số cho nhân viên khi nhận lead.</small>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Phân Hệ CRM Nhận Lead *</label>
                    <select id="modalPageCrmType" class="form-control" onchange="onCrmTypeChange(this.value)" style="height: 38px; border-radius: 8px; padding: 0 35px 0 16px;">
                        <option value="nhu_cau" ${pageData.crm_type === 'nhu_cau' ? 'selected' : ''}>🏢 Phòng Kinh Doanh (nhu_cau)</option>
                        <option value="sale" ${pageData.crm_type === 'sale' ? 'selected' : ''}>💼 Phòng Sale (sale)</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Nguồn Khách Mặc Định *</label>
                    <select id="modalPageSourceId" class="form-control" style="height: 38px; border-radius: 8px; padding: 0 35px 0 16px;">
                        <!-- Filled dynamically -->
                    </select>
                </div>
            </div>            
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary" onclick="closeModal()" style="border-radius: 8px; padding: 8px 16px;">Hủy</button>
        <button class="btn" onclick="savePageConfigFromModal(${index})" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">
            ${isEdit ? '💾 Cập Nhật' : '➕ Tạo Mới'}
        </button>
    `;

    openModal(isEdit ? '✏️ Sửa Cấu Hình Page' : '➕ Thêm Cấu Hình Page', modalBody, modalFooter);

    // Populate source dropdown matching initial crm_type selection
    onCrmTypeChange(pageData.crm_type, pageData.source_id);
}

function onCrmTypeChange(crmType, selectedSourceId = null) {
    const select = document.getElementById('modalPageSourceId');
    if (!select) return;

    const sourceList = crmType === 'sale' ? _saleSources : _kdSources;
    
    select.innerHTML = `
        <option value="">-- Chọn nguồn khách --</option>
        ${sourceList.map(s => `<option value="${s.id}" ${Number(selectedSourceId) === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
    `;
}

async function savePageConfigFromModal(index = null) {
    const pageId = document.getElementById('modalPageId').value.trim();
    const pageName = document.getElementById('modalPageName').value.trim();
    const crmType = document.getElementById('modalPageCrmType').value;
    const sourceId = document.getElementById('modalPageSourceId').value;
    const pageAccessToken = document.getElementById('modalPageAccessToken').value.trim();
    const botTele = document.getElementById('modalPageBotTele').value.trim();
    const pageLink = document.getElementById('modalPageLink').value.trim();
    const adsManagerId = document.getElementById('modalPageAdsManager').value;

    if (!pageId) { showToast('Vui lòng nhập Pancake Page ID!', 'error'); return; }
    if (!pageName) { showToast('Vui lòng nhập Tên Page!', 'error'); return; }
    if (!sourceId) { showToast('Vui lòng chọn nguồn khách mặc định!', 'error'); return; }

    const isEdit = index !== null;
    const pageObject = {
        id: pageId,
        name: pageName,
        crm_type: crmType,
        source_id: Number(sourceId),
        page_access_token: pageAccessToken,
        bot_tele: botTele,
        fallback_user_id: '',
        page_link: pageLink,
        ads_manager_id: adsManagerId ? Number(adsManagerId) : '',
        is_active: isEdit ? _pancakeConfig.pages[index].is_active : true,
        staff_assignments: isEdit ? (_pancakeConfig.pages[index].staff_assignments || []) : [],
        last_assigned_index: isEdit ? (_pancakeConfig.pages[index].last_assigned_index != null ? _pancakeConfig.pages[index].last_assigned_index : -1) : -1
    };

    if (isEdit) {
        _pancakeConfig.pages[index] = pageObject;
    } else {
        // Prevent duplicate page IDs
        const dup = _pancakeConfig.pages.find(p => p.id === pageId);
        if (dup) {
            showToast('Page ID này đã tồn tại trong cấu hình!', 'error');
            return;
        }
        _pancakeConfig.pages.push(pageObject);
    }

    await savePancakeConfigToDB();
    closeModal();
    renderPagesTable();
    showToast(isEdit ? '✅ Đã cập nhật cấu hình Page!' : '✅ Đã thêm Page mới thành công!');
}

// ========== ROSTER CONFIGURATION MODAL ==========
let _activeRosterIndex = null;
let _activeRosterPageMembers = [];

async function showRosterModal(index) {
    _activeRosterIndex = index;
    const page = _pancakeConfig.pages[index];
    if (!page) return;

    // Open modal with loader
    openModal(
        `👥 Phân Công Roster - ${page.name}`,
        `<div style="text-align: center; padding: 40px; color: var(--gray-500);">
            <div style="font-size: 24px; animation: spin 1s linear infinite; display: inline-block;">⏳</div>
            <div style="margin-top: 10px;">Đang tải danh sách nhân viên từ Pancake...</div>
         </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>`
    );

    // Dynamic width adjustments for App.js Modal container
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '960px';
        container.style.width = '95%';
    }

    // Load Pancake page members (with cache check)
    let pageMembers = [];
    if (_pancakeMembersCache[page.id]) {
        pageMembers = _pancakeMembersCache[page.id];
    } else {
        try {
            const tokenToUse = page.page_access_token || _pancakeConfig.pancake_token;
            if (tokenToUse) {
                const res = await apiCall(`/api/pancake/members/${page.id}`);
                if (res && res.members) {
                    pageMembers = res.members;
                    _pancakeMembersCache[page.id] = pageMembers;
                }
            }
        } catch (e) {
            console.error('Failed to fetch Pancake members for page roster:', e);
        }
    }
    _activeRosterPageMembers = pageMembers;

    // Roster UI Body
    const assignments = page.staff_assignments || [];
    
    const bodyHTML = `
        <div style="max-height: 65vh; overflow-y: auto; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h5 style="margin: 0; font-weight: 800; color: var(--gray-800); font-size: 14px;">Cấu hình chia số Roster (Vòng Tròn) cho Fanpage này:</h5>
                <button type="button" class="btn btn-sm" onclick="addRosterStaffRow()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <span>➕</span> Thêm Nhân Viên
                </button>
            </div>
            
            <div style="border: 1px solid var(--gray-200); border-radius: 12px; overflow: hidden; background: #fff; margin-bottom: 12px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px;">
                    <thead>
                        <tr style="background: #1e293b; border-bottom: 1px solid var(--gray-200);">
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 200px;">Nhân Viên CRM</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 220px;">ID Nhân Viên Pancake</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 90px; text-align: center;">Hạn Mức/Ngày</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 210px; text-align: center;">Thứ Nhận Lead</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 140px; text-align: center;">Ngoại Lệ (Lịch/Nghỉ)</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; text-align: center; width: 60px;">Xóa</th>
                        </tr>
                    </thead>
                    <tbody id="rosterTableBody">
                        <!-- Rows populated here -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()" style="border-radius: 8px; padding: 8px 16px;">Hủy</button>
        <button class="btn" onclick="saveRosterConfig()" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">
            💾 Lưu Roster
        </button>
    `;

    openModal(`👥 Phân Công Roster - ${page.name}`, bodyHTML, footerHTML);

    // Render roster rows
    const tbody = document.getElementById('rosterTableBody');
    if (assignments.length === 0) {
        tbody.innerHTML = `
            <tr id="emptyRosterRow">
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--gray-400);">
                    Chưa phân công nhân viên nào. Bấm <b>"Thêm Nhân Viên"</b> để bắt đầu thiết lập roster.
                </td>
            </tr>
        `;
    } else {
        assignments.forEach((sa, idx) => {
            appendRosterRow(sa, idx);
        });
    }
}

function appendRosterRow(sa = {}, idx = null) {
    const tbody = document.getElementById('rosterTableBody');
    const emptyRow = document.getElementById('emptyRosterRow');
    if (emptyRow) emptyRow.remove();

    const rowId = idx !== null ? idx : tbody.children.length;

    // Days logic
    const workingDays = sa.working_days || [1, 2, 3, 4, 5, 6]; // Default Mon-Sat
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const daysBadgeHTML = dayLabels.map((label, dIdx) => {
        const isChecked = workingDays.includes(dIdx);
        return `
            <span class="day-badge ${isChecked ? 'active' : ''}" 
                  data-day="${dIdx}" 
                  onclick="toggleRosterDayBadge(this)" 
                  style="display: inline-block; cursor: pointer; padding: 4px 6px; margin: 2px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid ${isChecked ? '#FF7E5F' : '#e2e8f0'}; background: ${isChecked ? '#fff0eb' : '#fff'}; color: ${isChecked ? '#FF7E5F' : '#64748b'}; transition: all 0.15s; user-select: none;">
                ${label}
            </span>
        `;
    }).join('');

    const exceptions = sa.exceptions || [];

    const tr = document.createElement('tr');
    tr.className = 'roster-staff-row';
    tr.style.borderBottom = '1px solid var(--gray-150)';
    
    // Build select box for Pancake member
    const hasPancakeMembers = _activeRosterPageMembers.length > 0;
    const isManualMode = sa.pancake_staff_id && !_activeRosterPageMembers.some(m => String(m.id) === String(sa.pancake_staff_id));

    const pancakeSelectHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
            <select class="form-control staff-pancake-select" onchange="onPancakeSelectChange(this)" style="height: 34px; font-size: 12px; border-radius: 6px; padding: 0 10px;">
                <option value="">-- Chọn NV Pancake --</option>
                ${_activeRosterPageMembers.map(m => `<option value="${m.id}" ${String(m.id) === String(sa.pancake_staff_id) ? 'selected' : ''}>${m.name} (${m.id})</option>`).join('')}
                <option value="manual_input" ${isManualMode || !hasPancakeMembers ? 'selected' : ''}>Nhập ID thủ công...</option>
            </select>
            <input type="text" class="form-control staff-pancake-manual" value="${sa.pancake_staff_id || ''}" placeholder="Nhập ID Pancake..." style="height: 34px; font-size: 12px; border-radius: 6px; display: ${isManualMode || !hasPancakeMembers ? 'block' : 'none'};">
        </div>
    `;

    tr.innerHTML = `
        <td style="padding: 12px; vertical-align: top;">
            <select class="form-control staff-crm-select" style="height: 34px; font-size: 12px; border-radius: 6px; padding: 0 10px; font-weight: 600;">
                <option value="">-- Chọn nhân viên --</option>
                ${_allUsers.map(u => `<option value="${u.id}" ${Number(sa.crm_user_id) === u.id ? 'selected' : ''}>${u.full_name} (${u.username})</option>`).join('')}
            </select>
        </td>
        <td style="padding: 12px; vertical-align: top;">
            ${pancakeSelectHTML}
        </td>
        <td style="padding: 12px; vertical-align: top; text-align: center;">
            <input type="number" class="form-control staff-limit" value="${sa.daily_limit != null ? sa.daily_limit : 20}" min="1" max="999" style="height: 34px; font-size: 12px; border-radius: 6px; text-align: center; width: 70px; display: inline-block;">
        </td>
        <td style="padding: 12px; vertical-align: top; text-align: center;">
            <div class="day-badges-container" style="display: inline-block;">
                ${daysBadgeHTML}
            </div>
        </td>
        <td style="padding: 12px; vertical-align: top; text-align: center;">
            <button type="button" class="btn btn-sm" onclick="toggleExceptionsPanel(this)" style="background: var(--gray-100); border: 1px solid var(--gray-200); font-weight: 700; font-size: 11px; padding: 6px 10px; border-radius: 6px; color: var(--gray-600); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; width: 100%; justify-content: center;">
                📅 Lịch/Nghỉ (<span class="exceptions-count">${exceptions.length}</span>)
            </button>
            
            <!-- Collapsible Exceptions panel -->
            <div class="exceptions-panel" style="display: none; margin-top: 10px; border: 1px dashed var(--gray-200); border-radius: 8px; padding: 10px; background: var(--gray-50); text-align: left; max-width: 250px;">
                <div class="exceptions-list-wrapper" style="max-height: 120px; overflow-y: auto; margin-bottom: 8px; font-size: 11px;">
                    <!-- Exception items appended here -->
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--gray-200); padding-top: 8px;">
                    <div style="font-weight: 700; font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Thêm ngoại lệ:</div>
                    <input type="date" class="form-control new-exc-date" style="height: 28px; font-size: 11px; padding: 2px 6px; border-radius: 4px;">
                    <select class="form-control new-exc-type" style="height: 28px; font-size: 11px; padding: 0 4px; border-radius: 4px;">
                        <option value="all_day">Nghỉ cả ngày</option>
                        <option value="morning_off">Nghỉ buổi sáng</option>
                        <option value="afternoon_off">Nghỉ buổi chiều</option>
                        <option value="force_receive">Trực (Bắt nhận số)</option>
                    </select>
                    <button type="button" class="btn btn-sm btn-success" onclick="addExceptionRow(this)" style="font-weight: 700; border-radius: 4px; height: 28px; font-size: 11px; border: none; background: #10b981; color: white; cursor: pointer;">➕ Thêm</button>
                </div>
            </div>
        </td>
        <td style="padding: 12px; vertical-align: top; text-align: center;">
            <button type="button" class="btn btn-sm" onclick="removeRosterRow(this)" style="background: none; border: none; cursor: pointer; font-size: 16px; color: var(--gray-400); hover: color: red; padding: 4px;" title="Xóa nhân viên khỏi roster">🗑️</button>
        </td>
    `;

    tbody.appendChild(tr);

    // Render loaded exceptions list for this row
    const wrapper = tr.querySelector('.exceptions-list-wrapper');
    exceptions.forEach(exc => {
        appendExceptionItem(wrapper, exc);
    });
}

function addRosterStaffRow() {
    appendRosterRow({}, null);
}

function removeRosterRow(button) {
    const row = button.closest('.roster-staff-row');
    if (row) row.remove();

    const tbody = document.getElementById('rosterTableBody');
    if (tbody.children.length === 0) {
        tbody.innerHTML = `
            <tr id="emptyRosterRow">
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--gray-400);">
                    Chưa phân công nhân viên nào. Bấm <b>"Thêm Nhân Viên"</b> để bắt đầu thiết lập roster.
                </td>
            </tr>
        `;
    }
}

function toggleRosterDayBadge(badge) {
    badge.classList.toggle('active');
    const isActive = badge.classList.contains('active');
    
    badge.style.border = `1px solid ${isActive ? '#FF7E5F' : '#e2e8f0'}`;
    badge.style.background = isActive ? '#fff0eb' : '#fff';
    badge.style.color = isActive ? '#FF7E5F' : '#64748b';
}

function onPancakeSelectChange(select) {
    const manualInput = select.nextElementSibling;
    if (select.value === 'manual_input') {
        manualInput.style.display = 'block';
    } else {
        manualInput.style.display = 'none';
        manualInput.value = select.value;
    }
}

function toggleExceptionsPanel(button) {
    const panel = button.nextElementSibling;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    button.style.background = isHidden ? 'var(--gray-200)' : 'var(--gray-100)';
}

const EXC_TYPE_LABELS = {
    all_day: 'Nghỉ cả ngày',
    morning_off: 'Nghỉ sáng',
    afternoon_off: 'Nghỉ chiều',
    force_receive: 'Trực (Bắt nhận)'
};

function appendExceptionItem(wrapper, exc) {
    const div = document.createElement('div');
    div.className = 'exc-item';
    div.setAttribute('data-date', exc.date);
    div.setAttribute('data-type', exc.type);
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--gray-200); margin-bottom: 4px;';
    
    let typeClass = 'badge-secondary';
    if (exc.type === 'force_receive') typeClass = 'badge-success';
    else if (exc.type === 'all_day') typeClass = 'badge-danger';
    else if (exc.type.includes('off')) typeClass = 'badge-warning';

    div.innerHTML = `
        <div>
            <strong style="color: var(--gray-800);">${formatDateString(exc.date)}</strong>: 
            <span style="font-size: 10px; opacity: 0.95;" class="badge ${typeClass}">${EXC_TYPE_LABELS[exc.type] || exc.type}</span>
        </div>
        <span onclick="removeExceptionItem(this)" style="cursor: pointer; color: var(--gray-400); font-weight: bold; font-size: 13px; padding-left: 6px;" title="Xóa ngoại lệ này">×</span>
    `;
    wrapper.appendChild(div);
}

function addExceptionRow(button) {
    const panel = button.closest('.exceptions-panel');
    const dateInput = panel.querySelector('.new-exc-date');
    const typeSelect = panel.querySelector('.new-exc-type');
    const wrapper = panel.querySelector('.exceptions-list-wrapper');

    const dateVal = dateInput.value;
    const typeVal = typeSelect.value;

    if (!dateVal) {
        showToast('Vui lòng chọn ngày ngoại lệ!', 'error');
        return;
    }

    // Check duplicate date in exceptions list
    const existing = wrapper.querySelectorAll('.exc-item');
    for (let item of existing) {
        if (item.getAttribute('data-date') === dateVal) {
            showToast('Ngày này đã có trong danh sách ngoại lệ!', 'error');
            return;
        }
    }

    appendExceptionItem(wrapper, { date: dateVal, type: typeVal });
    
    // Update badge count
    const td = panel.closest('td');
    const countSpan = td.querySelector('.exceptions-count');
    countSpan.textContent = wrapper.children.length;

    dateInput.value = ''; // Reset input
}

function removeExceptionItem(span) {
    const item = span.closest('.exc-item');
    const wrapper = item.closest('.exceptions-list-wrapper');
    const td = wrapper.closest('td');
    
    item.remove();
    
    // Update badge count
    const countSpan = td.querySelector('.exceptions-count');
    countSpan.textContent = wrapper.children.length;
}

async function saveRosterConfig() {
    if (_activeRosterIndex === null) return;
    const page = _pancakeConfig.pages[_activeRosterIndex];
    if (!page) return;

    const rows = document.querySelectorAll('.roster-staff-row');
    const assignments = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const crmSelect = row.querySelector('.staff-crm-select');
        const crmUserId = crmSelect.value;
        if (!crmUserId) {
            showToast(`Dòng thứ ${i + 1}: Vui lòng chọn Nhân Viên CRM!`, 'error');
            return;
        }

        const pancakeSelect = row.querySelector('.staff-pancake-select');
        const pancakeManual = row.querySelector('.staff-pancake-manual');
        const pancakeStaffId = pancakeSelect.value === 'manual_input' ? pancakeManual.value.trim() : pancakeSelect.value.trim();
        if (!pancakeStaffId) {
            showToast(`Dòng thứ ${i + 1}: Vui lòng chọn hoặc nhập ID Nhân Viên Pancake!`, 'error');
            return;
        }

        const limitInput = row.querySelector('.staff-limit');
        const dailyLimit = Number(limitInput.value);
        if (isNaN(dailyLimit) || dailyLimit < 1) {
            showToast(`Dòng thứ ${i + 1}: Hạn mức ngày phải là số lớn hơn hoặc bằng 1!`, 'error');
            return;
        }

        // Get working days from active day badges
        const workingDays = [];
        const dayBadges = row.querySelectorAll('.day-badge.active');
        dayBadges.forEach(badge => {
            workingDays.push(Number(badge.getAttribute('data-day')));
        });

        // Get exceptions
        const exceptions = [];
        const excItems = row.querySelectorAll('.exc-item');
        excItems.forEach(item => {
            exceptions.push({
                date: item.getAttribute('data-date'),
                type: item.getAttribute('data-type')
            });
        });

        assignments.push({
            crm_user_id: Number(crmUserId),
            pancake_staff_id: pancakeStaffId,
            daily_limit: dailyLimit,
            working_days: workingDays,
            exceptions: exceptions
        });
    }

    // Save assignments to page
    page.staff_assignments = assignments;
    
    // Invalidate last assigned index if it's out of range now
    if (page.last_assigned_index >= assignments.length) {
        page.last_assigned_index = -1;
    }

    await savePancakeConfigToDB();
    closeModal();
    renderPagesTable();
    showToast(`✅ Đã lưu cấu hình Roster cho page ${page.name}!`);
}

// Helpers
function formatDateString(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function copyWebhookUrl() {
    const code = document.getElementById('pancakeWebhookUrl');
    navigator.clipboard.writeText(code.textContent);
    showToast('📋 Đã sao chép URL Webhook!');
}
