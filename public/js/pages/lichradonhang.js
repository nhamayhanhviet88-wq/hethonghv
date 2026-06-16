// ========== LỊCH RA ĐƠN HÀNG — Pages Controller ==========

(function() {
    let selectedYear = vnNow().getFullYear();
    let selectedQuarter = 'all';
    let selectedMonth = vnNow().getMonth() + 1;
    let searchQuery = '';
    let debounceTimer = null;

    // Standard Vietnamese month name options
    const MONTH_LABELS = {
        1: 'Tháng 1', 2: 'Tháng 2', 3: 'Tháng 3', 4: 'Tháng 4',
        5: 'Tháng 5', 6: 'Tháng 6', 7: 'Tháng 7', 8: 'Tháng 8',
        9: 'Tháng 9', 10: 'Tháng 10', 11: 'Tháng 11', 12: 'Tháng 12'
    };

    // Department configs
    const DEPARTMENTS = [
        { key: 'cut', label: 'Cắt', emoji: '✂️', cls: 'dept-cut' },
        { key: 'in', label: 'In', emoji: '🖨️', cls: 'dept-in' },
        { key: 'ep', label: 'Ép', emoji: '🔥', cls: 'dept-ep' },
        { key: 'may', label: 'May', emoji: '🧵', cls: 'dept-may' },
        { key: 'gui', label: 'Gửi', emoji: '📦', cls: 'dept-gui' }
    ];

    // Priority colors for card indicators
    const PRIORITY_MAP = {
        'GẤP': { border: '#ef4444', text: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
        'GỬI': { border: '#3b82f6', text: '#93c5fd', bg: 'rgba(59,130,246,0.1)' },
        'CHUẨN': { border: '#10b981', text: '#86efac', bg: 'rgba(16,185,129,0.1)' }
    };

    window.renderLichradonhangPage = function(content) {
        content.innerHTML = `
            <div class="cal-wrap">
                <style>
                    .cal-wrap {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        color: #f8fafc;
                        padding: 10px 4px;
                    }
                    /* Filter Bar */
                    .cal-filter-bar {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 16px;
                        background: rgba(30, 41, 59, 0.7);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 16px;
                        padding: 18px 24px;
                        margin-bottom: 20px;
                        align-items: center;
                    }
                    .cal-title-group {
                        flex: 1;
                        min-width: 200px;
                    }
                    .cal-title-group h2 {
                        margin: 0;
                        font-size: 20px;
                        font-weight: 800;
                        background: linear-gradient(135deg, #38bdf8, #818cf8);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .cal-title-group p {
                        margin: 4px 0 0;
                        font-size: 12px;
                        color: #94a3b8;
                    }
                    .cal-filters-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 14px;
                        align-items: center;
                    }
                    .cal-filter-item {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .cal-filter-item label {
                        font-size: 11px;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .cal-select {
                        background: #0f172a;
                        border: 1.5px solid rgba(255, 255, 255, 0.1);
                        color: #f8fafc;
                        padding: 10px 16px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        outline: none;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 110px;
                    }
                    .cal-select:focus {
                        border-color: #6366f1;
                        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                    }
                    .cal-search-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }
                    .cal-input {
                        background: #0f172a;
                        border: 1.5px solid rgba(255, 255, 255, 0.1);
                        color: #f8fafc;
                        padding: 10px 36px 10px 16px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        outline: none;
                        width: 240px;
                        transition: all 0.2s;
                    }
                    .cal-input:focus {
                        border-color: #6366f1;
                        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                        width: 300px;
                    }
                    .cal-search-clear {
                        position: absolute;
                        right: 12px;
                        color: #64748b;
                        font-size: 18px;
                        font-weight: bold;
                        cursor: pointer;
                        display: none;
                        user-select: none;
                    }
                    .cal-search-clear:hover {
                        color: #f8fafc;
                    }

                    /* Stats Bar */
                    .cal-stats-bar {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .cal-stat-card {
                        background: rgba(30, 41, 59, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 14px;
                        padding: 12px 18px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .cal-stat-icon {
                        font-size: 24px;
                        background: rgba(255, 255, 255, 0.05);
                        width: 44px;
                        height: 44px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .cal-stat-info {
                        display: flex;
                        flex-direction: column;
                    }
                    .cal-stat-num {
                        font-size: 18px;
                        font-weight: 900;
                        color: #f8fafc;
                    }
                    .cal-stat-lbl {
                        font-size: 11px;
                        font-weight: 700;
                        color: #64748b;
                        margin-top: 2px;
                    }

                    /* Calendar Layout */
                    .cal-grid-container {
                        background: rgba(30, 41, 59, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 16px;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }
                    .cal-grid-header {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        background: #1e293b;
                        border-bottom: 1.5px solid rgba(255, 255, 255, 0.08);
                        text-align: center;
                        font-weight: 800;
                        font-size: 13px;
                        color: #cbd5e1;
                    }
                    .cal-grid-header > div {
                        padding: 14px 8px;
                        border-right: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .cal-grid-header > div:last-child {
                        border-right: none;
                        color: #f87171; /* Highlight Sunday column */
                        background: rgba(239, 68, 68, 0.05);
                    }
                    
                    .cal-grid-body {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        grid-auto-rows: minmax(180px, auto);
                    }
                    
                    /* Cell Styling */
                    .cal-cell {
                        border-right: 1px solid rgba(255, 255, 255, 0.05);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        transition: background 0.15s;
                        position: relative;
                        background: rgba(15, 23, 42, 0.2);
                        min-width: 0; /* Prevents overflow inside flex/grid */
                    }
                    .cal-cell:nth-child(7n) {
                        border-right: none;
                        background: rgba(239, 68, 68, 0.02);
                    }
                    .cal-cell.other-month {
                        opacity: 0.35;
                        background: rgba(15, 23, 42, 0.4);
                    }
                    .cal-cell.today {
                        box-shadow: inset 0 0 0 2px #3b82f6;
                        background: rgba(59, 130, 246, 0.05);
                    }
                    .cal-cell.holiday {
                        background: rgba(239, 68, 68, 0.08) !important;
                    }
                    
                    /* Cell Header */
                    .cal-cell-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .cal-cell-num {
                        font-size: 15px;
                        font-weight: 900;
                        color: #94a3b8;
                    }
                    .cal-cell.today .cal-cell-num {
                        color: #38bdf8;
                    }
                    .cal-cell.holiday .cal-cell-num {
                        color: #f87171;
                    }
                    .cal-cell-holiday-name {
                        font-size: 9px;
                        font-weight: 800;
                        color: #ef4444;
                        background: rgba(239, 68, 68, 0.15);
                        padding: 2px 6px;
                        border-radius: 4px;
                        max-width: 70%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    
                    /* Cell Department Totals */
                    .cal-cell-depts {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        padding-bottom: 6px;
                        border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
                    }
                    .cal-dept-pill {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 9.5px;
                        font-weight: 700;
                        padding: 2px 6px;
                        border-radius: 6px;
                        line-height: 1.3;
                    }
                    .dept-emoji {
                        flex-shrink: 0;
                    }
                    .dept-text {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    /* Colors for departments */
                    .cal-dept-pill.dept-cut { background: rgba(249, 115, 22, 0.15); color: #fdba74; }
                    .cal-dept-pill.dept-in { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
                    .cal-dept-pill.dept-ep { background: rgba(168, 85, 247, 0.15); color: #d8b4fe; }
                    .cal-dept-pill.dept-may { background: rgba(34, 197, 94, 0.15); color: #86efac; }
                    .cal-dept-pill.dept-gui { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }

                    /* Cell Order Cards container */
                    .cal-cell-orders {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        overflow-y: auto;
                        max-height: 220px;
                        padding-right: 2px;
                    }
                    /* Scrollbar custom for cards list */
                    .cal-cell-orders::-webkit-scrollbar {
                        width: 4px;
                    }
                    .cal-cell-orders::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 2px;
                    }

                    /* Order Card styling */
                    .cal-order-card {
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                        padding: 8px 10px;
                        cursor: pointer;
                        transition: all 0.15s;
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                        position: relative;
                    }
                    .cal-order-card:hover {
                        background: rgba(255, 255, 255, 0.06);
                        border-color: rgba(255, 255, 255, 0.12);
                        transform: translateY(-1px);
                    }
                    .cal-order-code {
                        font-size: 11.5px;
                        font-weight: 800;
                        color: #818cf8;
                    }
                    .cal-order-cust {
                        font-size: 10px;
                        color: #94a3b8;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .cal-order-qty {
                        font-size: 10px;
                        font-weight: 800;
                        color: #fbbf24;
                        margin-top: 1px;
                    }
                    
                    /* Step Schedule Buttons */
                    .order-step-badges {
                        display: grid;
                        grid-template-columns: repeat(5, 1fr);
                        gap: 2px;
                        margin-top: 3px;
                    }
                    .order-step-btn {
                        border: none;
                        border-radius: 4px;
                        padding: 2.5px 0;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.15s;
                        position: relative;
                        outline: none;
                    }
                    .order-step-btn.inactive {
                        background: rgba(255, 255, 255, 0.03);
                        color: rgba(255, 255, 255, 0.15);
                    }
                    .order-step-btn.inactive:hover {
                        background: rgba(255, 255, 255, 0.08);
                    }
                    .order-step-btn.inactive .step-time {
                        display: none;
                    }
                    .order-step-btn .step-emoji {
                        font-size: 9px;
                    }
                    .order-step-btn .step-time {
                        font-size: 7.5px;
                        font-weight: 700;
                        margin-top: 1px;
                        line-height: 1;
                    }
                    
                    /* Specific active buttons */
                    .order-step-btn.badge-cut.active { background: rgba(249, 115, 22, 0.2); color: #ffedd5; border: 0.5px solid rgba(249, 115, 22, 0.4); }
                    .order-step-btn.badge-in.active { background: rgba(59, 130, 246, 0.2); color: #eff6ff; border: 0.5px solid rgba(59, 130, 246, 0.4); }
                    .order-step-btn.badge-ep.active { background: rgba(168, 85, 247, 0.2); color: #faf5ff; border: 0.5px solid rgba(168, 85, 247, 0.4); }
                    .order-step-btn.badge-may.active { background: rgba(34, 197, 94, 0.2); color: #f0fdf4; border: 0.5px solid rgba(34, 197, 94, 0.4); }
                    .order-step-btn.badge-gui.active { background: rgba(148, 163, 184, 0.2); color: #f8fafc; border: 0.5px solid rgba(148, 163, 184, 0.4); }

                    .order-step-btn.active:hover {
                        transform: scale(1.08);
                        z-index: 2;
                    }

                    @media (max-width: 1024px) {
                        .cal-grid-header > div {
                            font-size: 11px;
                            padding: 10px 4px;
                        }
                        .cal-cell {
                            min-height: 140px;
                        }
                    }
                    @media (max-width: 768px) {
                        .cal-filter-bar {
                            padding: 12px 16px;
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .cal-filters-group {
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .cal-input {
                            width: 100% !important;
                        }
                        .cal-grid-body {
                            grid-template-columns: 1fr;
                        }
                        .cal-grid-header {
                            display: none;
                        }
                        .cal-cell {
                            border-right: none !important;
                            border-bottom: 1.5px solid rgba(255, 255, 255, 0.08) !important;
                        }
                    }
                </style>

                <div class="cal-filter-bar">
                    <div class="cal-title-group">
                        <h2>📅 Lịch Ra Đơn Hàng</h2>
                        <p>Theo dõi ngày gửi dự kiến và tổng hợp năng suất xưởng</p>
                    </div>
                    <div class="cal-filters-group">
                        <div class="cal-filter-item">
                            <label>Năm</label>
                            <select class="cal-select" id="calYearSelect"></select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Quý</label>
                            <select class="cal-select" id="calQuarterSelect">
                                <option value="all">Tất cả Quý</option>
                                <option value="1">Quý 1 (T1-T3)</option>
                                <option value="2">Quý 2 (T4-T6)</option>
                                <option value="3">Quý 3 (T7-T9)</option>
                                <option value="4">Quý 4 (T10-T12)</option>
                            </select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Tháng</label>
                            <select class="cal-select" id="calMonthSelect"></select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Tìm kiếm đơn</label>
                            <div class="cal-search-wrapper">
                                <input type="text" class="cal-input" id="calSearchInput" placeholder="Mã đơn, tên KH, sản phẩm..." autocomplete="off">
                                <span class="cal-search-clear" id="calSearchClearBtn">&times;</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="cal-stats-bar" id="calStatsContainer">
                    <!-- Dynamic stats cards -->
                </div>

                <div class="cal-grid-container">
                    <div class="cal-grid-header">
                        <div>Thứ Hai</div>
                        <div>Thứ Ba</div>
                        <div>Thứ Tư</div>
                        <div>Thứ Năm</div>
                        <div>Thứ Sáu</div>
                        <div>Thứ Bảy</div>
                        <div>Chủ Nhật</div>
                    </div>
                    <div class="cal-grid-body" id="calGridBody">
                        <!-- Dynamic cells -->
                    </div>
                </div>
            </div>
        `;

        initYearSelect();
        initQuarterSelect();
        initMonthSelect();
        initSearchInput();

        loadCalendarData();
    };

    function initYearSelect() {
        const select = document.getElementById('calYearSelect');
        if (!select) return;
        select.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 3; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === selectedYear) opt.selected = true;
            select.appendChild(opt);
        }
        select.onchange = function() {
            selectedYear = Number(this.value);
            loadCalendarData();
        };
    }

    function initQuarterSelect() {
        const select = document.getElementById('calQuarterSelect');
        if (!select) return;
        select.value = selectedQuarter;
        select.onchange = function() {
            selectedQuarter = this.value;
            syncMonthDropdownOptions();
            loadCalendarData();
        };
    }

    function initMonthSelect() {
        syncMonthDropdownOptions();
    }

    function syncMonthDropdownOptions() {
        const select = document.getElementById('calMonthSelect');
        if (!select) return;
        select.innerHTML = '';

        let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        if (selectedQuarter === '1') months = [1, 2, 3];
        else if (selectedQuarter === '2') months = [4, 5, 6];
        else if (selectedQuarter === '3') months = [7, 8, 9];
        else if (selectedQuarter === '4') months = [10, 11, 12];

        // If currently selected month is not in the allowed list, auto-choose first allowed
        if (!months.includes(selectedMonth)) {
            selectedMonth = months[0];
        }

        months.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = MONTH_LABELS[m];
            if (m === selectedMonth) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = function() {
            selectedMonth = Number(this.value);
            loadCalendarData();
        };
    }

    function initSearchInput() {
        const input = document.getElementById('calSearchInput');
        const clearBtn = document.getElementById('calSearchClearBtn');
        if (!input || !clearBtn) return;

        input.value = searchQuery;
        clearBtn.style.display = searchQuery ? 'block' : 'none';

        input.oninput = function() {
            searchQuery = this.value;
            clearBtn.style.display = searchQuery ? 'block' : 'none';
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadCalendarData();
            }, 300);
        };

        clearBtn.onclick = function() {
            searchQuery = '';
            input.value = '';
            this.style.display = 'none';
            loadCalendarData();
        };
    }

    async function loadCalendarData() {
        const gridBody = document.getElementById('calGridBody');
        const statsBar = document.getElementById('calStatsContainer');
        if (!gridBody) return;

        gridBody.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #64748b; font-size: 14px; font-weight: 600;">⏳ Đang tải dữ liệu lịch...</div>`;
        if (statsBar) {
            statsBar.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 10px; color: #64748b; font-size: 11px;">Đang tính toán số liệu...</div>`;
        }

        try {
            const params = new URLSearchParams({
                year: selectedYear,
                month: selectedMonth
            });
            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim());
            }

            const res = await apiCall('/api/qlx/order-calendar?' + params.toString());
            if (!res.success) {
                throw new Error(res.error || 'Server error');
            }

            renderCalendar(res.orders || [], res.holidays || []);
        } catch (e) {
            console.error('Calendar load error:', e);
            gridBody.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #ef4444; font-size: 14px; font-weight: 700;">❌ Không thể tải dữ liệu lịch ra đơn. Vui lòng thử lại.</div>`;
        }
    }

    function renderCalendar(rows, holidaysList) {
        const gridBody = document.getElementById('calGridBody');
        if (!gridBody) return;
        gridBody.innerHTML = '';

        // Generate map of holidays for O(1) checks
        const holidaysMap = {};
        holidaysList.forEach(h => {
            if (h.holiday_date) {
                const dateStr = h.holiday_date.split('T')[0];
                holidaysMap[dateStr] = h.name;
            }
        });

        // 1. Calculate calendar bounds (Monday to Sunday grid)
        // First day of current selected month
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
        const startDayIndex = firstDay.getDay(); // 0 = Sunday, 1-6 = Mon-Sat
        // Padding cells at the beginning
        const paddingDays = startDayIndex === 0 ? 6 : startDayIndex - 1;

        // Total cells needed: first complete week before 1st, then month days, then complete week after
        const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const totalCells = Math.ceil((paddingDays + totalDaysInMonth) / 7) * 7;

        // Construct 42-cell array representing the days of the calendar grid
        const cells = [];
        const todayStr = vnDateStr(vnNow());

        // Previous month days to fill starting padding
        const prevMonthLastDate = new Date(selectedYear, selectedMonth - 1, 0).getDate();
        for (let i = paddingDays - 1; i >= 0; i--) {
            const d = new Date(selectedYear, selectedMonth - 2, prevMonthLastDate - i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= totalDaysInMonth; i++) {
            const d = new Date(selectedYear, selectedMonth - 1, i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: true
            });
        }

        // Next month days to fill ending padding
        const remainingCells = totalCells - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            const d = new Date(selectedYear, selectedMonth, i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: false
            });
        }

        // Initialize cells Map for fast data sorting
        const cellsMap = {};
        cells.forEach(cell => {
            cellsMap[cell.dateStr] = {
                ...cell,
                orders: [],
                deptTotals: {
                    cut: {},
                    in: {},
                    ep: {},
                    may: {},
                    gui: {}
                }
            };
        });

        // 2. Parse and sort orders/items/schedules
        const ordersMap = {};
        rows.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    id: row.order_id,
                    order_code: row.order_code,
                    customer_name: row.customer_name,
                    expected_ship_date: row.expected_ship_date,
                    shipping_priority: row.shipping_priority,
                    cskh_name: row.cskh_name,
                    items: []
                };
            }
            if (row.item_id) {
                ordersMap[row.order_id].items.push({
                    id: row.item_id,
                    product_name: row.product_name,
                    item_desc: row.item_desc,
                    quantity: row.item_quantity,
                    cutting_category_name: row.cutting_category_name || 'Áo',
                    cut_expected_at: row.cut_expected_at,
                    in_expected_at: row.in_expected_at,
                    ep_expected_at: row.ep_expected_at,
                    may_qc_ht_expected_at: row.may_qc_ht_expected_at,
                    gui_expected_at: row.gui_expected_at
                });
            }
        });

        // Match order cards to cell dates
        Object.values(ordersMap).forEach(order => {
            if (order.expected_ship_date) {
                const dateStr = order.expected_ship_date.split('T')[0];
                if (cellsMap[dateStr]) {
                    cellsMap[dateStr].orders.push(order);
                }
            }
        });

        // Aggregate daily production stats (by department scheduled date)
        let totalMonthlyQty = 0;
        const monthlyDeptTotals = { cut: 0, in: 0, ep: 0, may: 0, gui: 0 };

        rows.forEach(row => {
            if (!row.item_id) return;
            const qty = Number(row.item_quantity) || 0;
            const cat = row.cutting_category_name || 'Áo';

            totalMonthlyQty += qty;

            const addTotal = (dateField, deptKey) => {
                if (row[dateField]) {
                    const dateStr = row[dateField].split('T')[0];
                    if (cellsMap[dateStr]) {
                        const deptMap = cellsMap[dateStr].deptTotals[deptKey];
                        deptMap[cat] = (deptMap[cat] || 0) + qty;
                    }
                    // Count only if scheduled in current month
                    const schedDate = new Date(row[dateField]);
                    if (schedDate.getFullYear() === selectedYear && (schedDate.getMonth() + 1) === selectedMonth) {
                        monthlyDeptTotals[deptKey] += qty;
                    }
                }
            };

            addTotal('cut_expected_at', 'cut');
            addTotal('in_expected_at', 'in');
            addTotal('ep_expected_at', 'ep');
            addTotal('may_qc_ht_expected_at', 'may');
            addTotal('gui_expected_at', 'gui');
        });

        // 3. Render stats row
        renderStatsBar(Object.keys(ordersMap).length, totalMonthlyQty, monthlyDeptTotals);

        // 4. Render cells
        cells.forEach(cell => {
            const dataCell = cellsMap[cell.dateStr];
            const isToday = cell.dateStr === todayStr;
            const holidayName = holidaysMap[cell.dateStr];

            let cellClass = 'cal-cell';
            if (!cell.isCurrentMonth) cellClass += ' other-month';
            if (isToday) cellClass += ' today';
            if (holidayName) cellClass += ' holiday';

            const holidayHtml = holidayName ? `<div class="cal-cell-holiday-name" title="${holidayName}">🎉 ${holidayName}</div>` : '';
            const deptsHtml = renderCellDepts(dataCell.deptTotals);
            const ordersHtml = renderCellOrders(dataCell.orders);

            const cellHtml = `
                <div class="${cellClass}">
                    <div class="cal-cell-header">
                        <span class="cal-cell-num">${cell.date.getDate()}</span>
                        ${holidayHtml}
                    </div>
                    ${deptsHtml}
                    <div class="cal-cell-orders">
                        ${ordersHtml}
                    </div>
                </div>
            `;
            gridBody.insertAdjacentHTML('beforeend', cellHtml);
        });
    }

    function renderStatsBar(ordersCount, totalQty, deptTotals) {
        const container = document.getElementById('calStatsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="cal-stat-card">
                <div class="cal-stat-icon">📦</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num">${ordersCount}</span>
                    <span class="cal-stat-lbl">Đơn Hàng Giao</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">📊</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num">${totalQty.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Tổng Sản Phẩm</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">✂️</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #fdba74">${deptTotals.cut.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Cắt trong tháng</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">🖨️</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #93c5fd">${deptTotals.in.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">In trong tháng</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">🔥</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #d8b4fe">${deptTotals.ep.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Ép trong tháng</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">🧵</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #86efac">${deptTotals.may.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">May trong tháng</span>
                </div>
            </div>
            <div class="cal-stat-card">
                <div class="cal-stat-icon">📦</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #cbd5e1">${deptTotals.gui.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Gửi trong tháng</span>
                </div>
            </div>
        `;
    }

    function renderCellDepts(deptTotals) {
        let html = '';
        DEPARTMENTS.forEach(d => {
            const catMap = deptTotals[d.key];
            const parts = [];
            Object.entries(catMap).forEach(([cat, qty]) => {
                if (qty > 0) {
                    parts.push(`${qty} ${cat}`);
                }
            });
            if (parts.length > 0) {
                html += `
                    <div class="cal-dept-pill ${d.cls}" title="${d.label}: ${parts.join(', ')}">
                        <span class="dept-emoji">${d.emoji}</span>
                        <span class="dept-text">${parts.join(', ')}</span>
                    </div>
                `;
            }
        });
        return html ? `<div class="cal-cell-depts">${html}</div>` : '';
    }

    function renderCellOrders(orders) {
        if (!orders.length) return '';
        let html = '';

        orders.forEach(o => {
            // Sort items quantity grouped by category type
            const qtyMap = {};
            o.items.forEach(item => {
                const cat = item.cutting_category_name || 'Áo';
                qtyMap[cat] = (qtyMap[cat] || 0) + (Number(item.quantity) || 0);
            });
            const qtyParts = Object.entries(qtyMap).map(([cat, qty]) => `${qty} ${cat}`);
            const qtyText = qtyParts.join(', ');

            // Calculate card border and styling based on priority
            const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
            const pStyle = PRIORITY_MAP[priority] || PRIORITY_MAP['CHUẨN'];

            const stepsHtml = renderOrderStepsHtml(o);

            html += `
                <div class="cal-order-card" 
                     style="border-left: 4px solid ${pStyle.border};"
                     onclick="navigateToOrderTrace('${o.order_code}')"
                     title="Nhấp để tra soát toàn bộ đơn hàng ${o.order_code}">
                    <div class="cal-order-code">${o.order_code}</div>
                    <div class="cal-order-cust">${o.customer_name || 'Không tên KH'}</div>
                    <div class="cal-order-qty">${qtyText || '0 sản phẩm'}</div>
                    ${stepsHtml}
                </div>
            `;
        });

        return html;
    }

    function renderOrderStepsHtml(order) {
        // We use first item details to map specific schedules (most orders share timeline steps)
        const firstItem = order.items[0] || {};
        
        const steps = [
            { key: 'cut_expected_at', label: 'Cắt', labelTS: 'Cắt', emoji: '✂️', cls: 'badge-cut' },
            { key: 'in_expected_at', label: 'In', labelTS: 'In', emoji: '🖨️', cls: 'badge-in' },
            { key: 'ep_expected_at', label: 'Ép', labelTS: 'Ép', emoji: '🔥', cls: 'badge-ep' },
            { key: 'may_qc_ht_expected_at', label: 'May', labelTS: 'May', emoji: '🧵', cls: 'badge-may' },
            { key: 'gui_expected_at', label: 'Gửi', labelTS: 'Gửi Hàng', emoji: '📦', cls: 'badge-gui' }
        ];

        let html = '<div class="order-step-badges">';
        steps.forEach(s => {
            const timeVal = firstItem[s.key];
            const timeText = timeVal ? formatStepTime(timeVal) : '--';
            const hasTime = !!timeVal;
            html += `
                <button class="order-step-btn ${s.cls} ${hasTime ? 'active' : 'inactive'}" 
                        onclick="event.stopPropagation(); _tsOpenStepModal(${order.id}, '${s.labelTS}', ${firstItem.id || 'null'})"
                        title="Bấm để xem báo cáo chặng ${s.label}: ${timeVal ? vnFormat(timeVal) : 'Chưa xếp lịch'}">
                    <span class="step-emoji">${s.emoji}</span>
                    <span class="step-time">${timeText}</span>
                </button>
            `;
        });
        html += '</div>';
        return html;
    }

    function formatStepTime(isoStr) {
        if (!isoStr) return '--';
        const d = new Date(isoStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month} ${hour}:${min}`;
    }

    window.navigateToOrderTrace = function(orderCode) {
        history.pushState(null, '', '/trasoatdonhang?search=' + encodeURIComponent(orderCode));
        if (typeof handleRoute === 'function') {
            handleRoute();
        }
    };
})();
