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
let _kdAndSaleUsers = [];
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
                    
                    <!-- Settings Row 2 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                        <div>
                            <label style="display: block; font-weight: 800; font-size: 13px; color: var(--gray-700); margin-bottom: 8px;">⏳ Thời Gian Chờ Có SĐT (Giây)</label>
                            <input type="number" id="pancakeDelaySecondsInput" class="form-control" min="0" placeholder="VD: 60" style="height: 42px; border-radius: 10px; border: 1.5px solid var(--gray-200); font-size: 13px; font-weight: 700;">
                            <small style="color: var(--gray-400); display: block; margin-top: 6px; font-size: 11px;">Thời gian tối đa chờ khách hàng gửi SĐT. Hết số giây này sẽ tự động chia số (mặc định 60 giây).</small>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 800; font-size: 13px; color: var(--gray-700); margin-bottom: 8px;">🔄 Thời Hạn Cập Nhật SĐT Muộn (Phút)</label>
                            <input type="number" id="pancakeUpdateLimitInput" class="form-control" min="0" placeholder="VD: 15" style="height: 42px; border-radius: 10px; border: 1.5px solid var(--gray-200); font-size: 13px; font-weight: 700;">
                            <small style="color: var(--gray-400); display: block; margin-top: 6px; font-size: 11px;">Thời gian tối đa để tự động cập nhật SĐT muộn vào thẻ khách hàng đã chia (mặc định 15 phút).</small>
                        </div>
                    </div>

                    <!-- Global Working Days Config -->
                    <div style="margin-bottom: 24px; border: 1.5px solid var(--gray-200); border-radius: 12px; padding: 18px; background: #fafafa; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">📅</span>
                            <div>
                                <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #FF7E5F;">Cấu hình Thứ Nhận Lead của Nhân Viên (Toàn bộ Page)</h4>
                                <p style="margin: 4px 0 0 0; font-size: 11.5px; color: var(--gray-400);">Thiết lập lịch trực nhận số của nhân viên thuộc Phòng Kinh Doanh & Phòng Sale</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="showGlobalWorkingDaysModal()" class="btn" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(255,126,95,0.15); height: 38px;">
                                ⚙️ Thiết Lập Thứ Nhận Lead
                            </button>
                            <button type="button" onclick="showSundayRosterModal()" class="btn" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(255,126,95,0.15); height: 38px;">
                                📅 Lịch Trực Chủ Nhật
                            </button>
                        </div>
                    </div>
                    
                    <div style="text-align: right; margin-bottom: 24px;">
                        <button id="saveGlobalSettingsBtn" onclick="saveGlobalPancakeSettings()" class="btn" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 0 24px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; height: 42px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">Lưu Cấu Hình Chung</button>
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
                        <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                                <thead>
                                    <tr style="background: #1e293b; border-bottom: 2px solid #0f172a;">
                                        <th style="padding: 16px 20px; font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 240px;">Page Name / ID</th>
                                        <th style="padding: 16px 20px; font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 150px; text-align: center;">Phân Hệ CRM</th>
                                        <th style="padding: 16px 20px; font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 180px;">Nguồn Mặc Định</th>
                                        <th style="padding: 16px 20px; font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 130px; text-align: center;">Trạng Thái</th>
                                        <th style="padding: 16px 20px; font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 200px;">Thao Tác</th>
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

        // Load departments list
        let departments = [];
        try {
            const deptRes = await apiCall('/api/departments');
            departments = deptRes.departments || [];
        } catch(e) {
            console.error('Failed to load departments:', e);
        }

        // Identify department IDs for Kinh Doanh & Sale
        const targetDeptIds = [];
        if (departments.length > 0) {
            const activeDepts = departments.filter(d => d.status === 'active');
            const targets = activeDepts.filter(d => {
                const nameUpper = (d.name || '').toUpperCase();
                const codeUpper = (d.code || '').toUpperCase();
                return codeUpper === 'KINHDOANH' || 
                       codeUpper === 'PHONGSALE' || 
                       nameUpper.includes('KINH DOANH') || 
                       nameUpper.includes('PHÒNG SALE') ||
                       nameUpper.includes('PHONG SALE');
            });
            const resultIds = new Set(targets.map(t => t.id));
            let added = true;
            while (added) {
                added = false;
                for (const dept of activeDepts) {
                    if (dept.parent_id && resultIds.has(dept.parent_id) && !resultIds.has(dept.id)) {
                        resultIds.add(dept.id);
                        added = true;
                    }
                }
            }
            targetDeptIds.push(...Array.from(resultIds));
        }

        // Filter users to only KINH DOANH and SALE
        if (targetDeptIds.length > 0) {
            _kdAndSaleUsers = _allUsers.filter(u => targetDeptIds.includes(Number(u.department_id)));
        } else {
            // Fallback to standard IDs if department list fails/is empty
            const fallbackIds = [1, 2, 3, 22, 23, 4, 27];
            _kdAndSaleUsers = _allUsers.filter(u => fallbackIds.includes(Number(u.department_id)));
        }

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
        if (_pancakeConfig.delay_assignment_seconds === undefined) _pancakeConfig.delay_assignment_seconds = 60;
        if (_pancakeConfig.update_phone_limit_minutes === undefined) _pancakeConfig.update_phone_limit_minutes = 15;
        _pancakeConfig.global_working_days = _pancakeConfig.global_working_days || {};

        // Set inputs
        document.getElementById('pancakeTokenInput').value = _pancakeConfig.pancake_token || '';
        document.getElementById('pancakeCutoffInput').value = _pancakeConfig.cutoff_time || '18:15';
        document.getElementById('pancakeDelaySecondsInput').value = _pancakeConfig.delay_assignment_seconds;
        document.getElementById('pancakeUpdateLimitInput').value = _pancakeConfig.update_phone_limit_minutes;
        document.getElementById('pancakeActiveSwitch').checked = !!_pancakeConfig.is_active;

        // Visual helper for unsaved changes
        const markUnsaved = () => {
            const btn = document.getElementById('saveGlobalSettingsBtn');
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
                btn.innerHTML = '💾 Lưu Cấu Hình (Có thay đổi chưa lưu)';
                btn.style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)';
            }
        };
        document.getElementById('pancakeTokenInput').addEventListener('input', markUnsaved);
        document.getElementById('pancakeCutoffInput').addEventListener('input', markUnsaved);
        document.getElementById('pancakeDelaySecondsInput').addEventListener('input', markUnsaved);
        document.getElementById('pancakeUpdateLimitInput').addEventListener('input', markUnsaved);

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
        const crmLabel = page.crm_type === 'ca_hai'
            ? '<span style="background: rgba(147, 51, 234, 0.08); color: #7c3aed; border: 1.5px solid rgba(147, 51, 234, 0.15); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #7c3aed;"></span> Cả 2 phòng</span>'
            : (page.crm_type === 'sale' 
                ? '<span style="background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1.5px solid rgba(37, 99, 235, 0.15); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #2563eb;"></span> Phòng Sale</span>'
                : '<span style="background: rgba(217, 119, 6, 0.08); color: #d97706; border: 1.5px solid rgba(217, 119, 6, 0.15); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #d97706;"></span> Kinh Doanh</span>');
        
        const statusLabel = page.is_active
            ? '<span style="background: rgba(16, 185, 129, 0.08); color: #059669; border: 1.5px solid rgba(16, 185, 129, 0.15); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> Hoạt động</span>'
            : '<span style="background: rgba(148, 163, 184, 0.08); color: #64748b; border: 1.5px solid rgba(148, 163, 184, 0.15); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;"></span> Tạm dừng</span>';

        // Find source name
        let sourceName = '—';
        const srcId = Number(page.source_id);
        const sourceList = page.crm_type === 'ca_hai'
            ? [..._kdSources, ..._saleSources]
            : (page.crm_type === 'sale' ? _saleSources : _kdSources);
        const matchedSrc = sourceList.find(s => s.id === srcId);
        if (matchedSrc) sourceName = matchedSrc.name;

        const rosterCount = page.staff_assignments ? page.staff_assignments.length : 0;

        let adsManagerName = '—';
        if (page.ads_manager_id) {
            const matchedUser = _allUsers.find(u => u.id === Number(page.ads_manager_id));
            if (matchedUser) adsManagerName = matchedUser.full_name;
        }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#fafafa'" onmouseout="this.style.backgroundColor='transparent'">
                <td style="padding: 16px 20px; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: #1e293b; font-size: 14px;">${page.name}</span>
                        ${page.page_link ? `<a href="${page.page_link}" target="_blank" title="Xem Trang" style="text-decoration: none; font-size: 12px; transition: transform 0.2s; display: inline-flex;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">🔗</a>` : ''}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-top: 4px; background: #f8fafc; padding: 2px 6px; border-radius: 4px; display: inline-block; border: 1px solid #e2e8f0;">ID: ${page.id}</div>
                    ${page.ads_manager_id ? `<br><div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; background: rgba(79, 70, 229, 0.08); color: #4f46e5; border: 1.5px solid rgba(79, 70, 229, 0.15); padding: 3px 8px; border-radius: 6px; font-weight: 700; margin-top: 6px; vertical-align: middle;"><span>📢</span> Ads: ${adsManagerName}</div>` : ''}
                </td>
                <td style="padding: 16px 20px; text-align: center; vertical-align: middle;">${crmLabel}</td>
                <td style="padding: 16px 20px; vertical-align: middle;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #334155; font-size: 12px; background: #f1f5f9; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0;"><span>📍</span> ${sourceName}</div>
                </td>
                <td style="padding: 16px 20px; text-align: center; cursor: pointer; vertical-align: middle;" onclick="togglePageStatus(${index})">${statusLabel}</td>
                <td style="padding: 16px 20px; text-align: center; vertical-align: middle;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <button onclick="showRosterModal(${index})" class="btn" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(59,130,246,0.15); height: 32px; outline: none;">
                            👥 Roster (${rosterCount})
                        </button>
                        <button onclick="showEditPageModal(${index})" class="btn" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 12px;" title="Sửa thông tin Page" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✏️</button>
                        <button onclick="deletePageConfig(${index})" class="btn" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 12px;" title="Xóa cấu hình Page" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getUpcomingSundayDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = (7 - day) % 7;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + diff);
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, '0');
    const d = String(sunday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderGlobalWorkingDaysTable() {
    const tbody = document.getElementById('globalWorkingDaysTableBody');
    if (!tbody) return;

    const users = _kdAndSaleUsers || [];
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--gray-400);">Không có nhân viên nào.</td></tr>`;
        return;
    }

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    tbody.innerHTML = users.map(u => {
        const workingDays = _pancakeConfig.global_working_days && _pancakeConfig.global_working_days[u.id] !== undefined
            ? _pancakeConfig.global_working_days[u.id].filter(d => d !== 0) // exclude static Sunday
            : [1, 2, 3, 4, 5, 6]; // Default Monday to Saturday
        
        // Find all future Sundays (today onwards) assigned to this user
        const todayStr = typeof vnDateStr === 'function' ? vnDateStr() : new Date().toISOString().split('T')[0];
        const schedule = _pancakeConfig.sunday_duty_schedule || {};
        const futureSundays = Object.keys(schedule).filter(dateStr => {
            return dateStr >= todayStr && Array.isArray(schedule[dateStr]) && schedule[dateStr].includes(u.id);
        }).sort();

        const isAssignedSunday = futureSundays.length > 0;
        if (isAssignedSunday) {
            workingDays.push(0);
        }
        
        const daysBadgeHTML = dayLabels.map((label, dIdx) => {
            const isChecked = workingDays.includes(dIdx);
            if (dIdx === 0) {
                const formattedSundays = futureSundays.map(d => d.split('-').reverse().join('/')).join(', ');
                const toastMsg = isChecked
                    ? `Không ấn được trực tiếp tại đây vì ${u.full_name} có lịch trực vào ngày CN, ${formattedSundays}. Muốn hủy trực thì hãy vào 📅 Phân Lịch Trực Chủ Nhật để chuyển cho người khác.`
                    : `Không ấn được trực tiếp tại đây vì ${u.full_name} không có lịch trực vào các ngày Chủ Nhật sắp tới. Muốn bật trực thì hãy vào 📅 Phân Lịch Trực Chủ Nhật để phân công.`;
                return `
                    <span class="day-badge ${isChecked ? 'active' : ''}" 
                          data-day="${dIdx}" 
                          onclick="showToast('${toastMsg}', 'warning')" 
                          style="display: inline-block; cursor: pointer; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid ${isChecked ? '#FF7E5F' : '#e2e8f0'}; background: ${isChecked ? '#fff0eb' : '#fff'}; color: ${isChecked ? '#FF7E5F' : '#64748b'}; transition: all 0.15s; user-select: none;"
                          title="Trực Chủ Nhật: ${isChecked ? 'BẬT (' + formattedSundays + ')' : 'TẮT'}">
                        ${label}
                    </span>
                `;
            }
            return `
                <span class="day-badge ${isChecked ? 'active' : ''}" 
                      data-day="${dIdx}" 
                      onclick="toggleGlobalWorkingDayBadge(this, ${u.id})" 
                      style="display: inline-block; cursor: pointer; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid ${isChecked ? '#FF7E5F' : '#e2e8f0'}; background: ${isChecked ? '#fff0eb' : '#fff'}; color: ${isChecked ? '#FF7E5F' : '#64748b'}; transition: all 0.15s; user-select: none;">
                    ${label}
                </span>
            `;
        }).join('');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 16px; font-weight: 700; color: #334155; vertical-align: middle;">${u.full_name} (${u.username})</td>
                <td style="padding: 10px 16px; text-align: center; vertical-align: middle;">
                    <div style="display: inline-block;">
                        ${daysBadgeHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleGlobalWorkingDayBadge(badge, userId) {
    const day = parseInt(badge.getAttribute('data-day'));
    if (day === 0) return; // Prevent manual toggle of Sunday

    badge.classList.toggle('active');
    const isActive = badge.classList.contains('active');
    
    badge.style.border = `1px solid ${isActive ? '#FF7E5F' : '#e2e8f0'}`;
    badge.style.background = isActive ? '#fff0eb' : '#fff';
    badge.style.color = isActive ? '#FF7E5F' : '#64748b';

    if (!_pancakeConfig.global_working_days) _pancakeConfig.global_working_days = {};
    if (!_pancakeConfig.global_working_days[userId]) {
        _pancakeConfig.global_working_days[userId] = [1, 2, 3, 4, 5, 6]; // default
    }

    let arr = _pancakeConfig.global_working_days[userId].filter(d => d !== 0); // exclude 0
    if (isActive) {
        if (!arr.includes(day)) arr.push(day);
    } else {
        arr = arr.filter(d => d !== day);
    }
    _pancakeConfig.global_working_days[userId] = arr;
}

function showGlobalWorkingDaysModal() {
    const modalBody = `
        <div style="margin-bottom: 16px; font-size: 13px; color: var(--gray-600); font-weight: 500; line-height: 1.5;">
            Thiết lập ngày trong tuần (Thứ nhận Lead) áp dụng chung cho toàn bộ Fanpage. Nhấp chọn các ngày nhân viên trực nhận số.
        </div>
        <div style="max-height: 400px; overflow-y: auto; border: 1.5px solid var(--gray-200); border-radius: 12px; background: white; box-shadow: inset 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
                <thead>
                    <tr style="background: #1e293b; border-bottom: 1.5px solid #0f172a;">
                        <th style="padding: 12px 16px; font-weight: 700; color: #ffffff; width: 45%;">Nhân viên CRM</th>
                        <th style="padding: 12px 16px; font-weight: 700; color: #ffffff; width: 55%; text-align: center;">Thứ Nhận Lead</th>
                    </tr>
                </thead>
                <tbody id="globalWorkingDaysTableBody">
                    <tr>
                        <td colspan="2" style="text-align: center; padding: 20px; color: var(--gray-400);">Đang tải danh sách nhân viên...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary" onclick="closeModal()" style="border-radius: 8px; padding: 8px 16px;">Hủy</button>
        <button class="btn" onclick="saveGlobalWorkingDaysFromModal()" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">
            💾 Lưu Lịch Trực
        </button>
    `;

    openModal('📅 Thiết Lập Thứ Nhận Lead Toàn Cục', modalBody, modalFooter);
    
    // Adjust modal width for comfortable table viewing
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '650px';
        container.style.width = '90%';
    }

    renderGlobalWorkingDaysTable();
}

async function saveGlobalWorkingDaysFromModal() {
    const success = await savePancakeConfigToDB();
    if (success) {
        closeModal();
        showToast('✅ Đã lưu lịch trực toàn cục của nhân viên!');
    }
}

function onRosterCrmUserChange(select) {
    const userId = Number(select.value);
    const row = select.closest('.roster-staff-row');
    if (!row) return;

    const badgesContainer = row.querySelector('.day-badges-container');
    if (!badgesContainer) return;

    const workingDays = _pancakeConfig.global_working_days && _pancakeConfig.global_working_days[userId] !== undefined
        ? _pancakeConfig.global_working_days[userId]
        : [1, 2, 3, 4, 5, 6];

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    badgesContainer.innerHTML = dayLabels.map((label, dIdx) => {
        const isChecked = workingDays.includes(dIdx);
        return `
            <span class="day-badge ${isChecked ? 'active' : ''}" 
                  data-day="${dIdx}"
                  style="display: inline-block; padding: 4px 6px; margin: 2px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid ${isChecked ? '#FF7E5F' : '#e2e8f0'}; background: ${isChecked ? '#fff0eb' : '#fff'}; color: ${isChecked ? '#FF7E5F' : '#64748b'}; opacity: 0.85; user-select: none;">
                ${label}
            </span>
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
    const delaySecs = parseInt(document.getElementById('pancakeDelaySecondsInput').value.trim()) || 0;
    const updateLimit = parseInt(document.getElementById('pancakeUpdateLimitInput').value.trim()) || 0;
    
    _pancakeConfig.pancake_token = token;
    _pancakeConfig.cutoff_time = cutoff;
    _pancakeConfig.delay_assignment_seconds = delaySecs;
    _pancakeConfig.update_phone_limit_minutes = updateLimit;
    
    const success = await savePancakeConfigToDB();
    if (success) {
        showToast('✅ Đã lưu cấu hình Pancake chung!');
        const btn = document.getElementById('saveGlobalSettingsBtn');
        if (btn) {
            btn.style.background = 'linear-gradient(135deg, #FF7E5F, #FEB47B)';
            btn.innerHTML = 'Lưu Cấu Hình Chung';
            btn.style.boxShadow = '0 4px 12px rgba(255,126,95,0.2)';
        }
    }
}

async function togglePancakeActive(checked) {
    _pancakeConfig.is_active = checked;
    const success = await savePancakeConfigToDB();
    if (success) {
        showToast(checked ? '✅ Đã kích hoạt đồng bộ Pancake' : '⚠️ Đã tạm dừng đồng bộ Pancake');
    } else {
        document.getElementById('pancakeActiveSwitch').checked = !checked;
    }
}

async function togglePageStatus(index) {
    if (_pancakeConfig.pages[index]) {
        const oldVal = _pancakeConfig.pages[index].is_active;
        _pancakeConfig.pages[index].is_active = !oldVal;
        const success = await savePancakeConfigToDB();
        if (success) {
            renderPagesTable();
            showToast('✅ Đã cập nhật trạng thái hoạt động của Page!');
        } else {
            _pancakeConfig.pages[index].is_active = oldVal;
        }
    }
}

async function deletePageConfig(index) {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình đồng bộ của Page này?')) return;
    const removed = _pancakeConfig.pages.splice(index, 1)[0];
    const success = await savePancakeConfigToDB();
    if (success) {
        renderPagesTable();
        showToast('🗑️ Đã xóa cấu hình Page thành công!');
    } else {
        _pancakeConfig.pages.splice(index, 0, removed);
    }
}

async function savePancakeConfigToDB() {
    try {
        await apiCall('/api/app-config/pancake_settings', 'PUT', { value: _pancakeConfig });
        return true;
    } catch(e) {
        console.error('Error saving pancake settings:', e);
        showToast('Lỗi khi lưu cấu hình lên máy chủ!', 'error');
        return false;
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
                        ${_allUsers.filter(u => u.role === 'giam_doc' || (Number(u.department_id) === 6 && (u.role === 'nhan_vien' || u.role === 'truong_phong')) || Number(pageData.ads_manager_id) === u.id).map(u => `<option value="${u.id}" ${Number(pageData.ads_manager_id) === u.id ? 'selected' : ''}>${u.full_name} (${u.username})</option>`).join('')}
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
                        <option value="ca_hai" ${pageData.crm_type === 'ca_hai' ? 'selected' : ''}>🏢💼 Cả 2 phòng (ca_hai)</option>
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

    const sourceList = crmType === 'ca_hai'
        ? [..._kdSources, ..._saleSources]
        : (crmType === 'sale' ? _saleSources : _kdSources);
    
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

    const success = await savePancakeConfigToDB();
    if (success) {
        closeModal();
        renderPagesTable();
        showToast(isEdit ? '✅ Đã cập nhật cấu hình Page!' : '✅ Đã thêm Page mới thành công!');
    }
}

// ========== ROSTER CONFIGURATION MODAL ==========
let _activeRosterIndex = null;
let _activeRosterPageMembers = [];
let _activeRosterPageTags = [];
const _pancakeTagsCache = {};

async function showRosterModal(index) {
    _activeRosterIndex = index;
    const page = _pancakeConfig.pages[index];
    if (!page) return;

    // Open modal with loader
    openModal(
        `👥 Phân Công Roster - ${page.name}`,
        `<div style="text-align: center; padding: 40px; color: var(--gray-500);">
            <div style="font-size: 24px; animation: spin 1s linear infinite; display: inline-block;">⏳</div>
            <div style="margin-top: 10px;">Đang tải danh sách nhân viên & nhãn từ Pancake...</div>
         </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>`
    );

    // Dynamic width adjustments for App.js Modal container
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '1000px';
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

    // Load Pancake page tags (with cache check)
    let pageTags = [];
    if (_pancakeTagsCache[page.id]) {
        pageTags = _pancakeTagsCache[page.id];
    } else {
        try {
            const tokenToUse = page.page_access_token || _pancakeConfig.pancake_token;
            if (tokenToUse) {
                const res = await apiCall(`/api/pancake/tags/${page.id}`);
                if (res && res.tags) {
                    pageTags = res.tags;
                    _pancakeTagsCache[page.id] = pageTags;
                }
            }
        } catch (e) {
            console.error('Failed to fetch Pancake tags for page roster:', e);
        }
    }
    _activeRosterPageTags = pageTags;

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
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 180px;">Nhân Viên CRM</th>
                            <th style="padding: 12px; font-weight: 700; color: #ffffff; width: 260px;">ID & Tag Nhân Viên Pancake</th>
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

    // Days logic (Look up from global working days map first)
    const workingDays = _pancakeConfig.global_working_days && _pancakeConfig.global_working_days[sa.crm_user_id] !== undefined
        ? _pancakeConfig.global_working_days[sa.crm_user_id]
        : (sa.working_days || [1, 2, 3, 4, 5, 6]);
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const daysBadgeHTML = dayLabels.map((label, dIdx) => {
        const isChecked = workingDays.includes(dIdx);
        return `
            <span class="day-badge ${isChecked ? 'active' : ''}" 
                  data-day="${dIdx}" 
                  style="display: inline-block; padding: 4px 6px; margin: 2px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid ${isChecked ? '#FF7E5F' : '#e2e8f0'}; background: ${isChecked ? '#fff0eb' : '#fff'}; color: ${isChecked ? '#FF7E5F' : '#64748b'}; opacity: 0.85; user-select: none;">
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
    const isManualMode = sa.pancake_staff_id && !_activeRosterPageMembers.some(m => String(m.id) === String(sa.pancake_staff_id) || String(m.fb_id) === String(sa.pancake_staff_id));

    const hasPancakeTags = _activeRosterPageTags.length > 0;
    const isTagManualMode = sa.pancake_tag_id && !_activeRosterPageTags.some(t => String(t.id) === String(sa.pancake_tag_id));

    const pancakeSelectHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="font-size: 10px; font-weight: 700; color: var(--gray-500); margin-bottom: 2px;">👤 Tài khoản Pancake:</div>
            <select class="form-control staff-pancake-select" onchange="onPancakeSelectChange(this)" style="height: 34px; font-size: 12px; border-radius: 6px; padding: 0 10px; width: 100%;">
                <option value="">-- Chọn NV Pancake --</option>
                ${_activeRosterPageMembers.map(m => {
                    const isSelected = String(m.id) === String(sa.pancake_staff_id) || String(m.fb_id) === String(sa.pancake_staff_id);
                    return `<option value="${m.id}" ${isSelected ? 'selected' : ''}>${m.name} (${m.id}${m.fb_id ? ' / ' + m.fb_id : ''})</option>`;
                }).join('')}
                <option value="manual_input" ${isManualMode || !hasPancakeMembers ? 'selected' : ''}>Nhập ID thủ công...</option>
            </select>
            <input type="text" class="form-control staff-pancake-manual" value="${sa.pancake_staff_id || ''}" placeholder="Nhập ID Pancake..." style="height: 34px; font-size: 12px; border-radius: 6px; display: ${isManualMode || !hasPancakeMembers ? 'block' : 'none'}; width: 100%;">
            
            <div style="font-size: 10px; font-weight: 700; color: var(--gray-500); margin-top: 6px; margin-bottom: 2px;">🏷️ Thẻ nhân viên (Pancake Tag):</div>
            <select class="form-control staff-tag-select" onchange="onTagSelectChange(this)" style="height: 34px; font-size: 12px; border-radius: 6px; padding: 0 10px; width: 100%;">
                <option value="">-- Chọn Tag Pancake --</option>
                ${_activeRosterPageTags.map(t => `<option value="${t.id}" ${String(t.id) === String(sa.pancake_tag_id) ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
                <option value="manual_input" ${isTagManualMode || !hasPancakeTags ? 'selected' : ''}>Nhập Tag ID thủ công...</option>
            </select>
            <input type="text" class="form-control staff-tag-manual" value="${sa.pancake_tag_id || ''}" placeholder="Nhập Tag ID Pancake..." style="height: 34px; font-size: 12px; border-radius: 6px; display: ${isTagManualMode || !hasPancakeTags ? 'block' : 'none'}; width: 100%;">
        </div>
    `;

    tr.innerHTML = `
        <td style="padding: 12px; vertical-align: top;">
            <select class="form-control staff-crm-select" onchange="onRosterCrmUserChange(this)" style="height: 34px; font-size: 12px; border-radius: 6px; padding: 0 10px; font-weight: 600;">
                <option value="">-- Chọn nhân viên --</option>
                ${_kdAndSaleUsers.map(u => `<option value="${u.id}" ${Number(sa.crm_user_id) === u.id ? 'selected' : ''}>${u.full_name} (${u.username})</option>`).join('')}
            </select>
        </td>
        <td style="padding: 12px; vertical-align: top;">
            ${pancakeSelectHTML}
        </td>
        <td style="padding: 12px; vertical-align: top; text-align: center;">
            <input type="number" class="form-control staff-limit" value="${sa.daily_limit != null ? (sa.daily_limit === 0 ? '' : sa.daily_limit) : 20}" placeholder="Vô hạn" min="0" max="999" style="height: 34px; font-size: 12px; border-radius: 6px; text-align: center; width: 70px; display: inline-block;">
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

function onTagSelectChange(select) {
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

        const tagSelect = row.querySelector('.staff-tag-select');
        const tagManual = row.querySelector('.staff-tag-manual');
        const pancakeTagId = tagSelect.value === 'manual_input' ? tagManual.value.trim() : tagSelect.value.trim();

        const limitInput = row.querySelector('.staff-limit');
        const dailyLimit = limitInput.value === '' ? 0 : Number(limitInput.value);
        if (isNaN(dailyLimit) || dailyLimit < 0) {
            showToast(`Dòng thứ ${i + 1}: Hạn mức ngày phải là số lớn hơn hoặc bằng 0 (0 hoặc bỏ trống nghĩa là vô hạn)!`, 'error');
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
            pancake_tag_id: pancakeTagId,
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

function canEditSundayRoster() {
    if (!currentUser) return false;
    return currentUser.role === 'giam_doc' || currentUser.role === 'quan_ly_cap_cao' || currentUser.username === 'leviettrinh';
}

let _sundayRosterDates = [];

function getUpcomingSundays(count = 5) {
    const list = [];
    const now = new Date();
    const day = now.getDay();
    const diffToThisSunday = (7 - day) % 7;
    const thisSunday = new Date(now);
    thisSunday.setDate(now.getDate() + diffToThisSunday);
    
    const startSunday = new Date(thisSunday);
    startSunday.setDate(thisSunday.getDate() - 7); // start from last Sunday
    
    for (let i = 0; i < count; i++) {
        const d = new Date(startSunday);
        d.setDate(startSunday.getDate() + i * 7);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dateStr = String(d.getDate()).padStart(2, '0');
        list.push(`${y}-${m}-${dateStr}`);
    }
    return list;
}

function showSundayRosterModal() {
    _sundayRosterDates = getUpcomingSundays(5);
    
    if (_pancakeConfig.sunday_duty_schedule) {
        Object.keys(_pancakeConfig.sunday_duty_schedule).forEach(dateStr => {
            if (!_sundayRosterDates.includes(dateStr)) {
                _sundayRosterDates.push(dateStr);
            }
        });
        _sundayRosterDates.sort();
    }
    
    renderSundayRosterModalContent();
}

function renderSundayRosterModalContent() {
    const editAllowed = canEditSundayRoster();
    const modalBody = `
        <div style="margin-bottom: 16px; font-size: 13px; color: var(--gray-600); font-weight: 500; line-height: 1.5;">
            Phân công lịch trực Chủ Nhật theo ngày cụ thể. Chỉ các bạn Sale/KD được tích chọn mới được Bật nhận số và gửi Nhắc xử lý số vào ngày đó.
        </div>
        <div style="max-height: 420px; overflow-y: auto; border: 1.5px solid var(--gray-200); border-radius: 12px; background: white; box-shadow: inset 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
                <thead>
                    <tr style="background: #1e293b; border-bottom: 1.5px solid #0f172a;">
                        <th style="padding: 12px 16px; font-weight: 700; color: #ffffff; width: 35%;">Ngày Chủ Nhật</th>
                        <th style="padding: 12px 16px; font-weight: 700; color: #ffffff; width: 65%;">Nhân viên trực (Click để bật/tắt)</th>
                    </tr>
                </thead>
                <tbody id="sundayRosterTableBody">
                </tbody>
            </table>
        </div>
        ${editAllowed ? `
        <div style="text-align: left; margin-bottom: 8px;">
            <button type="button" class="btn btn-sm" onclick="addNextSundayRosterDate()" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                ➕ Thêm Chủ Nhật tiếp theo
            </button>
        </div>` : ''}
    `;

    const modalFooter = `
        <button class="btn btn-secondary" onclick="closeModal()" style="border-radius: 8px; padding: 8px 16px;">Đóng</button>
        ${editAllowed ? `
        <button class="btn" onclick="saveSundayRosterFromModal()" style="background: linear-gradient(135deg, #FF7E5F, #FEB47B); color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(255,126,95,0.2);">
            💾 Lưu Lịch Trực
        </button>` : ''}
    `;

    openModal('📅 Phân Lịch Trực Chủ Nhật', modalBody, modalFooter);

    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '750px';
        container.style.width = '95%';
    }

    renderSundayRosterTableRows();
}

function renderSundayRosterTableRows() {
    const tbody = document.getElementById('sundayRosterTableBody');
    if (!tbody) return;

    const users = _kdAndSaleUsers || [];
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--gray-400);">Không có nhân viên nào.</td></tr>`;
        return;
    }

    const schedule = _pancakeConfig.sunday_duty_schedule || {};
    const editAllowed = canEditSundayRoster();

    tbody.innerHTML = _sundayRosterDates.map(dateStr => {
        const assignedIds = schedule[dateStr] || [];
        const formattedDate = dateStr.split('-').reverse().join('/');
        
        const pillsHTML = users.map(u => {
            const isAssigned = assignedIds.includes(u.id);
            const clickHandler = editAllowed 
                ? `onclick="toggleSundayStaffRoster(this)"` 
                : `onclick="showToast('Bạn không có quyền chỉnh sửa lịch trực. Chỉ Giám Đốc và Quản Lý Cấp Cao Lê Việt Trinh mới được quyền chỉnh sửa.', 'error')"`;
            
            return `
                <span class="sunday-staff-pill ${isAssigned ? 'active' : ''}" 
                      data-date="${dateStr}" 
                      data-user-id="${u.id}" 
                      data-user-name="${u.full_name}"
                      ${clickHandler}
                      style="display: inline-block; cursor: ${editAllowed ? 'pointer' : 'default'}; padding: 4px 8px; margin: 3px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid ${isAssigned ? '#10b981' : '#e2e8f0'}; background: ${isAssigned ? '#ecfdf5' : '#f8fafc'}; color: ${isAssigned ? '#10b981' : '#64748b'}; transition: all 0.15s; user-select: none;">
                    ${isAssigned ? '🟢' : '⚪'} ${u.full_name}
                </span>
            `;
        }).join('');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 16px; font-weight: 700; color: #1e293b; vertical-align: middle;">
                    📅 CN, ${formattedDate}
                </td>
                <td style="padding: 12px 16px; vertical-align: middle;">
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${pillsHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleSundayStaffRoster(pill) {
    pill.classList.toggle('active');
    const isActive = pill.classList.contains('active');
    
    pill.style.border = `1px solid ${isActive ? '#10b981' : '#e2e8f0'}`;
    pill.style.background = isActive ? '#ecfdf5' : '#f8fafc';
    pill.style.color = isActive ? '#10b981' : '#64748b';
    
    const userName = pill.getAttribute('data-user-name') || '';
    pill.innerHTML = `${isActive ? '🟢' : '⚪'} ${userName}`;
    
    const dateStr = pill.getAttribute('data-date');
    const userId = Number(pill.getAttribute('data-user-id'));
    
    if (!_pancakeConfig.sunday_duty_schedule) _pancakeConfig.sunday_duty_schedule = {};
    if (!_pancakeConfig.sunday_duty_schedule[dateStr]) _pancakeConfig.sunday_duty_schedule[dateStr] = [];
    
    let arr = _pancakeConfig.sunday_duty_schedule[dateStr];
    if (isActive) {
        if (!arr.includes(userId)) arr.push(userId);
    } else {
        _pancakeConfig.sunday_duty_schedule[dateStr] = arr.filter(id => id !== userId);
    }
}

function addNextSundayRosterDate() {
    let lastSunday = new Date();
    if (_sundayRosterDates.length > 0) {
        const sorted = [..._sundayRosterDates].sort();
        const [y, m, d] = sorted[sorted.length - 1].split('-').map(Number);
        lastSunday = new Date(Date.UTC(y, m - 1, d));
    }
    
    const nextSunday = new Date(lastSunday);
    nextSunday.setDate(lastSunday.getDate() + 7);
    
    const y = nextSunday.getUTCFullYear();
    const m = String(nextSunday.getUTCMonth() + 1).padStart(2, '0');
    const d = String(nextSunday.getUTCDate()).padStart(2, '0');
    const nextSundayStr = `${y}-${m}-${d}`;
    
    if (!_sundayRosterDates.includes(nextSundayStr)) {
        _sundayRosterDates.push(nextSundayStr);
        _sundayRosterDates.sort();
        renderSundayRosterTableRows();
        showToast('➕ Đã thêm ngày Chủ Nhật tiếp theo!');
    }
}

async function saveSundayRosterFromModal() {
    try {
        await savePancakeConfigToDB();
        closeModal();
        showToast('✅ Đã lưu lịch trực Chủ Nhật thành công!');
    } catch (e) {
        showToast('Lỗi khi lưu lịch trực!', 'error');
    }
}
