function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _tkaGetAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
    if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

window.renderThongkeadsPage = function(container) {
    // State
    let _accounts = [];
    let _selectedAccountIds = []; // [] = Tất cả tài khoản, hoặc ['1', '2', '3']
    let _selectedLinhVuc = 'all'; // 'all' hoặc tên Lĩnh Vực Ads
    let _linhVucList = [];
    let _filterMode = 'month'; // 'month', 'quarter', 'daterange'
    let _selectedYear = new Date().getFullYear();
    let _selectedMonth = new Date().getMonth() + 1;
    let _selectedQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    let _startDate = null; // 'YYYY-MM-DD'
    let _endDate = null;   // 'YYYY-MM-DD'

    // View Mode state ('campaign' = Tổng hợp camp hiệu quả, 'daily' = Thống kê chi tiết theo ngày)
    let _viewMode = 'campaign';

    // Daily Sort state
    let _sortColumn = null; // 'report_date', 'spend', 'messages', 'cpa', 'ctr', 'cpm', 'run_count', 'is_effective', 'campaign_name', 'campaign_id', 'link_post_id'
    let _sortDir = 'desc'; // 'asc' or 'desc'

    // Campaign Summary State
    let _campaigns = [];
    let _campSortColumn = 'effective_rate';
    let _campSortDir = 'desc';

    let _stats = [];
    let _summary = {};
    let _searchQuery = '';
    let _currentPage = 1;
    let _totalRecords = 0;
    let _isGD = false;

    // Check role
    try {
        const u = window.__currentUser || window._currentUser;
        if (u) {
            const r = (u.role || '').toLowerCase();
            _isGD = r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!u.is_admin;
        }
    } catch(e) {}

    container.innerHTML = `
        <div id="thongkeads-root" style="padding: 16px 20px; width: 100%; max-width: 100%; box-sizing: border-box;">
            <!-- Header -->
            <div id="tka-header" style="
                background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%);
                border-radius: 20px;
                padding: 32px;
                color: white;
                margin-bottom: 24px;
                box-shadow: 0 20px 40px -12px rgba(67, 56, 202, 0.4);
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="
                                background: rgba(255,255,255,0.15);
                                backdrop-filter: blur(10px);
                                padding: 6px 14px;
                                border-radius: 20px;
                                font-size: 12px;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">📊 Bộ Phận Marketing Ads</span>
                        </div>
                        <h2 style="margin: 12px 0 8px; font-size: 28px; font-weight: 800;">
                            📊 Thống Kê Camp Hiệu Quả
                        </h2>
                        <p style="margin: 0; opacity: 0.85; font-size: 15px; line-height: 1.6;">
                            Thống kê và phân tích hiệu quả các Chiến Dịch Quảng Cáo — tự động đồng bộ từ Meta Ads API.
                        </p>
                    </div>
                    ${_isGD ? `
                    <a href="/caidattaikhoanads" target="_blank" style="
                        font-family: inherit; padding: 12px 22px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
                        color: white; font-size: 14px; font-weight: 800; text-decoration: none;
                        display: inline-flex; align-items: center; gap: 8px;
                        transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    " onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                        <span>⚙️</span> Cài Đặt Tài Khoản Ads ↗
                    </a>
                    ` : ''}
                </div>
            </div>

            <!-- Platform Tabs -->
            <div id="tka-platform-tabs" style="
                display: flex; gap: 12px; margin-bottom: 20px;
            ">
                <button class="tka-platform-btn active" data-platform="facebook" style="
                    flex: 1; padding: 14px 20px; border-radius: 14px; border: 2px solid #1877f2;
                    background: #1877f2; color: white; font-size: 15px; font-weight: 700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.2s;
                ">📘 Facebook</button>
                <button class="tka-platform-btn" data-platform="tiktok" style="
                    flex: 1; padding: 14px 20px; border-radius: 14px; border: 2px solid #e2e8f0;
                    background: #f8fafc; color: #94a3b8; font-size: 15px; font-weight: 700;
                    cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.2s;
                ">🎵 TikTok <span style="font-size:11px;background:#e2e8f0;padding:2px 8px;border-radius:10px;margin-left:4px;">Sắp ra mắt</span></button>
                <button class="tka-platform-btn" data-platform="youtube" style="
                    flex: 1; padding: 14px 20px; border-radius: 14px; border: 2px solid #e2e8f0;
                    background: #f8fafc; color: #94a3b8; font-size: 15px; font-weight: 700;
                    cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.2s;
                ">▶️ YouTube <span style="font-size:11px;background:#e2e8f0;padding:2px 8px;border-radius:10px;margin-left:4px;">Sắp ra mắt</span></button>
            </div>

            <!-- Platform Content -->
            <div id="tka-facebook-content">
                <!-- Tracked Accounts Section -->
                <div id="tka-account-section" style="
                    background: white; border-radius: 20px; border: 1px solid #e2e8f0;
                    padding: 24px; margin-bottom: 24px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 22px;">📡</span>
                            <div>
                                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                    Danh Sách Tài Khoản Quảng Cáo Đang Theo Dõi
                                    <span id="tka-account-count-badge" style="background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 12px; padding: 3px 10px; border-radius: 20px; border: 1px solid #bfdbfe;">0 TK</span>
                                </h3>
                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Bấm vào thẻ tài khoản bên dưới để xem riêng thống kê hiệu quả của tài khoản đó.</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="font-weight: 700; font-size: 13px; color: #475569; white-space: nowrap;">🏢 Lĩnh Vực Ads:</label>
                                <select id="tka-linh-vuc-select" onchange="window._tkaSelectLinhVuc(this.value)" style="
                                    padding: 8px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; background: #f8fafc; color: #0f172a;
                                    outline: none; cursor: pointer;
                                ">
                                    <option value="all">🏢 Tất cả Lĩnh Vực Ads</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="font-weight: 700; font-size: 13px; color: #475569; white-space: nowrap;">Lọc TK:</label>
                                <select id="tka-account-select" onchange="window._tkaToggleAcc(this.value)" style="
                                    padding: 8px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; background: #eff6ff; color: #1d4ed8;
                                    outline: none; cursor: pointer;
                                ">
                                    <option value="all">📋 Tất cả tài khoản</option>
                                </select>
                            </div>
                            ${_isGD ? `
                            <button id="tka-btn-perf-account" style="
                                font-family: inherit; padding: 11px 22px; border-radius: 12px; border: none;
                                background: linear-gradient(135deg, #1877f2, #2563eb);
                                color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px;
                                cursor: pointer; display: flex; align-items: center; gap: 8px;
                                transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                                <span>📊</span> Cài Đặt Hiệu Quả
                            </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Tracked Account Cards Grid -->
                    <div id="tka-account-cards-grid" style="
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 14px; margin-top: 14px;
                    "></div>

                    <div id="tka-account-info" style="margin-top: 12px;"></div>
                </div>

                <!-- Filters & Sync -->
                <div id="tka-filter-section" style="
                    background: white; border-radius: 16px; border: 1px solid #e2e8f0;
                    padding: 20px; margin-bottom: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                ">
                    <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">

                        <!-- Filter Mode Selector -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 700; font-size: 13px; color: #1e293b; white-space: nowrap;">📅 Lọc theo:</label>
                            <select id="tka-filter-mode-select" style="
                                padding: 9px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                font-size: 13px; font-weight: 700; background: #f8fafc; cursor: pointer; outline: none;
                                color: #1d4ed8;
                            ">
                                <option value="month">📅 Theo Tháng</option>
                                <option value="quarter">📊 Theo Quý</option>
                                <option value="daterange">📆 Theo Ngày (Bảng Lịch)</option>
                            </select>
                        </div>

                        <!-- Dynamic Filter Controls Container -->
                        <div id="tka-dynamic-filters" style="display: flex; align-items: center; gap: 8px;">
                            <!-- Month Mode Controls -->
                            <div id="tka-month-controls" style="display: flex; align-items: center; gap: 8px;">
                                <select id="tka-month-select" style="
                                    padding: 9px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 600; background: white; cursor: pointer;
                                "></select>
                                <select id="tka-year-select" style="
                                    padding: 9px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 600; background: white; cursor: pointer;
                                "></select>
                            </div>

                            <!-- Quarter Mode Controls -->
                            <div id="tka-quarter-controls" style="display: none; align-items: center; gap: 8px;">
                                <select id="tka-quarter-select" style="
                                    padding: 9px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 700; background: white; cursor: pointer; color: #0f172a;
                                ">
                                    <option value="1">Quý 1 (Tháng 1 - Tháng 3)</option>
                                    <option value="2">Quý 2 (Tháng 4 - Tháng 6)</option>
                                    <option value="3">Quý 3 (Tháng 7 - Tháng 9)</option>
                                    <option value="4">Quý 4 (Tháng 10 - Tháng 12)</option>
                                </select>
                                <select id="tka-q-year-select" style="
                                    padding: 9px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                                    font-size: 13px; font-weight: 600; background: white; cursor: pointer;
                                "></select>
                            </div>

                            <!-- Date Range Calendar Mode Controls -->
                            <div id="tka-daterange-controls" style="display: none; align-items: center; gap: 8px; position: relative;">
                                <button id="tka-btn-daterange-picker" style="
                                    padding: 9px 16px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                                    background: white; color: #0f172a; font-size: 13px; font-weight: 700;
                                    cursor: pointer; display: flex; align-items: center; gap: 8px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.03); transition: all 0.15s;
                                " onmouseover="this.style.borderColor='#2563eb'" onmouseout="this.style.borderColor='#cbd5e1'">
                                    <span style="font-size: 15px;">📆</span>
                                    <span id="tka-daterange-text">Chọn từ bảng lịch...</span>
                                    <span style="font-size: 10px; color: #64748b;">▼</span>
                                </button>
                            </div>
                        </div>

                        <div style="flex: 1; min-width: 200px;">
                            <input id="tka-search-input" type="text" placeholder="🔍 Tìm tên camp, ID camp, Post ID..."
                                style="
                                    width: 100%; padding: 9px 14px; border-radius: 8px; border: 1.5px solid #e2e8f0;
                                    font-size: 13px; outline: none;
                                ">
                        </div>
                        ${_isGD ? `
                        <button id="tka-btn-schedule-settings" style="
                            font-family: inherit; padding: 10px 18px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                            background: white; color: #1e293b; font-size: 13px; font-weight: 700;
                            cursor: pointer; display: flex; align-items: center; gap: 6px;
                            transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                        " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <span>⏰</span> Lịch Đồng Bộ
                        </button>
                        <button id="tka-btn-sync" style="
                            font-family: inherit; padding: 10px 20px; border-radius: 10px; border: none;
                            background: linear-gradient(135deg, #059669, #10b981);
                            color: white; font-size: 13px; font-weight: 700;
                            cursor: pointer; display: flex; align-items: center; gap: 6px;
                            transition: all 0.2s; box-shadow: 0 4px 12px rgba(5,150,105,0.3);
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                            🔄 Đồng Bộ Từ Meta
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Summary Cards -->
                <div id="tka-summary" style="
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px; margin-bottom: 20px;
                "></div>

                <!-- Table View Mode Switcher Tabs -->
                <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                    <button class="tka-view-tab active" data-view="campaign" style="
                        font-family: inherit; padding: 11px 22px; border-radius: 12px; border: none;
                        background: linear-gradient(135deg, #1877f2, #2563eb);
                        color: white; font-size: 14px; font-weight: 800; letter-spacing: 0.2px;
                        cursor: pointer; display: flex; align-items: center; gap: 8px;
                        transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                        <span>🔥</span> Tổng Hợp Camp Hiệu Quả
                    </button>
                    <button class="tka-view-tab" data-view="daily" style="
                        font-family: inherit; padding: 11px 22px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                        background: white; color: #475569; font-size: 14px; font-weight: 800; letter-spacing: 0.2px;
                        cursor: pointer; display: flex; align-items: center; gap: 8px;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                        <span>📅</span> Thống Kê Chi Tiết Theo Ngày
                    </button>
                </div>

                <!-- Data Table -->
                <div id="tka-table-wrapper" style="
                    background: white; border-radius: 16px; border: 1px solid #e2e8f0;
                    overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); width: 100%;
                ">
                    <div style="overflow-x: auto; width: 100%;">
                        <table id="tka-table" style="width: 100%; min-width: 1200px; border-collapse: collapse; font-size: 13px;">
                            <tbody id="tka-tbody">
                                <tr><td colspan="11" style="padding: 60px 20px; text-align: center; color: #94a3b8;">
                                    <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
                                    Đang tải dữ liệu...
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Pagination -->
                    <div id="tka-pagination" style="
                        padding: 14px 20px; border-top: 1px solid #e2e8f0;
                        display: flex; align-items: center; justify-content: space-between;
                        font-size: 13px; color: #475569; background: #fafbfc;
                    "></div>
                </div>
            </div>
        </div>
    `;

    // ========== INIT ==========
    _populateDateSelectors();
    _loadAccounts();
    _bindEvents();

    // ========== HELPERS ==========

    function _cleanNumber(val, defaultVal = 0) {
        if (val === null || val === undefined || val === '') return defaultVal;
        const str = String(val).replace(/\./g, '').replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? defaultVal : num;
    }

    function _fmtNumber(val) {
        if (val === null || val === undefined || val === '') return '0';
        return Number(val).toLocaleString('vi-VN');
    }

    function _formatDateVN(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function _fmt(n) {
        if (n == null || isNaN(n)) return '0';
        return Number(n).toLocaleString('vi-VN');
    }

    function _fmtMoney(n) {
        if (n == null || isNaN(n)) return '0 đ';
        return Number(n).toLocaleString('vi-VN') + ' đ';
    }

    function _populateDateSelectors() {
        const monthSel = document.getElementById('tka-month-select');
        const yearSel = document.getElementById('tka-year-select');
        const qYearSel = document.getElementById('tka-q-year-select');
        const qSel = document.getElementById('tka-quarter-select');

        if (monthSel) {
            monthSel.innerHTML = '<option value="all">🌐 Tất cả các tháng</option>';
            for (let m = 1; m <= 12; m++) {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `Tháng ${m}`;
                if (String(m) === String(_selectedMonth)) opt.selected = true;
                monthSel.appendChild(opt);
            }
            if (String(_selectedMonth) === 'all') {
                monthSel.value = 'all';
            }
        }

        const curYear = new Date().getFullYear();
        const fillYears = (sel, curVal) => {
            if (!sel) return;
            sel.innerHTML = '';
            for (let y = curYear; y >= curYear - 3; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === curVal) opt.selected = true;
                sel.appendChild(opt);
            }
        };

        fillYears(yearSel, _selectedYear);
        fillYears(qYearSel, _selectedYear);

        if (qSel) qSel.value = String(_selectedQuarter);
    }

    // ========== DATA LOADING ==========

    function _getAccountParam() {
        if (_selectedAccountIds && _selectedAccountIds.length > 0) {
            return _selectedAccountIds.join(',');
        }
        if (_selectedLinhVuc && _selectedLinhVuc !== 'all') {
            const fbAccs = _accounts.filter(a => (a.platform || 'facebook') === 'facebook');
            const matched = fbAccs.filter(a => String(a.linh_vuc_name || '').trim().toLowerCase() === _selectedLinhVuc.trim().toLowerCase());
            if (matched.length > 0) {
                return matched.map(a => a.id).join(',');
            }
        }
        return 'all';
    }

    async function _loadAccounts() {
        try {
            const [resAcc, resLV] = await Promise.all([
                fetch('/api/thongkeads/accounts', { credentials: 'include' }).then(r => r.json()),
                fetch('/api/kho-ads/linh-vuc', { headers: _tkaGetAuthHeaders() }).then(r => r.json()).catch(() => ({}))
            ]);
            if (resAcc && resAcc.ok) _accounts = resAcc.accounts || [];
            if (resLV && resLV.ok) _linhVucList = resLV.linh_vuc_list || [];
            _renderAccountSelector();
            _loadData();
        } catch(e) {
            console.error('Error loading accounts:', e);
        }
    }

    function _renderAccountSelector() {
        const sel = document.getElementById('tka-account-select');
        const lvSel = document.getElementById('tka-linh-vuc-select');
        const grid = document.getElementById('tka-account-cards-grid');
        const badgeCount = document.getElementById('tka-account-count-badge');
        const fbAccs = _accounts.filter(a => (a.platform || 'facebook') === 'facebook');

        // Populate Lĩnh Vực select dropdown
        if (lvSel) {
            const currentLv = _selectedLinhVuc;
            let lvOptionsHtml = `<option value="all" ${currentLv === 'all' ? 'selected' : ''}>🏢 Tất cả Lĩnh Vực Ads</option>`;
            _linhVucList.forEach(item => {
                const label = item.code ? `🏢 ${_escapeHtml(item.name)} (${_escapeHtml(item.code)})` : `🏢 ${_escapeHtml(item.name)}`;
                lvOptionsHtml += `<option value="${_escapeHtml(item.name)}" ${currentLv === item.name ? 'selected' : ''}>${label}</option>`;
            });
            lvSel.innerHTML = lvOptionsHtml;
        }

        // Filter accounts by selected Lĩnh Vực
        let displayedAccounts = [...fbAccs];
        if (_selectedLinhVuc && _selectedLinhVuc !== 'all') {
            displayedAccounts = fbAccs.filter(a => String(a.linh_vuc_name || '').trim().toLowerCase() === _selectedLinhVuc.trim().toLowerCase());
        }

        if (badgeCount) badgeCount.textContent = `${displayedAccounts.length} TK`;

        // Populate header dropdown (for mobile/compact view)
        if (sel) {
            sel.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = 'all';
            defaultOpt.textContent = `📋 Tất cả tài khoản (${displayedAccounts.length})`;
            if (_selectedAccountIds.length === 0) defaultOpt.selected = true;
            sel.appendChild(defaultOpt);

            displayedAccounts.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = `📘 ${a.account_name}`;
                if (_selectedAccountIds.includes(String(a.id))) opt.selected = true;
                sel.appendChild(opt);
            });
        }

        // Render Tracked Cards Grid
        if (grid) {
            if (displayedAccounts.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: #f8fafc; border-radius: 14px; border: 1.5px dashed #cbd5e1; color: #64748b;">
                        <div style="font-size: 28px; margin-bottom: 6px;">📭</div>
                        <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Chưa có tài khoản quảng cáo nào thuộc Lĩnh Vực "${_escapeHtml(_selectedLinhVuc)}"!</div>
                        <div style="font-size: 12px; margin-top: 4px;">Vui lòng chọn Lĩnh Vực khác hoặc gán Lĩnh Vực Ads cho tài khoản ở trang <strong>"Cài Đặt Tài Khoản Ads"</strong>.</div>
                    </div>
                `;
                return;
            }

            const isAllActive = _selectedAccountIds.length === 0;

            let cardsHtml = `
                <div onclick="window._tkaToggleAcc('all')" style="
                    padding: 14px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
                    border: ${isAllActive ? '2.5px solid #2563eb' : '1.5px solid #e2e8f0'};
                    background: ${isAllActive ? '#eff6ff' : '#ffffff'};
                    box-shadow: ${isAllActive ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'};
                    display: flex; flex-direction: column; justify-content: space-between;
                " onmouseover="if(!${isAllActive}) this.style.borderColor='#93c5fd'" onmouseout="if(!${isAllActive}) this.style.borderColor='#e2e8f0'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 800; font-size: 14px; color: ${isAllActive ? '#1d4ed8' : '#1e293b'};">
                            📋 Tất Cả Tài Khoản
                        </span>
                        ${isAllActive ? '<span style="background: #2563eb; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">✓ ĐANG THEO DÕI TẤT CẢ</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                        Tổng hợp chỉ số của <strong>${displayedAccounts.length}</strong> tài khoản QC${_selectedLinhVuc !== 'all' ? ` (${_escapeHtml(_selectedLinhVuc)})` : ''}
                    </div>
                </div>
            `;

            cardsHtml += displayedAccounts.map(acc => {
                const isSelected = _selectedAccountIds.length === 0 || _selectedAccountIds.includes(String(acc.id));
                const isExplicitlySelected = _selectedAccountIds.includes(String(acc.id));
                const st = acc.connection_status || 'unconfigured';
                let statusBadge = '<span style="color:#059669;font-weight:700;font-size:11px;background:#dcfce7;padding:2px 8px;border-radius:10px;">🟢 Kết Nối Tốt</span>';
                if (st === 'error') {
                    statusBadge = '<span style="color:#dc2626;font-weight:800;font-size:11px;background:#fee2e2;padding:2px 8px;border-radius:10px;">🔴 MẤT KẾT NỐI</span>';
                } else if (st === 'unconfigured') {
                    statusBadge = '<span style="color:#d97706;font-weight:700;font-size:11px;background:#fef3c7;padding:2px 8px;border-radius:10px;">🟡 Chưa Kết Nối</span>';
                }

                const metric = (acc.effectiveness_metric || 'cpa').toUpperCase();
                const threshold = _fmtMoney(acc.effectiveness_threshold);
                const staffName = acc.assigned_staff_name || 'Chưa phân công';
                const adsManagerUrl = acc.fb_ads_manager_url || (acc.fb_ad_account_id ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${acc.fb_ad_account_id.replace('act_', '')}` : '');

                return `
                    <div onclick="window._tkaToggleAcc('${acc.id}')" style="
                        padding: 14px 16px; border-radius: 14px; cursor: pointer; transition: all 0.2s;
                        border: ${isExplicitlySelected ? '2.5px solid #2563eb' : '1.5px solid #e2e8f0'};
                        background: ${isExplicitlySelected ? '#eff6ff' : '#ffffff'};
                        opacity: ${!isAllActive && !isExplicitlySelected ? '0.7' : '1'};
                        box-shadow: ${isExplicitlySelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'};
                        display: flex; flex-direction: column; justify-content: space-between;
                    " onmouseover="if(!${isExplicitlySelected}) this.style.borderColor='#93c5fd'" onmouseout="if(!${isExplicitlySelected}) this.style.borderColor='#e2e8f0'">
                        <div>
                            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                                <div style="font-weight: 800; font-size: 14px; color: ${isExplicitlySelected ? '#1d4ed8' : '#0f172a'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    📘 ${acc.account_name}
                                </div>
                                <div style="flex-shrink:0;">${statusBadge}</div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
                                <div style="font-family: monospace; font-size: 11px; color: #64748b;">
                                    ${acc.fb_ad_account_id || 'ID chưa cài'}
                                </div>
                                ${adsManagerUrl ? `
                                <a href="${adsManagerUrl}" target="_blank" onclick="event.stopPropagation();" style="
                                    color: #1d4ed8; font-weight: 700; text-decoration: none; font-size: 11px;
                                    background: #dbeafe; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 6px;
                                    display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;
                                " onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'" title="Bấm để mở trang Quản Lý Ads Manager Meta của tài khoản này">
                                    🔗 Mở Link Ads ↗
                                </a>
                                ` : ''}
                            </div>
                        </div>

                        <div style="font-size: 12px; color: #334155; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b;">👤 NV Phụ Trách:</span>
                                <strong style="color: #1e1b4b; background: #e0e7ff; padding: 1px 8px; border-radius: 6px; font-size: 11px;">${staffName}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b;">Loại Tài Khoản:</span>
                                ${acc.account_type === 'test' ? `
                                    <span style="background: #f3e8ff; color: #7e22ce; font-weight: 800; padding: 1px 7px; border-radius: 6px; font-size: 11px;">🧪 Chạy Test</span>
                                ` : `
                                    <span style="background: #eff6ff; color: #1d4ed8; font-weight: 800; padding: 1px 7px; border-radius: 6px; font-size: 11px;">🚀 Chạy Chính</span>
                                `}
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b;">Lĩnh Vực Ads:</span>
                                <strong style="color: #0f172a; font-weight: 800; font-size: 11px;">🏷️ ${_escapeHtml(acc.linh_vuc_name || 'Chưa chọn')}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #64748b;">Ngưỡng hiệu quả:</span>
                                <strong style="color: #059669;">${metric} < ${threshold}</strong>
                            </div>
                        </div>

                        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; font-weight: 700; color: ${isExplicitlySelected ? '#2563eb' : '#94a3b8'};">
                                ${isExplicitlySelected ? '✓ ĐANG THEO DÕI' : (isAllActive ? 'Bấm để gộp theo dõi' : 'Bấm để thêm vào gộp')}
                            </span>
                            <button onclick="event.stopPropagation(); window._tkaEditPerf('${acc.id}')" style="
                                padding: 4px 10px; border-radius: 8px; border: 1px solid #bfdbfe;
                                background: white; color: #1d4ed8; font-size: 11px; font-weight: 700;
                                cursor: pointer; transition: all 0.15s;
                            " onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='white'">
                                ⚙️ Cài Đặt Hiệu Quả
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = cardsHtml;
        }

        _updateAccountButtons();
    }

    window._tkaToggleAcc = function(accId) {
        if (accId === 'all') {
            _selectedAccountIds = [];
        } else {
            const strId = String(accId);
            const idx = _selectedAccountIds.indexOf(strId);
            if (idx > -1) {
                _selectedAccountIds.splice(idx, 1);
            } else {
                _selectedAccountIds.push(strId);
            }
        }
        _currentPage = 1;
        _renderAccountSelector();
        _loadData();
    };

    window._tkaSelectLinhVuc = function(lvName) {
        _selectedLinhVuc = lvName || 'all';
        _selectedAccountIds = [];
        _currentPage = 1;
        _renderAccountSelector();
        _loadData();
    };

    window._tkaEditPerf = function(accId) {
        _showPerfModal(accId);
    };

    function _updateAccountButtons() {
        const infoDiv = document.getElementById('tka-account-info');
        const accountSec = document.getElementById('tka-account-section');
        const singleSelectedId = (_selectedAccountIds && _selectedAccountIds.length === 1) ? _selectedAccountIds[0] : null;

        // Remove old warning banner if exists
        const oldBanner = document.getElementById('tka-conn-warning-banner');
        if (oldBanner) oldBanner.remove();

        if (infoDiv && singleSelectedId) {
            const acc = _accounts.find(a => String(a.id) === String(singleSelectedId));
            if (acc) {
                const st = acc.connection_status || 'unconfigured';

                // If account has connection error, show warning banner
                if (st === 'error' && accountSec) {
                    const banner = document.createElement('div');
                    banner.id = 'tka-conn-warning-banner';
                    banner.style.cssText = `
                        background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 12px;
                        padding: 12px 16px; margin-top: 14px; display: flex; align-items: center;
                        justify-content: space-between; gap: 12px; box-shadow: 0 4px 6px -1px rgba(220,38,38,0.08);
                    `;
                    banner.innerHTML = `
                        <div style="color: #991b1b; font-size: 13px; line-height: 1.4;">
                            <strong style="font-size: 14px;">⚠️ CẢNH BÁO MẤT KẾT NỐI:</strong> Tài khoản quảng cáo <strong>"${acc.account_name}"</strong> đang bị gián đoạn API Meta.
                            <div style="font-size: 12px; margin-top: 2px; color: #dc2626;">Chi tiết: ${acc.connection_error || 'Access Token Meta hết hạn hoặc bị đổi mật khẩu.'}</div>
                        </div>
                        <a href="/caidattaikhoanads" target="_blank" style="
                            padding: 8px 16px; border-radius: 10px; border: none; background: #dc2626;
                            color: white; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap;
                            box-shadow: 0 4px 10px rgba(220,38,38,0.3); transition: all 0.2s; text-decoration: none;
                        ">
                            👉 Chuyển Sang Trang Cài Đặt Sửa Token ↗
                        </a>
                    `;
                    accountSec.appendChild(banner);
                }
            }
        } else if (infoDiv) {
            infoDiv.innerHTML = '';
        }
    }

    async function _loadData() {
        if (_viewMode === 'campaign') {
            await Promise.all([_loadCampaignSummaryData(), _loadSummary()]);
        } else {
            await Promise.all([_loadStats(), _loadSummary()]);
        }
    }

    async function _loadStats() {
        try {
            const params = new URLSearchParams({
                account_id: _getAccountParam(),
                page: _currentPage,
                limit: 200
            });

            if (_filterMode === 'daterange' && _startDate && _endDate) {
                params.set('start_date', _startDate);
                params.set('end_date', _endDate);
            } else if (_filterMode === 'quarter') {
                params.set('quarter', _selectedQuarter);
                params.set('year', _selectedYear);
            } else {
                params.set('month', _selectedMonth);
                params.set('year', _selectedYear);
            }

            if (_searchQuery) params.set('search', _searchQuery);

            const res = await fetch(`/api/thongkeads/stats?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            _stats = data.stats || [];
            _totalRecords = data.total || 0;
            _sortStatsData();
            _renderTable();
        } catch(e) {
            console.error('Error loading stats:', e);
            const tbody = document.getElementById('tka-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="padding:40px;text-align:center;color:#ef4444;">❌ Lỗi: ${e.message}</td></tr>`;
        }
    }

    async function _loadCampaignSummaryData() {
        try {
            const params = new URLSearchParams({
                account_id: _getAccountParam()
            });

            if (_filterMode === 'daterange' && _startDate && _endDate) {
                params.set('start_date', _startDate);
                params.set('end_date', _endDate);
            } else if (_filterMode === 'quarter') {
                params.set('quarter', _selectedQuarter);
                params.set('year', _selectedYear);
            } else {
                params.set('month', _selectedMonth);
                params.set('year', _selectedYear);
            }

            if (_searchQuery) params.set('search', _searchQuery);

            const res = await fetch(`/api/thongkeads/campaign-summary?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            _campaigns = data.campaigns || [];
            _campaigns.forEach(c => {
                const effCount = parseInt(c.total_effective_count) || 0;
                const runCount = parseInt(c.total_run_count) || 1;
                const filteredRunCount = c.filtered_run_count !== undefined && c.filtered_run_count !== null ? parseInt(c.filtered_run_count) : runCount;
                c.effective_rate = filteredRunCount > 0 ? (effCount / filteredRunCount * 100) : 0;
            });
            _sortCampaignsData();
            _renderCampaignTable();
        } catch(e) {
            console.error('Error loading campaign summary:', e);
            const tableEl = document.getElementById('tka-table');
            if (tableEl) tableEl.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#ef4444;">❌ Lỗi: ${e.message}</td></tr>`;
        }
    }

    async function _loadSummary() {
        try {
            const params = new URLSearchParams({
                account_id: _getAccountParam()
            });

            if (_filterMode === 'daterange' && _startDate && _endDate) {
                params.set('start_date', _startDate);
                params.set('end_date', _endDate);
            } else if (_filterMode === 'quarter') {
                params.set('quarter', _selectedQuarter);
                params.set('year', _selectedYear);
            } else {
                params.set('month', _selectedMonth);
                params.set('year', _selectedYear);
            }

            const res = await fetch(`/api/thongkeads/summary?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            _summary = data.summary || {};
            _renderSummary();
        } catch(e) {
            console.error('Error loading summary:', e);
        }
    }

    // ========== SORTING LOGIC ==========

    function _sortStatsData() {
        if (!_sortColumn) return;

        _stats.sort((a, b) => {
            let valA = a[_sortColumn];
            let valB = b[_sortColumn];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            // Numbers
            if (['spend', 'messages', 'cpa', 'cpc', 'ctr', 'cpm', 'run_count', 'is_effective'].includes(_sortColumn)) {
                const numA = parseFloat(valA) || 0;
                const numB = parseFloat(valB) || 0;
                return _sortDir === 'desc' ? numB - numA : numA - numB;
            }

            // Dates
            if (_sortColumn === 'report_date') {
                const dA = new Date(valA).getTime() || 0;
                const dB = new Date(valB).getTime() || 0;
                return _sortDir === 'desc' ? dB - dA : dA - dB;
            }

            // Text
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (_sortDir === 'asc') {
                return strA.localeCompare(strB, 'vi');
            } else {
                return strB.localeCompare(strA, 'vi');
            }
        });
    }

    function _getSortIcon(col) {
        if (_sortColumn !== col) return '<span style="opacity:0.35;font-size:11px;margin-left:4px;">↕</span>';
        if (_sortDir === 'desc') {
            return '<span style="color:#60a5fa;font-weight:900;font-size:12px;margin-left:4px;">▼</span>';
        } else {
            return '<span style="color:#60a5fa;font-weight:900;font-size:12px;margin-left:4px;">▲</span>';
        }
    }

    window._tkaSortBy = function(col) {
        if (_sortColumn === col) {
            _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            _sortColumn = col;
            if (['campaign_name', 'campaign_id', 'link_post_id'].includes(col)) {
                _sortDir = 'asc';
            } else {
                _sortDir = 'desc'; // Numbers & Date default to Desc (to->nhỏ / gần nhất)
            }
        }
        _sortStatsData();
        _renderTable();
    };

    // ========== CAMPAIGN SUMMARY SORTING ==========

    function _sortCampaignsData() {
        if (!_campSortColumn) return;

        _campaigns.sort((a, b) => {
            let valA = a[_campSortColumn];
            let valB = b[_campSortColumn];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            // Numbers
            if (['total_spend', 'total_messages', 'avg_cpa', 'avg_cpc', 'avg_ctr', 'avg_cpm', 'total_run_count', 'filtered_run_count', 'total_effective_count', 'effective_rate'].includes(_campSortColumn)) {
                const numA = parseFloat(valA) || 0;
                const numB = parseFloat(valB) || 0;
                if (numA !== numB) {
                    return _campSortDir === 'desc' ? numB - numA : numA - numB;
                }
                if (_campSortColumn === 'total_effective_count') {
                    const rateA = parseFloat(a.effective_rate) || 0;
                    const rateB = parseFloat(b.effective_rate) || 0;
                    if (rateA !== rateB) return rateB - rateA;
                }
                if (_campSortColumn === 'effective_rate') {
                    const effA = parseFloat(a.total_effective_count) || 0;
                    const effB = parseFloat(b.total_effective_count) || 0;
                    if (effA !== effB) return effB - effA;
                }
            }

            // Text
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (_campSortDir === 'asc') {
                return strA.localeCompare(strB, 'vi');
            } else {
                return strB.localeCompare(strA, 'vi');
            }
        });
    }

    function _getCampSortIcon(col) {
        if (_campSortColumn !== col) return '<span style="opacity:0.35;font-size:11px;margin-left:4px;">↕</span>';
        if (_campSortDir === 'desc') {
            return '<span style="color:#60a5fa;font-weight:900;font-size:12px;margin-left:4px;">▼</span>';
        } else {
            return '<span style="color:#60a5fa;font-weight:900;font-size:12px;margin-left:4px;">▲</span>';
        }
    }

    window._tkaCampSortBy = function(col) {
        if (_campSortColumn === col) {
            _campSortDir = _campSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            _campSortColumn = col;
            if (['campaign_name', 'campaign_id', 'link_post_id'].includes(col)) {
                _campSortDir = 'asc';
            } else {
                _campSortDir = 'desc';
            }
        }
        _sortCampaignsData();
        _renderCampaignTable();
    };

    // ========== RENDERING ==========

    function _renderSummary() {
        const el = document.getElementById('tka-summary');
        if (!el) return;

        const cards = [
            { icon: '💰', label: 'Tổng Chi Tiêu', value: _fmtMoney(_summary.total_spend), color: '#6366f1', bg: '#eef2ff' },
            { icon: '💬', label: 'Tổng Tin Nhắn', value: _fmt(_summary.total_messages), color: '#0891b2', bg: '#ecfeff' },
            { icon: '📊', label: 'TB CPA', value: _fmtMoney(_summary.avg_cpa), color: '#ea580c', bg: '#fff7ed' },
            { icon: '✅', label: 'Lần Hiệu Quả', value: `${_fmt(_summary.total_effective)} / ${_fmt(_summary.total_records)}`, color: '#059669', bg: '#ecfdf5' },
            { icon: '🎯', label: 'Campaigns', value: _fmt(_summary.unique_campaigns), color: '#7c3aed', bg: '#f5f3ff' },
            { icon: '📅', label: 'Số Ngày', value: _fmt(_summary.unique_days), color: '#dc2626', bg: '#fef2f2' }
        ];

        el.innerHTML = cards.map(c => `
            <div style="
                background: ${c.bg}; border-radius: 14px; padding: 18px 16px;
                border: 1px solid ${c.color}20;
            ">
                <div style="font-size: 12px; color: ${c.color}; font-weight: 600; margin-bottom: 6px;">
                    ${c.icon} ${c.label}
                </div>
                <div style="font-size: 20px; font-weight: 800; color: #1e293b;">
                    ${c.value}
                </div>
            </div>
        `).join('');
    }

    function _renderTable() {
        const tableEl = document.getElementById('tka-table');
        if (!tableEl) return;

        // Find threshold for the selected account
        let threshold = 75000;
        if (_selectedAccountId !== 'all') {
            const acc = _accounts.find(a => String(a.id) === String(_selectedAccountId));
            if (acc) threshold = parseFloat(acc.effectiveness_threshold) || 75000;
        } else if (_stats.length > 0 && _stats[0].effectiveness_threshold != null) {
            threshold = parseFloat(_stats[0].effectiveness_threshold) || 75000;
        } else if (_accounts.length > 0) {
            threshold = parseFloat(_accounts[0].effectiveness_threshold) || 75000;
        }

        const threshK = Math.round(threshold / 1000) + 'K';

        // Render Table Headers with sort triggers
        const headersHtml = `
            <thead>
                <tr style="background: #1e293b; color: white;">
                    <th onclick="window._tkaSortBy('report_date')" style="padding: 12px 10px; text-align: left; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" title="Bấm để lọc/sắp xếp theo Ngày chạy">NGÀY CHẠY ${_getSortIcon('report_date')}</th>
                    <th onclick="window._tkaSortBy('link_post_id')" style="padding: 12px 10px; text-align: left; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" title="Bấm để lọc/sắp xếp theo Link Post ID">LINK POST ID ${_getSortIcon('link_post_id')}</th>
                    <th onclick="window._tkaSortBy('campaign_name')" style="padding: 12px 10px; text-align: left; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" title="Bấm để lọc/sắp xếp theo Tên Camp & ID Camp">CHIẾN DỊCH / ID CAMP ${_getSortIcon('campaign_name')}</th>
                    <th onclick="window._tkaSortBy('spend')" style="padding: 12px 10px; text-align: right; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số tiền chi cho quảng cáo chiến dịch.">NGÂN SÁCH CHI TIÊU ${_getSortIcon('spend')}</th>
                    <th onclick="window._tkaSortBy('messages')" style="padding: 12px 10px; text-align: center; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số mess tin nhắn từ khách hàng.">TIN NHẮN ${_getSortIcon('messages')}</th>
                    <th onclick="window._tkaSortBy('cpa')" style="padding: 12px 10px; text-align: right; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí giá tiền / tin nhắn khách.">CPA ${_getSortIcon('cpa')}</th>
                    <th onclick="window._tkaSortBy('cpc')" style="padding: 12px 10px; text-align: right; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí / mỗi lượt click vào quảng cáo.&#10;Ví dụ: Bạn chạy quảng cáo hết 1.000.000đ và có 2.000 lượt click&#10;CPC = 1.000.000 ÷ 2.000 = 500đ/click&#10;CPC càng thấp → Bạn đang mua được lượt click càng rẻ.">CPC ${_getSortIcon('cpc')}</th>
                    <th onclick="window._tkaSortBy('ctr')" style="padding: 12px 10px; text-align: right; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Tỷ lệ % nhấp vào quảng cáo.&#10;Ví dụ: Quảng cáo hiển thị: 10.000 lần, có 300 lượt click&#10;CTR = 300 ÷ 10.000 × 100% = 3%&#10;CTR càng cao → Quảng cáo càng thu hút người xem nhấp.">CTR ${_getSortIcon('ctr')}</th>
                    <th onclick="window._tkaSortBy('cpm')" style="padding: 12px 10px; text-align: right; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí cho 1.000 lượt hiển thị quảng cáo.&#10;Ví dụ: Chi phí quảng cáo: 500.000đ, lượt hiển thị: 100.000&#10;CPM = 500.000 ÷ 100.000 × 1.000 = 5.000đ&#10;CPM càng thấp → Bạn mua được 1.000 lượt hiển thị càng rẻ.">CPM ${_getSortIcon('cpm')}</th>
                    <th onclick="window._tkaSortBy('run_count')" style="padding: 12px 10px; text-align: center; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số lần quảng cáo chạy mất tiền,&#10;bao gồm cả những lần chạy vài nghìn,&#10;vài trăm đồng.">SL CHẠY TỔNG ${_getSortIcon('run_count')}</th>
                    <th onclick="window._tkaSortBy('is_effective')" style="padding: 12px 10px; text-align: center; font-weight: 700; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số lần quảng cáo được đánh giá là đạt&#10;hiệu quả theo tiêu chí CPA.">SL HIỆU QUẢ ${_getSortIcon('is_effective')}</th>
                </tr>
            </thead>
        `;

        if (_stats.length === 0) {
            tableEl.innerHTML = `
                ${headersHtml}
                <tbody id="tka-tbody">
                    <tr><td colspan="12" style="padding: 60px 20px; text-align: center; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">Chưa có dữ liệu thống kê</div>
                        <div style="font-size: 13px;">Bấm "🔄 Đồng Bộ Từ Meta" phía trên để tải dữ liệu chiến dịch mới nhất.</div>
                    </td></tr>
                </tbody>
            `;
            document.getElementById('tka-pagination').innerHTML = '';
            return;
        }

        const rowsHtml = _stats.map((row, i) => {
            const rowThreshold = parseFloat(row.effectiveness_threshold) || threshold;
            const cpa = parseFloat(row.cpa) || 0;
            const messages = parseInt(row.messages) || 0;
            const spend = parseFloat(row.spend) || 0;
            const isEff = (messages > 0 && cpa > 0 && cpa <= rowThreshold);

            // CPA color
            let cpaStyle = '';
            if (messages === 0) {
                cpaStyle = 'color: #94a3b8;'; // grey for no messages
            } else if (cpa < rowThreshold) {
                cpaStyle = 'color: #059669; font-weight: 700;'; // green
            } else {
                cpaStyle = 'color: #dc2626; font-weight: 700;'; // red
            }

            // Effective cell
            const effBg = isEff ? '#dcfce7' : '#fee2e2';
            const effColor = isEff ? '#059669' : '#dc2626';
            const effText = isEff ? '1' : '0';

            // Date format in Vietnam timezone
            const dateStr = _formatDateVN(row.report_date);

            // Post ID display (truncated) & clickable Facebook link
            const postId = row.link_post_id || '';
            const postIdDisplay = postId.length > 18 ? postId.substring(0, 18) + '...' : postId;
            const accName = row.account_name || '';

            // Camp name display (truncated)
            const campName = row.campaign_name || '';
            const campDisplay = campName.length > 45 ? campName.substring(0, 45) + '...' : campName;

            // Camp ID (truncated)
            const campId = row.campaign_id || '';
            const campIdDisplay = campId.length > 20 ? campId.substring(0, 20) + '...' : campId;

            // Rounded CPM without decimals
            const roundedCpm = Math.round(parseFloat(row.cpm || 0));

            // CPC calculation & formatting
            const ctr = parseFloat(row.ctr || 0);
            const rawCpc = parseFloat(row.cpc || 0);
            const cpcVal = rawCpc > 0 ? rawCpc : (ctr > 0 && roundedCpm > 0 ? (roundedCpm / (ctr * 10)) : 0);
            const formattedCpc = _fmtMoney(Math.round(cpcVal));
            const formattedCpa = messages > 0 ? _fmtMoney(Math.round(cpa)) : '-';
            const formattedCtr = ctr.toFixed(2) + '%';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; ${i % 2 === 0 ? 'background:#fafbfc;' : ''}transition:background 0.15s;"
                    onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='${i % 2 === 0 ? '#fafbfc' : 'white'}'">
                    <td style="padding: 10px; white-space: nowrap; font-weight: 500;">${dateStr}</td>
                    <td style="padding: 10px; white-space: nowrap; font-size: 12px;" title="${postId}">
                        ${postId ? `
                            <a href="http://fb.com/${postId}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline; transition: color 0.15s;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'" title="Bấm để xem bài viết Facebook (http://fb.com/${postId})">
                                ${postIdDisplay} ↗
                            </a>
                            ${accName ? `<div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px;">📘 ${_escapeHtml(accName)}</div>` : ''}
                        ` : '-'}
                    </td>
                    <td style="padding: 10px; max-width: 320px;" title="${campName}${campId ? ' (' + campId + ')' : ''}">
                        <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${campDisplay}</div>
                        ${campId ? `<div style="font-size: 11px; color: #64748b; font-weight: 500; font-family: monospace; margin-top: 2px;">${campId}</div>` : ''}
                    </td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; white-space: nowrap;">${_fmtMoney(spend)}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 700; color: ${messages > 0 ? '#0891b2' : '#94a3b8'};">${messages}</td>
                    <td style="padding: 10px; text-align: right; white-space: nowrap; ${cpaStyle}">${formattedCpa}</td>
                    <td style="padding: 10px; text-align: right; white-space: nowrap; font-weight: 600; color: #475569;">${formattedCpc}</td>
                    <td style="padding: 10px; text-align: right; white-space: nowrap;">${formattedCtr}</td>
                    <td style="padding: 10px; text-align: right; white-space: nowrap;">${_fmtMoney(roundedCpm)}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 600;">${row.run_count || 1}</td>
                    <td style="padding: 10px; text-align: center;">
                        <span style="
                            display: inline-block; padding: 4px 14px; border-radius: 8px;
                            font-weight: 800; font-size: 13px;
                            background: ${effBg}; color: ${effColor};
                        ">${effText}</span>
                    </td>
                </tr>
            `;
        }).join('');

        tableEl.innerHTML = `${headersHtml}<tbody id="tka-tbody">${rowsHtml}</tbody>`;

        // Pagination (200 rows limit per page)
        const totalPages = Math.ceil(_totalRecords / 200);
        const paginationEl = document.getElementById('tka-pagination');
        if (paginationEl) {
            const startRec = _totalRecords === 0 ? 0 : (_currentPage - 1) * 200 + 1;
            const endRec = Math.min(_currentPage * 200, _totalRecords);

            paginationEl.innerHTML = `
                <div style="font-weight: 600; color: #334155;">
                    Hiển thị <strong>${_fmt(startRec)} - ${_fmt(endRec)}</strong> / Tổng <strong>${_fmt(_totalRecords)}</strong> dòng (200 dòng / trang)
                    ${_sortColumn ? `<span style="margin-left:10px;color:#2563eb;">(Đang lọc/sắp xếp theo: <strong>${_sortColumn}</strong> ${_sortDir === 'desc' ? '▼' : '▲'})</span>` : ''}
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${_currentPage > 1 ? `<button onclick="window._tkaGoPage(${_currentPage - 1})" style="padding:7px 16px;border-radius:10px;border:1.5px solid #cbd5e1;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#1e293b;">← Trang Trước</button>` : ''}
                    <span style="padding:7px 14px;font-weight:800;color:#1d4ed8;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">Trang ${_currentPage} / ${totalPages || 1}</span>
                    ${_currentPage < totalPages ? `<button onclick="window._tkaGoPage(${_currentPage + 1})" style="padding:7px 16px;border-radius:10px;border:1.5px solid #cbd5e1;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#1e293b;">Trang Tiếp →</button>` : ''}
                </div>
            `;
        }
    }

    // ========== CAMPAIGN AGGREGATED SUMMARY TABLE RENDERING ==========

    function _renderCampaignTable() {
        const tableEl = document.getElementById('tka-table');
        if (!tableEl) return;

        // Find threshold & ignore threshold for selected account
        let threshold = 75000;
        let ignoreThresh = 70000;
        if (_selectedAccountId !== 'all') {
            const acc = _accounts.find(a => String(a.id) === String(_selectedAccountId));
            if (acc) {
                threshold = parseFloat(acc.effectiveness_threshold) || 75000;
                ignoreThresh = parseFloat(acc.ignore_no_msg_spend_threshold) || 70000;
            }
        } else if (_campaigns.length > 0) {
            if (_campaigns[0].ignore_no_msg_spend_threshold != null) ignoreThresh = parseFloat(_campaigns[0].ignore_no_msg_spend_threshold) || 70000;
            if (_campaigns[0].effectiveness_threshold != null) threshold = parseFloat(_campaigns[0].effectiveness_threshold) || 75000;
        } else if (_accounts.length > 0) {
            ignoreThresh = parseFloat(_accounts[0].ignore_no_msg_spend_threshold) || 70000;
            threshold = parseFloat(_accounts[0].effectiveness_threshold) || 75000;
        }

        const threshLabel = _fmtMoney(threshold).replace(' đ', '');
        const threshK = Math.round(threshold / 1000) + 'K';
        const ignoreThreshLabel = _fmtMoney(ignoreThresh).replace(' đ', '');
        const ignoreThreshK = Math.round(ignoreThresh / 1000) + 'K';

        // Render Table Headers matching Google Sheet columns
        const headersHtml = `
            <thead>
                <tr style="background: linear-gradient(135deg, #1e293b, #334155); color: white; font-size: 12px;">
                    <th onclick="window._tkaCampSortBy('link_post_id')" style="padding: 10px 8px; text-align: left; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" title="Bấm để lọc/sắp xếp theo Post ID">POST ID ${_getCampSortIcon('link_post_id')}</th>
                    <th onclick="window._tkaCampSortBy('campaign_name')" style="padding: 10px 8px; text-align: left; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" title="Bấm để lọc/sắp xếp theo Tên Chiến dịch & ID Camp">CHIẾN DỊCH / ID CAMP ${_getCampSortIcon('campaign_name')}</th>
                    <th onclick="window._tkaCampSortBy('total_spend')" style="padding: 10px 8px; text-align: right; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số tiền chi cho quảng cáo chiến dịch.">NGÂN SÁCH ${_getCampSortIcon('total_spend')}</th>
                    <th onclick="window._tkaCampSortBy('total_messages')" style="padding: 10px 8px; text-align: center; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số mess tin nhắn từ khách hàng.">TIN NHẮN ${_getCampSortIcon('total_messages')}</th>
                    <th onclick="window._tkaCampSortBy('avg_cpa')" style="padding: 10px 8px; text-align: right; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí giá tiền / tin nhắn khách.">CPA ${_getCampSortIcon('avg_cpa')}</th>
                    <th onclick="window._tkaCampSortBy('avg_cpc')" style="padding: 10px 8px; text-align: right; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí / mỗi lượt click vào quảng cáo.&#10;Ví dụ: Bạn chạy quảng cáo hết 1.000.000đ và có 2.000 lượt click&#10;CPC = 1.000.000 ÷ 2.000 = 500đ/click&#10;CPC càng thấp → Bạn đang mua được lượt click càng rẻ.">CPC ${_getCampSortIcon('avg_cpc')}</th>
                    <th onclick="window._tkaCampSortBy('avg_ctr')" style="padding: 10px 8px; text-align: right; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Tỷ lệ % nhấp vào quảng cáo.&#10;Ví dụ: Quảng cáo hiển thị: 10.000 lần, có 300 lượt click&#10;CTR = 300 ÷ 10.000 × 100% = 3%&#10;CTR càng cao → Quảng cáo càng thu hút người xem nhấp.">CTR ${_getCampSortIcon('avg_ctr')}</th>
                    <th onclick="window._tkaCampSortBy('avg_cpm')" style="padding: 10px 8px; text-align: right; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Chi phí cho 1.000 lượt hiển thị quảng cáo.&#10;Ví dụ: Chi phí quảng cáo: 500.000đ, lượt hiển thị: 100.000&#10;CPM = 500.000 ÷ 100.000 × 1.000 = 5.000đ&#10;CPM càng thấp → Bạn mua được 1.000 lượt hiển thị càng rẻ.">CPM ${_getCampSortIcon('avg_cpm')}</th>
                    <th onclick="window._tkaCampSortBy('total_run_count')" style="padding: 10px 8px; text-align: center; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số lần quảng cáo chạy mất tiền,&#10;bao gồm cả những lần chạy vài nghìn,&#10;vài trăm đồng.">SL CHẠY TỔNG ${_getCampSortIcon('total_run_count')}</th>
                    <th onclick="window._tkaCampSortBy('filtered_run_count')" style="padding: 10px 8px; text-align: center; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số lần chạy thực tế đạt ngưỡng chi tiêu&#10;(loại bỏ các ngân sách chạy dở vài nghìn,&#10;vài trăm đồng không có tin nhắn).">SL CHẠY THỰC ${_getCampSortIcon('filtered_run_count')}</th>
                    <th onclick="window._tkaCampSortBy('total_effective_count')" style="padding: 10px 8px; text-align: center; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Số lần quảng cáo được đánh giá là đạt&#10;hiệu quả theo tiêu chí CPA.">SL HIỆU QUẢ ${_getCampSortIcon('total_effective_count')}</th>
                    <th onclick="window._tkaCampSortBy('effective_rate')" style="padding: 10px 8px; text-align: center; font-weight: 800; white-space: nowrap; cursor: pointer; user-select: none;" data-tooltip="Tỷ lệ % Hiệu Quả =&#10;(SL Hiệu Quả / SL Chạy Thực) * 100%">% HIỆU QUẢ ${_getCampSortIcon('effective_rate')}</th>
                </tr>
            </thead>
        `;

        if (_campaigns.length === 0) {
            tableEl.innerHTML = `
                ${headersHtml}
                <tbody id="tka-tbody">
                    <tr><td colspan="12" style="padding: 60px 20px; text-align: center; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">Chưa có dữ liệu tổng hợp chiến dịch</div>
                        <div style="font-size: 13px;">Bấm "🔄 Đồng Bộ Từ Meta" phía trên để cập nhật chỉ số mới nhất.</div>
                    </td></tr>
                </tbody>
            `;
            document.getElementById('tka-pagination').innerHTML = '';
            return;
        }

        // Find max effective count in current dataset for Google Sheet style highlighting
        const maxEffCount = Math.max(..._campaigns.map(c => parseInt(c.total_effective_count) || 0));

        const rowsHtml = _campaigns.map((row, i) => {
            const rowThreshold = parseFloat(row.effectiveness_threshold) || threshold;
            const rowIgnoreThresh = parseFloat(row.ignore_no_msg_spend_threshold) || ignoreThresh;
            const spend = parseFloat(row.total_spend) || 0;
            const messages = parseInt(row.total_messages) || 0;
            const cpa = parseFloat(row.avg_cpa) || 0;
            const effCount = parseInt(row.total_effective_count) || 0;
            const runCount = parseInt(row.total_run_count) || 1;
            const filteredRunCount = row.filtered_run_count !== undefined && row.filtered_run_count !== null ? parseInt(row.filtered_run_count) : runCount;

            // CPA color
            let cpaStyle = '';
            if (messages === 0) {
                cpaStyle = 'color: #94a3b8;';
            } else if (cpa < rowThreshold) {
                cpaStyle = 'color: #059669; font-weight: 800;';
            } else {
                cpaStyle = 'color: #dc2626; font-weight: 800;';
            }

            // Multi-Tier Heatmap Badge System for SỐ LẦN HIỆU QUẢ (Phân biệt màu sắc rõ rệt từng nấc)
            let effBadgeStyle = '';
            const ratio = maxEffCount > 0 ? effCount / maxEffCount : 0;

            if (effCount === 0) {
                // 0 lần (Đỏ nhạt)
                effBadgeStyle = 'background: #fee2e2; color: #dc2626; font-weight: 700;';
            } else if (effCount === maxEffCount || ratio >= 0.95) {
                // Top 1 / Cao Nhất (Hồng Magenta Neon rực rỡ với hiệu ứng Glow)
                effBadgeStyle = 'background: linear-gradient(135deg, #d946ef, #ec4899); color: white; font-weight: 900; box-shadow: 0 4px 12px rgba(217,70,239,0.45); text-shadow: 0 1px 2px rgba(0,0,0,0.3);';
            } else if (ratio >= 0.85) {
                // Nấc 2 (Xanh Neon Kim Cương rực rỡ)
                effBadgeStyle = 'background: #00ff66; color: #052e16; font-weight: 900; box-shadow: 0 0 10px rgba(0,255,102,0.45);';
            } else if (ratio >= 0.75) {
                // Nấc 3 (Xanh Lục Đậm / Emerald)
                effBadgeStyle = 'background: #10b981; color: white; font-weight: 800; box-shadow: 0 2px 6px rgba(16,185,129,0.3);';
            } else if (ratio >= 0.65) {
                // Nấc 4 (Xanh Lục Tươi / Spring Green)
                effBadgeStyle = 'background: #34d399; color: #064e3b; font-weight: 800;';
            } else if (ratio >= 0.50) {
                // Nấc 5 (Xanh Lá Sáng / Light Green)
                effBadgeStyle = 'background: #6ee7b7; color: #064e3b; font-weight: 800;';
            } else if (ratio >= 0.35) {
                // Nấc 6 (Xanh Dịu / Mint)
                effBadgeStyle = 'background: #a7f3d0; color: #065f46; font-weight: 800;';
            } else if (ratio >= 0.20) {
                // Nấc 7 (Xanh Nhạt / Soft Mint)
                effBadgeStyle = 'background: #dcfce7; color: #15803d; font-weight: 700;';
            } else {
                // Nấc 8 (Xanh Rất Nhạt / Pale Mint)
                effBadgeStyle = 'background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-weight: 700;';
            }

            // Post ID display & clickable link
            const postId = row.link_post_id || '';
            const postIdDisplay = postId.length > 18 ? postId.substring(0, 18) + '...' : postId;
            const accName = row.account_name || '';

            // Camp name display
            const campName = row.campaign_name || '';
            const campDisplay = campName.length > 45 ? campName.substring(0, 45) + '...' : campName;

            // Camp ID
            const campId = row.campaign_id || '';
            const campIdDisplay = campId.length > 20 ? campId.substring(0, 20) + '...' : campId;

            // Rounded CPM
            const roundedCpm = Math.round(parseFloat(row.avg_cpm || 0));

            // CPC calculation & formatting
            const ctr = parseFloat(row.avg_ctr || 0);
            const rawCpc = parseFloat(row.avg_cpc || 0);
            const cpcVal = rawCpc > 0 ? rawCpc : (ctr > 0 && roundedCpm > 0 ? (roundedCpm / (ctr * 10)) : 0);
            const formattedCpc = _fmtMoney(Math.round(cpcVal));
            const formattedCpa = messages > 0 ? _fmtMoney(Math.round(cpa)) : '-';
            const formattedCtr = ctr.toFixed(2) + '%';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; ${i % 2 === 0 ? 'background:#fafbfc;' : ''}transition:background 0.15s;"
                    onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='${i % 2 === 0 ? '#fafbfc' : 'white'}'">
                    <td style="padding: 8px 6px; white-space: nowrap; font-size: 12px;" title="${postId}">
                        ${postId ? `
                            <a href="http://fb.com/${postId}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline; transition: color 0.15s;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'" title="Bấm để xem bài viết Facebook (http://fb.com/${postId})">
                                ${postIdDisplay} ↗
                            </a>
                            ${accName ? `<div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px;">📘 ${_escapeHtml(accName)}</div>` : ''}
                        ` : '-'}
                    </td>
                    <td style="padding: 8px 6px; max-width: 260px;" title="${campName}${campId ? ' (' + campId + ')' : ''}">
                        <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${campDisplay}</div>
                        ${campId ? `<div style="font-size: 11px; color: #64748b; font-weight: 500; font-family: monospace; margin-top: 2px;">${campId}</div>` : ''}
                    </td>
                    <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: #1e1b4b; white-space: nowrap;">${_fmtMoney(spend)}</td>
                    <td style="padding: 8px 6px; text-align: center; font-weight: 800; color: ${messages > 0 ? '#0891b2' : '#94a3b8'};">${messages}</td>
                    <td style="padding: 8px 6px; text-align: right; white-space: nowrap; ${cpaStyle}">${formattedCpa}</td>
                    <td style="padding: 8px 6px; text-align: right; white-space: nowrap; font-weight: 600; color: #475569;">${formattedCpc}</td>
                    <td style="padding: 8px 6px; text-align: right; white-space: nowrap; font-weight: 600;">${formattedCtr}</td>
                    <td style="padding: 8px 6px; text-align: right; white-space: nowrap; font-weight: 600;">${_fmtMoney(roundedCpm)}</td>
                    <td style="padding: 8px 6px; text-align: center; font-weight: 700; color: #475569;">${runCount}</td>
                    <td style="padding: 8px 6px; text-align: center;">
                        <span style="
                            display: inline-block; padding: 4px 12px; border-radius: 8px;
                            font-size: 13px; font-weight: 800;
                            background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe;
                        " title="Số lần chạy hợp lệ (đã loại trừ các lần chạy dở < ${_fmtMoney(rowIgnoreThresh)} không ra tin nhắn)">${filteredRunCount}</span>
                    </td>
                    <td style="padding: 8px 6px; text-align: center;">
                        <span style="
                            display: inline-block; padding: 4px 12px; border-radius: 8px;
                            font-size: 13px; ${effBadgeStyle}
                        ">${effCount}</span>
                    </td>
                    <td style="padding: 8px 6px; text-align: center;">
                        ${(() => {
                            const effRate = row.effective_rate || 0;
                            let effRateBadgeStyle = '';
                            if (filteredRunCount === 0) {
                                effRateBadgeStyle = 'background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; font-weight: 700;';
                            } else if (effRate >= 100) {
                                effRateBadgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1.5px solid #93c5fd; font-weight: 900; box-shadow: 0 2px 6px rgba(29,78,216,0.15);';
                            } else if (effRate >= 80) {
                                effRateBadgeStyle = 'background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 800;';
                            } else if (effRate >= 65) {
                                effRateBadgeStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 800;';
                            } else if (effRate >= 50) {
                                effRateBadgeStyle = 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 800;';
                            } else {
                                effRateBadgeStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 800;';
                            }
                            return `<span style="display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 12.5px; ${effRateBadgeStyle}">${filteredRunCount > 0 ? (effRate.toFixed(2).replace('.', ',') + '%') : '-'}</span>`;
                        })()}
                    </td>
                </tr>
            `;
        }).join('');

        tableEl.innerHTML = `${headersHtml}<tbody id="tka-tbody">${rowsHtml}</tbody>`;

        const paginationEl = document.getElementById('tka-pagination');
        if (paginationEl) {
            paginationEl.innerHTML = `
                <div style="font-weight: 700; color: #334155;">
                    🔥 Tổng hợp <strong>${_fmt(_campaigns.length)}</strong> Chiến Dịch Quảng Cáo
                    ${_campSortColumn ? `<span style="margin-left:10px;color:#2563eb;">(Đang lọc/sắp xếp theo: <strong>${_campSortColumn}</strong> ${_campSortDir === 'desc' ? '▼' : '▲'})</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #64748b;">
                    💡 <em>Số liệu tổng hợp theo công thức Google Sheet Query (Nhóm theo Post ID & ID Camp)</em>
                </div>
            `;
        }
    }

    window._tkaGoPage = function(p) {
        _currentPage = p;
        _loadStats();
    };

    // ========== EVENTS ==========

    function _bindEvents() {
        // Table View Mode Switcher Tabs
        document.querySelectorAll('.tka-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const v = tab.getAttribute('data-view');
                if (v === _viewMode) return;
                _viewMode = v;
                document.querySelectorAll('.tka-view-tab').forEach(t => {
                    const isActive = t.getAttribute('data-view') === _viewMode;
                    if (isActive) {
                        t.style.background = 'linear-gradient(135deg, #1877f2, #2563eb)';
                        t.style.color = 'white';
                        t.style.border = 'none';
                        t.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)';
                    } else {
                        t.style.background = 'white';
                        t.style.color = '#475569';
                        t.style.border = '1.5px solid #cbd5e1';
                        t.style.boxShadow = 'none';
                    }
                });
                _loadData();
            });
        });

        // Account selector
        const accSel = document.getElementById('tka-account-select');
        if (accSel) {
            accSel.addEventListener('change', () => {
                _selectedAccountId = accSel.value;
                _currentPage = 1;
                _renderAccountSelector();
                _loadData();
            });
        }

        // Filter Mode Selector
        const modeSel = document.getElementById('tka-filter-mode-select');
        if (modeSel) {
            modeSel.addEventListener('change', () => {
                _filterMode = modeSel.value;
                _updateFilterControlsVisibility();
                _currentPage = 1;
                _loadData();
            });
        }

        // Month/Year selectors
        const monthSel = document.getElementById('tka-month-select');
        const yearSel = document.getElementById('tka-year-select');
        if (monthSel) monthSel.addEventListener('change', () => { _selectedMonth = monthSel.value === 'all' ? 'all' : parseInt(monthSel.value); _currentPage = 1; _loadData(); });
        if (yearSel) yearSel.addEventListener('change', () => { _selectedYear = parseInt(yearSel.value); _currentPage = 1; _loadData(); });

        // Quarter selectors
        const qSel = document.getElementById('tka-quarter-select');
        const qYearSel = document.getElementById('tka-q-year-select');
        if (qSel) qSel.addEventListener('change', () => { _selectedQuarter = parseInt(qSel.value); _currentPage = 1; _loadData(); });
        if (qYearSel) qYearSel.addEventListener('change', () => { _selectedYear = parseInt(qYearSel.value); _currentPage = 1; _loadData(); });

        // Date Range Picker Button
        const daterangeBtn = document.getElementById('tka-btn-daterange-picker');
        if (daterangeBtn) {
            daterangeBtn.addEventListener('click', _openCalendarPicker);
        }

        // Search
        const searchInput = document.getElementById('tka-search-input');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    _searchQuery = searchInput.value.trim();
                    _currentPage = 1;
                    _loadData();
                }, 400);
            });
        }

        // Sync button
        const syncBtn = document.getElementById('tka-btn-sync');
        if (syncBtn) {
            syncBtn.addEventListener('click', _handleSync);
        }

        // Schedule settings button
        const schedBtn = document.getElementById('tka-btn-schedule-settings');
        if (schedBtn) {
            schedBtn.addEventListener('click', () => _showSyncScheduleModal());
        }

        // Performance settings modal button
        const perfBtn = document.getElementById('tka-btn-perf-account');
        if (perfBtn) perfBtn.addEventListener('click', () => _showPerfModal());
    }

    function _updateFilterControlsVisibility() {
        const mCtl = document.getElementById('tka-month-controls');
        const qCtl = document.getElementById('tka-quarter-controls');
        const drCtl = document.getElementById('tka-daterange-controls');

        if (mCtl) mCtl.style.display = _filterMode === 'month' ? 'flex' : 'none';
        if (qCtl) qCtl.style.display = _filterMode === 'quarter' ? 'flex' : 'none';
        if (drCtl) drCtl.style.display = _filterMode === 'daterange' ? 'flex' : 'none';

        _updateDaterangeButtonText();
    }

    function _updateDaterangeButtonText() {
        const txt = document.getElementById('tka-daterange-text');
        if (!txt) return;

        if (_startDate && _endDate) {
            if (_startDate === _endDate) {
                txt.textContent = `Ngày ${_formatDateVN(_startDate)}`;
            } else {
                txt.textContent = `${_formatDateVN(_startDate)} → ${_formatDateVN(_endDate)}`;
            }
        } else {
            txt.textContent = 'Chọn từ bảng lịch...';
        }
    }

    // ========== CALENDAR PICKER POPUP ==========

    function _openCalendarPicker() {
        const existingPopover = document.getElementById('tka-calendar-modal');
        if (existingPopover) existingPopover.remove();

        // Temporary selection state inside calendar
        let tempStart = _startDate;
        let tempEnd = _endDate;

        // Current calendar view month/year
        let viewDate = tempStart ? new Date(tempStart) : new Date();
        let viewYear = viewDate.getFullYear();
        let viewMonth = viewDate.getMonth(); // 0-indexed

        // Double click detection state
        let lastClickDateStr = null;
        let lastClickTime = 0;

        const overlay = document.createElement('div');
        overlay.id = 'tka-calendar-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.15s ease;
        `;

        const popover = document.createElement('div');
        popover.style.cssText = `
            background: white; border-radius: 20px; width: 95%; max-width: 440px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.2); overflow: hidden;
            border: 1px solid #e2e8f0; animation: slideUp 0.2s ease;
        `;

        function renderCalendarHTML() {
            const firstDay = new Date(viewYear, viewMonth, 1);
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

            // Day of week offset (0: Sunday, 1: Monday...). Let's convert to T2..CN (0..6)
            let startDayOfWeek = firstDay.getDay(); // 0 is Sunday
            let offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 for Monday, 6 for Sunday

            const monthNames = [
                'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
            ];

            const todayStr = new Date().toISOString().split('T')[0];

            let daysHtml = '';

            // Blank cells padding before 1st day of month
            for (let i = 0; i < offset; i++) {
                daysHtml += `<div style="padding:10px;text-align:center;color:#cbd5e1;font-size:12px;"></div>`;
            }

            for (let d = 1; d <= daysInMonth; d++) {
                const mStr = String(viewMonth + 1).padStart(2, '0');
                const dStr = String(d).padStart(2, '0');
                const dateStr = `${viewYear}-${mStr}-${dStr}`;

                const isStart = tempStart === dateStr;
                const isEnd = tempEnd === dateStr;
                const isInRange = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
                const isToday = dateStr === todayStr;

                let cellBg = 'transparent';
                let cellColor = '#1e293b';
                let cellWeight = '500';
                let borderRadius = '8px';

                if (isStart && isEnd) {
                    cellBg = '#2563eb';
                    cellColor = 'white';
                    cellWeight = '800';
                    borderRadius = '50%';
                } else if (isStart) {
                    cellBg = '#2563eb';
                    cellColor = 'white';
                    cellWeight = '800';
                    borderRadius = '10px 0 0 10px';
                } else if (isEnd) {
                    cellBg = '#2563eb';
                    cellColor = 'white';
                    cellWeight = '800';
                    borderRadius = '0 10px 10px 0';
                } else if (isInRange) {
                    cellBg = '#eff6ff';
                    cellColor = '#1d4ed8';
                    cellWeight = '700';
                    borderRadius = '0';
                }

                daysHtml += `
                    <div class="tka-cal-day-cell" data-date="${dateStr}" style="
                        height: 38px; display: flex; align-items: center; justify-content: center;
                        background: ${cellBg}; color: ${cellColor}; font-weight: ${cellWeight};
                        font-size: 13px; cursor: pointer; border-radius: ${borderRadius};
                        user-select: none; transition: all 0.1s;
                        ${isToday && !isStart && !isEnd ? 'border: 1.5px solid #3b82f6; font-weight:700;' : ''}
                    " onmouseover="if(!'${isStart||isEnd}') this.style.background='#f1f5f9'" onmouseout="if(!'${isStart||isEnd}') this.style.background='${cellBg}'">
                        ${d}
                    </div>
                `;
            }

            let selRangeText = 'Chưa chọn ngày';
            if (tempStart && tempEnd) {
                if (tempStart === tempEnd) {
                    selRangeText = `🎯 Ngày: ${_formatDateVN(tempStart)}`;
                } else {
                    selRangeText = `🎯 Từ ${_formatDateVN(tempStart)} → ${_formatDateVN(tempEnd)}`;
                }
            } else if (tempStart) {
                selRangeText = `🎯 Bắt đầu: ${_formatDateVN(tempStart)} (Chọn tiếp ngày kết thúc)`;
            }

            popover.innerHTML = `
                <div style="padding: 16px 20px; background: linear-gradient(135deg, #1e293b, #334155); color: white; display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                        <span>📆</span> Chọn Khoảng Thời Gian (Bảng Lịch)
                    </div>
                    <button id="tka-cal-close" style="background:transparent;border:none;color:white;font-size:18px;cursor:pointer;">✕</button>
                </div>

                <!-- Quick Presets -->
                <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="tka-preset-btn" data-preset="today" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:white;font-size:11px;font-weight:700;cursor:pointer;">Hôm Nay</button>
                    <button class="tka-preset-btn" data-preset="yesterday" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:white;font-size:11px;font-weight:700;cursor:pointer;">Hôm Qua</button>
                    <button class="tka-preset-btn" data-preset="last7" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:white;font-size:11px;font-weight:700;cursor:pointer;">7 Ngày Qua</button>
                    <button class="tka-preset-btn" data-preset="last30" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:white;font-size:11px;font-weight:700;cursor:pointer;">30 Ngày Qua</button>
                    <button class="tka-preset-btn" data-preset="thisMonth" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:white;font-size:11px;font-weight:700;cursor:pointer;">Tháng Này</button>
                </div>

                <div style="padding: 16px 20px;">
                    <!-- Month Navigation -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <button id="tka-cal-prev-m" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: 700;">◀</button>
                        <div style="font-weight: 800; font-size: 15px; color: #0f172a;">
                            ${monthNames[viewMonth]} — Năm ${viewYear}
                        </div>
                        <button id="tka-cal-next-m" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: 700;">▶</button>
                    </div>

                    <div style="font-size: 11px; color: #64748b; margin-bottom: 10px; text-align: center;">
                        💡 <em>Đúp 2 lần vào 1 ngày để chọn riêng ngày đó. Chọn 2 ngày khác nhau để lọc khoảng.</em>
                    </div>

                    <!-- Days Header -->
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 8px;">
                        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
                    </div>

                    <!-- Days Grid -->
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
                        ${daysHtml}
                    </div>
                </div>

                <!-- Footer Summary & Actions -->
                <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e293b; flex: 1;">
                        ${selRangeText}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="tka-cal-clear" style="padding: 7px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 12px; font-weight: 700; cursor: pointer;">Xóa</button>
                        <button id="tka-cal-apply" style="padding: 7px 18px; border-radius: 8px; border: none; background: #2563eb; color: white; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">Áp Dụng</button>
                    </div>
                </div>
            `;

            bindCalendarEvents();
        }

        function bindCalendarEvents() {
            popover.querySelector('#tka-cal-close').addEventListener('click', () => overlay.remove());

            popover.querySelector('#tka-cal-prev-m').addEventListener('click', () => {
                viewMonth--;
                if (viewMonth < 0) { viewMonth = 11; viewYear--; }
                renderCalendarHTML();
            });

            popover.querySelector('#tka-cal-next-m').addEventListener('click', () => {
                viewMonth++;
                if (viewMonth > 11) { viewMonth = 0; viewYear++; }
                renderCalendarHTML();
            });

            // Day click / double click
            popover.querySelectorAll('.tka-cal-day-cell').forEach(cell => {
                cell.addEventListener('click', (e) => {
                    const dateStr = cell.getAttribute('data-date');
                    if (!dateStr) return;

                    const now = Date.now();
                    const isDoubleClick = (lastClickDateStr === dateStr) && (now - lastClickTime < 350);

                    if (isDoubleClick) {
                        // DOUBLE CLICK: Select single date & apply immediately!
                        _startDate = dateStr;
                        _endDate = dateStr;
                        _updateDaterangeButtonText();
                        overlay.remove();
                        _currentPage = 1;
                        _loadData();
                        return;
                    }

                    lastClickDateStr = dateStr;
                    lastClickTime = now;

                    // Single click range logic
                    if (!tempStart || (tempStart && tempEnd)) {
                        tempStart = dateStr;
                        tempEnd = null;
                    } else if (tempStart && !tempEnd) {
                        if (dateStr < tempStart) {
                            tempEnd = tempStart;
                            tempStart = dateStr;
                        } else {
                            tempEnd = dateStr;
                        }
                    }
                    renderCalendarHTML();
                });
            });

            // Presets
            popover.querySelectorAll('.tka-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = btn.getAttribute('data-preset');
                    const now = new Date();
                    const todayStr = now.toISOString().split('T')[0];

                    if (p === 'today') {
                        _startDate = todayStr;
                        _endDate = todayStr;
                    } else if (p === 'yesterday') {
                        const y = new Date(Date.now() - 86400000);
                        const yStr = y.toISOString().split('T')[0];
                        _startDate = yStr;
                        _endDate = yStr;
                    } else if (p === 'last7') {
                        const d7 = new Date(Date.now() - 6 * 86400000);
                        _startDate = d7.toISOString().split('T')[0];
                        _endDate = todayStr;
                    } else if (p === 'last30') {
                        const d30 = new Date(Date.now() - 29 * 86400000);
                        _startDate = d30.toISOString().split('T')[0];
                        _endDate = todayStr;
                    } else if (p === 'thisMonth') {
                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                        _startDate = firstDay.toISOString().split('T')[0];
                        _endDate = todayStr;
                    }

                    _updateDaterangeButtonText();
                    overlay.remove();
                    _currentPage = 1;
                    _loadData();
                });
            });

            // Clear
            popover.querySelector('#tka-cal-clear').addEventListener('click', () => {
                tempStart = null;
                tempEnd = null;
                renderCalendarHTML();
            });

            // Apply
            popover.querySelector('#tka-cal-apply').addEventListener('click', () => {
                if (!tempStart) {
                    alert('Vui lòng chọn ngày!');
                    return;
                }
                _startDate = tempStart;
                _endDate = tempEnd || tempStart;
                _updateDaterangeButtonText();
                overlay.remove();
                _currentPage = 1;
                _loadData();
            });
        }

        overlay.appendChild(popover);
        document.body.appendChild(overlay);
        renderCalendarHTML();

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ========== SYNC ==========

    async function _handleSync() {
        if (_selectedAccountId === 'all') {
            alert('Vui lòng chọn 1 tài khoản cụ thể để đồng bộ!');
            return;
        }

        let since = '';
        let until = '';

        if (_filterMode === 'daterange' && _startDate && _endDate) {
            since = _startDate;
            until = _endDate;
        } else if (_filterMode === 'quarter') {
            const q = parseInt(_selectedQuarter);
            let startM = 1, endM = 3;
            if (q === 2) { startM = 4; endM = 6; }
            else if (q === 3) { startM = 7; endM = 9; }
            else if (q === 4) { startM = 10; endM = 12; }
            since = `${_selectedYear}-${String(startM).padStart(2, '0')}-01`;
            const lastDay = new Date(_selectedYear, endM, 0).getDate();
            until = `${_selectedYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
            since = `${_selectedYear}-${String(_selectedMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(_selectedYear, _selectedMonth, 0).getDate();
            until = `${_selectedYear}-${String(_selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        const syncBtn = document.getElementById('tka-btn-sync');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '⏳ Đang đồng bộ...';
            syncBtn.style.opacity = '0.7';
        }

        try {
            const res = await fetch(`/api/thongkeads/accounts/${_selectedAccountId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ since, until })
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            alert(`✅ ${data.message}`);
            _loadData();
        } catch(e) {
            alert(`❌ Lỗi đồng bộ: ${e.message}`);
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '🔄 Đồng Bộ Từ Meta';
                syncBtn.style.opacity = '1';
            }
        }
    }

    // ========== PERFORMANCE MODAL ==========

    async function _showPerfModal(targetAccId) {
        const fbAccs = _accounts.filter(a => a.platform === 'facebook');
        if (!fbAccs || fbAccs.length === 0) {
            alert('⚠️ Chưa có tài khoản quảng cáo nào! Vui lòng sang trang "Cài Đặt Tài Khoản Ads" để tạo tài khoản trước.');
            return;
        }

        let currentTargetId = targetAccId || (_selectedAccountIds && _selectedAccountIds.length === 1 ? _selectedAccountIds[0] : String(fbAccs[0].id));
        let account = fbAccs.find(a => String(a.id) === String(currentTargetId)) || fbAccs[0];

        // Remove existing modal
        const existingModal = document.getElementById('tka-account-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tka-account-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        const isReadonly = !_isGD;
        const disabledAttr = isReadonly ? 'disabled style="background:#f1f5f9;cursor:not-allowed;"' : '';

        const renderModalBody = (acc) => `
            <div style="
                background: white; border-radius: 20px; width: 95%; max-width: 560px;
                max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                animation: slideUp 0.3s ease;
            ">
                <div style="padding: 22px 28px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:22px;">📊</span>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #1e293b;">Cài Đặt Hiệu Quả Quảng Cáo</h3>
                        ${isReadonly ? '<span style="font-size:11px;font-weight:700;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:6px;margin-left:6px;">👁️ Chỉ xem</span>' : ''}
                    </div>
                    <button id="tka-modal-close" style="
                        width: 36px; height: 36px; border-radius: 10px; border: none;
                        background: #f1f5f9; cursor: pointer; font-size: 18px; display: flex;
                        align-items: center; justify-content: center; color: #64748b;
                    ">✕</button>
                </div>
                <div style="padding: 24px 28px;">

                    <div style="margin-bottom: 20px;">
                        <label style="display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">
                            Chọn Tài Khoản Quảng Cáo *
                        </label>
                        <select id="tka-f-account-id" style="width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid #cbd5e1;font-size:14px;font-weight:700;color:#0f172a;background:white;outline:none;">
                            ${fbAccs.map(a => `
                                <option value="${a.id}" ${String(a.id) === String(acc.id) ? 'selected' : ''}>
                                    📘 ${a.account_name} (${a.fb_ad_account_id || 'ID chưa cài'})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="background: #fafbfc; padding: 20px; border-radius: 16px; border: 1.5px solid #e2e8f0; margin-bottom: 10px;">
                        <h4 style="margin: 0 0 16px; font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                            📊 Tiêu Chí & Ngưỡng Đánh Giá
                        </h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Tiêu chí hiệu quả</label>
                                <select id="tka-f-metric" ${disabledAttr} style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:600;${isReadonly ? 'background:#f1f5f9;cursor:not-allowed;' : 'background:white;'}">
                                    <option value="cpa" ${(acc.effectiveness_metric || 'cpa') === 'cpa' ? 'selected' : ''}>CPA (Chi phí / Tin nhắn)</option>
                                    <option value="ctr" ${acc.effectiveness_metric === 'ctr' ? 'selected' : ''}>CTR (Tỷ lệ click)</option>
                                    <option value="cpm" ${acc.effectiveness_metric === 'cpm' ? 'selected' : ''}>CPM (Chi phí / 1000 hiển thị)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Ngưỡng hiệu quả (đ)</label>
                                <input id="tka-f-threshold" type="text"
                                    value="${_fmtNumber(acc.effectiveness_threshold || 75000)}"
                                    placeholder="75.000"
                                    ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}
                                    oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                            </div>
                        </div>

                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">
                                SL Chạy Thực (Không tính số lần chạy không ra tin nhắn < đ)
                            </label>
                            <input id="tka-f-ignore-no-msg-thresh" type="text"
                                value="${_fmtNumber(acc.ignore_no_msg_spend_threshold || 70000)}"
                                placeholder="70.000"
                                ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}
                                oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 5px;">
                                💡 Các ngày chạy dở có Chi tiêu < số tiền này VÀ không ra tin nhắn sẽ không bị tính là 1 lần chạy.
                            </div>
                        </div>

                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">
                                🏆 Ngưỡng % Tỷ Lệ Mẫu Win (%)
                            </label>
                            ${(() => {
                                let winVal = 50;
                                if (acc.win_rate_threshold != null && acc.win_rate_threshold !== '') {
                                    const parsed = parseFloat(acc.win_rate_threshold);
                                    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) winVal = Math.round(parsed);
                                }
                                return `<input id="tka-f-win-rate-thresh" type="number" min="0" max="100" step="1"
                                    value="${winVal}"
                                    placeholder="50"
                                    ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}>`;
                            })()}
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 5px;">
                                💡 Chiến dịch có % HIỆU QUẢ ≥ số này sẽ được xếp vào Mẫu Win, ngược lại là Mẫu Lose.
                            </div>
                        </div>
                    </div>
                </div>

                <div style="padding: 18px 28px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; background: white; border-radius: 0 0 20px 20px;">
                    <button id="tka-modal-cancel" style="
                        padding: 11px 22px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                        background: white; color: #475569; font-size: 13px; font-weight: 700;
                        cursor: pointer;
                    ">${isReadonly ? 'Đóng' : 'Hủy'}</button>
                    ${isReadonly ? `
                        <button disabled style="
                            padding: 11px 22px; border-radius: 12px; border: none;
                            background: #e2e8f0; color: #64748b; font-size: 13px; font-weight: 700;
                            cursor: not-allowed; display: flex; align-items: center; gap: 6px;
                        ">🔒 Chỉ Giám Đốc/Admin Mới Có Quyền Chỉnh Sửa</button>
                    ` : `
                        <button id="tka-modal-save" style="
                            padding: 11px 24px; border-radius: 12px; border: none;
                            background: linear-gradient(135deg, #1877f2, #2563eb);
                            color: white; font-size: 13px; font-weight: 800;
                            cursor: pointer; display: flex; align-items: center; gap: 8px;
                            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                        ">💾 Lưu Cấu Hình Hiệu Quả</button>
                    `}
                </div>
            </div>
        `;

        overlay.innerHTML = renderModalBody(account);
        document.body.appendChild(overlay);

        const setupModalListeners = () => {
            const accSelect = overlay.querySelector('#tka-f-account-id');
            if (accSelect) {
                accSelect.addEventListener('change', () => {
                    const newAccId = accSelect.value;
                    const found = fbAccs.find(a => String(a.id) === String(newAccId));
                    if (found) {
                        overlay.innerHTML = renderModalBody(found);
                        setupModalListeners();
                    }
                });
            }

            overlay.querySelector('#tka-modal-close')?.addEventListener('click', () => overlay.remove());
            overlay.querySelector('#tka-modal-cancel')?.addEventListener('click', () => overlay.remove());

            const saveBtn = overlay.querySelector('#tka-modal-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const targetId = overlay.querySelector('#tka-f-account-id').value;
                    const metric = overlay.querySelector('#tka-f-metric').value;
                    const threshold = _cleanNumber(overlay.querySelector('#tka-f-threshold').value, 75000);
                    const ignoreThresh = _cleanNumber(overlay.querySelector('#tka-f-ignore-no-msg-thresh').value, 70000);

                    const winInputVal = overlay.querySelector('#tka-f-win-rate-thresh')?.value;
                    const parsedWin = parseFloat(winInputVal);
                    const winThresh = (!isNaN(parsedWin) && parsedWin >= 0 && parsedWin <= 100) ? parsedWin : 50;

                    saveBtn.disabled = true;
                    saveBtn.textContent = '⏳ Đang lưu...';

                    try {
                        const res = await fetch(`/api/thongkeads/accounts/${targetId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                effectiveness_metric: metric,
                                effectiveness_threshold: threshold,
                                ignore_no_msg_spend_threshold: ignoreThresh,
                                win_rate_threshold: winThresh
                            })
                        });
                        const data = await res.json();
                        if (!data.ok) throw new Error(data.error);

                        _selectedAccountIds = [String(targetId)];

                        const targetAcc = _accounts.find(a => String(a.id) === String(targetId));
                        if (targetAcc) {
                            targetAcc.effectiveness_metric = metric;
                            targetAcc.effectiveness_threshold = threshold;
                            targetAcc.ignore_no_msg_spend_threshold = ignoreThresh;
                        }

                        overlay.remove();
                        alert('✅ Đã lưu cài đặt hiệu quả thành công!');
                        _loadAccounts();
                        _loadCampaignSummaryData();
                    } catch(e) {
                        alert(`❌ Lỗi: ${e.message}`);
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Lưu Cấu Hình Hiệu Quả';
                    }
                });
            }
        };

        setupModalListeners();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    // ========== MODAL CÀI ĐẶT LỊCH ĐỒNG BỘ CRM & GIỜ BÁO ZALO ==========
    async function _showSyncScheduleModal() {
        let settings = { sync_enabled: true, sync_hours: [0, 1, 8, 13, 19], zalo_notify_hours: [0] };
        try {
            const res = await fetch('/api/thongkeads/sync-schedule', { credentials: 'include' });
            const data = await res.json();
            if (data.ok) {
                settings.sync_enabled = data.sync_enabled;
                settings.sync_hours = data.sync_hours || [0, 1, 8, 13, 19];
                settings.zalo_notify_hours = data.zalo_notify_hours || [0];
            }
        } catch (e) {
            console.error('[load sync schedule error]', e);
        }

        let selectedSyncHours = new Set(settings.sync_hours);
        let selectedZaloHours = new Set(settings.zalo_notify_hours);
        let isEnabled = settings.sync_enabled;

        const overlay = document.createElement('div');
        overlay.id = 'tka-schedule-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 100000; padding: 20px; box-sizing: border-box;
        `;

        function renderSyncGrid() {
            let gridHtml = '';
            for (let h = 0; h < 24; h++) {
                const isChecked = selectedSyncHours.has(h);
                const label = String(h).padStart(2, '0') + ':00';
                gridHtml += `
                    <button type="button" class="tka-sync-hour-btn ${isChecked ? 'active' : ''}" data-hour="${h}" style="
                        padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 700;
                        border: 1.5px solid ${isChecked ? '#059669' : '#cbd5e1'};
                        background: ${isChecked ? '#ecfdf5' : 'white'};
                        color: ${isChecked ? '#047857' : '#475569'};
                        cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 3px;
                    ">
                        <span>${isChecked ? '✅' : '⚪'}</span> ${label}
                    </button>
                `;
            }
            return gridHtml;
        }

        function renderZaloGrid() {
            let gridHtml = '';
            for (let h = 0; h < 24; h++) {
                const isChecked = selectedZaloHours.has(h);
                const label = String(h).padStart(2, '0') + ':00';
                gridHtml += `
                    <button type="button" class="tka-zalo-hour-btn ${isChecked ? 'active' : ''}" data-hour="${h}" style="
                        padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 700;
                        border: 1.5px solid ${isChecked ? '#2563eb' : '#cbd5e1'};
                        background: ${isChecked ? '#eff6ff' : 'white'};
                        color: ${isChecked ? '#1e40af' : '#475569'};
                        cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 3px;
                    ">
                        <span>${isChecked ? '📱' : '⚪'}</span> ${label}
                    </button>
                `;
            }
            return gridHtml;
        }

        overlay.innerHTML = `
            <div style="
                background: white; width: 100%; max-width: 720px; border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;
                font-family: inherit;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #059669 0%, #0284c7 100%);
                    padding: 20px 26px; color: white; display: flex; align-items: center; justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 26px; background: rgba(255,255,255,0.2); padding: 6px 10px; border-radius: 14px;">⚙️</span>
                        <div>
                            <h3 style="margin: 0; font-size: 19px; font-weight: 800;">Lịch Đồng Bộ CRM & Báo Zalo Tự Động</h3>
                            <div style="font-size: 12.5px; opacity: 0.9; margin-top: 2px;">Tách biệt khung giờ đồng bộ dữ liệu ngầm và khung giờ bắn tin Zalo</div>
                        </div>
                    </div>
                    <button id="tka-sched-close" style="
                        background: rgba(255,255,255,0.2); border: none; color: white;
                        font-size: 20px; font-weight: bold; width: 34px; height: 34px; border-radius: 50%;
                        cursor: pointer; display: flex; align-items: center; justify-content: center;
                    ">&times;</button>
                </div>

                <!-- Body -->
                <div style="padding: 20px 26px; max-height: 75vh; overflow-y: auto;">
                    <!-- Switch -->
                    <div style="
                        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;
                        padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">⚡ Trạng Thái Tiến Trình Tự Động</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">Bật/tắt toàn bộ tiến trình quét ngầm & thông báo Zalo</div>
                        </div>
                        <label style="position: relative; display: inline-block; width: 48px; height: 25px; cursor: pointer;">
                            <input type="checkbox" id="tka-sched-enabled" ${isEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span style="
                                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                                background-color: ${isEnabled ? '#10b981' : '#cbd5e1'}; transition: .3s; border-radius: 34px;
                            " id="tka-sched-slider">
                                <span style="
                                    position: absolute; content: ''; height: 19px; width: 19px; left: 3px; bottom: 3px;
                                    background-color: white; transition: .3s; border-radius: 50%;
                                    transform: ${isEnabled ? 'translateX(23px)' : 'none'};
                                " id="tka-sched-knob"></span>
                            </span>
                        </label>
                    </div>

                    <!-- PHẦN 1: ĐỒNG BỘ CRM NGẦM -->
                    <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 18px; padding: 16px; margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <span style="font-size: 14px; font-weight: 800; color: #166534;">🔄 1. Khung Giờ Đồng Bộ Ngầm (Web CRM)</span>
                                <div style="font-size: 11.5px; color: #15803d; margin-top: 2px;">Kéo dữ liệu Meta Ads API lưu vào DB để số liệu trên CRM luôn mới nhất</div>
                            </div>
                            <span id="tka-sync-count" style="font-weight: 800; color: #047857; font-size: 12px; background: #dcfce7; padding: 4px 10px; border-radius: 8px;">${selectedSyncHours.size} giờ</span>
                        </div>

                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                            <button type="button" class="tka-sync-preset" data-preset="default" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #a7f3d0; background: white; font-size: 11.5px; font-weight: 700; color: #065f46; cursor: pointer;">⭐ Mặc định (00h,01h,08h,13h,19h)</button>
                            <button type="button" class="tka-sync-preset" data-preset="every2h" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #a7f3d0; background: white; font-size: 11.5px; font-weight: 700; color: #065f46; cursor: pointer;">🔄 Mỗi 2 tiếng</button>
                            <button type="button" class="tka-sync-preset" data-preset="all" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #a7f3d0; background: white; font-size: 11.5px; font-weight: 700; color: #065f46; cursor: pointer;">✔️ Chọn tất cả (24h)</button>
                        </div>

                        <div id="tka-sync-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
                            ${renderSyncGrid()}
                        </div>
                    </div>

                    <!-- PHẦN 2: THÔNG BÁO ZALO -->
                    <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 18px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <span style="font-size: 14px; font-weight: 800; color: #1e40af;">📱 2. Khung Giờ Báo Tin Nhắn Zalo</span>
                                <div style="font-size: 11.5px; color: #1d4ed8; margin-top: 2px;">Chỉ phát tin nhắn Zalo tổng kết vào những khung giờ được chọn ở đây</div>
                            </div>
                            <span id="tka-zalo-count" style="font-weight: 800; color: #1d4ed8; font-size: 12px; background: #dbeafe; padding: 4px 10px; border-radius: 8px;">${selectedZaloHours.size} giờ</span>
                        </div>

                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                            <button type="button" class="tka-zalo-preset" data-preset="zalo-midnight" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #93c5fd; background: white; font-size: 11.5px; font-weight: 700; color: #1e40af; cursor: pointer;">🌙 1 Lần lúc 00:00 (Chốt ngày)</button>
                            <button type="button" class="tka-zalo-preset" data-preset="zalo-evening" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #93c5fd; background: white; font-size: 11.5px; font-weight: 700; color: #1e40af; cursor: pointer;">🌆 1 Lần lúc 19:00 (Hết giờ làm)</button>
                            <button type="button" class="tka-zalo-preset" data-preset="zalo-same-sync" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #93c5fd; background: white; font-size: 11.5px; font-weight: 700; color: #1e40af; cursor: pointer;">🔄 Báo theo giờ đồng bộ CRM</button>
                            <button type="button" class="tka-zalo-preset" data-preset="zalo-none" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #fca5a5; background: #fef2f2; font-size: 11.5px; font-weight: 700; color: #991b1b; cursor: pointer;">❌ Tắt báo Zalo</button>
                        </div>

                        <div id="tka-zalo-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
                            ${renderZaloGrid()}
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 26px; background: #f8fafc; border-top: 1px solid #e2e8f0;
                    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
                ">
                    <button id="tka-sched-btn-test-zalo" style="
                        padding: 9px 15px; border-radius: 10px; border: 1.5px solid #0284c7;
                        background: #f0f9ff; color: #0369a1; font-size: 12.5px; font-weight: 700; cursor: pointer;
                        display: flex; align-items: center; gap: 5px; margin-right: auto;
                    ">🧪 Test Gửi Báo Cáo Zalo</button>

                    <button id="tka-sched-btn-cancel" style="
                        padding: 9px 16px; border-radius: 10px; border: 1.5px solid #cbd5e1;
                        background: white; color: #475569; font-size: 12.5px; font-weight: 700; cursor: pointer;
                    ">Hủy</button>
                    <button id="tka-sched-btn-save" style="
                        padding: 9px 20px; border-radius: 10px; border: none;
                        background: linear-gradient(135deg, #059669, #10b981);
                        color: white; font-size: 12.5px; font-weight: 800; cursor: pointer;
                        box-shadow: 0 4px 12px rgba(5,150,105,0.3); transition: all 0.2s;
                    ">💾 Lưu Cấu Hình Lịch</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Switch handler
        const chk = overlay.querySelector('#tka-sched-enabled');
        const slider = overlay.querySelector('#tka-sched-slider');
        const knob = overlay.querySelector('#tka-sched-knob');
        chk.addEventListener('change', () => {
            isEnabled = chk.checked;
            slider.style.backgroundColor = isEnabled ? '#10b981' : '#cbd5e1';
            knob.style.transform = isEnabled ? 'translateX(23px)' : 'none';
        });

        // Sync Grid UI logic
        const syncGrid = overlay.querySelector('#tka-sync-grid');
        const syncCountBadge = overlay.querySelector('#tka-sync-count');

        function updateSyncUI() {
            syncGrid.innerHTML = renderSyncGrid();
            syncCountBadge.textContent = `${selectedSyncHours.size} giờ`;
            bindSyncButtons();
        }

        function bindSyncButtons() {
            syncGrid.querySelectorAll('.tka-sync-hour-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const h = parseInt(btn.dataset.hour, 10);
                    if (selectedSyncHours.has(h)) selectedSyncHours.delete(h);
                    else selectedSyncHours.add(h);
                    updateSyncUI();
                });
            });
        }
        bindSyncButtons();

        // Zalo Grid UI logic
        const zaloGrid = overlay.querySelector('#tka-zalo-grid');
        const zaloCountBadge = overlay.querySelector('#tka-zalo-count');

        function updateZaloUI() {
            zaloGrid.innerHTML = renderZaloGrid();
            zaloCountBadge.textContent = `${selectedZaloHours.size} giờ`;
            bindZaloButtons();
        }

        function bindZaloButtons() {
            zaloGrid.querySelectorAll('.tka-zalo-hour-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const h = parseInt(btn.dataset.hour, 10);
                    if (selectedZaloHours.has(h)) selectedZaloHours.delete(h);
                    else selectedZaloHours.add(h);
                    updateZaloUI();
                });
            });
        }
        bindZaloButtons();

        // Sync Presets
        overlay.querySelectorAll('.tka-sync-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = btn.dataset.preset;
                if (p === 'default') selectedSyncHours = new Set([0, 1, 8, 13, 19]);
                else if (p === 'every2h') selectedSyncHours = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
                else if (p === 'all') selectedSyncHours = new Set(Array.from({ length: 24 }, (_, i) => i));
                updateSyncUI();
            });
        });

        // Zalo Presets
        overlay.querySelectorAll('.tka-zalo-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = btn.dataset.preset;
                if (p === 'zalo-midnight') selectedZaloHours = new Set([0]);
                else if (p === 'zalo-evening') selectedZaloHours = new Set([19]);
                else if (p === 'zalo-same-sync') selectedZaloHours = new Set(selectedSyncHours);
                else if (p === 'zalo-none') selectedZaloHours = new Set();
                updateZaloUI();
            });
        });

        // Close handlers
        const closeBtn = overlay.querySelector('#tka-sched-close');
        const cancelBtn = overlay.querySelector('#tka-sched-btn-cancel');
        const closeFunc = () => overlay.remove();
        closeBtn.addEventListener('click', closeFunc);
        cancelBtn.addEventListener('click', closeFunc);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFunc(); });

        // Test Zalo handler
        const testZaloBtn = overlay.querySelector('#tka-sched-btn-test-zalo');
        if (testZaloBtn) {
            testZaloBtn.addEventListener('click', async () => {
                testZaloBtn.disabled = true;
                testZaloBtn.textContent = '⏳ Đang gửi thử Zalo...';
                try {
                    const res = await fetch('/api/thongkeads/zalo-test-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({})
                    });
                    const data = await res.json();
                    if (!data.ok) throw new Error(data.error || 'Lỗi gửi tin thử Zalo');
                    alert(`✅ ${data.message}`);
                } catch (e) {
                    alert(`❌ Lỗi: ${e.message}`);
                } finally {
                    testZaloBtn.disabled = false;
                    testZaloBtn.textContent = '🧪 Test Gửi Báo Cáo Zalo';
                }
            });
        }

        // Save handler
        const saveBtn = overlay.querySelector('#tka-sched-btn-save');
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu...';

            try {
                const res = await fetch('/api/thongkeads/sync-schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        sync_hours: Array.from(selectedSyncHours).sort((a, b) => a - b),
                        zalo_notify_hours: Array.from(selectedZaloHours).sort((a, b) => a - b),
                        sync_enabled: isEnabled
                    })
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || 'Lỗi lưu lịch');

                alert(`✅ ${data.message}`);
                overlay.remove();
            } catch (err) {
                alert(`❌ Lỗi: ${err.message}`);
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Lưu Cấu Hình Lịch';
            }
        });
    }
};

window.renderThongKeAdsPage = window.renderThongkeadsPage;

function _tkaSetupGlobalTooltip() {
    if (window._cdAdsTooltipInitialized) return;
    window._cdAdsTooltipInitialized = true;

    let tip = document.getElementById('cd-global-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'cd-global-tooltip';
        tip.style.cssText = `
            position: fixed;
            background: #0f172a;
            color: #ffffff;
            padding: 9px 13px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.45;
            white-space: pre-line;
            width: max-content;
            max-width: 300px;
            text-align: left;
            pointer-events: none;
            z-index: 999999;
            box-shadow: 0 12px 28px -5px rgba(0,0,0,0.5), 0 4px 10px -2px rgba(0,0,0,0.3);
            border: 1px solid #334155;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.15s ease, transform 0.15s ease;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            display: none;
        `;
        document.body.appendChild(tip);
    }

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;

        // Skip sidebar menu items when sidebar is expanded
        if (target.closest('.nav-item, #sidebar, .sidebar')) {
            const sidebar = target.closest('#sidebar, .sidebar') || document.querySelector('#sidebar, .sidebar');
            if (!sidebar || !sidebar.classList.contains('collapsed')) return;
        }

        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        tip.innerText = text;
        tip.style.display = 'block';

        const rect = target.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();

        let top = rect.top - tipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

        if (top < 10) top = rect.bottom + 8;
        if (left < 10) left = 10;
        if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;

        tip.style.top = `${top}px`;
        tip.style.left = `${left}px`;
        requestAnimationFrame(() => {
            tip.style.opacity = '1';
            tip.style.transform = 'translateY(0)';
        });
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;
        tip.style.opacity = '0';
        tip.style.transform = 'translateY(4px)';
    });
}

_tkaSetupGlobalTooltip();

