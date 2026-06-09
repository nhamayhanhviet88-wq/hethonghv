// ========== KIỂM TRA CHẤT LƯỢNG — Desktop SPA Embed ==========

var _ktclState = {
    activeTab: '1',
    originalRecords: [],
    teams: [],
    contractors: [],
    holidays: [],
    search: '',
    teamFilter: '',
    contractorFilter: '',
    showDoneToday: false,
    showSimulator: false,
    currentRecordId: null
};

// Formatter Helpers
function _ktclFormatVnDate(dStr) {
    if (!dStr) return '—';
    try {
        const parts = dStr.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) {
        return dStr;
    }
}

function _ktclFormatVnDateTime(dStr) {
    if (!dStr) return '—';
    try {
        const dt = new Date(dStr);
        return dt.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        }).replace(',', '').trim();
    } catch(e) {
        return dStr;
    }
}

function _ktclGetVnTodayStr() {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function _ktclIsHolidayDate(dateStr) {
    return _ktclState.holidays.includes(dateStr);
}

// Render Page Entry Point
function renderKiemtrachatluongPage(content) {
    if (!document.getElementById('_ktclS')) {
        const st = document.createElement('style');
        st.id = '_ktclS';
        st.textContent = `
            .ktcl-page-wrapper {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 24px;
                background: #f8fafc;
                min-height: calc(100vh - 80px);
                font-family: 'Inter', sans-serif;
                color: #1e293b;
                box-sizing: border-box;
            }
            .ktcl-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
            }
            .ktcl-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .ktcl-header-icon {
                font-size: 28px;
            }
            .ktcl-title {
                font-size: 20px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
            }
            .ktcl-subtitle {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0;
            }
            .ktcl-btn-secondary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                color: #334155;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ktcl-btn-secondary:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .ktcl-body-container {
                display: flex;
                gap: 24px;
                align-items: flex-start;
                width: 100%;
            }
            .ktcl-audit-area {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .ktcl-kpi-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
            }
            .ktcl-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 14px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .ktcl-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .ktcl-kpi-card.active {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            .ktcl-kpi-icon {
                font-size: 24px;
                width: 44px;
                height: 44px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .kpi-tab-1 .ktcl-kpi-icon { background: #eff6ff; color: #2563eb; }
            .kpi-tab-2 .ktcl-kpi-icon { background: #fffbeb; color: #d97706; }
            .kpi-tab-3 .ktcl-kpi-icon { background: #fef2f2; color: #dc2626; }
            .kpi-tab-4 .ktcl-kpi-icon { background: #ecfdf5; color: #059669; }

            .ktcl-kpi-info {
                display: flex;
                flex-direction: column;
            }
            .ktcl-kpi-label {
                font-size: 9px;
                font-weight: 800;
                color: #64748b;
                letter-spacing: 0.5px;
            }
            .ktcl-kpi-val {
                font-size: 18px;
                font-weight: 900;
                color: #0f172a;
                margin-top: 2px;
            }
            .ktcl-metrics-summary {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 12px 20px;
                font-size: 12px;
                color: #475569;
            }
            .ktcl-metric-item {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ktcl-metric-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .ktcl-filter-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }
            .ktcl-search-wrapper input {
                width: 280px;
                padding: 8px 14px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                outline: none;
            }
            .ktcl-search-wrapper input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }
            .ktcl-filters-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ktcl-filters-group select {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                outline: none;
                background: white;
            }
            .ktcl-checkbox-wrapper {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                font-weight: 600;
                color: #334155;
                user-select: none;
                cursor: pointer;
            }
            .ktcl-table-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .ktcl-table-responsive {
                overflow-x: auto;
            }
            .ktcl-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                text-align: left;
            }
            .ktcl-table th {
                background: #f8fafc;
                color: #475569;
                font-weight: 700;
                padding: 12px 16px;
                border-bottom: 1.5px solid #e2e8f0;
                white-space: nowrap;
            }
            .ktcl-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: top;
            }
            .ktcl-table tr:hover {
                background: #f8fafc;
            }
            .ktcl-btn-sm {
                padding: 5px 10px;
                font-size: 10.5px;
                font-weight: 700;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                transition: all 0.15s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .ktcl-btn-primary { background: #3b82f6; color: white; }
            .ktcl-btn-primary:hover { background: #2563eb; }
            .ktcl-btn-danger { background: #ef4444; color: white; }
            .ktcl-btn-danger:hover { background: #dc2626; }
            .ktcl-btn-success { background: #10b981; color: white; }
            .ktcl-btn-success:hover { background: #059669; }
            .ktcl-btn-info { background: #6366f1; color: white; }
            .ktcl-btn-info:hover { background: #4f46e5; }
            .ktcl-btn-outline { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; }
            .ktcl-btn-outline:hover { background: #f1f5f9; }

            /* Badges */
            .ktcl-badge {
                display: inline-flex;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 800;
                line-height: 1;
            }
            .ktcl-badge-urgent { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
            .ktcl-badge-ship { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .ktcl-badge-normal { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }

            .ktcl-simulator-panel {
                width: 360px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: sticky;
                top: 20px;
            }
            .ktcl-phone-frame {
                width: 340px;
                height: 680px;
                background: #000;
                border-radius: 40px;
                border: 12px solid #27272a;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                position: relative;
                overflow: hidden;
            }
            .ktcl-phone-notch {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 140px;
                height: 20px;
                background: #27272a;
                border-radius: 0 0 14px 14px;
                z-index: 10;
            }
            .ktcl-phone-frame iframe {
                width: 100%;
                height: 100%;
                border: none;
            }
            .ktcl-simulator-label {
                margin-top: 12px;
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ktcl-simulator-dot {
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            .ktcl-qc-img-thumb {
                width: 36px;
                height: 36px;
                object-fit: cover;
                border-radius: 6px;
                border: 1px solid #cbd5e1;
                cursor: pointer;
                transition: all 0.15s;
            }
            .ktcl-qc-img-thumb:hover {
                transform: scale(1.1);
                border-color: #3b82f6;
            }
            .ktcl-timeline {
                display: flex;
                flex-direction: column;
                gap: 14px;
                position: relative;
                padding-left: 20px;
                border-left: 2px solid #e2e8f0;
                margin: 10px 0;
            }
            .ktcl-timeline-item {
                position: relative;
            }
            .ktcl-timeline-dot {
                position: absolute;
                left: -26px;
                top: 2px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #3b82f6;
                border: 2px solid white;
            }
            .ktcl-timeline-time {
                font-size: 10px;
                color: #94a3b8;
                font-weight: 700;
            }
            .ktcl-timeline-detail {
                font-size: 11.5px;
                color: #334155;
                margin-top: 2px;
            }
            .ktcl-timeline-user {
                font-weight: 800;
                color: #0d9488;
            }
            @media(max-width:900px){
                .ktcl-kpi-grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                }
                .ktcl-body-container {
                    flex-direction: column !important;
                }
                .ktcl-simulator-panel {
                    width: 100% !important;
                    position: static !important;
                }
            }
            @media(max-width:500px){
                .ktcl-kpi-grid {
                    grid-template-columns: 1fr !important;
                }
            }
        `;
        document.head.appendChild(st);
    }

    content.innerHTML = `
        <div class="ktcl-page-wrapper">
            <!-- Header Area -->
            <div class="ktcl-header">
                <div class="ktcl-header-left">
                    <span class="ktcl-header-icon">🔍</span>
                    <div>
                        <h1 class="ktcl-title">KIỂM TRA CHẤT LƯỢNG — Độc lập & Giám sát</h1>
                        <p class="ktcl-subtitle">Xem báo cáo chất lượng, tiến độ may và truy vết lịch sử nghiệp vụ</p>
                    </div>
                </div>
                <div class="ktcl-header-right">
                    <button class="ktcl-btn-secondary" onclick="_ktclToggleSimulator()">
                        📱 Trình Giả Lập Mobile
                    </button>
                </div>
            </div>

            <!-- Main Layout Container: split into main table and optional simulator -->
            <div class="ktcl-body-container">
                <!-- Main Audit Area -->
                <div class="ktcl-audit-area" id="ktclAuditArea">
                    <!-- KPI Cards Block -->
                    <div class="ktcl-kpi-grid">
                        <div class="ktcl-kpi-card kpi-tab-1 active" onclick="_ktclSwitchTab('1')" id="ktclKpiCard1">
                            <div class="ktcl-kpi-icon">📅</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">ĐẾN HẸN (TRONG NHÀ)</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab1">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-2" onclick="_ktclSwitchTab('2')" id="ktclKpiCard2">
                            <div class="ktcl-kpi-icon">⏳</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">ĐƠN HẸN LẠI (PHÒNG CHỜ)</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab2">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-3" onclick="_ktclSwitchTab('3')" id="ktclKpiCard3">
                            <div class="ktcl-kpi-icon">❌</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">CHƯA PHÂN TỔ MAY</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab3">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-4" onclick="_ktclSwitchTab('4')" id="ktclKpiCard4">
                            <div class="ktcl-kpi-icon">✅</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">CẦN KIỂM TRA / QC</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab4">0</div>
                            </div>
                        </div>
                    </div>

                    <!-- Audit Metrics Bar -->
                    <div class="ktcl-metrics-summary" id="ktclMetricsSummary">
                        <!-- Filled on data load -->
                    </div>

                    <!-- Filters Bar -->
                    <div class="ktcl-filter-bar">
                        <div class="ktcl-search-wrapper">
                            <input type="text" id="ktclSearch" placeholder="Tìm theo mã đơn, sản phẩm..." oninput="_ktclHandleSearch(this.value)">
                        </div>
                        <div class="ktcl-filters-group">
                            <select id="ktclTeamFilter" onchange="_ktclFilterTeam(this.value)">
                                <option value="">-- Tất cả Tổ May --</option>
                            </select>
                            <select id="ktclContractorFilter" onchange="_ktclFilterContractor(this.value)">
                                <option value="">-- Tất cả Nhà Gia Công --</option>
                            </select>
                            <div class="ktcl-checkbox-wrapper" id="ktclDoneTodayWrapper" style="display:none;">
                                <input type="checkbox" id="ktclShowDoneToday" onchange="_ktclToggleShowDoneToday(this.checked)">
                                <label for="ktclShowDoneToday">Xem đơn đã xong hôm nay</label>
                            </div>
                        </div>
                    </div>

                    <!-- Records Table Card -->
                    <div class="ktcl-table-card">
                        <div class="ktcl-table-responsive">
                            <table class="ktcl-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50px; text-align: center;">STT</th>
                                        <th style="text-align: center; white-space: nowrap;">Thao Tác</th>
                                        <th style="text-align: left; white-space: nowrap;">Mã Đơn / Sản Phẩm / CSKH</th>
                                        <th style="text-align: left; white-space: nowrap;">Kỹ Thuật / Vải / Màu</th>
                                        <th style="text-align: center; white-space: nowrap; width: 120px;">SL Đơn / SL May</th>
                                        <th style="text-align: left; white-space: nowrap;">Phân Công Cho</th>
                                        <th style="text-align: center; white-space: nowrap; width: 120px;">Hạn Trả / QLX Hẹn</th>
                                        <th style="text-align: center; white-space: nowrap; width: 100px;">QC / Lương</th>
                                        <th style="text-align: left; white-space: nowrap; width: 150px;">Ghi Chú & Ảnh QC</th>
                                    </tr>
                                </thead>
                                <tbody id="ktclTableBody">
                                    <tr>
                                        <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                                            ⏳ Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Collapsible Phone Simulator Panel -->
                <div class="ktcl-simulator-panel" id="ktclSimulatorPanel" style="display: none;">
                    <div class="ktcl-phone-frame">
                        <div class="ktcl-phone-notch"></div>
                        <iframe src="/m/kiemtrachatluong" title="Mobile QC Simulator"></iframe>
                    </div>
                    <div class="ktcl-simulator-label">
                        <div class="ktcl-simulator-dot"></div>
                        <span>Trình giả lập Kiểm tra chất lượng (Mobile View)</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Trigger initial data load
    _ktclLoadInitialData().then(() => {
        _ktclLoadData();
    });
}

// Initial Data loaders
async function _ktclLoadInitialData() {
    try {
        const [teamRes, contractorRes] = await Promise.all([
            apiCall('/api/sewing/teams').catch(() => ({ teams: [] })),
            apiCall('/api/sewing/contractors').catch(() => ({ contractors: [] }))
        ]);
        _ktclState.teams = teamRes.teams || [];
        _ktclState.contractors = contractorRes.contractors || [];
        
        await _ktclLoadHolidays();
        _ktclPopulateDropdowns();
    } catch(err) {
        console.error('Lỗi tải dữ liệu ban đầu:', err);
    }
}

async function _ktclLoadHolidays() {
    try {
        const currentYear = new Date().getFullYear();
        const [h1, h2] = await Promise.all([
            apiCall(`/api/holidays?year=${currentYear}`).catch(() => ({ holidays: [] })),
            apiCall(`/api/holidays?year=${currentYear + 1}`).catch(() => ({ holidays: [] }))
        ]);
        _ktclState.holidays = [
            ...(h1.holidays || []),
            ...(h2.holidays || [])
        ].map(h => {
            if (!h.holiday_date) return '';
            return typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : '';
        }).filter(Boolean);
    } catch(e) {
        console.error('Lỗi tải danh sách ngày lễ:', e);
    }
}

function _ktclPopulateDropdowns() {
    const teamSelect = document.getElementById('ktclTeamFilter');
    if (teamSelect) {
        teamSelect.innerHTML = '<option value="">-- Tất cả Tổ May --</option>' + 
            _ktclState.teams.map(t => `<option value="${t.id}">👥 ${t.name}</option>`).join('');
    }
    
    const contractorSelect = document.getElementById('ktclContractorFilter');
    if (contractorSelect) {
        contractorSelect.innerHTML = '<option value="">-- Tất cả Nhà Gia Công --</option>' + 
            _ktclState.contractors.map(c => `<option value="${c.id}">🏭 ${c.name}</option>`).join('');
    }
}

// Switch tabs and load corresponding tab records
function _ktclSwitchTab(tab) {
    _ktclState.activeTab = tab;
    
    // Toggle active classes on KPI cards
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`ktclKpiCard${i}`);
        if (el) {
            if (String(i) === tab) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    }
    
    // Show/hide done today checkbox
    const wrapper = document.getElementById('ktclDoneTodayWrapper');
    if (wrapper) {
        wrapper.style.display = tab === '4' ? 'flex' : 'none';
    }
    
    _ktclLoadData();
}

async function _ktclLoadData() {
    try {
        // Load counts for badges
        const countTabs = ['1', '2', '3', '4'];
        const results = await Promise.all(countTabs.map(t => apiCall(`/api/sewing/records?tab=${t}`)));
        
        for (let i = 0; i < countTabs.length; i++) {
            const count = results[i].records ? results[i].records.length : 0;
            const el = document.getElementById(`ktclCountTab${countTabs[i]}`);
            if (el) el.textContent = count;
        }

        // Load active tab records
        let url = `/api/sewing/records?tab=${_ktclState.activeTab}`;
        if (_ktclState.activeTab === '4' && _ktclState.showDoneToday) {
            url += `&status=done_today`;
        }
        const res = await apiCall(url);
        _ktclState.originalRecords = res.records || [];
        
        _ktclRenderTable();
        _ktclRenderMetrics();
    } catch(err) {
        console.error('Lỗi tải dữ liệu:', err);
        showToast(err.message || 'Lỗi tải dữ liệu', 'error');
    }
}

// Render Metrics & KPIs block
function _ktclRenderMetrics() {
    const todayStr = _ktclGetVnTodayStr();
    const records = _ktclState.originalRecords;
    
    const total = records.length;
    const overdue = records.filter(r => !r.done_date && r.expected_date && r.expected_date.split('T')[0] < todayStr).length;
    const errorCount = records.filter(r => r.error_reported).length;
    const doneToday = records.filter(r => r.done_date && r.done_date.split('T')[0] === todayStr).length;
    
    let html = `
        <div class="ktcl-metric-item">
            <span class="ktcl-metric-dot" style="background: #3b82f6;"></span>
            <span>Tổng số đơn: <strong>${total}</strong></span>
        </div>
        <div class="ktcl-metric-item" style="margin-left: 20px;">
            <span class="ktcl-metric-dot" style="background: #ef4444;"></span>
            <span>Đơn trễ hẹn: <strong style="color: #ef4444;">${overdue}</strong></span>
        </div>
        <div class="ktcl-metric-item" style="margin-left: 20px;">
            <span class="ktcl-metric-dot" style="background: #f59e0b;"></span>
            <span>Đơn lỗi nội bộ: <strong style="color: #d97706;">${errorCount}</strong></span>
        </div>
    `;
    if (_ktclState.activeTab === '4') {
        html += `
            <div class="ktcl-metric-item" style="margin-left: 20px;">
                <span class="ktcl-metric-dot" style="background: #10b981;"></span>
                <span>QC hoàn thành hôm nay: <strong style="color: #10b981;">${doneToday}</strong></span>
            </div>
        `;
    }
    
    const el = document.getElementById('ktclMetricsSummary');
    if (el) el.innerHTML = html;
}

// Render Records Table
function _ktclRenderTable() {
    const body = document.getElementById('ktclTableBody');
    if (!body) return;
    
    let filtered = _ktclState.originalRecords.slice();
    
    // Apply search filter
    if (_ktclState.search) {
        const q = _ktclState.search.toLowerCase().trim();
        filtered = filtered.filter(r => 
            (r.order_code || '').toLowerCase().includes(q) ||
            (r.product_name || '').toLowerCase().includes(q) ||
            (r.cut_product_name || '').toLowerCase().includes(q)
        );
    }
    
    // Apply team filter
    if (_ktclState.teamFilter) {
        filtered = filtered.filter(r => String(r.sewing_team_id) === String(_ktclState.teamFilter));
    }
    
    // Apply contractor filter
    if (_ktclState.contractorFilter) {
        filtered = filtered.filter(r => String(r.contractor_id) === String(_ktclState.contractorFilter));
    }
    
    if (!filtered.length) {
        body.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                    📭 Không tìm thấy đơn hàng nào khớp bộ lọc.
                </td>
            </tr>
        `;
        return;
    }
    
    body.innerHTML = filtered.map((r, idx) => {
        // Actions cell
        let actionsHtml = '';
        if (_ktclState.activeTab === '1' || _ktclState.activeTab === '2') {
            actionsHtml = `
                <button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclOpenHenLai(${r.id})" style="justify-content:center; white-space:nowrap;">
                    📅 Hẹn Lại
                </button>
                <button class="ktcl-btn-sm ktcl-btn-danger" onclick="_ktclReportError(${r.id})" style="justify-content:center; white-space:nowrap;">
                    ⚠️ Báo Lỗi
                </button>
            `;
        } else if (_ktclState.activeTab === '3') {
            actionsHtml = `
                <button class="ktcl-btn-sm ktcl-btn-primary" onclick="_ktclOpenPhanTo(${r.id})" style="justify-content:center; white-space:nowrap;">
                    👥 Phân Tổ
                </button>
            `;
        } else if (_ktclState.activeTab === '4') {
            const isDone = !!r.done_date;
            actionsHtml = `
                <button class="ktcl-btn-sm ktcl-btn-success" onclick="_ktclOpenQCModal(${r.id})" style="justify-content:center; white-space:nowrap;">
                    🔍 QC & Nghiệm Thu
                </button>
                ${isDone ? 
                    `<button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclToggleDone(${r.id}, 'undo_done')" style="justify-content:center; white-space:nowrap;">
                        ↩️ Hoàn Tác
                    </button>` : 
                    `<button class="ktcl-btn-sm ktcl-btn-primary" onclick="_ktclToggleDone(${r.id}, 'mark_done')" style="justify-content:center; white-space:nowrap;">
                        ✅ Xong May
                    </button>`
                }
            `;
        }
        
        // Add audit history button to all rows
        actionsHtml += `
            <button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclOpenHistory(${r.id})" style="justify-content:center; white-space:nowrap;">
                📜 Lịch Sử
            </button>
        `;
        
        // Wrap everything in a nowrap flex container
        actionsHtml = `<div style="display:flex; gap:6px; align-items:center; justify-content:center; white-space:nowrap;">${actionsHtml}</div>`;
        
        // Order Info
        const priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
        let priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span class="ktcl-badge ktcl-badge-urgent">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span class="ktcl-badge ktcl-badge-ship">Gửi</span>';
        } else {
            priBadge = '<span class="ktcl-badge ktcl-badge-normal">Chuẩn</span>';
        }
        
        const prodName = r.cut_product_name || r.product_name || '—';
        const orderInfoHtml = `
            <div style="font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
                ${priBadge}
                <span>${r.order_code || '—'}</span>
            </div>
            <div style="font-weight: 600; color: #334155; margin-top: 4px; font-size:11.5px;">${prodName}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">CSKH: <strong>${r.cskh_name || '—'}</strong></div>
        `;
        
        // Fabrics / techniques info
        const fabricInfoHtml = `
            <div style="color: #475569;">Vải: <strong>${r.material_name || '—'}</strong></div>
            <div style="color: #475569; margin-top: 2px;">Màu: <strong>${r.color_name || '—'}</strong></div>
            <div style="color: #0f766e; margin-top: 2px; font-size: 11px;">Kỹ thuật: <strong>${r.sewing_techniques || '—'}</strong></div>
        `;
        
        // Quantities
        const qtyHtml = `
            <div style="font-size: 13px; font-weight: 800; color: #2563eb; text-align: center;">${r.order_qty || r.quantity}</div>
            <div style="font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #e2e8f0; margin-top: 4px; padding-top: 4px;">
                May: <strong style="color: #059669;">${r.quantity}</strong>
            </div>
        `;
        
        // Assigned to (Team or Contractor)
        let assignedHtml = '';
        if (r.contractor_id) {
            assignedHtml = `<span style="background: #f5f5f4; color: #44403c; border: 1px solid #e7e5e4; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">🏭 ${r.contractor_name || 'Gia công'}</span>`;
        } else if (r.sewing_team_id) {
            assignedHtml = `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">👥 ${r.sewer_name || 'Tổ may'}</span>`;
        } else {
            assignedHtml = `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">❌ Chưa phân tổ</span>`;
        }
        
        // Dates
        const datesHtml = `
            <div style="font-size: 11px; color: #475569; text-align: center;">
                Hẹn trả: <strong>${_ktclFormatVnDate(r.expected_ship_date || r.shipping_date)}</strong>
            </div>
            <div style="font-size: 11px; color: #4f46e5; text-align: center; font-weight: 700; margin-top: 4px;">
                QLX Hẹn: <strong>${_ktclFormatVnDate(r.expected_date)}</strong>
            </div>
            ${r.done_date ? 
                `<div style="font-size: 10px; color: #059669; text-align: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; margin-top: 6px; padding: 2px 4px; font-weight: 700;">
                    Xong: ${_ktclFormatVnDate(r.done_date)}
                </div>` : ''
            }
        `;
        
        // QC / Salary info
        const qcHtml = `
            <div style="font-weight: 700; color: #b91c1c;">${r.checked_price ? r.checked_price.toLocaleString('vi-VN') + ' đ' : '—'}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Lương: <strong style="color: #0d9488;">${r.salary ? r.salary.toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong>
            </div>
            ${r.salary_approved ? 
                `<div style="font-size: 9px; color: #2563eb; font-weight: 700; margin-top: 2px;">✓ Đã tính lương</div>` : ''
            }
        `;
        
        // Notes and QC photos
        let imagesHtml = '—';
        try {
            const imgs = JSON.parse(r.finish_images || '[]');
            if (imgs.length > 0) {
                imagesHtml = `
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                        ${imgs.map(src => `<img src="${src}" class="ktcl-qc-img-thumb" onclick="_ktclViewFullImage('${src}', ${r.id})">`).join('')}
                    </div>
                `;
            }
        } catch(e) {}
        
        const notesHtml = `
            <div style="font-size: 11px; max-width: 250px; word-break: break-word;">
                ${r.notes ? `<div style="color: #334155; margin-bottom: 4px;">📝 <strong>QC:</strong> ${r.notes}</div>` : ''}
                ${r.sewing_details ? `<div style="color: #0f766e; font-style: italic;">🧵 <strong>Chi tiết:</strong> ${r.sewing_details}</div>` : ''}
                ${!r.notes && !r.sewing_details ? '<span style="color:#94a3b8; font-style:italic;">Không có ghi chú</span>' : ''}
            </div>
            ${imagesHtml !== '—' ? imagesHtml : ''}
        `;
        
        return `
            <tr>
                <td style="text-align: center; font-weight: 700; color: #94a3b8; vertical-align: middle;">${idx + 1}</td>
                <td style="text-align: center; vertical-align: middle;">${actionsHtml}</td>
                <td>${orderInfoHtml}</td>
                <td>${fabricInfoHtml}</td>
                <td style="vertical-align: middle;">${qtyHtml}</td>
                <td style="vertical-align: middle;">${assignedHtml}</td>
                <td style="vertical-align: middle;">${datesHtml}</td>
                <td style="vertical-align: middle;">${qcHtml}</td>
                <td>${notesHtml}</td>
            </tr>
        `;
    }).join('');
}

// Advanced Audit History logger popup
async function _ktclOpenHistory(recordId) {
    try {
        const res = await apiCall(`/api/sewing/history/${recordId}`);
        const list = res.history || [];
        
        let timelineHtml = '';
        if (list.length === 0) {
            timelineHtml = '<div style="text-align:center; padding:20px; color:#64748b;">Chưa có lịch sử cập nhật cho đơn hàng này.</div>';
        } else {
            timelineHtml = `
                <div class="ktcl-timeline">
                    ${list.map(h => `
                        <div class="ktcl-timeline-item">
                            <div class="ktcl-timeline-dot"></div>
                            <div class="ktcl-timeline-time">${_ktclFormatVnDateTime(h.performed_at)}</div>
                            <div class="ktcl-timeline-detail">
                                <span class="ktcl-timeline-user">${h.performer_name || 'Hệ thống'}</span>: 
                                <strong>${h.details || h.action}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        const modalHtml = `
            <div class="bpm-modal-overlay show" id="ktclHistoryModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">
                <div style="background:#fff;border-radius:16px;width:550px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                        <div style="font-weight:800; font-size:15px;">📜 LỊCH SỬ CHI TIẾT ĐƠN MAY #${recordId}</div>
                        <button onclick="_ktclCloseModal('ktclHistoryModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:24px; max-height:60vh; overflow-y:auto;">
                        ${timelineHtml}
                    </div>
                    <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:right;">
                        <button onclick="_ktclCloseModal('ktclHistoryModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        
        _ktclCloseModal('ktclHistoryModal');
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch(err) {
        showToast('Không tải được lịch sử: ' + err.message, 'error');
    }
}

// Modal closing helper
function _ktclCloseModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Reschedule Modal
function _ktclOpenHenLai(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    const expectedVal = r.expected_date ? r.expected_date.split('T')[0] : '';
    const todayStr = _ktclGetVnTodayStr();
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclHenLaiModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;">
            <div style="background:#fff;border-radius:16px;width:400px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:15px;">📅 LÙI LỊCH HẸN ĐƠN HÀNG</div>
                    <button onclick="_ktclCloseModal('ktclHenLaiModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px; font-size:13px; color:#334155;">
                    <div style="margin-bottom:12px;"><strong>Mã Đơn:</strong> ${r.order_code || '—'}</div>
                    <div style="margin-bottom:16px;"><strong>Sản phẩm:</strong> ${r.product_name || '—'}</div>
                    
                    <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">CHỌN NGÀY HẸN MỚI</label>
                    <input type="date" id="ktclNewDate" min="${todayStr}" value="${expectedVal}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; box-sizing:border-box;">
                </div>
                <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="_ktclCloseModal('ktclHenLaiModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    <button onclick="_ktclSubmitHenLai()" class="ktcl-btn-sm ktcl-btn-primary" style="padding:8px 20px;">Lưu Hẹn</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclHenLaiModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Bind change listener for inline warning
    const dateInput = document.getElementById('ktclNewDate');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const val = this.value;
            if (!val) return;
            if (val < todayStr) {
                showToast('Chỉ được hẹn từ ngày hôm nay trở đi!', 'error');
                this.value = '';
                return;
            }
            if (_ktclIsHolidayDate(val)) {
                showToast('Không được chọn ngày nghỉ lễ!', 'error');
                this.value = '';
                return;
            }
        });
    }
}

async function _ktclSubmitHenLai() {
    const val = document.getElementById('ktclNewDate').value;
    if (!val) {
        showToast('Vui lòng chọn ngày hẹn mới', 'error');
        return;
    }
    
    const todayStr = _ktclGetVnTodayStr();
    if (val < todayStr) {
        showToast('Chỉ được hẹn từ ngày hôm nay trở đi!', 'error');
        return;
    }
    if (_ktclIsHolidayDate(val)) {
        showToast('Không được chọn ngày nghỉ lễ!', 'error');
        return;
    }
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'expected_date',
            value: val
        });
        showToast('Cập nhật lịch hẹn thành công!');
        _ktclCloseModal('ktclHenLaiModal');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi cập nhật', 'error');
    }
}

// Phân Tổ Modal
function _ktclOpenPhanTo(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    
    const currentTeamId = r.sewing_team_id || '';
    const currentContractorId = r.contractor_id || '';
    
    const teamOpts = _ktclState.teams.map(t => {
        const selected = String(t.id) === String(currentTeamId) && !currentContractorId ? 'selected' : '';
        return `<option value="team_${t.id}" ${selected}>👥 Tổ: ${t.name}</option>`;
    }).join('');
    
    const contractorOpts = _ktclState.contractors.map(c => {
        const selected = String(c.id) === String(currentContractorId) ? 'selected' : '';
        return `<option value="contractor_${c.id}" ${selected}>🏭 Gia công: ${c.name}</option>`;
    }).join('');
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclPhanToModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;">
            <div style="background:#fff;border-radius:16px;width:400px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:15px;">👥 BÀN GIAO & PHÂN TỔ MAY</div>
                    <button onclick="_ktclCloseModal('ktclPhanToModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px; font-size:13px; color:#334155;">
                    <div style="margin-bottom:12px;"><strong>Mã Đơn:</strong> ${r.order_code || '—'}</div>
                    <div style="margin-bottom:16px;"><strong>Sản phẩm:</strong> ${r.product_name || '—'}</div>
                    
                    <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">CHỌN ĐƠN VỊ THỰC HIỆN</label>
                    <select id="ktclPhanToSelect" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; background:white; box-sizing:border-box;">
                        <option value="">-- Chưa Phân Tổ --</option>
                        <optgroup label="Tổ May Trong Xưởng">
                            ${teamOpts}
                        </optgroup>
                        <optgroup label="Nhà Gia Công Ngoài">
                            ${contractorOpts}
                        </optgroup>
                    </select>
                </div>
                <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="_ktclCloseModal('ktclPhanToModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    <button onclick="_ktclSubmitPhanTo()" class="ktcl-btn-sm ktcl-btn-primary" style="padding:8px 20px;">Lưu Phân Phối</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclPhanToModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _ktclSubmitPhanTo() {
    const selectVal = document.getElementById('ktclPhanToSelect').value;
    
    let field = 'sewing_team_id';
    let value = null;
    
    if (selectVal.startsWith('team_')) {
        field = 'sewing_team_id';
        value = parseInt(selectVal.replace('team_', ''));
    } else if (selectVal.startsWith('contractor_')) {
        field = 'contractor_id';
        value = parseInt(selectVal.replace('contractor_', ''));
    }
    
    try {
        if (field === 'sewing_team_id') {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'contractor_id', value: null });
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'sewing_team_id', value: value });
        } else {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'sewing_team_id', value: null });
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'contractor_id', value: value });
        }
        
        showToast('Phân công thành công!');
        _ktclCloseModal('ktclPhanToModal');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi phân công', 'error');
    }
}

// QC / Audit Modal (Checked price, notes, images upload/delete)
function _ktclOpenQCModal(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    
    const assignee = r.contractor_id ? `🏭 ${r.contractor_name}` : (r.sewer_name ? `👥 ${r.sewer_name}` : '—');
    
    // Preview images
    let imagesHtml = '';
    try {
        const imgs = JSON.parse(r.finish_images || '[]');
        if (imgs.length > 0) {
            imagesHtml = imgs.map(src => `
                <div style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1;">
                    <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                    <button onclick="_ktclDeleteQCImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(239,68,68,0.85); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700;">✕</button>
                </div>
            `).join('');
        }
    } catch(e) {}
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclQCModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:60px;overflow-y:auto">
            <div style="background:#fff;border-radius:16px;width:500px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:15px;">🔍 KIỂM TRA CHẤT LƯỢNG & NGHIỆM THU</div>
                    <button onclick="_ktclCloseModal('ktclQCModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px; font-size:13px; color:#334155;">
                    <div style="margin-bottom:12px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div><strong>Mã Đơn:</strong> ${r.order_code || '—'}</div>
                        <div><strong>Số lượng:</strong> ${r.quantity}</div>
                    </div>
                    <div style="margin-bottom:16px;"><strong>Đơn vị thực hiện:</strong> ${assignee}</div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">ĐƠN GIÁ QC / KIỂM TRA (đ)</label>
                        <input type="number" id="ktclCheckedPriceInput" value="${r.checked_price || ''}" placeholder="Nhập đơn giá QC..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; box-sizing:border-box;">
                    </div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">GHI CHÚ QC</label>
                        <textarea id="ktclNotesInput" placeholder="Nhập ghi chú kiểm tra chất lượng..." style="width:100%; height:80px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; resize:none; box-sizing:border-box;">${r.notes || ''}</textarea>
                    </div>
                    
                    <div>
                        <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">ẢNH THỰC TẾ NGHIỆM THU</label>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;" id="ktclQCImagesContainer">
                            ${imagesHtml || '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh chụp thực tế.</span>'}
                        </div>
                        
                        <div style="background:#f8fafc; border: 1.5px dashed #cbd5e1; border-radius:8px; padding:16px; text-align:center; cursor:pointer;" onclick="document.getElementById('ktclQCFileInput').click()">
                            <span style="font-size:20px; display:block; margin-bottom:4px;">📸</span>
                            <span style="font-size:12px; font-weight:700; color:#3b82f6;">Tải ảnh từ máy tính</span>
                            <input type="file" multiple id="ktclQCFileInput" accept="image/*" style="display:none;" onchange="_ktclUploadQCImages(event)">
                        </div>
                        <div id="ktclUploadStatus" style="font-size:11px; color:#64748b; margin-top:6px; text-align:center;"></div>
                    </div>
                </div>
                <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="_ktclCloseModal('ktclQCModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    <button onclick="_ktclSubmitQC()" class="ktcl-btn-sm ktcl-btn-success" style="padding:8px 20px;">💾 Lưu Thông Tin</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclQCModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _ktclUploadQCImages(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
        fd.append('file', files[i]);
    }
    
    const statusEl = document.getElementById('ktclUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        
        const res = await fetch(`/api/sewing/records/${_ktclState.currentRecordId}/images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');
        
        showToast('Tải ảnh thành công!');
        if (statusEl) statusEl.textContent = `Đã tải lên ${data.images.length} ảnh.`;
        
        const container = document.getElementById('ktclQCImagesContainer');
        if (container) {
            container.innerHTML = data.images.map(src => `
                <div style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1;">
                    <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                    <button onclick="_ktclDeleteQCImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(239,68,68,0.85); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700;">✕</button>
                </div>
            `).join('');
        }
        
        const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(data.images);
        
    } catch(err) {
        showToast(err.message || 'Lỗi tải lên', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

async function _ktclDeleteQCImage(imgSrc) {
    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    if (!r) return;
    
    let currentImgs = [];
    try {
        currentImgs = JSON.parse(r.finish_images || '[]');
    } catch(e) {}
    
    const updatedImgs = currentImgs.filter(src => src !== imgSrc);
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'finish_images',
            value: JSON.stringify(updatedImgs)
        });
        
        r.finish_images = JSON.stringify(updatedImgs);
        showToast('Đã xóa ảnh.');
        
        const container = document.getElementById('ktclQCImagesContainer');
        if (container) {
            if (updatedImgs.length === 0) {
                container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh chụp thực tế.</span>';
            } else {
                container.innerHTML = updatedImgs.map(src => `
                    <div style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1;">
                        <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                        <button onclick="_ktclDeleteQCImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(239,68,68,0.85); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700;">✕</button>
                    </div>
                `).join('');
            }
        }
    } catch(err) {
        showToast('Lỗi khi xóa ảnh: ' + err.message, 'error');
    }
}

async function _ktclSubmitQC() {
    const checkedPrice = document.getElementById('ktclCheckedPriceInput').value;
    const notes = document.getElementById('ktclNotesInput').value;
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'checked_price',
            value: checkedPrice ? Number(checkedPrice) : null
        });
        
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'notes',
            value: notes || null
        });
        
        showToast('Lưu thông tin QC thành công!');
        _ktclCloseModal('ktclQCModal');
        await _ktclLoadData();
    } catch(err) {
        showToast('Lỗi khi lưu thông tin QC: ' + err.message, 'error');
    }
}

// Complete sewing done / Undo done
async function _ktclToggleDone(recordId, action) {
    if (action === 'mark_done') {
        const r = _ktclState.originalRecords.find(x => x.id === recordId);
        if (r && (!r.checked_price || Number(r.checked_price) <= 0)) {
            _ktclOpenQCModal(recordId);
            showToast('Vui lòng nhập Giá Kiểm Tra trước khi hoàn thành đơn!', 'error');
            return;
        }
    }
    
    try {
        await apiCall(`/api/sewing/toggle/${recordId}`, 'POST', { action });
        showToast(action === 'mark_done' ? '✅ Đã hoàn thành đơn may!' : '↩️ Đã hoàn tác!');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

// Report Error Action (Redirects to internal/customer error list page)
function _ktclReportError(recordId) {
    if (typeof navigate === 'function') {
        navigate('don-loi-khach-hang');
        showToast('📋 Chuyển sang Đơn Lỗi');
    }
}

// Image Viewer Modal
function _ktclViewFullImage(src, recordId) {
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclImageOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:40px;">
            <div style="position:relative; max-width:90vw; max-height:90vh; text-align:center;">
                <img src="${src}" style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:8px; border:3px solid white; box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <div style="margin-top:12px; color:white; font-size:13px; font-weight:700;">Ảnh chụp thực tế đơn may #${recordId}</div>
                <button onclick="_ktclCloseModal('ktclImageOverlay')" style="position:absolute; top:-30px; right:0; background:none; border:none; color:white; font-size:24px; cursor:pointer; font-weight:700;">✕</button>
            </div>
        </div>
    `;
    _ktclCloseModal('ktclImageOverlay');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Toggle Simulator Panel
function _ktclToggleSimulator() {
    _ktclState.showSimulator = !_ktclState.showSimulator;
    const panel = document.getElementById('ktclSimulatorPanel');
    const button = document.querySelector('.ktcl-btn-secondary');
    if (panel) {
        if (_ktclState.showSimulator) {
            panel.style.display = 'flex';
            if (button) button.style.background = '#cbd5e1';
        } else {
            panel.style.display = 'none';
            if (button) button.style.background = '#ffffff';
        }
    }
}

// Filters listeners
function _ktclHandleSearch(val) {
    _ktclState.search = val;
    _ktclRenderTable();
}

function _ktclFilterTeam(val) {
    _ktclState.teamFilter = val;
    _ktclRenderTable();
}

function _ktclFilterContractor(val) {
    _ktclState.contractorFilter = val;
    _ktclRenderTable();
}

function _ktclToggleShowDoneToday(checked) {
    _ktclState.showDoneToday = checked;
    _ktclLoadData();
}
