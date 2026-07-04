// ========== CÀI ĐẶT PANCAKE PAGE — Modern Integration Config ==========

let _pancakeConfig = {
    pancake_token: '',
    is_active: false,
    pages: []
};

let _kdSources = [];
let _saleSources = [];

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
                    <!-- Token field -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; font-weight: 800; font-size: 13px; color: var(--gray-700); margin-bottom: 8px;">🔑 Pancake API Access Token</label>
                        <div style="display: flex; gap: 12px;">
                            <div style="position: relative; flex: 1;">
                                <input type="password" id="pancakeTokenInput" class="form-control" placeholder="Nhập long-lived access token từ Pancake..." style="padding-right: 45px; height: 42px; border-radius: 10px; border: 1.5px solid var(--gray-200); font-family: monospace; font-size: 13px;">
                                <button type="button" onclick="toggleTokenVisibility()" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; color: var(--gray-400);">👁️</button>
                            </div>
                            <button onclick="savePancakeToken()" class="btn" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 0 24px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; height: 42px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">Lưu Token</button>
                        </div>
                        <small style="color: var(--gray-400); display: block; margin-top: 6px; font-size: 11px;">Token này dùng để kết nối với Pancake.vn để đồng bộ hội thoại/leads.</small>
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
                                    <tr style="background: var(--gray-50); border-bottom: 1px solid var(--gray-200);">
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 220px;">Page Name / ID</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 140px; text-align: center;">Phân Hệ CRM</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 200px;">Nguồn Khách Mặc Định</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; width: 120px; text-align: center;">Trạng Thái</th>
                                        <th style="padding: 14px 16px; font-weight: 700; color: #ffffff; text-align: center; width: 100px;">Thao Tác</th>
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

        // Load pancake settings
        const configRes = await apiCall('/api/app-config/pancake_settings');
        if (configRes && configRes.value) {
            try {
                _pancakeConfig = typeof configRes.value === 'string' ? JSON.parse(configRes.value) : configRes.value;
            } catch(e) {
                console.error('Error parsing pancake settings JSON:', e);
            }
        }

        // Set inputs
        document.getElementById('pancakeTokenInput').value = _pancakeConfig.pancake_token || '';
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

        return `
            <tr style="border-bottom: 1px solid var(--gray-150); hover: background-color: var(--gray-50);">
                <td style="padding: 14px 16px;">
                    <div style="font-weight: 700; color: var(--gray-800);">${page.name}</div>
                    <div style="font-size: 11px; color: var(--gray-400); font-family: monospace; margin-top: 2px;">ID: ${page.id}</div>
                </td>
                <td style="padding: 14px 16px; text-align: center;">${crmLabel}</td>
                <td style="padding: 14px 16px; font-weight: 600; color: var(--gray-700);">${sourceName}</td>
                <td style="padding: 14px 16px; text-align: center; cursor: pointer;" onclick="togglePageStatus(${index})">${statusLabel}</td>
                <td style="padding: 14px 16px; text-align: center;">
                    <button onclick="showEditPageModal(${index})" class="btn btn-sm" style="background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px 8px;" title="Sửa">✏️</button>
                    <button onclick="deletePageConfig(${index})" class="btn btn-sm" style="background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px 8px;" title="Xóa">🗑️</button>
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

async function savePancakeToken() {
    const token = document.getElementById('pancakeTokenInput').value.trim();
    _pancakeConfig.pancake_token = token;
    await savePancakeConfigToDB();
    showToast('✅ Đã lưu Pancake API Access Token!');
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
    const pageData = isEdit ? _pancakeConfig.pages[index] : { id: '', name: '', crm_type: 'nhu_cau', source_id: '', is_active: true };

    const modalBody = `
        <div style="display: grid; gap: 16px;">
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Pancake Page ID *</label>
                <input type="text" id="modalPageId" class="form-control" value="${pageData.id}" placeholder="VD: 104728372382173" ${isEdit ? 'disabled' : ''} style="height: 38px; border-radius: 8px;">
            </div>
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Tên Trang (Page Name) *</label>
                <input type="text" id="modalPageName" class="form-control" value="${pageData.name}" placeholder="VD: Đồng Phục HV" style="height: 38px; border-radius: 8px;">
            </div>
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Phân Hệ CRM Nhận Lead *</label>
                <select id="modalPageCrmType" class="form-control" onchange="onCrmTypeChange(this.value)" style="height: 38px; border-radius: 8px; padding: 0 35px 0 16px;">
                    <option value="nhu_cau" ${pageData.crm_type === 'nhu_cau' ? 'selected' : ''}>🏢 Phòng Kinh Doanh (crm_type='nhu_cau')</option>
                    <option value="sale" ${pageData.crm_type === 'sale' ? 'selected' : ''}>💼 Phòng Sale (crm_type='sale')</option>
                </select>
            </div>
            <div>
                <label style="display: block; font-weight: 700; font-size: 12px; color: var(--gray-700); margin-bottom: 6px;">Nguồn Khách Mặc Định *</label>
                <select id="modalPageSourceId" class="form-control" style="height: 38px; border-radius: 8px; padding: 0 35px 0 16px;">
                    <!-- Filled dynamically -->
                </select>
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

    if (!pageId) { showToast('Vui lòng nhập Pancake Page ID!', 'error'); return; }
    if (!pageName) { showToast('Vui lòng nhập Tên Page!', 'error'); return; }
    if (!sourceId) { showToast('Vui lòng chọn nguồn khách mặc định!', 'error'); return; }

    const isEdit = index !== null;
    const pageObject = {
        id: pageId,
        name: pageName,
        crm_type: crmType,
        source_id: Number(sourceId),
        is_active: isEdit ? _pancakeConfig.pages[index].is_active : true
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

function copyWebhookUrl() {
    const code = document.getElementById('pancakeWebhookUrl');
    navigator.clipboard.writeText(code.textContent);
    showToast('📋 Đã sao chép URL Webhook!');
}
