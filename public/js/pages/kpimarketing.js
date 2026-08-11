/**
 * Page: /kpimarketing — renderKpimarketingPage(container)
 * Báo cáo & Quản lý KPI Marketing — Tái thiết lập mới tinh, chuẩn kiến trúc
 * Hỗ trợ chọn Tháng, Thêm Mục Con / Mã Nguồn (Modal Ảnh 1) & Hiển thị 6 chỉ số cốt lõi per Mục Con.
 */

var _kpiMkt = { month: '', data: null };

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatVND(num) {
    if (!num || isNaN(num)) return '0đ';
    return Number(num).toLocaleString('vi-VN') + 'đ';
}

async function kpiMktApiCall(url, method = 'GET', body = null) {
    if (typeof method === 'object' && method !== null) {
        body = method.body || method.data || null;
        method = method.method || 'GET';
    }
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token && token.length > 20) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const opts = { method, headers, credentials: 'include' };
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        opts.body = JSON.stringify(body || {});
    }
    try {
        let fetchUrl = url;
        if (method === 'GET') {
            const sep = fetchUrl.includes('?') ? '&' : '?';
            fetchUrl = `${fetchUrl}${sep}_t=${Date.now()}`;
        }
        let r = await fetch(fetchUrl, opts);
        if (r.status === 401 && token) {
            delete headers['Authorization'];
            r = await fetch(fetchUrl, { method, headers, credentials: 'include', body: opts.body });
        }
        const text = await r.text();
        if (!text || !text.trim()) {
            return { success: r.ok };
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('[kpiMktApiCall] Response parse error:', text);
            return { error: 'Dữ liệu phản hồi không đúng định dạng JSON' };
        }
    } catch (e) {
        console.error('[kpiMktApiCall] Fetch error:', e);
        return { error: e.message };
    }
}

async function renderKpimarketingPage(container) {
    if (!container) return;

    const now = new Date();
    if (!_kpiMkt.month) {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        _kpiMkt.month = `${y}-${m}`;
    }

    const cssId = 'kpi-mkt-v2-css';
    if (!document.getElementById(cssId)) {
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = `
            .kpi-v2-wrap { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; width: 100%; box-sizing: border-box; background: #f8fafc; min-height: 100vh; }
            
            /* Topbar */
            .kpi-v2-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #fff; padding: 14px 20px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
            .kpi-v2-nav { display: flex; align-items: center; gap: 10px; background: #f1f5f9; padding: 6px 12px; border-radius: 10px; border: 1px solid #cbd5e1; }
            .kpi-v2-nav-btn { background: #fff; border: 1px solid #94a3b8; border-radius: 6px; width: 32px; height: 32px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #334155; transition: all 0.2s; }
            .kpi-v2-nav-btn:hover { background: #4338ca; color: #fff; border-color: #4338ca; }
            .kpi-v2-month-label { font-size: 16px; font-weight: 800; color: #1e1b4b; min-width: 100px; text-align: center; cursor: pointer; user-select: none; }
            .kpi-v2-month-label:hover { color: #4338ca; }
            #kpiMktMonthInput { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
            
            .kpi-v2-add-btn { padding: 10px 20px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 4px 14px rgba(2,132,199,0.35); transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
            .kpi-v2-add-btn:hover { transform: translateY(-1.5px); box-shadow: 0 6px 20px rgba(2,132,199,0.45); }

            /* Top Summary Grid */
            .kpi-v2-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
            .kpi-v2-card { background: #fff; border-radius: 14px; padding: 16px; border: 1.5px solid #e2e8f0; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: center; align-items: center; transition: transform 0.2s; }
            .kpi-v2-card:hover { transform: translateY(-2px); }
            .kpi-v2-card-val { font-size: 22px; font-weight: 900; line-height: 1.2; margin-bottom: 4px; }
            .kpi-v2-card-lbl { font-size: 11px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: #475569; }

            /* Section Header */
            .kpi-v2-sec-hdr { display: flex; justify-content: space-between; align-items: center; margin: 24px 0 14px; padding: 12px 18px; background: #fff; border-left: 5px solid #4338ca; border-radius: 10px; border: 1px solid #e2e8f0; border-left-width: 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
            .kpi-v2-sec-title { font-size: 16px; font-weight: 800; color: #1e1b4b; display: flex; align-items: center; gap: 10px; }

            /* Main Table */
            .kpi-v2-tbl-wrap { background: #fff; border-radius: 16px !important; border: 1.5px solid #cbd5e1; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden !important; margin-bottom: 30px; }
            .kpi-v2-tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; text-align: left; }
            .kpi-v2-tbl th { background: #1e293b; color: #f8fafc; padding: 12px 14px; font-weight: 800; font-size: 12px; letter-spacing: 0.3px; border-bottom: 2px solid #0f172a; white-space: nowrap; text-align: center; }
            .kpi-v2-tbl th:first-child { border-top-left-radius: 14px !important; }
            .kpi-v2-tbl th:last-child { border-top-right-radius: 14px !important; }
            .kpi-v2-tbl td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; vertical-align: middle; text-align: center; font-weight: 600; }
            .kpi-v2-tbl tr:nth-child(even) { background: #f8fafc; }
            .kpi-v2-tbl tr:hover { background: #f0f9ff; }
            .kpi-v2-tbl tr.total-row { background: #fef3c7 !important; font-weight: 900; }
            .kpi-v2-tbl tr.total-row td { border-top: 2.5px solid #d97706; border-bottom: 2.5px solid #d97706; font-size: 13.5px; color: #78350f; }

            /* Indicator Pills */
            .kpi-pill { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; text-align: center; }
            .kpi-pill-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .kpi-pill-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
            .kpi-pill-orange { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
            .kpi-pill-cyan { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
            .kpi-pill-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .kpi-negative-badge { background: #fef2f2 !important; color: #991b1b !important; border: 1.5px solid #fca5a5 !important; padding: 3px 10px; border-radius: 8px; font-weight: 800 !important; display: inline-block; box-shadow: 0 1px 4px rgba(220, 38, 38, 0.15); }

            /* Custom Instant Formula Tooltip */
            [data-tooltip] { position: relative; cursor: pointer !important; }
            [data-tooltip]::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                background: #0f172a;
                color: #ffffff;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 11.5px;
                font-weight: 700;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.15s ease-in-out;
                z-index: 9999;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                border: 1px solid #334155;
            }
            [data-tooltip]::before {
                content: '';
                position: absolute;
                bottom: 110%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 6px;
                border-style: solid;
                border-color: #0f172a transparent transparent transparent;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.15s ease-in-out;
                z-index: 9999;
            }
            [data-tooltip]:hover::after,
            [data-tooltip]:hover::before {
                opacity: 1;
            }

            /* Modal Style */
            .kpi-v2-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 99999; display: none; align-items: center; justify-content: center; padding: 16px; }
            .kpi-v2-modal { background: #fff; border-radius: 20px; width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.35); display: flex; flex-direction: column; animation: kpiModalFade 0.25s ease-out; }
            @keyframes kpiModalFade { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            .kpi-v2-modal-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px; }
            .kpi-v2-modal-title { font-size: 17px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px; }
            .kpi-v2-modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; padding: 4px; border-radius: 6px; }
            .kpi-v2-modal-close:hover { background: #f1f5f9; color: #0f172a; }
            
            .kpi-v2-form-group { margin-bottom: 16px; }
            .kpi-v2-label { font-weight: 700; font-size: 13px; color: #334155; display: block; margin-bottom: 6px; }
            .kpi-v2-input { width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 600; color: #0f172a; outline: none; transition: all 0.2s; box-sizing: border-box; background: #fff; }
            .kpi-v2-input:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,0.18); }
            .kpi-v2-input:disabled, .kpi-v2-input[disabled], select.kpi-v2-input:disabled { background-color: #e2e8f0 !important; color: #475569 !important; cursor: not-allowed !important; pointer-events: none !important; opacity: 0.85 !important; border-color: #cbd5e1 !important; box-shadow: none !important; -webkit-user-select: none !important; user-select: none !important; }
            .kpi-v2-lock-badge { font-size: 11px; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 6px; font-weight: 800; margin-left: 8px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #fca5a5; }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="kpi-v2-wrap">
            <!-- TOPBAR -->
            <div class="kpi-v2-topbar">
                <div class="kpi-v2-nav">
                    <button class="kpi-v2-nav-btn" onclick="kpiMktChangeMonth(-1)" title="Tháng trước">‹</button>
                    <span class="kpi-v2-month-label" id="kpiMktMonthText" onclick="kpiMktPickMonth()">T8/2026</span>
                    <button class="kpi-v2-nav-btn" onclick="kpiMktChangeMonth(1)" title="Tháng sau">›</button>
                    <input type="month" id="kpiMktMonthInput" onchange="kpiMktOnMonthInput(this.value)">
                </div>
                <div>
                    <button class="kpi-v2-add-btn" id="kpiMktAddCatBtn" onclick="kpiMktOpenAddCatModal()">➕ Thêm Mục Con / Mã Nguồn Marketing (Ảnh 2)</button>
                </div>
            </div>

            <!-- TOP SUMMARY METRICS GRID (2 ROWS x 4 CARDS) -->
            <div id="kpiMktSummaryCards" style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px;">
                <div style="text-align:center;padding:20px;color:#64748b;font-weight:700;">⏳ Đang tải dữ liệu tổng quan...</div>
            </div>

            <!-- TREND CHART SECTION (ON TOP OF SUB-CATEGORIES TABLE) -->
            <div id="kpiMktTrendSection" style="margin-bottom:24px"></div>

            <!-- SECTION TITLE -->
            <div class="kpi-v2-sec-hdr">
                <div class="kpi-v2-sec-title">
                    <span>📌 DANH SÁCH MỤC CON & CHỈ SỐ MARKETING CHI TIẾT</span>
                </div>
            </div>

            <!-- MAIN TABLE OF SUB-CATEGORIES -->
            <div class="kpi-v2-tbl-wrap" style="margin-bottom: 30px;">
                <table class="kpi-v2-tbl" id="kpiMktTable" style="table-layout: fixed !important; width: 100%;">
                    <colgroup>
                        <col style="width: 40px;">
                        <col style="width: 390px;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                        <col style="width: 12.5%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="width:45px">STT</th>
                            <th style="text-align:left;min-width:220px">Mục Con / Mã Nguồn (Channel & Page)</th>
                            <th style="width:135px">
                                💸 CHI PHÍ MKT
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí Quảng Cáo)</span>
                            </th>
                            <th style="width:135px">
                                📦 ĐƠN HÀNG
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(SL đơn hàng)</span>
                            </th>
                            <th style="width:135px">
                                💰 DOANH SỐ (đ)
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Doanh thu đơn hàng)</span>
                            </th>
                            <th style="width:135px">
                                📉 % CP / DOANH SỐ
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí MKT / Doanh số)</span>
                            </th>
                            <th style="width:135px">
                                🎯 TỶ LỆ CHỐT
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Đơn hàng / Số lead)</span>
                            </th>
                            <th style="width:135px">
                                🎯 CPO (GIÁ/ĐƠN)
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí MKT / Đơn hàng)</span>
                            </th>
                            <th style="width:135px">
                                📥 SỐ LEAD
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(SL Tin Nhắn)</span>
                            </th>
                            <th style="width:135px">
                                📊 CPL (GIÁ/LEAD)
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Giá / Tin Nhắn)</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="kpiMktTbody">
                        <tr><td colspan="10" style="text-align:center;padding:35px;color:#64748b;font-weight:700">⏳ Đang tải danh sách Mục Con & Chỉ số...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- SECTION TITLE: KPI MARKETING ADS THEO NHÂN VIÊN -->
            <div class="kpi-v2-sec-hdr" style="border-left-color: #0284c7; background: linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%); flex-wrap: wrap; gap: 10px;">
                <div class="kpi-v2-sec-title" style="color: #0369a1;">
                    <span>👥 BẢNG GÁN & BÁO CÁO KPI MARKETING ADS THEO NHÂN VIÊN</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <button type="button" onclick="kpiMktResetAllAssignments()" style="background:#ef4444;color:#ffffff;border:none;padding:7px 14px;border-radius:10px;font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(239,68,68,0.25);transition:all 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                        🗑️ Reset Phân Công Page
                    </button>
                    <button type="button" onclick="kpiMktOpenCreateEmployeeModal()" style="background:#0284c7;color:#ffffff;border:none;padding:7px 16px;border-radius:10px;font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(2,132,199,0.25);transition:all 0.2s;" onmouseover="this.style.background='#0369a1'" onmouseout="this.style.background='#0284c7'">
                        ➕ Tạo Nhân Viên & Gán Page
                    </button>
                </div>
            </div>

            <!-- TABLE OF MARKETING HANDLERS / EMPLOYEES CARDS -->
            <div id="kpiMktHandlersContainer" style="margin-bottom: 30px; display: flex; flex-direction: column; gap: 24px;">
                <div style="text-align:center;padding:35px;color:#64748b;font-weight:700;background:#fff;border-radius:16px;border:1.5px solid #cbd5e1;">⏳ Đang tải dữ liệu KPI theo nhân viên...</div>
            </div>
        </div>

        <!-- MODAL THÊM MỤC CON / MÃ NGUỒN (ẢNH 1) -->
        <div class="kpi-v2-modal-overlay" id="kpiMktAddCatModal">
            <div class="kpi-v2-modal">
                <div class="kpi-v2-modal-hdr">
                    <div class="kpi-v2-modal-title">➕ Thêm Mục Con / Mã Nguồn Marketing (Ảnh 2)</div>
                    <button class="kpi-v2-modal-close" onclick="kpiMktCloseAddCatModal()">✕</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <div class="kpi-v2-form-group">
                        <label class="kpi-v2-label">Kênh / Mục Lớn (Channel):</label>
                        <select id="kpiAddCatParent" class="kpi-v2-input" onchange="kpiMktOnChannelChange(this.value)"></select>
                    </div>
                    <div class="kpi-v2-form-group">
                        <label class="kpi-v2-label">Tên Mục Con / Sản Phẩm (Mã Nguồn):</label>
                        <select id="kpiAddCatSubSelect" class="kpi-v2-input" onchange="kpiMktOnSubCatSelectChange(this.value)"></select>
                        <input type="text" id="kpiAddCatSubInput" class="kpi-v2-input" style="display:none;margin-top:8px" placeholder="Ví dụ: Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng">
                    </div>
                    <div class="kpi-v2-form-group">
                        <label class="kpi-v2-label">Tên Nguồn liên kết / Page Pancake: <span id="kpiPageLockBadge" class="kpi-v2-lock-badge">🔒 Khóa theo Mục Con</span></label>
                        <select id="kpiAddCatPageSelect" class="kpi-v2-input" onchange="kpiMktOnPageSelectChange(this.value)"></select>
                        <input type="text" id="kpiAddCatPageInput" class="kpi-v2-input" style="display:none;margin-top:8px" placeholder="Ví dụ: Page Công Ty 2 hoặc Pancake Page ID">
                    </div>
                    <div class="kpi-v2-form-group">
                        <label class="kpi-v2-label">Người đảm nhiệm (Ads Handler): <span id="kpiHandlerLockBadge" class="kpi-v2-lock-badge">🔒 Khóa theo Mục Con</span></label>
                        <select id="kpiAddCatHandlerSelect" class="kpi-v2-input" onchange="kpiMktOnHandlerSelectChange(this.value)"></select>
                        <input type="text" id="kpiAddCatHandlerInput" class="kpi-v2-input" style="display:none;margin-top:8px" placeholder="Ví dụ: Giám Đốc hoặc tên nhân sự MKT">
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;border-top:1.5px solid #e2e8f0;padding-top:16px">
                    <button type="button" style="padding:10px 20px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;color:#334155" onclick="kpiMktCloseAddCatModal()">Hủy</button>
                    <button type="button" class="kpi-v2-add-btn" onclick="kpiMktSaveNewCategory()">💾 Lưu Mục Marketing Mới</button>
                </div>
            </div>
        </div>
    `;

    await loadKpimarketingData();
}

async function loadKpimarketingData() {
    try {
        if (_kpiMkt) _kpiMkt.yearlyCache = {};
        if (!_kpiMkt.month) {
            const now = new Date();
            _kpiMkt.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        const monthTxt = document.getElementById('kpiMktMonthText');
        if (monthTxt) {
            const [y, m] = _kpiMkt.month.split('-');
            monthTxt.innerText = `T${parseInt(m, 10)}/${y}`;
        }

        let res = await kpiMktApiCall(`/api/reports/kpi-marketing?month=${_kpiMkt.month}`);
        if (!res || res.error) {
            console.warn('KPI MKT data fetch notice:', res ? res.error : 'No response');
            res = { summary: {}, categories: [], handlers: [] };
        }

        _kpiMkt.data = res;

        // Render 8 summary metric cards (2 rows x 4 cards) matching Ngân Sách Marketing
        const s = res.summary || {};
        const totalOrders = Number(s.total_orders || 0);
        const totalRevenue = Number(s.total_revenue || 0);
        const costIncomeRatio = s.avg_cost_ratio !== undefined ? Number(s.avg_cost_ratio).toFixed(2) : '0.00';
        const costPerOrder = Number(s.avg_cpo || 0);
        const totalSpent = Number(s.total_spent || 0);
        const totalLeads = Number(s.total_leads || 0);
        const avgCpl = Number(s.avg_cpl || 0);
        const closeRate = s.avg_close_rate !== undefined ? Number(s.avg_close_rate).toFixed(2) : '0.00';

        const [yStr, mStr] = (_kpiMkt.month || '').split('-');
        const periodText = yStr && mStr ? `Tháng ${parseInt(mStr, 10)}/${yStr}` : 'Tháng';

        const titleOrders = `${totalOrders.toLocaleString('vi-VN')} Đơn Khách Mới chốt thành công trong ${periodText}`;
        const titleRevenue = `${formatVND(totalRevenue)} Doanh số Khách Mới thu về trong ${periodText}`;
        const titleCostRatio = `${formatVND(totalSpent)} Chi phí MKT / ${formatVND(totalRevenue)} Doanh số Khách Mới = ${costIncomeRatio}%`;
        const titleCpo = `${formatVND(totalSpent)} Chi phí MKT / ${totalOrders} Đơn Khách Mới = ${costPerOrder > 0 ? formatVND(costPerOrder) : '0đ'}`;
        const titleSpent = `${formatVND(totalSpent)} Chi phí MKT đã thực chi trong ${periodText}`;
        const titleLeads = `${totalLeads.toLocaleString('vi-VN')} Khách (Tin Nhắn) trong ${periodText}`;
        const titleCpl = `${formatVND(totalSpent)} Chi phí MKT / ${totalLeads} Tin Nhắn = ${formatVND(avgCpl)}`;
        const titleCloseRate = `${totalOrders} Đơn Khách Mới / ${totalLeads} Tin Nhắn = ${closeRate}%`;

        const cardsContainer = document.getElementById('kpiMktSummaryCards');
        if (cardsContainer) {
            cardsContainer.innerHTML = `
                <!-- HÀNG 1: 4 Ô THỐNG KÊ (Đơn Hàng | Doanh Số | % Chi Phí/Doanh Thu | Giá/Đơn) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
                    <div class="kpi-v2-card" onclick="kpiMktOpenOrdersModal()" data-tooltip="${titleOrders}" title="${titleOrders}" style="border-top:4px solid #16a34a;background:linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span>🎯 SỐ ĐƠN ADS (KHÁCH MỚI)</span>
                            <span style="font-size:10px;color:#16a34a;background:#dcfce7;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                        </div>
                        <div class="kpi-v2-card-val" style="color:#16a34a;margin-top:6px;font-size:22px;">${totalOrders.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">đơn</span></div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Chỉ tính Khách Mới T8/2026</div>
                    </div>
                    <div class="kpi-v2-card" onclick="kpiMktOpenOrdersModal()" data-tooltip="${titleRevenue}" title="${titleRevenue}" style="border-top:4px solid #0284c7;background:linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span>💵 DOANH SỐ ADS (KHÁCH MỚI)</span>
                            <span style="font-size:10px;color:#0284c7;background:#e0e7ff;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                        </div>
                        <div class="kpi-v2-card-val" style="color:#0284c7;margin-top:6px;font-size:22px;">${formatVND(totalRevenue)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Doanh số từ Khách Mới</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCostRatio}" title="${titleCostRatio}" style="border-top:4px solid #4f46e5;background:linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📉 % CHI PHÍ / DOANH THU ADS</div>
                        <div class="kpi-v2-card-val" style="color:#4f46e5;margin-top:6px;font-size:22px;">${costIncomeRatio}%</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Tỷ lệ chi phí MKT / doanh thu</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCpo}" title="${titleCpo}" style="border-top:4px solid #dc2626;background:linear-gradient(180deg, #fef2f2 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">🎯 GIÁ / ĐƠN (CPO)</div>
                        <div class="kpi-v2-card-val" style="color:#dc2626;margin-top:6px;font-size:22px;">${costPerOrder > 0 ? formatVND(costPerOrder) : '—'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Chi phí thực tế / 1 đơn</div>
                    </div>
                </div>

                <!-- HÀNG 2: 4 Ô THỐNG KÊ (Thực Chi | Lead | CPL | Tỷ Lệ Chốt) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
                    <div class="kpi-v2-card" data-tooltip="${titleSpent}" title="${titleSpent}" style="border-top:4px solid #d97706;background:linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📢 CHI PHÍ QUẢNG CÁO</div>
                        <div class="kpi-v2-card-val" style="color:#d97706;margin-top:6px;font-size:22px;">${formatVND(totalSpent)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">${periodText}</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleLeads}" title="${titleLeads}" style="border-top:4px solid #2563eb;background:linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📥 TỔNG SỐ LEAD (TIN NHẮN)</div>
                        <div class="kpi-v2-card-val" style="color:#2563eb;margin-top:6px;font-size:22px;">${totalLeads.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">khách</span></div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Phát sinh trong ${periodText}</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCpl}" title="${titleCpl}" style="border-top:4px solid #7c3aed;background:linear-gradient(180deg, #f3e8ff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📊 GIÁ ADS / LEAD (CPL)</div>
                        <div class="kpi-v2-card-val" style="color:#7c3aed;margin-top:6px;font-size:22px;">${formatVND(avgCpl)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Chi phí / 1 tin nhắn</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCloseRate}" title="${titleCloseRate}" style="border-top:4px solid #ea580c;background:linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">🎯 TỶ LỆ % CHỐT ADS</div>
                        <div class="kpi-v2-card-val" style="color:#ea580c;margin-top:6px;font-size:22px;">${closeRate}%</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Tổng số đơn / tổng số lead (tin nhắn)</div>
                    </div>
                </div>
            `;
        }

        // Render Sub-Category Items & Handlers Tables
        renderCategoryTable(res);
        kpiInitMktTrendSection(res);

    } catch (e) {
        console.error('Error loading KPI Mkt data:', e);
    }
}

function renderCategoryTable(res) {
    const tbody = document.getElementById('kpiMktTbody');
    if (!tbody) return;

    const handlers = (res && res.handlers) ? res.handlers : [];
    const allSystemCatsList = (res && (res.all_system_categories || res.categories)) ? (res.all_system_categories || res.categories) : [];
    const categories = allSystemCatsList.filter(c => c.show_in_kpi_mkt === true || c.show_in_kpi_mkt === 'true');
    const catMap = new Map();
    allSystemCatsList.forEach(c => catMap.set(c.id, c));

    let rawItemsList = [];

    // 1. Collect from handlers items
    handlers.forEach(h => {
        if (h.items && h.items.length > 0) {
            h.items.forEach(it => {
                const catName = (it.category_name || it.name || '').trim();
                if (catName) {
                    rawItemsList.push({
                        ...it,
                        category_name: catName,
                        channel_name: it.channel_name || 'Facebook Ads',
                        ads_handler_name: it.ads_handler_name || h.ads_handler_name || 'Giám Đốc'
                    });
                }
            });
        }
    });

    // 2. Always merge categories list
    if (categories.length > 0) {
        categories.forEach(cat => {
            if (cat.parent_id !== null && cat.parent_id !== undefined) {
                const parentCat = catMap.get(cat.parent_id);
                const catName = (cat.name || '').trim();
                if (catName) {
                    rawItemsList.push({
                        category_id: cat.id,
                        category_name: catName,
                        channel_name: parentCat ? parentCat.name : 'Facebook Ads',
                        icon: cat.icon || (parentCat ? parentCat.icon : '📌'),
                        pancake_page_name: cat.pancake_page_name || cat.linked_source_name || '',
                        channel_link: cat.channel_link || '',
                        ads_handler_name: cat.ads_handler_name || 'Giám Đốc',
                        spent: 0,
                        leads: 0,
                        orders: 0,
                        revenue: 0,
                        cpl: 0,
                        cpo: 0,
                        cost_ratio: 0,
                        close_rate: 0
                    });
                }
            }
        });
    }

    // 3. Aggregate & Deduplicate items cleanly by category_name
    const itemsMap = new Map();
    rawItemsList.forEach(it => {
        const catName = (it.category_name || it.name || '').trim();
        if (!catName) return;
        const key = catName.toLowerCase();

        const spent = Number(it.spent || 0);
        const leads = Number(it.leads || 0);
        const orders = Number(it.orders || 0);
        const revenue = Number(it.revenue || 0);

        if (!itemsMap.has(key)) {
            itemsMap.set(key, {
                ...it,
                category_name: catName,
                channel_name: (it.channel_name && it.channel_name !== 'Khác' ? it.channel_name : 'Facebook Ads').trim(),
                spent,
                leads,
                orders,
                revenue
            });
        } else {
            const existing = itemsMap.get(key);
            existing.spent += spent;
            existing.leads += leads;
            existing.orders += orders;
            existing.revenue += revenue;
            if ((!existing.pancake_page_name || existing.pancake_page_name === '') && (it.pancake_page_name || it.linked_source_name)) {
                existing.pancake_page_name = it.pancake_page_name || it.linked_source_name;
            }
            if ((!existing.channel_name || existing.channel_name === 'Khác') && it.channel_name) {
                existing.channel_name = it.channel_name;
            }
            if (!existing.category_id && it.category_id) {
                existing.category_id = it.category_id;
            }
            if ((!existing.channel_link || existing.channel_link === '') && (it.channel_link || (it.category_id && catMap.get(it.category_id)?.channel_link))) {
                existing.channel_link = it.channel_link || (it.category_id ? catMap.get(it.category_id)?.channel_link : '');
            }
        }
    });

    const itemsList = Array.from(itemsMap.values());
    itemsList.forEach(item => {
        item.cpl = item.leads > 0 ? Math.round(item.spent / item.leads) : 0;
        item.cpo = item.orders > 0 ? Math.round(item.spent / item.orders) : 0;
        item.cost_ratio = item.revenue > 0 ? Math.round((item.spent / item.revenue) * 10000) / 100 : 0;
    });

    // 4. Guaranteed fallback items so table is NEVER empty
    if (itemsList.length === 0) {
        itemsList.push(
            {
                category_name: 'Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng',
                channel_name: 'Facebook Ads',
                icon: '📌',
                pancake_page_name: 'Page Công Ty 2',
                ads_handler_name: 'Giám Đốc',
                spent: 0, leads: 0, orders: 0, revenue: 0, cpl: 0, cpo: 0, cost_ratio: 0, close_rate: 0
            },
            {
                category_name: 'Xưởng In HV - Xưởng In Pet , In Tem Eco Gia Công',
                channel_name: 'Facebook Ads',
                icon: '📌',
                pancake_page_name: 'Page TEMVN',
                ads_handler_name: 'Giám Đốc',
                spent: 0, leads: 0, orders: 0, revenue: 0, cpl: 0, cpo: 0, cost_ratio: 0, close_rate: 0
            }
        );
    }

    // Render Handlers Table with calculated itemsList
    renderKpiMktHandlersTable(res, itemsList);

    if (!_kpiMkt.data) _kpiMkt.data = {};
    _kpiMkt.data.renderedCategories = itemsList.map(i => i.category_name);

    let html = '';
    let totalSpent = 0, totalLeads = 0, totalOrders = 0, totalRevenue = 0;

    const isGiamDoc = kpiMktIsGiamDoc();

    itemsList.forEach((c, idx) => {
        totalSpent += Number(c.spent || 0);
        totalLeads += Number(c.leads || 0);
        totalOrders += Number(c.orders || 0);
        totalRevenue += Number(c.revenue || 0);

        const cplStr = formatVND(c.cpl || 0);
        const costRatioStr = `${Number(c.cost_ratio || 0).toFixed(2)}%`;
        const cpoStr = c.cpo > 0 ? formatVND(c.cpo) : '0đ';
        const closeRateStr = `${Number(c.close_rate || 0).toFixed(2)}%`;

        const titleCostRatio = `${formatVND(c.spent || 0)} Chi phí MKT / ${formatVND(c.revenue || 0)} Doanh số = ${costRatioStr}`;
        const titleCloseRate = `${c.orders || 0} Đơn / ${c.leads || 0} Tin Nhắn = ${closeRateStr}`;
        const titleCpo = `${formatVND(c.spent || 0)} Chi phí MKT / ${c.orders || 0} Đơn = ${cpoStr}`;
        const titleCpl = `${formatVND(c.spent || 0)} Chi phí MKT / ${c.leads || 0} Tin Nhắn = ${cplStr}`;

        const catObj = (c.category_id && catMap.get(c.category_id)?.channel_link) ? catMap.get(c.category_id) : (Array.from(catMap.values()).find(cat => cat.name && cat.name.trim().toLowerCase() === String(c.category_name).trim().toLowerCase() && cat.channel_link) || catMap.get(c.category_id) || Array.from(catMap.values()).find(cat => cat.name && cat.name.trim().toLowerCase() === String(c.category_name).trim().toLowerCase()));
        const pageNameDisp = c.pancake_page_name || c.linked_source_name || (catObj ? (catObj.linked_source_name || catObj.pancake_page_name) : '') || '';
        let cLink = c.channel_link || (catObj ? catObj.channel_link : null) || '';
        if (!cLink && pageNameDisp) {
            const pageMatch = Array.from(catMap.values()).find(cat => cat.channel_link && (
                (cat.linked_source_name && cat.linked_source_name.trim().toLowerCase() === pageNameDisp.trim().toLowerCase()) ||
                (cat.pancake_page_name && cat.pancake_page_name.trim().toLowerCase() === pageNameDisp.trim().toLowerCase())
            ));
            if (pageMatch) cLink = pageMatch.channel_link;
        }
        const pageTagHtml = pageNameDisp ? (cLink ? `<a href="${cLink}" target="_blank" rel="noopener noreferrer" style="background:#e0f2fe;color:#0284c7;border:1.5px solid #bae6fd;padding:2px 9px;border-radius:8px;font-weight:700;font-size:11px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(2,132,199,0.08);transition:all 0.2s;" title="Mở link kênh trong tab mới" onmouseover="this.style.background='#bae6fd';this.style.borderColor='#7dd3fc'" onmouseout="this.style.background='#e0f2fe';this.style.borderColor='#bae6fd'">🔗 ${escapeHtml(pageNameDisp)} ↗</a>` : `<span style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:2px 8px;border-radius:8px;font-weight:700;font-size:11px;display:inline-flex;align-items:center;gap:4px;">🔗 ${escapeHtml(pageNameDisp)}</span>`) : '';

        html += `
            <tr onclick="kpiMktOpenOrdersModal('${c.category_id || 0}', '${escapeHtml(c.category_name).replace(/'/g, "\\'")}')" style="cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'" title="Click bất kỳ đâu trên thanh ngang mục con để xem Danh Sách Đơn Hàng Marketing (Ảnh 2)">
                <td style="text-align:center">${idx + 1}</td>
                <td style="text-align:left">
                    <div style="font-weight:800;font-size:13.5px;color:#1e1b4b;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <span style="flex:1;min-width:0;">${c.icon || '📌'} ${escapeHtml(c.category_name)} <span style="font-size:11px;color:#2563eb;font-weight:700;margin-left:4px;">🔍 Xem đơn</span></span>
                        ${isGiamDoc ? `<button type="button" data-name="${escapeHtml(c.category_name)}" onclick="event.stopPropagation();kpiMktDeleteCategory('${c.category_id || 0}', this.getAttribute('data-name'))" title="Xóa mục con này khỏi danh sách" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(220,38,38,0.1);transition:all 0.2s;white-space:nowrap;flex-shrink:0;height:fit-content;align-self:center;" onmouseover="this.style.background='#fee2e2';this.style.borderColor='#f87171'" onmouseout="this.style.background='#fef2f2';this.style.borderColor='#fca5a5'">🗑️ Xóa</button>` : ''}
                    </div>
                    <div style="font-size:11px;color:#475569;margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <span style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:2px 8px;border-radius:8px;font-weight:600;font-size:11px;display:inline-flex;align-items:center;">Kênh: <strong style="margin-left:3px;">${escapeHtml(c.channel_name || 'Khác')}</strong></span>
                        ${pageTagHtml}
                    </div>
                    <div style="margin-top:4px;">
                        <span style="background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;padding:2px 8px;border-radius:8px;font-weight:700;font-size:11px;display:inline-flex;align-items:center;gap:3px;">👤 ${escapeHtml(c.ads_handler_name || 'Giám Đốc')}</span>
                    </div>
                </td>
                <td style="font-weight:700;color:#e11d48">${formatVND(c.spent || 0)}</td>
                <td style="font-weight:700;color:#d97706;">
                    <span style="background:#fffbeb;padding:3px 8px;border-radius:6px;border:1px solid #fde68a;">${c.orders || 0} đơn 🔍</span>
                </td>
                <td style="font-weight:700;color:#16a34a">${formatVND(c.revenue || 0)}</td>
                <td><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleCostRatio}" title="${titleCostRatio}">${costRatioStr}</span></td>
                <td><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleCloseRate}" title="${titleCloseRate}">${closeRateStr}</span></td>
                <td><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleCpo}" title="${titleCpo}">${cpoStr}</span></td>
                <td style="font-weight:700;color:#0284c7">${c.leads || 0}</td>
                <td><span class="kpi-pill kpi-pill-blue" data-tooltip="${titleCpl}" title="${titleCpl}">${cplStr}</span></td>
            </tr>
        `;
    });

    // Total summary row
    const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
    const avgCostRatio = totalRevenue > 0 ? (totalSpent / totalRevenue * 100).toFixed(2) : '0.00';
    const avgCpo = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
    const avgCloseRate = totalLeads > 0 ? (totalOrders / totalLeads * 100).toFixed(2) : '0.00';

    const totalTitleCostRatio = `${formatVND(totalSpent)} Chi phí MKT / ${formatVND(totalRevenue)} Doanh số = ${avgCostRatio}%`;
    const totalTitleCloseRate = `${totalOrders} Đơn / ${totalLeads} Tin Nhắn = ${avgCloseRate}%`;
    const totalTitleCpo = `${formatVND(totalSpent)} Chi phí MKT / ${totalOrders} Đơn = ${avgCpo > 0 ? formatVND(avgCpo) : '0đ'}`;
    const totalTitleCpl = `${formatVND(totalSpent)} Chi phí MKT / ${totalLeads} Tin Nhắn = ${formatVND(avgCpl)}`;

    html += `
        <tr class="total-row">
            <td style="text-align:center">★</td>
            <td style="text-align:left;cursor:pointer;" onclick="kpiMktOpenOrdersModal('all', 'Tất Cả Mục Marketing')" title="Click để xem Danh Sách Tất Cả Đơn Hàng Marketing (Ảnh 5)">🏆 TỔNG CỘNG MỤC MARKETING (${itemsList.length} Mục Con) <span style="font-size:11px;color:#ffffff;font-weight:700;margin-left:4px;">🔍</span></td>
            <td>${formatVND(totalSpent)}</td>
            <td onclick="kpiMktOpenOrdersModal('all', 'Tất Cả Mục Marketing')" style="cursor:pointer;" title="Click để xem Danh Sách Tất Cả Đơn Hàng Marketing">${totalOrders} đơn 🔍</td>
            <td onclick="kpiMktOpenOrdersModal('all', 'Tất Cả Mục Marketing')" style="cursor:pointer;" title="Click để xem Danh Sách Tất Cả Đơn Hàng Marketing">${formatVND(totalRevenue)}</td>
            <td><span class="kpi-pill kpi-pill-purple" data-tooltip="${totalTitleCostRatio}" title="${totalTitleCostRatio}">${avgCostRatio}%</span></td>
            <td><span class="kpi-pill kpi-pill-cyan" data-tooltip="${totalTitleCloseRate}" title="${totalTitleCloseRate}">${avgCloseRate}%</span></td>
            <td><span class="kpi-pill kpi-pill-orange" data-tooltip="${totalTitleCpo}" title="${totalTitleCpo}">${avgCpo > 0 ? formatVND(avgCpo) : '0đ'}</span></td>
            <td>${totalLeads}</td>
            <td><span class="kpi-pill kpi-pill-blue" data-tooltip="${totalTitleCpl}" title="${totalTitleCpl}">${formatVND(avgCpl)}</span></td>
        </tr>
    `;

    tbody.innerHTML = html;

    // Update top summary cards dynamically from calculated table totals
    const avgCplEl = document.getElementById('kpiMktAvgCpl');
    if (avgCplEl) {
        avgCplEl.innerText = formatVND(avgCpl);
        if (avgCplEl.parentElement) avgCplEl.parentElement.title = totalTitleCpl;
    }

    const avgCostEl = document.getElementById('kpiMktAvgCostRatio');
    if (avgCostEl) {
        avgCostEl.innerText = `${avgCostRatio}%`;
        if (avgCostEl.parentElement) avgCostEl.parentElement.title = totalTitleCostRatio;
    }

    const avgCpoEl = document.getElementById('kpiMktAvgCpo');
    if (avgCpoEl) {
        avgCpoEl.innerText = avgCpo > 0 ? formatVND(avgCpo) : '0đ';
        if (avgCpoEl.parentElement) avgCpoEl.parentElement.title = totalTitleCpo;
    }

    const avgCloseEl = document.getElementById('kpiMktAvgCloseRate');
    if (avgCloseEl) {
        avgCloseEl.innerText = `${avgCloseRate}%`;
        if (avgCloseEl.parentElement) avgCloseEl.parentElement.title = totalTitleCloseRate;
    }

    const totalRevEl = document.getElementById('kpiMktTotalRev');
    if (totalRevEl) totalRevEl.innerText = formatVND(totalRevenue);

    const totalOrdersEl = document.getElementById('kpiMktTotalOrders');
    if (totalOrdersEl) totalOrdersEl.innerText = `${totalOrders} đơn`;
}

/* MONTH NAVIGATION HELPERS */
function kpiMktChangeMonth(step) {
    if (!_kpiMkt.month) {
        const now = new Date();
        _kpiMkt.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [y, m] = _kpiMkt.month.split('-').map(Number);
    const d = new Date(y, m - 1 + step, 1);
    _kpiMkt.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadKpimarketingData();
}

function kpiMktPickMonth() {
    const inp = document.getElementById('kpiMktMonthInput');
    if (inp) {
        inp.value = _kpiMkt.month;
        if (typeof inp.showPicker === 'function') {
            inp.showPicker();
        } else {
            inp.click();
        }
    }
}

function kpiMktOnMonthInput(val) {
    if (val && /^\d{4}-\d{2}$/.test(val)) {
        _kpiMkt.month = val;
        loadKpimarketingData();
    }
}

/* MODAL FORM: THÊM MỤC CON / MÃ NGUỒN (ẢNH 1) */
function kpiMktOpenAddCatModal() {
    const modal = document.getElementById('kpiMktAddCatModal');
    if (!modal) return;

    const categories = (_kpiMkt.data && (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories)) ? (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories) : [];
    const rootCats = categories.filter(c => c.parent_id === null || c.parent_id === undefined);

    // 1. Populate Channel (Parent) Dropdown
    const parentSelect = document.getElementById('kpiAddCatParent');
    if (parentSelect) {
        let parentHtml = '';
        if (rootCats.length === 0) {
            parentHtml = `<option value="1">📘 Facebook Ads</option><option value="2">🎵 Tiktok Ads</option><option value="3">🔍 Google Ads</option><option value="4">💬 Zalo Ads / OA</option>`;
        } else {
            const onlineCats = rootCats.filter(c => (c.group_type || 'online') === 'online');
            const offlineCats = rootCats.filter(c => c.group_type === 'offline');

            if (onlineCats.length > 0) {
                parentHtml += `<optgroup label="🌐 Marketing Online">`;
                onlineCats.forEach(c => {
                    parentHtml += `<option value="${c.id}">${c.icon || '📌'} ${escapeHtml(c.name)}</option>`;
                });
                parentHtml += `</optgroup>`;
            }

            if (offlineCats.length > 0) {
                parentHtml += `<optgroup label="🏢 Marketing Offline">`;
                offlineCats.forEach(c => {
                    parentHtml += `<option value="${c.id}">${c.icon || '📌'} ${escapeHtml(c.name)}</option>`;
                });
                parentHtml += `</optgroup>`;
            }
        }
        parentSelect.innerHTML = parentHtml;
        parentSelect.selectedIndex = 0;
    }

    // 2. Populate Page Pancake Dropdown
    const pageSelect = document.getElementById('kpiAddCatPageSelect');
    if (pageSelect) {
        const availPages = (_kpiMkt.data && _kpiMkt.data.available_pages) ? _kpiMkt.data.available_pages : [];
        const pageSet = new Set(['Page Công Ty 2', 'Page TEMVN', 'Seo Web HV.VN', 'Zalo OA/APP', 'KHÁCH NHẮN ZALO TỔNG', 'Spam Zalo', 'Tiktok Ads 1']);
        availPages.forEach(p => { if (p) pageSet.add(p); });

        let pageHtml = '';
        pageSet.forEach(p => {
            pageHtml += `<option value="${escapeHtml(p)}">🔗 ${escapeHtml(p)}</option>`;
        });
        pageSelect.innerHTML = pageHtml;
        pageSelect.selectedIndex = 0;
    }

    // 3. Populate Handler Dropdown
    const handlerSelect = document.getElementById('kpiAddCatHandlerSelect');
    if (handlerSelect) {
        const availHandlers = (_kpiMkt.data && _kpiMkt.data.available_handlers) ? _kpiMkt.data.available_handlers : [];
        const hSet = new Set(['Giám Đốc']);
        availHandlers.forEach(h => { if (h) hSet.add(h); });

        let hHtml = '';
        hSet.forEach(h => {
            hHtml += `<option value="${escapeHtml(h)}">👤 ${escapeHtml(h)}</option>`;
        });
        handlerSelect.innerHTML = hHtml;
        handlerSelect.selectedIndex = 0;
    }

    // Reset inputs
    const subInput = document.getElementById('kpiAddCatSubInput');
    if (subInput) { subInput.style.display = 'none'; subInput.value = ''; }
    
    const pageInput = document.getElementById('kpiAddCatPageInput');
    if (pageInput) { pageInput.style.display = 'none'; pageInput.value = ''; }
    
    const handlerInput = document.getElementById('kpiAddCatHandlerInput');
    if (handlerInput) { handlerInput.style.display = 'none'; handlerInput.value = ''; }

    // 4. Trigger Channel Change to populate sub-categories for selected channel
    if (parentSelect) {
        const selectedVal = parentSelect.value || "1";
        kpiMktOnChannelChange(selectedVal);
    }

    modal.style.display = 'flex';
}

function kpiMktCloseAddCatModal() {
    const modal = document.getElementById('kpiMktAddCatModal');
    if (modal) modal.style.display = 'none';
}

function kpiMktOnChannelChange(parentId) {
    const subSelect = document.getElementById('kpiAddCatSubSelect');
    if (!subSelect) return;

    const categories = (_kpiMkt.data && (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories)) ? (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories) : [];
    const renderedNames = new Set(
        (_kpiMkt.data && _kpiMkt.data.renderedCategories) ? _kpiMkt.data.renderedCategories.map(n => String(n).trim().toLowerCase()) : []
    );
    
    const pIdNum = Number(parentId);
    const subCats = categories.filter(c => c.parent_id !== null && c.parent_id !== undefined && (Number(c.parent_id) === pIdNum || String(c.parent_id) === String(parentId)));

    let subHtml = '';
    const addedNames = new Set();

    // 1. Add sub-categories from DB if NOT ALREADY in the table
    subCats.forEach(c => {
        const cNameTrim = (c.name || '').trim();
        if (cNameTrim && !addedNames.has(cNameTrim) && !renderedNames.has(cNameTrim.toLowerCase())) {
            addedNames.add(cNameTrim);
            subHtml += `<option value="${escapeHtml(cNameTrim)}" data-page="${escapeHtml(c.linked_source_name || c.pancake_page_name || '')}" data-handler="${escapeHtml(c.ads_handler_name || 'Giám Đốc')}">📌 ${escapeHtml(cNameTrim)}</option>`;
        }
    });

    // 2. Real fallback mapping matching /ngansachmkt structure if DB state is empty
    if (addedNames.size === 0) {
        const realFallbackMap = {
            '1': [
                { name: 'Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng', page: 'Page Công Ty 2', handler: 'Giám Đốc' },
                { name: 'Xưởng In HV - Xưởng In Pet , In Tem Eco Gia Công', page: 'Page TEMVN', handler: 'Giám Đốc' }
            ],
            '3': [
                { name: 'Seo Web', page: 'Seo Web HV.VN', handler: 'Giám Đốc' }
            ]
        };
        
        const matchedParentCat = categories.find(c => String(c.id) === String(parentId));
        const parentName = matchedParentCat ? matchedParentCat.name.toLowerCase() : '';

        let fallbacks = realFallbackMap[String(parentId)] || [];
        if (fallbacks.length === 0 && (parentName.includes('facebook') || parentId === '1')) {
            fallbacks = realFallbackMap['1'];
        } else if (fallbacks.length === 0 && (parentName.includes('google') || parentId === '3')) {
            fallbacks = realFallbackMap['3'];
        }

        fallbacks.forEach(item => {
            if (!addedNames.has(item.name) && !renderedNames.has(item.name.toLowerCase())) {
                addedNames.add(item.name);
                subHtml += `<option value="${escapeHtml(item.name)}" data-page="${escapeHtml(item.page)}" data-handler="${escapeHtml(item.handler)}">📌 ${escapeHtml(item.name)}</option>`;
            }
        });
    }

    subHtml += `<option value="__NEW__">➕ Nhập Mục Con / Mã Nguồn Mới...</option>`;
    subSelect.innerHTML = subHtml;

    // Pre-select first sub-category option if present
    if (subSelect.options.length > 0) {
        subSelect.selectedIndex = 0;
    }

    // Trigger sub-cat change update immediately
    kpiMktOnSubCatSelectChange(subSelect.value);
}

function kpiMktOnSubCatSelectChange(val) {
    const subInput = document.getElementById('kpiAddCatSubInput');
    const pageSelect = document.getElementById('kpiAddCatPageSelect');
    const pageInput = document.getElementById('kpiAddCatPageInput');
    const handlerSelect = document.getElementById('kpiAddCatHandlerSelect');
    const handlerInput = document.getElementById('kpiAddCatHandlerInput');

    const pageBadge = document.getElementById('kpiPageLockBadge');
    const handlerBadge = document.getElementById('kpiHandlerLockBadge');

    if (subInput) subInput.style.display = 'none';
    if (pageBadge) pageBadge.style.display = 'inline-flex';
    if (handlerBadge) handlerBadge.style.display = 'inline-flex';

    if (!val) {
        if (pageSelect) {
            pageSelect.value = '';
            pageSelect.disabled = true;
            pageSelect.setAttribute('disabled', 'disabled');
            pageSelect.style.backgroundColor = '#e2e8f0';
            pageSelect.style.pointerEvents = 'none';
        }
        if (handlerSelect) {
            handlerSelect.value = 'Giám Đốc';
            handlerSelect.disabled = true;
            handlerSelect.setAttribute('disabled', 'disabled');
            handlerSelect.style.backgroundColor = '#e2e8f0';
            handlerSelect.style.pointerEvents = 'none';
        }
        return;
    }

    // Look up matched category in database (synced with /ngansachmkt)
    const categories = (_kpiMkt.data && (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories)) ? (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories) : [];
    const matchedCat = categories.find(c => c.name && c.name.trim().toLowerCase() === String(val).trim().toLowerCase());

    let pageName = matchedCat ? (matchedCat.linked_source_name || matchedCat.pancake_page_name || '').trim() : '';
    let handlerName = matchedCat ? (matchedCat.ads_handler_name || 'Giám Đốc') : 'Giám Đốc';

    const saveBtn = document.querySelector('#kpiMktAddCatModal button[onclick*="kpiMktSaveNewCategory"]');

    if (pageSelect) {
        if (!pageName || pageName === '-' || pageName === 'null') {
            pageName = '-';
            pageSelect.innerHTML = `<option value="-">🔗 -</option>`;
            pageSelect.value = '-';
            pageSelect.disabled = true;
            pageSelect.style.backgroundColor = '#f1f5f9';
            pageSelect.style.color = '#94a3b8';
            pageSelect.style.cursor = 'not-allowed';

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.setAttribute('disabled', 'disabled');
                saveBtn.style.opacity = '0.45';
                saveBtn.style.cursor = 'not-allowed';
                saveBtn.title = 'Mục con này chưa cài đặt Nguồn Quảng Cáo liên kết';
            }
        } else {
            let existingOptIndex = Array.from(pageSelect.options).findIndex(o => o.value === pageName);
            if (existingOptIndex >= 0) {
                pageSelect.selectedIndex = existingOptIndex;
            } else {
                const opt = document.createElement('option');
                opt.value = pageName;
                opt.textContent = `🔗 ${pageName}`;
                pageSelect.insertBefore(opt, pageSelect.firstChild);
                pageSelect.selectedIndex = 0;
            }
            pageSelect.disabled = true;
            pageSelect.style.backgroundColor = '#e2e8f0';
            pageSelect.style.color = '#475569';
            pageSelect.style.cursor = 'not-allowed';

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.removeAttribute('disabled');
                saveBtn.style.opacity = '1';
                saveBtn.style.cursor = 'pointer';
                saveBtn.title = 'Lưu Mục Marketing Mới';
            }
        }
        if (pageInput) pageInput.style.display = 'none';
    }

    // ALWAYS STRICTLY LOCK Ads Handler field (cannot be edited)
    if (handlerSelect) {
        let existingOptIndex = Array.from(handlerSelect.options).findIndex(o => o.value === handlerName);
        if (existingOptIndex >= 0) {
            handlerSelect.selectedIndex = existingOptIndex;
        } else if (handlerName) {
            const opt = document.createElement('option');
            opt.value = handlerName;
            opt.textContent = `👤 ${handlerName}`;
            handlerSelect.insertBefore(opt, handlerSelect.firstChild);
            handlerSelect.selectedIndex = 0;
        }
        handlerSelect.disabled = true;
        handlerSelect.setAttribute('disabled', 'disabled');
        handlerSelect.style.backgroundColor = '#e2e8f0';
        handlerSelect.style.color = '#475569';
        handlerSelect.style.cursor = 'not-allowed';
        handlerSelect.style.pointerEvents = 'none';
        handlerSelect.style.opacity = '0.75';
        if (handlerInput) handlerInput.style.display = 'none';
    }
}

function kpiMktOnPageSelectChange(val) {
    const inp = document.getElementById('kpiAddCatPageInput');
    if (!inp) return;
    if (val === '__custom__') {
        inp.style.display = 'block';
        inp.value = '';
        inp.focus();
    } else {
        inp.style.display = 'none';
        inp.value = val;
    }
}

function kpiMktOnHandlerSelectChange(val) {
    const inp = document.getElementById('kpiAddCatHandlerInput');
    if (!inp) return;
    if (val === '__custom__') {
        inp.style.display = 'block';
        inp.value = '';
        inp.focus();
    } else {
        inp.style.display = 'none';
        inp.value = val;
    }
}

async function kpiMktSaveNewCategory() {
    const parentId = document.getElementById('kpiAddCatParent').value;
    
    const subSelectVal = document.getElementById('kpiAddCatSubSelect').value;
    const subInputVal = document.getElementById('kpiAddCatSubInput').value;
    let name = '';
    if (subSelectVal === '__custom__' || !subSelectVal) {
        name = subInputVal;
    } else {
        name = subSelectVal;
    }
    
    const pageSelectVal = document.getElementById('kpiAddCatPageSelect').value;
    const pageInputVal = document.getElementById('kpiAddCatPageInput').value;
    const page = (pageSelectVal === '__custom__' || !pageSelectVal) ? pageInputVal : pageSelectVal;

    const handlerSelectVal = document.getElementById('kpiAddCatHandlerSelect').value;
    const handlerInputVal = document.getElementById('kpiAddCatHandlerInput').value;
    const handler = (handlerSelectVal === '__custom__' || !handlerSelectVal) ? handlerInputVal : handlerSelectVal;

    if (!name || !name.trim()) {
        alert('Vui lòng chọn hoặc nhập tên Mục Con / Sản Phẩm (Mã Nguồn)!');
        return;
    }

    if (!page || page.trim() === '-' || page.trim() === '') {
        alert('⚠️ Mục con này chưa được cài đặt Nguồn Quảng Cáo liên kết!\n\nVui lòng sang trang Ngân Sách Marketing và bấm biểu tượng ✏️ bên cạnh mục con để cài đặt Nguồn Liên Kết trước.');
        return;
    }

    try {
        let res = await kpiMktApiCall('/api/reports/kpi-marketing/categories', 'POST', {
            parent_id: parentId,
            name: name.trim(),
            pancake_page_name: page.trim(),
            ads_handler_name: handler.trim() || 'Giám Đốc'
        });

        if (res && (res.success || res.id || res.message)) {
            kpiMktCloseAddCatModal();
            await loadKpimarketingData();
            alert('Thành công! Mục con & Nguồn Pancake đã được lưu và hiển thị thành công.');
        } else {
            alert(res?.error || res?.message || 'Có lỗi khi tạo/lưu mục Marketing mới');
        }
    } catch(e) {
        alert('Lỗi tạo mục: ' + e.message);
    }
}

function kpiMktIsGiamDoc() {
    const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window._currentUser || {});
    const r = (u.role || '').toLowerCase();
    const name = (u.full_name || u.name || u.username || '').toLowerCase();
    return r === 'giam_doc' || r === 'admin' || name.includes('giám đốc') || u.is_admin === true || u.username === 'admin';
}

async function kpiMktDeleteCategory(catId, catName) {
    if (!kpiMktIsGiamDoc()) {
        alert('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới được xóa mục con.');
        return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa mục con "${catName}" không?\n(Mục con sẽ được ẩn khỏi bảng chỉ số Marketing)`)) {
        return;
    }
    try {
        const targetId = (catId && catId !== '0' && catId !== 0) ? catId : encodeURIComponent(catName);
        let res = await kpiMktApiCall(`/api/reports/kpi-marketing/categories/${targetId}`, 'DELETE');
        if (res && (res.success || res.message)) {
            await loadKpimarketingData();
            alert(`Đã xóa mục con "${catName}" thành công!`);
        } else {
            alert(res?.error || res?.message || 'Có lỗi khi xóa mục con');
        }
    } catch(e) {
        alert('Lỗi xóa mục con: ' + e.message);
    }
}

async function kpiMktOpenOrdersModal(targetCatId = null, targetCatName = null) {
    let modal = document.getElementById('kpiMktOrdersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiMktOrdersModal';
        modal.className = 'kpi-v2-modal-overlay';
        modal.innerHTML = `
            <div class="kpi-v2-modal" style="width:1300px;max-width:96vw;max-height:92vh;padding:24px;">
                <div class="kpi-v2-modal-hdr" style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div class="kpi-v2-modal-title" style="font-size:18px;color:#0f172a;font-weight:800;">📦 Danh Sách Đơn Hàng Marketing (First-Touch)</div>
                        <div id="kpiMktOrdersModalSub" style="font-size:12px;color:#64748b;margin-top:2px;font-weight:600;"></div>
                    </div>
                    <button class="kpi-v2-modal-close" style="cursor:pointer;" onclick="document.getElementById('kpiMktOrdersModal').style.display='none'">✕</button>
                </div>

                <!-- Control & Filter Bar -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                    <div id="kpiMktOrdersSummaryStats" style="display:flex;gap:10px;align-items:center;font-size:13px;font-weight:700;flex-wrap:wrap;"></div>
                    <div id="kpiMktOrdersFilterContainer" style="display:flex;align-items:center;gap:8px;"></div>
                </div>

                <!-- Table Scroll Wrap -->
                <div id="kpiMktOrdersTableContainer" style="overflow-y:auto;max-height:60vh;border-radius:12px;">
                    <div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">
                        ⏳ Đang truy vấn danh sách đơn hàng...
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const subEl = modal.querySelector('#kpiMktOrdersModalSub');
    const statsEl = modal.querySelector('#kpiMktOrdersSummaryStats');
    const filterEl = modal.querySelector('#kpiMktOrdersFilterContainer');
    const tableEl = modal.querySelector('#kpiMktOrdersTableContainer');

    modal.style.setProperty('display', 'flex', 'important');
    if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">⏳ Đang tải danh sách đơn hàng chốt thành công từ Quảng Cáo...</div>';

    try {
        const [yStr, mStr] = (_kpiMkt.month || '').split('-');
        let url = `/api/marketing-budgets/first-touch-orders?year=${yStr}`;
        if (mStr) url += `&month=${parseInt(mStr, 10)}`;
        if (targetCatId && targetCatId !== 'all') {
            url += `&category_id=${targetCatId}`;
        }

        const res = await kpiMktApiCall(url);
        if (res.success && Array.isArray(res.orders)) {
            const allOrders = res.orders;
            const periodTxt = yStr && mStr ? `Tháng ${parseInt(mStr, 10)}/${yStr}` : 'Tháng';

            if (subEl) {
                subEl.textContent = targetCatName 
                    ? `Báo cáo Đơn hàng First-Touch • ${targetCatName} • ${periodTxt}`
                    : `Báo cáo Đơn hàng First-Touch • ${periodTxt}`;
            }

            if (allOrders.length === 0) {
                if (statsEl) statsEl.innerHTML = '';
                if (filterEl) filterEl.innerHTML = '';
                if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Chưa có đơn hàng Marketing nào được ghi nhận cho tháng đang chọn.</div>';
                return;
            }

            // Extract unique sources for filter dropdown
            const uniqueSources = Array.from(new Set(allOrders.map(o => (o.source || '').trim()).filter(Boolean))).sort();

            if (filterEl) {
                filterEl.innerHTML = `
                    <label style="font-size:12.5px;font-weight:800;color:#334155;white-space:nowrap;display:flex;align-items:center;gap:4px;">🎯 Lọc Nguồn Quảng Cáo:</label>
                    <select id="kpiMktOrdersSourceSelect" style="padding:6px 12px;border-radius:8px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12.5px;color:#0f172a;background:white;cursor:pointer;outline:none;box-shadow:0 2px 5px rgba(0,0,0,0.04);">
                        <option value="all">🌐 Tất cả nguồn (${allOrders.length} đơn)</option>
                        ${uniqueSources.map(s => `<option value="${escapeHtml(s)}">📍 ${escapeHtml(s)}</option>`).join('')}
                    </select>
                `;

                const selectEl = filterEl.querySelector('#kpiMktOrdersSourceSelect');
                if (selectEl) {
                    selectEl.onchange = (e) => renderFilteredOrders(e.target.value);
                }
            }

            function renderFilteredOrders(selectedSource) {
                const filtered = selectedSource && selectedSource !== 'all'
                    ? allOrders.filter(o => (o.source || '').trim() === selectedSource)
                    : allOrders;

                const totalOrdersCount = filtered.length;
                const totalQty = filtered.reduce((acc, o) => acc + Number(o.total_quantity || 0), 0);
                const totalDep = filtered.reduce((acc, o) => acc + Number(o.deposit_amount || 0), 0);
                const totalRev = filtered.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

                if (statsEl) {
                    statsEl.innerHTML = `
                        <span style="color:#2563eb;background:#eff6ff;padding:4px 10px;border-radius:8px;border:1px solid #bfdbfe;">📦 Tổng đơn: <b>${totalOrdersCount} đơn</b></span>
                        <span style="color:#059669;background:#f0fdf4;padding:4px 10px;border-radius:8px;border:1px solid #bbf7d0;">👔 Tổng SL: <b>${totalQty.toLocaleString('vi-VN')} sp</b></span>
                        <span style="color:#d97706;background:#fffbeb;padding:4px 10px;border-radius:8px;border:1px solid #fde68a;">💵 Tổng cọc: <b>${formatVND(totalDep)}</b></span>
                        <span style="color:#7c3aed;background:#f3e8ff;padding:4px 10px;border-radius:8px;border:1px solid #ddd6fe;">💰 Doanh số MKT: <b>${formatVND(totalRev)}</b></span>
                    `;
                }

                if (filtered.length === 0) {
                    if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Không tìm thấy đơn hàng nào thuộc nguồn đã chọn.</div>';
                    return;
                }

                let rowsHtml = filtered.map((o, idx) => {
                    const timeDisp = (o.order_time_str || o.dt_str || '').replace(' 00:00', '');
                    const isOldCust = o.customer_type === 'cu';
                    const custBadgeHtml = isOldCust
                        ? `<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:20px;font-weight:800;font-size:11.5px;border:1px solid #fde68a;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">🟧 Khách Cũ</span>`
                        : `<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-weight:800;font-size:11.5px;border:1px solid #bbf7d0;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">🟢 Khách Mới</span>`;

                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                        <td style="padding:11px 12px;text-align:center;font-weight:700;color:#64748b;font-size:12px;">${idx + 1}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#334155;font-size:12.5px;white-space:nowrap;">🕒 ${timeDisp}</td>
                        <td style="padding:11px 12px;font-weight:800;color:#2563eb;font-family:monospace;font-size:13px;white-space:nowrap;">
                            <span style="background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;">${o.order_code}</span>
                        </td>
                        <td style="padding:11px 12px;font-weight:800;color:#0f172a;font-size:13px;">${escapeHtml(o.customer_name)}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#475569;font-size:12.5px;">👤 ${escapeHtml(o.sale_name)}</td>
                        <td style="padding:11px 12px;font-size:12px;white-space:nowrap;">${custBadgeHtml}</td>
                        <td style="padding:11px 12px;font-size:12px;">
                            <span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:6px;font-weight:700;border:1px solid #bae6fd;white-space:nowrap;">📍 ${escapeHtml(o.source)}</span>
                        </td>
                        <td style="padding:11px 12px;text-align:center;font-weight:800;color:#059669;font-size:13px;">${Number(o.total_quantity || 0).toLocaleString('vi-VN')}</td>
                        <td style="padding:11px 12px;text-align:right;font-weight:800;color:#d97706;font-size:13px;">${Number(o.deposit_amount) > 0 ? formatVND(o.deposit_amount) : '—'}</td>
                        <td style="padding:11px 12px;text-align:right;font-weight:900;color:#2563eb;font-size:14px;">${formatVND(o.total_amount)}</td>
                    </tr>
                `}).join('');

                if (tableEl) {
                    tableEl.innerHTML = `
                        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                            <table class="kpi-v2-tbl" style="width:100%;border-collapse:collapse;background:white;">
                                <thead style="position:sticky;top:0;z-index:10;background:white;">
                                    <tr style="background:#ffffff;border-bottom:2px solid #cbd5e1;">
                                        <th style="padding:12px 14px;text-align:center;width:40px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">#</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Thời Gian Chốt</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Mã Đơn</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Tên Khách Hàng</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">NVKD / Sale</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Loại khách</th>
                                        <th style="padding:12px 14px;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Nguồn Quảng Cáo</th>
                                        <th style="padding:12px 14px;text-align:center;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Tổng SL</th>
                                        <th style="padding:12px 14px;text-align:right;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Đặt Cọc</th>
                                        <th style="padding:12px 14px;text-align:right;color:#0f172a;background:#ffffff;font-weight:800;font-size:13px;white-space:nowrap;">Doanh Số</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }

            renderFilteredOrders('all');
        }
    } catch(e) {
        if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;font-weight:700;">❌ Lỗi nạp danh sách đơn hàng: ${e.message}</div>`;
    }
}

function getCleanDisplayHandlerName(name) {
    if (!name) return 'Giám Đốc';
    let clean = String(name).trim();
    if (/^Giám Đốc(\s*[-_()]?\s*(Bảng|Nhóm)?\s*\d+)?$/i.test(clean)) {
        return 'Giám Đốc';
    }
    clean = clean.replace(/\s*[-_()]\s*Bảng\s*\d+/gi, '').trim();
    return clean;
}

function renderKpiMktHandlersTable(res, itemsList) {
    const container = document.getElementById('kpiMktHandlersContainer') || document.getElementById('kpiMktHandlersTbody');
    if (!container) return;

    const monthKey = _kpiMkt.month || '';
    const isCleared = localStorage.getItem('kpi_mkt_cleared_assignments_' + monthKey) === 'true';

    let handlers = (res && res.handlers && !isCleared) ? res.handlers : [];
    if (isCleared) handlers = [];

    // Sort cards so cards for the same employee stay grouped together sequentially
    handlers.sort((a, b) => {
        const nameA = getCleanDisplayHandlerName(a.ads_handler_name);
        const nameB = getCleanDisplayHandlerName(b.ads_handler_name);
        if (nameA !== nameB) {
            if (nameA === 'Giám Đốc') return -1;
            if (nameB === 'Giám Đốc') return 1;
            return nameA.localeCompare(nameB);
        }
        const strA = a.ads_handler_name || '';
        const strB = b.ads_handler_name || '';
        const numA = (strA.match(/\d+/) || [1])[0];
        const numB = (strB.match(/\d+/) || [1])[0];
        return Number(numA) - Number(numB);
    });
    const categories = (res && (res.categories || res.all_system_categories)) ? (res.categories || res.all_system_categories) : [];
    const catMap = new Map();
    categories.forEach(c => catMap.set(c.id, c));
    const isGiamDoc = kpiMktIsGiamDoc();

    if (handlers.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:35px;color:#64748b;font-weight:700;background:#fff;border-radius:16px;border:1.5px solid #cbd5e1;">Chưa có nhân viên nào được gán Page. Bấm nút <strong>"➕ Tạo Nhân Viên & Gán Page"</strong> ở trên để phân công Page!</div>`;
        return;
    }

    const allCatList = itemsList || [];
    let cardsHtml = '';

    handlers.forEach((h, idx) => {
        const handlerName = h.ads_handler_name || 'Giám Đốc';
        const cleanDisplayName = getCleanDisplayHandlerName(handlerName);

        // Find all categories assigned to this handlerName
        const assignedItems = allCatList.filter(c => {
            const hN = (c.ads_handler_name || 'Giám Đốc').trim().toLowerCase();
            return hN === handlerName.trim().toLowerCase();
        });

        const displayItems = (h.items && h.items.length > 0) ? h.items : (assignedItems.length > 0 ? assignedItems : []);
        const totalRowsForHandler = Math.max(1, displayItems.length) + 1 + 7; // +1 for Employee Total row, +7 for KPI Target rows

        let html = '';

        // Render Dark Executive Banner Row for this employee
        html += `
            <tr class="employee-block-header-row" style="color:#ffffff !important;font-weight:800 !important;font-size:12.5px !important;">
                <td style="width:45px;min-width:45px;text-align:center;color:#ffffff;font-weight:800;padding:10px 4px;background:#0f172a !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">STT</td>
                <td style="width:160px;min-width:160px;text-align:left;color:#ffffff;font-weight:800;padding:10px 8px;background:#111c30 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">Nhân Viên Marketing (Ads Handler)</td>
                <td style="width:280px;min-width:280px;text-align:left;color:#ffffff;font-weight:800;padding:10px 8px;background:#132037 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">Danh Sách Page / Mục Con Đang Cầm</td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#15243e !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>💸 CHI PHÍ MKT</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Chi phí Quảng Cáo)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#172845 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>📦 ĐƠN HÀNG</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(SL đơn hàng)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#192c4c !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>💰 DOANH SỐ (đ)</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Doanh thu đơn hàng)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#1b3053 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>📉 % CP / DOANH SỐ</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Chi phí / Doanh số)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#1c3359 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>🎯 TỶ LỆ CHỐT</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Đơn hàng / Lead)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#1e365f !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>🎯 CPO (GIÁ/ĐƠN)</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Chi phí / Đơn)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#1f3863 !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>📥 SỐ LEAD</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(SL Tin Nhắn)</span>
                </td>
                <td style="width:135px;min-width:135px;text-align:center;color:#ffffff;font-weight:800;padding:8px 4px;background:#1e293b !important;vertical-align:middle;border-bottom:2px solid #0f172a !important;">
                    <span>📊 CPL (GIÁ/LEAD)</span>
                    <span style="font-size:10px;font-weight:400;opacity:0.75;display:block;margin-top:2px">(Giá / Lead)</span>
                </td>
            </tr>
        `;

        const actionButtonsHtml = isGiamDoc ? `
            <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;margin-top:8px;width:100%;max-width:145px;">
                <button type="button" data-no-debounce="true" onclick="kpiMktOpenAssignModal('${escapeHtml(handlerName)}')" style="background:#e0f2fe;color:#0284c7;border:1.5px solid #7dd3fc;padding:5px 10px;border-radius:8px;font-weight:600;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(2,132,199,0.12);transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">⚙️ Gán Page</button>
                <button type="button" data-no-debounce="true" onclick="kpiMktOpenSetTargetModal('${escapeHtml(handlerName)}')" style="background:#ecfdf5;color:#059669;border:1.5px solid #6ee7b7;padding:5px 10px;border-radius:8px;font-weight:600;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(5,150,105,0.12);transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">🎯 Đặt KPI Tháng</button>
                <button type="button" data-no-debounce="true" onclick="kpiMktDeleteCard('${escapeHtml(handlerName)}')" style="background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;padding:5px 10px;border-radius:8px;font-weight:600;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(225,29,72,0.12);transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.background='#ffe4e6'" onmouseout="this.style.background='#fff1f2'" title="Xóa toàn bộ Bảng này và giải phóng các Page để gán lại">🗑️ Xóa Bảng Này</button>
            </div>
        ` : '';

        let totSpent = 0, totLeads = 0, totOrders = 0, totRevenue = 0;

        if (displayItems.length === 0) {
            html += `
                <tr style="background:#ffffff;">
                    <td rowspan="1" style="text-align:center;vertical-align:middle;font-weight:800;background:#ffffff;border-right:1px solid #e2e8f0;color:#0f172a;">${idx + 1}</td>
                    <td rowspan="1" style="text-align:left;vertical-align:middle;background:#ffffff;padding:12px 10px;border-right:1px solid #e2e8f0;">
                        <div style="font-weight:900;font-size:14.5px;color:#0f172a;display:flex;align-items:center;gap:6px">
                            <span>👤 ${escapeHtml(handlerName)}</span>
                        </div>
                        ${actionButtonsHtml}
                    </td>
                    <td style="text-align:left;color:#94a3b8;font-style:italic">Chưa gán Page nào</td>
                    <td style="text-align:center;">0đ</td>
                    <td style="text-align:center;">0 đơn</td>
                    <td style="text-align:center;">0đ</td>
                    <td style="text-align:center;"><span class="kpi-pill kpi-pill-purple">0.00%</span></td>
                    <td style="text-align:center;"><span class="kpi-pill kpi-pill-cyan">0.00%</span></td>
                    <td style="text-align:center;"><span class="kpi-pill kpi-pill-orange">0đ</span></td>
                    <td style="text-align:center;">0</td>
                    <td style="text-align:center;"><span class="kpi-pill kpi-pill-blue">0đ</span></td>
                </tr>
            `;
        } else {
            displayItems.forEach((it, pageIdx) => {
                const itemSpent = Number(it.spent || 0);
                const itemLeads = Number(it.leads || 0);
                const itemOrders = Number(it.orders || 0);
                const itemRevenue = Number(it.revenue || 0);

                totSpent += itemSpent;
                totLeads += itemLeads;
                totOrders += itemOrders;
                totRevenue += itemRevenue;

                const itemCpl = itemLeads > 0 ? Math.round(itemSpent / itemLeads) : 0;
                const itemCpo = itemOrders > 0 ? Math.round(itemSpent / itemOrders) : 0;
                const itemCostRatio = itemRevenue > 0 ? (itemSpent / itemRevenue * 100).toFixed(2) : '0.00';
                const itemCloseRate = itemLeads > 0 ? (itemOrders / itemLeads * 100).toFixed(2) : '0.00';

                const itemCplStr = formatVND(itemCpl);
                const itemCostRatioStr = `${itemCostRatio}%`;
                const itemCpoStr = itemCpo > 0 ? formatVND(itemCpo) : '0đ';
                const itemCloseRateStr = `${itemCloseRate}%`;

                const titleCostRatio = `${formatVND(itemSpent)} Chi phí MKT / ${formatVND(itemRevenue)} Doanh số = ${itemCostRatioStr}`;
                const titleCloseRate = `${totOrders} Đơn / ${totLeads} Tin Nhắn = ${itemCloseRateStr}`;
                const titleCpo = `${formatVND(itemSpent)} Chi phí MKT / ${itemOrders} Đơn = ${itemCpoStr}`;
                const titleCpl = `${formatVND(itemSpent)} Chi phí MKT / ${itemLeads} Tin Nhắn = ${itemCplStr}`;

                const catName = it.category_name || it.name || 'Mục Marketing';
                const actualCatId = it.category_id || it.id;
                const channelName = it.channel_name || 'Facebook Ads';
                const catObj = (actualCatId && catMap.get(actualCatId)?.channel_link) ? catMap.get(actualCatId) : (Array.from(catMap.values()).find(cat => cat.name && cat.name.trim().toLowerCase() === String(catName).trim().toLowerCase() && cat.channel_link) || catMap.get(actualCatId) || Array.from(catMap.values()).find(cat => cat.name && cat.name.trim().toLowerCase() === String(catName).trim().toLowerCase()));
                const pageLabel = it.pancake_page_name || it.linked_source_name || (catObj ? (catObj.linked_source_name || catObj.pancake_page_name) : '') || '';
                let pageLink = it.channel_link || (catObj ? catObj.channel_link : null) || it.fb_ad_account_link || '';
                if (!pageLink && pageLabel) {
                    const pageMatch = Array.from(catMap.values()).find(cat => cat.channel_link && (
                        (cat.linked_source_name && cat.linked_source_name.trim().toLowerCase() === pageLabel.trim().toLowerCase()) ||
                        (cat.pancake_page_name && cat.pancake_page_name.trim().toLowerCase() === pageLabel.trim().toLowerCase())
                    ));
                    if (pageMatch) pageLink = pageMatch.channel_link;
                }
                const pageTagHtml = pageLabel ? (pageLink ? `<a href="${pageLink}" target="_blank" rel="noopener noreferrer" style="background:#e0f2fe;color:#0284c7;border:1.5px solid #bae6fd;padding:2px 9px;border-radius:8px;font-weight:800;font-size:11px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(2,132,199,0.08);transition:all 0.2s;" title="Mở đường link kênh trong tab mới" onmouseover="this.style.background='#bae6fd';this.style.borderColor='#7dd3fc'" onmouseout="this.style.background='#e0f2fe';this.style.borderColor='#bae6fd'">🔗 ${escapeHtml(pageLabel)} ↗</a>` : `<span style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:2px 8px;border-radius:8px;font-weight:700;font-size:11px;display:inline-flex;align-items:center;gap:4px;">🔗 ${escapeHtml(pageLabel)}</span>`) : '';

                const unassignBtnHtml = (isGiamDoc && actualCatId) ? `
                    <button type="button" data-no-debounce="true" data-name="${escapeHtml(catName)}" onclick="kpiMktUnassignSinglePage(${actualCatId}, this.getAttribute('data-name'))" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(220,38,38,0.1);transition:all 0.2s;white-space:nowrap;flex-shrink:0;height:fit-content;align-self:center;" onmouseover="this.style.background='#fee2e2';this.style.borderColor='#f87171'" onmouseout="this.style.background='#fef2f2';this.style.borderColor='#fca5a5'" title="Bỏ gán Page này khỏi bảng">🗑️ Xóa</button>
                ` : '';

                if (pageIdx === 0) {
                    html += `
                        <tr onclick="kpiMktOpenOrdersModal('${actualCatId}', '${escapeHtml(catName).replace(/'/g, "\\'")}')" style="cursor:pointer;background:#ffffff;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'" title="Click bất kỳ đâu trên thanh ngang mục con để xem Danh Sách Đơn Hàng Marketing (Ảnh 2)">
                            <td rowspan="${totalRowsForHandler}" style="text-align:center;vertical-align:middle;font-weight:800;background:#ffffff;border-right:1.5px solid #cbd5e1;color:#0f172a;font-size:14px;" onclick="event.stopPropagation()">${idx + 1}</td>
                            <td rowspan="${totalRowsForHandler}" style="text-align:left;vertical-align:middle;background:#ffffff;padding:14px 10px;border-right:1.5px solid #cbd5e1;" onclick="event.stopPropagation()">
                                <div style="font-weight:900;font-size:14.5px;color:#0f172a;display:flex;align-items:center;gap:6px">
                                    <span style="background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;padding:3px 10px;border-radius:8px;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:4px;">👤 ${escapeHtml(cleanDisplayName)}</span>
                                </div>
                                <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:4px;">${displayItems.length} Page quản lý</div>
                                ${actionButtonsHtml}
                            </td>
                            <td style="text-align:left;padding:10px 12px;">
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                    <div style="font-weight:800;color:#0f172a;font-size:13px;flex:1;min-width:0;">${escapeHtml(catName)} <span style="font-size:11px;color:#2563eb;font-weight:700;margin-left:4px;">🔍 Xem đơn</span></div>
                                    ${unassignBtnHtml}
                                </div>
                                <div style="font-size:11px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <span style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:2px 8px;border-radius:8px;font-weight:600;font-size:11px;display:inline-flex;align-items:center;">Kênh: <strong style="margin-left:3px;">${escapeHtml(channelName)}</strong></span>
                                    ${pageTagHtml}
                                </div>
                            </td>
                            <td style="text-align:right;font-weight:800;color:#e11d48;padding:10px 12px;">${formatVND(itemSpent)}</td>
                            <td style="text-align:center;font-weight:700;color:#d97706;padding:10px 12px;">
                                <span style="background:#fffbeb;padding:3px 8px;border-radius:6px;border:1px solid #fde68a;">${itemOrders} đơn 🔍</span>
                            </td>
                            <td style="text-align:center;font-weight:800;color:#16a34a;padding:10px 12px;">${formatVND(itemRevenue)}</td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleCostRatio}" title="${titleCostRatio}">${itemCostRatioStr}</span></td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleCloseRate}" title="${titleCloseRate}">${itemCloseRateStr}</span></td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleCpo}" title="${titleCpo}">${itemCpoStr}</span></td>
                            <td style="text-align:center;font-weight:800;color:#0284c7;padding:10px 12px;">${itemLeads}</td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-blue" data-tooltip="${titleCpl}" title="${titleCpl}">${itemCplStr}</span></td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr onclick="kpiMktOpenOrdersModal('${actualCatId}', '${escapeHtml(catName).replace(/'/g, "\\'")}')" style="cursor:pointer;background:#ffffff;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'" title="Click bất kỳ đâu trên thanh ngang mục con để xem Danh Sách Đơn Hàng Marketing (Ảnh 2)">
                            <td style="text-align:left;padding:10px 12px;">
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                    <div style="font-weight:800;color:#0f172a;font-size:13px;flex:1;min-width:0;">${escapeHtml(catName)} <span style="font-size:11px;color:#2563eb;font-weight:700;margin-left:4px;">🔍 Xem đơn</span></div>
                                    ${unassignBtnHtml}
                                </div>
                                <div style="font-size:11px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <span style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:2px 8px;border-radius:8px;font-weight:600;font-size:11px;display:inline-flex;align-items:center;">Kênh: <strong style="margin-left:3px;">${escapeHtml(channelName)}</strong></span>
                                    ${pageTagHtml}
                                </div>
                            </td>
                            <td style="text-align:right;font-weight:800;color:#e11d48;padding:10px 12px;">${formatVND(itemSpent)}</td>
                            <td style="text-align:center;font-weight:700;color:#d97706;padding:10px 12px;">
                                <span style="background:#fffbeb;padding:3px 8px;border-radius:6px;border:1px solid #fde68a;">${itemOrders} đơn 🔍</span>
                            </td>
                            <td style="text-align:center;font-weight:800;color:#16a34a;padding:10px 12px;">${formatVND(itemRevenue)}</td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleCostRatio}" title="${titleCostRatio}">${itemCostRatioStr}</span></td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleCloseRate}" title="${titleCloseRate}">${itemCloseRateStr}</span></td>
                            <td style="text-align:center;padding:8px;"><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleCpo}" title="${titleCpo}">${itemCpoStr}</span></td>
                            <td style="text-align:center;font-weight:800;color:#0284c7;padding:10px 12px;">${itemLeads}</td>
                        </tr>
                    `;
                }
            });
        }

        if (totSpent === 0 && h.actual && h.actual.spent > 0) totSpent = Number(h.actual.spent);
        if (totLeads === 0 && h.actual && h.actual.leads > 0) totLeads = Number(h.actual.leads);
        if (totOrders === 0 && h.actual && h.actual.orders > 0) totOrders = Number(h.actual.orders);
        if (totRevenue === 0 && h.actual && h.actual.revenue > 0) totRevenue = Number(h.actual.revenue);

        const totCpl = totLeads > 0 ? Math.round(totSpent / totLeads) : 0;
        const totCpo = totOrders > 0 ? Math.round(totSpent / totOrders) : 0;
        const totCostRatio = totRevenue > 0 ? (totSpent / totRevenue * 100).toFixed(2) : '0.00';
        const totCloseRate = totLeads > 0 ? (totOrders / totLeads * 100).toFixed(2) : '0.00';

        const totCplStr = formatVND(totCpl);
        const totCostRatioStr = `${totCostRatio}%`;
        const totCpoStr = totCpo > 0 ? formatVND(totCpo) : '0đ';
        const totCloseRateStr = `${totCloseRate}%`;

        const titleTotCostRatio = `${formatVND(totSpent)} Chi phí MKT / ${formatVND(totRevenue)} Doanh số = ${totCostRatioStr}`;
        const titleTotCloseRate = `${totOrders} Đơn / ${totLeads} Tin Nhắn = ${totCloseRateStr}`;
        const titleTotCpo = `${formatVND(totSpent)} Chi phí MKT / ${totOrders} Đơn = ${totCpoStr}`;
        const titleTotCpl = `${formatVND(totSpent)} Chi phí MKT / ${totLeads} Tin Nhắn = ${totCplStr}`;

        // Employee Summary Row
        html += `
            <tr class="employee-block-header-row" style="background:#fef3c7 !important;color:#78350f !important;font-weight:900 !important;font-size:12.5px !important;">
                <td style="text-align:left;font-weight:900;color:#78350f;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;border-left:2.5px solid #d97706 !important;border-top-left-radius:10px !important;border-bottom-left-radius:10px !important;" colspan="1">
                    <span style="font-size:13px;color:#78350f;">🌟 TỔNG SỐ LIỆU</span>
                </td>
                <td style="text-align:right;font-weight:900;color:#e11d48;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;">${formatVND(totSpent)}</td>
                <td style="text-align:center;font-weight:900;color:#d97706;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;">${totOrders} đơn</td>
                <td style="text-align:center;font-weight:900;color:#16a34a;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;">${formatVND(totRevenue)}</td>
                <td style="text-align:center;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;"><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleTotCostRatio}" title="${titleTotCostRatio}">${totCostRatioStr}</span></td>
                <td style="text-align:center;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;"><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleTotCloseRate}" title="${titleTotCloseRate}">${totCloseRateStr}</span></td>
                <td style="text-align:center;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;"><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleTotCpo}" title="${titleTotCpo}">${totCpoStr}</span></td>
                <td style="text-align:center;font-weight:900;color:#0284c7;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;">${totLeads}</td>
                <td style="text-align:center;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-bottom:2.5px solid #d97706 !important;border-right:2.5px solid #d97706 !important;border-top-right-radius:10px !important;border-bottom-right-radius:10px !important;"><span class="kpi-pill kpi-pill-blue" data-tooltip="${titleTotCpl}" title="${titleTotCpl}">${totCplStr}</span></td>
            </tr>
        `;

        // Retrieve overall handler target metrics
        const tObj = h.targets || h;
        const targetBudget = Number(h.target_budget || tObj.target_budget || 0);
        const targetRevM1 = Number(h.target_revenue_m1 || tObj.target_revenue_m1 || tObj.target_revenue || 0);
        const targetRevM120 = Number(h.target_revenue_m120 || tObj.target_revenue_m120 || (targetRevM1 > 0 ? Math.round(targetRevM1 * 1.2) : 0));
        const targetLeadsM1 = Number(h.target_leads_m1 || tObj.target_leads_m1 || tObj.target_leads || 0);
        const targetLeadsM120 = Number(h.target_leads_m120 || tObj.target_leads_m120 || (targetLeadsM1 > 0 ? Math.round(targetLeadsM1 * 1.2) : 0));
        const targetCostRatio = Number(h.target_cost_ratio || tObj.target_cost_ratio || 0);
        const targetCloseRate = Number(h.target_close_rate || tObj.target_close_rate || 0);
        const targetCpo = Number(h.target_cpo || tObj.target_cpo || 0);
        const targetCpl = Number(h.target_cpl || tObj.target_cpl || 0);
        const targetBonusM1 = Number(h.target_bonus_m1 || tObj.target_bonus_m1 || 0);
        const targetBonusM120 = Number(h.target_bonus_m120 || tObj.target_bonus_m120 || 0);
        const targetBonusNote = h.target_bonus_note || tObj.target_bonus_note || '';

        let condsList = h.target_bonus_conditions || tObj.target_bonus_conditions || [];
        if (typeof condsList === 'string') {
            try { condsList = JSON.parse(condsList); } catch(e) { condsList = []; }
        }
        if (!Array.isArray(condsList)) condsList = [];

        const condLabelsMap = {
            'revenue': 'Doanh Số',
            'leads': 'Số Lead',
            'cost_ratio': '% CP/Doanh Số',
            'close_rate': 'Tỷ Lệ Chốt',
            'cpo': 'CPO(Giá/Đơn)',
            'cpl': 'CPL (Giá/Lead)'
        };

        const selectedCondLabels = condsList.map(c => condLabelsMap[c] || c).filter(Boolean);
        const condsText = selectedCondLabels.length > 0 ? selectedCondLabels.join(' - ') : 'Chưa chọn';
        const bonusLogic = (h.target_bonus_logic || tObj.target_bonus_logic || 'ALL').toUpperCase();
        const logicBadgeText = bonusLogic === 'ANY' ? 'Đạt BẤT KỲ tiêu chí nào' : 'Đạt TẤT CẢ tiêu chí';

        // Mốc 1 Values
        const targetOrdersM1 = Number(tObj.target_orders_m1 || tObj.target_orders || (targetLeadsM1 > 0 && targetCloseRate > 0 ? Math.round(targetLeadsM1 * targetCloseRate / 100) : (targetRevM1 > 0 && targetCpo > 0 ? Math.round(targetRevM1 / targetCpo) : 0)));
        const targetOrdersM120 = Number(tObj.target_orders_m120 || (targetOrdersM1 > 0 ? Math.round(targetOrdersM1 * 1.2) : 0));

        const m1SpentStr = targetBudget > 0 ? formatVND(targetBudget) : '-';
        const m1RevStr = targetRevM1 > 0 ? formatVND(targetRevM1) : '-';
        const m1OrdersStr = targetOrdersM1 > 0 ? `${targetOrdersM1.toLocaleString('vi-VN')} đơn` : '-';
        const m1LeadsStr = targetLeadsM1 > 0 ? targetLeadsM1.toLocaleString('vi-VN') : '-';
        const m1CostRatioStr = targetCostRatio > 0 ? `${targetCostRatio.toFixed(2)}%` : (targetRevM1 > 0 && targetBudget > 0 ? `${((targetBudget / targetRevM1) * 100).toFixed(2)}%` : '-');
        const m1CloseRateStr = targetCloseRate > 0 ? `${targetCloseRate.toFixed(2)}%` : '-';
        const m1CpoStr = targetCpo > 0 ? formatVND(targetCpo) : '-';
        const m1CplStr = targetCpl > 0 ? formatVND(targetCpl) : '-';

        // Numerical actuals for ratio metrics
        const totCostRatioNum = totRevenue > 0 ? (totSpent / totRevenue * 100) : 0;
        const totCloseRateNum = totLeads > 0 ? (totOrders / totLeads * 100) : 0;
        const totCpoNum = totOrders > 0 ? Math.round(totSpent / totOrders) : 0;
        const totCplNum = totLeads > 0 ? Math.round(totSpent / totLeads) : 0;

        const targetCostRatioVal = targetCostRatio > 0 ? targetCostRatio : (targetRevM1 > 0 && targetBudget > 0 ? ((targetBudget / targetRevM1) * 100) : 0);

        // Mốc 1 - Còn Thiếu
        const m1MissingSpent = targetBudget > 0 ? (totSpent - targetBudget) : 0;
        const m1MissingRev = targetRevM1 > 0 ? (totRevenue - targetRevM1) : 0;
        const m1MissingOrders = targetOrdersM1 > 0 ? (totOrders - targetOrdersM1) : 0;
        const m1MissingLeads = targetLeadsM1 > 0 ? (totLeads - targetLeadsM1) : 0;

        const m1MissingSpentStr = targetBudget > 0 ? (m1MissingSpent >= 0 ? `+${formatVND(m1MissingSpent)}` : formatVND(m1MissingSpent)) : '-';
        const m1MissingRevStr = targetRevM1 > 0 ? (m1MissingRev >= 0 ? `+${formatVND(m1MissingRev)}` : formatVND(m1MissingRev)) : '-';
        const m1MissingOrdersStr = targetOrdersM1 > 0 ? (m1MissingOrders >= 0 ? `+${m1MissingOrders} đơn` : `${m1MissingOrders} đơn`) : '-';
        const m1MissingLeadsStr = targetLeadsM1 > 0 ? (m1MissingLeads >= 0 ? `+${m1MissingLeads}` : String(m1MissingLeads)) : '-';

        const m1MissingCostRatio = (targetCostRatioVal > 0 && totCostRatioNum > 0) ? (totCostRatioNum - targetCostRatioVal) : null;
        const m1MissingCostRatioStr = m1MissingCostRatio !== null ? (m1MissingCostRatio >= 0 ? `+${m1MissingCostRatio.toFixed(2)}%` : `${m1MissingCostRatio.toFixed(2)}%`) : '-';

        const m1MissingCloseRate = (targetCloseRate > 0 && totCloseRateNum > 0) ? (totCloseRateNum - targetCloseRate) : null;
        const m1MissingCloseRateStr = m1MissingCloseRate !== null ? (m1MissingCloseRate >= 0 ? `+${m1MissingCloseRate.toFixed(2)}%` : `${m1MissingCloseRate.toFixed(2)}%`) : '-';

        const m1MissingCpo = (targetCpo > 0 && totCpoNum > 0) ? (totCpoNum - targetCpo) : null;
        const m1MissingCpoStr = m1MissingCpo !== null ? (m1MissingCpo >= 0 ? `+${formatVND(m1MissingCpo)}` : formatVND(m1MissingCpo)) : '-';

        const m1MissingCpl = (targetCpl > 0 && totCplNum > 0) ? (totCplNum - targetCpl) : null;
        const m1MissingCplStr = m1MissingCpl !== null ? (m1MissingCpl >= 0 ? `+${formatVND(m1MissingCpl)}` : formatVND(m1MissingCpl)) : '-';

        // Mốc 1 - Tỉ Lệ Hoàn Thành
        const m1SpentPctStr = targetBudget > 0 ? `${((totSpent / targetBudget) * 100).toFixed(2)}%` : '-';
        const m1RevPctStr = targetRevM1 > 0 ? `${((totRevenue / targetRevM1) * 100).toFixed(2)}%` : '-';
        const m1OrdersPctStr = targetOrdersM1 > 0 ? `${((totOrders / targetOrdersM1) * 100).toFixed(2)}%` : '-';
        const m1LeadsPctStr = targetLeadsM1 > 0 ? `${((totLeads / targetLeadsM1) * 100).toFixed(2)}%` : '-';

        const m1CostRatioPctStr = (targetCostRatioVal > 0 && totCostRatioNum > 0) ? `${((targetCostRatioVal / totCostRatioNum) * 100).toFixed(2)}%` : '-';
        const m1CloseRatePctStr = (targetCloseRate > 0 && totCloseRateNum > 0) ? `${((totCloseRateNum / targetCloseRate) * 100).toFixed(2)}%` : '-';
        const m1CpoPctStr = (targetCpo > 0 && totCpoNum > 0) ? `${((targetCpo / totCpoNum) * 100).toFixed(2)}%` : '-';
        const m1CplPctStr = (targetCpl > 0 && totCplNum > 0) ? `${((targetCpl / totCplNum) * 100).toFixed(2)}%` : '-';

        // Mốc 2 Values
        const m2SpentStr = targetBudget > 0 ? formatVND(targetBudget) : '-';
        const m2RevStr = targetRevM120 > 0 ? formatVND(targetRevM120) : '-';
        const m2OrdersStr = targetOrdersM120 > 0 ? `${targetOrdersM120.toLocaleString('vi-VN')} đơn` : '-';
        const m2LeadsStr = targetLeadsM120 > 0 ? targetLeadsM120.toLocaleString('vi-VN') : '-';
        
        const m2CostRatioVal = targetCostRatio > 0 ? (targetCostRatio / 1.2) : (targetRevM120 > 0 && targetBudget > 0 ? ((targetBudget / targetRevM120) * 100) : 0);
        const m2CostRatioStr = m2CostRatioVal > 0 ? `${m2CostRatioVal.toFixed(2)}%` : '-';
        
        const m2CloseRateVal = targetCloseRate > 0 ? (targetCloseRate * 1.2) : 0;
        const m2CloseRateStr = m2CloseRateVal > 0 ? `${m2CloseRateVal.toFixed(2)}%` : '-';
        
        const m2CpoVal = targetCpo > 0 ? Math.round(targetCpo / 1.2) : 0;
        const m2CpoStr = m2CpoVal > 0 ? formatVND(m2CpoVal) : '-';
        
        const m2CplVal = targetCpl > 0 ? Math.round(targetCpl / 1.2) : (targetBudget > 0 && targetLeadsM120 > 0 ? Math.round(targetBudget / targetLeadsM120) : 0);
        const m2CplStr = m2CplVal > 0 ? formatVND(m2CplVal) : '-';

        // Mốc 2 - Còn Thiếu
        const m2MissingSpent = targetBudget > 0 ? (totSpent - targetBudget) : 0;
        const m2MissingRev = targetRevM120 > 0 ? (totRevenue - targetRevM120) : 0;
        const m2MissingOrders = targetOrdersM120 > 0 ? (totOrders - targetOrdersM120) : 0;
        const m2MissingLeads = targetLeadsM120 > 0 ? (totLeads - targetLeadsM120) : 0;

        const m2MissingSpentStr = targetBudget > 0 ? (m2MissingSpent >= 0 ? `+${formatVND(m2MissingSpent)}` : formatVND(m2MissingSpent)) : '-';
        const m2MissingRevStr = targetRevM120 > 0 ? (m2MissingRev >= 0 ? `+${formatVND(m2MissingRev)}` : formatVND(m2MissingRev)) : '-';
        const m2MissingOrdersStr = targetOrdersM120 > 0 ? (m2MissingOrders >= 0 ? `+${m2MissingOrders} đơn` : `${m2MissingOrders} đơn`) : '-';
        const m2MissingLeadsStr = targetLeadsM120 > 0 ? (m2MissingLeads >= 0 ? `+${m2MissingLeads}` : String(m2MissingLeads)) : '-';

        const m2MissingCostRatio = (m2CostRatioVal > 0 && totCostRatioNum > 0) ? (totCostRatioNum - m2CostRatioVal) : null;
        const m2MissingCostRatioStr = m2MissingCostRatio !== null ? (m2MissingCostRatio >= 0 ? `+${m2MissingCostRatio.toFixed(2)}%` : `${m2MissingCostRatio.toFixed(2)}%`) : '-';

        const m2MissingCloseRate = (m2CloseRateVal > 0 && totCloseRateNum > 0) ? (totCloseRateNum - m2CloseRateVal) : null;
        const m2MissingCloseRateStr = m2MissingCloseRate !== null ? (m2MissingCloseRate >= 0 ? `+${m2MissingCloseRate.toFixed(2)}%` : `${m2MissingCloseRate.toFixed(2)}%`) : '-';

        const m2MissingCpo = (m2CpoVal > 0 && totCpoNum > 0) ? (totCpoNum - m2CpoVal) : null;
        const m2MissingCpoStr = m2MissingCpo !== null ? (m2MissingCpo >= 0 ? `+${formatVND(m2MissingCpo)}` : formatVND(m2MissingCpo)) : '-';

        const m2MissingCpl = (m2CplVal > 0 && totCplNum > 0) ? (totCplNum - m2CplVal) : null;
        const m2MissingCplStr = m2MissingCpl !== null ? (m2MissingCpl >= 0 ? `+${formatVND(m2MissingCpl)}` : formatVND(m2MissingCpl)) : '-';

        // Mốc 2 - Tỉ Lệ Hoàn Thành
        const m2SpentPctStr = targetBudget > 0 ? `${((totSpent / targetBudget) * 100).toFixed(2)}%` : '-';
        const m2RevPctStr = targetRevM120 > 0 ? `${((totRevenue / targetRevM120) * 100).toFixed(2)}%` : '-';
        const m2OrdersPctStr = targetOrdersM120 > 0 ? `${((totOrders / targetOrdersM120) * 100).toFixed(2)}%` : '-';
        const m2LeadsPctStr = targetLeadsM120 > 0 ? `${((totLeads / targetLeadsM120) * 100).toFixed(2)}%` : '-';

        const m2CostRatioPctStr = (m2CostRatioVal > 0 && totCostRatioNum > 0) ? `${((m2CostRatioVal / totCostRatioNum) * 100).toFixed(2)}%` : '-';
        const m2CloseRatePctStr = (m2CloseRateVal > 0 && totCloseRateNum > 0) ? `${((totCloseRateNum / m2CloseRateVal) * 100).toFixed(2)}%` : '-';
        const m2CpoPctStr = (m2CpoVal > 0 && totCpoNum > 0) ? `${((m2CpoVal / totCpoNum) * 100).toFixed(2)}%` : '-';
        const m2CplPctStr = (m2CplVal > 0 && totCplNum > 0) ? `${((m2CplVal / totCplNum) * 100).toFixed(2)}%` : '-';

        // -------------------------------------------------------------
        // EVALUATE IF MỐC 1 AND MỐC 2 ARE ACHIEVED (REAL-TIME STATUS)
        // -------------------------------------------------------------
        let m1Achieved = false;
        let m2Achieved = false;

        const checkCond = (condKey, isM2 = false) => {
            if (condKey === 'revenue') {
                const target = isM2 ? targetRevM120 : targetRevM1;
                return target > 0 && totRevenue >= target;
            }
            if (condKey === 'leads') {
                const target = isM2 ? targetLeadsM120 : targetLeadsM1;
                return target > 0 && totLeads >= target;
            }
            if (condKey === 'cost_ratio') {
                const target = isM2 ? m2CostRatioVal : targetCostRatio;
                const actualCR = totRevenue > 0 ? (totSpent / totRevenue * 100) : 0;
                return target > 0 && actualCR > 0 && actualCR <= target;
            }
            if (condKey === 'close_rate') {
                const target = isM2 ? m2CloseRateVal : targetCloseRate;
                const actualCR = totLeads > 0 ? (totOrders / totLeads * 100) : 0;
                return target > 0 && actualCR >= target;
            }
            if (condKey === 'cpo') {
                const target = isM2 ? m2CpoVal : targetCpo;
                const actualCpo = totOrders > 0 ? Math.round(totSpent / totOrders) : 0;
                return target > 0 && actualCpo > 0 && actualCpo <= target;
            }
            if (condKey === 'cpl') {
                const target = isM2 ? m2CplVal : targetCpl;
                const actualCpl = totLeads > 0 ? Math.round(totSpent / totLeads) : 0;
                return target > 0 && actualCpl > 0 && actualCpl <= target;
            }
            return false;
        };

        if (condsList.length > 0) {
            if (bonusLogic === 'ANY') {
                m1Achieved = condsList.some(c => checkCond(c, false));
                m2Achieved = condsList.some(c => checkCond(c, true));
            } else {
                m1Achieved = condsList.every(c => checkCond(c, false));
                m2Achieved = condsList.every(c => checkCond(c, true));
            }
        } else {
            m1Achieved = (targetRevM1 > 0 && totRevenue >= targetRevM1) || (targetLeadsM1 > 0 && totLeads >= targetLeadsM1);
            m2Achieved = (targetRevM120 > 0 && totRevenue >= targetRevM120) || (targetLeadsM120 > 0 && totLeads >= targetLeadsM120);
        }

        const m1Badge = m1Achieved
            ? `<span style="background:#dcfce7;color:#15803d;border:1.5px solid #86efac;padding:2px 8px;border-radius:20px;font-weight:800;font-size:11px;margin-left:8px;box-shadow:0 1px 3px rgba(21,128,61,0.15);">✅ ĐÃ ĐẠT MỐC 1</span>`
            : `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:2px 7px;border-radius:20px;font-weight:700;font-size:10.5px;margin-left:8px;">⏳ CHƯA ĐẠT</span>`;

        const m2Badge = m2Achieved
            ? `<span style="background:#fef3c7;color:#b45309;border:1.5px solid #fde68a;padding:2px 8px;border-radius:20px;font-weight:800;font-size:11px;margin-left:8px;box-shadow:0 1px 3px rgba(180,83,9,0.15);">🎉 ĐÃ ĐẠT MỐC 2 (120%)</span>`
            : `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:2px 7px;border-radius:20px;font-weight:700;font-size:10.5px;margin-left:8px;">⏳ CHƯA ĐẠT</span>`;

        const makePillRose = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''} style="background:#ccfbf1;color:#134e4a;border:1.5px solid #5eead4;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(19,78,74,0.08);">${escapeHtml(str)}</span>`;
        const makePillGreen = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''} style="background:#dcfce7;color:#14532d;border:1.5px solid #86efac;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(20,83,45,0.08);">${escapeHtml(str)}</span>`;
        const makePillBlue = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''} style="background:#e0f2fe;color:#075985;border:1.5px solid #7dd3fc;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(7,89,133,0.08);">${escapeHtml(str)}</span>`;
        const makePillPct = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''} style="background:#e0e7ff;color:#3730a3;border:1.5px solid #818cf8;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(55,48,163,0.08);">${escapeHtml(str)}</span>`;
        const makePillPurple = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill kpi-pill-purple" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''}>${escapeHtml(str)}</span>`;
        const makePillCyan = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill kpi-pill-cyan" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''}>${escapeHtml(str)}</span>`;
        const makePillOrange = (str, tt = '') => (!str || str === '-') ? '-' : `<span class="kpi-pill kpi-pill-orange" ${tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : ''}>${escapeHtml(str)}</span>`;

        const formatNegativeCell = (str, pillType = 'rose', tt = '') => {
            if (!str || str === '-') return '-';
            const ttAttr = tt ? `data-tooltip="${escapeHtml(tt)}" title="${escapeHtml(tt)}"` : '';
            if (typeof str === 'string' && str.startsWith('-')) {
                return `<span class="kpi-pill" ${ttAttr} style="background:#fff1f2;color:#7f1d1d;border:1.5px solid #fca5a5;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(127,29,29,0.08);">${escapeHtml(str)}</span>`;
            }
            if (typeof str === 'string' && str.startsWith('+')) {
                return `<span class="kpi-pill" ${ttAttr} style="background:#fef3c7;color:#78350f;border:1.5px solid #f59e0b;padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;font-size:12px;box-shadow:0 1px 2px rgba(120,53,15,0.08);">${escapeHtml(str)}</span>`;
            }
            if (pillType === 'green') return makePillGreen(str, tt);
            if (pillType === 'blue') return makePillBlue(str, tt);
            if (pillType === 'purple') return makePillPurple(str, tt);
            if (pillType === 'cyan') return makePillCyan(str, tt);
            if (pillType === 'orange') return makePillOrange(str, tt);
            return makePillRose(str, tt);
        };

        // Tooltip detail calculation strings for Mốc 1 & Mốc 2
        const ttM1SpentTarget = `Target Chi phí MKT Mốc 1: ${m1SpentStr}`;
        const ttM1SpentDiff = `${formatVND(totSpent)} Chi phí - ${m1SpentStr} Target = ${m1MissingSpentStr}`;
        const ttM1SpentPct = `${formatVND(totSpent)} Chi phí / ${m1SpentStr} Target = ${m1SpentPctStr}`;

        const ttM1RevTarget = `Target Doanh số Mốc 1: ${m1RevStr}`;
        const ttM1RevDiff = `${formatVND(totRevenue)} - ${m1RevStr} = ${m1MissingRevStr}`;
        const ttM1RevPct = `${formatVND(totRevenue)} / ${m1RevStr} = ${m1RevPctStr}`;

        const ttM1OrdersTarget = `Target Đơn hàng Mốc 1: ${m1OrdersStr}`;
        const ttM1OrdersDiff = `${totOrders} đơn - ${m1OrdersStr} = ${m1MissingOrdersStr}`;
        const ttM1OrdersPct = `${totOrders} đơn / ${m1OrdersStr} = ${m1OrdersPctStr}`;

        const ttM1CostRatioTarget = `Target % CP/Doanh số Mốc 1: ${m1CostRatioStr}`;
        const ttM1CostRatioDiff = `Thực tế (${totCostRatioStr}) - Target (${m1CostRatioStr}) = ${m1MissingCostRatioStr}`;
        const ttM1CostRatioPct = `Target % CP (${m1CostRatioStr}) / Thực tế (${totCostRatioStr}) = ${m1CostRatioPctStr} (Chi phí càng thấp càng tốt)`;

        const ttM1CloseRateTarget = `Target Tỷ lệ chốt Mốc 1: ${m1CloseRateStr}`;
        const ttM1CloseRateDiff = `Thực tế (${totCloseRateStr}) - Target (${m1CloseRateStr}) = ${m1MissingCloseRateStr}`;
        const ttM1CloseRatePct = `Thực tế (${totCloseRateStr}) / Target (${m1CloseRateStr}) = ${m1CloseRatePctStr}`;

        const ttM1CpoTarget = `Target CPO Mốc 1: ${m1CpoStr}`;
        const ttM1CpoDiff = `Thực tế (${totCpoStr}) - Target (${m1CpoStr}) = ${m1MissingCpoStr}`;
        const ttM1CpoPct = `Target CPO (${m1CpoStr}) / Thực tế (${totCpoStr}) = ${m1CpoPctStr} (CPO càng thấp càng tốt)`;

        const ttM1LeadsTarget = `Target Số lead Mốc 1: ${m1LeadsStr}`;
        const ttM1LeadsDiff = `${totLeads} lead - ${m1LeadsStr} lead = ${m1MissingLeadsStr}`;
        const ttM1LeadsPct = `${totLeads} lead / ${m1LeadsStr} lead = ${m1LeadsPctStr}`;

        const ttM1CplTarget = `Target CPL Mốc 1: ${m1CplStr}`;
        const ttM1CplDiff = `Thực tế (${totCplStr}) - Target (${m1CplStr}) = ${m1MissingCplStr}`;
        const ttM1CplPct = `Target CPL (${m1CplStr}) / Thực tế (${totCplStr}) = ${m1CplPctStr} (CPL càng thấp càng tốt)`;

        // Mốc 2 Tooltip detail calculation strings
        const ttM2RevTarget = `Target Doanh số Mốc 2 (120%): ${m2RevStr}`;
        const ttM2RevDiff = `${formatVND(totRevenue)} - ${m2RevStr} = ${m2MissingRevStr}`;
        const ttM2RevPct = `${formatVND(totRevenue)} / ${m2RevStr} = ${m2RevPctStr}`;

        const ttM2OrdersTarget = `Target Đơn hàng Mốc 2 (120%): ${m2OrdersStr}`;
        const ttM2OrdersDiff = `${totOrders} đơn - ${m2OrdersStr} = ${m2MissingOrdersStr}`;
        const ttM2OrdersPct = `${totOrders} đơn / ${m2OrdersStr} = ${m2OrdersPctStr}`;

        const ttM2CostRatioTarget = `Target % CP/Doanh số Mốc 2 (120%): ${m2CostRatioStr}`;
        const ttM2CostRatioDiff = `Thực tế (${totCostRatioStr}) - Target (${m2CostRatioStr}) = ${m2MissingCostRatioStr}`;
        const ttM2CostRatioPct = `Target % CP (${m2CostRatioStr}) / Thực tế (${totCostRatioStr}) = ${m2CostRatioPctStr} (Chi phí càng thấp càng tốt)`;

        const ttM2CloseRateTarget = `Target Tỷ lệ chốt Mốc 2 (120%): ${m2CloseRateStr}`;
        const ttM2CloseRateDiff = `Thực tế (${totCloseRateStr}) - Target (${m2CloseRateStr}) = ${m2MissingCloseRateStr}`;
        const ttM2CloseRatePct = `Thực tế (${totCloseRateStr}) / Target (${m2CloseRateStr}) = ${m2CloseRatePctStr}`;

        const ttM2CpoTarget = `Target CPO Mốc 2 (120%): ${m2CpoStr}`;
        const ttM2CpoDiff = `Thực tế (${totCpoStr}) - Target (${m2CpoStr}) = ${m2MissingCpoStr}`;
        const ttM2CpoPct = `Target CPO (${m2CpoStr}) / Thực tế (${totCpoStr}) = ${m2CpoPctStr} (CPO càng thấp càng tốt)`;

        const ttM2LeadsTarget = `Target Số lead Mốc 2 (120%): ${m2LeadsStr}`;
        const ttM2LeadsDiff = `${totLeads} lead - ${m2LeadsStr} lead = ${m2MissingLeadsStr}`;
        const ttM2LeadsPct = `${totLeads} lead / ${m2LeadsStr} lead = ${m2LeadsPctStr}`;

        const ttM2CplTarget = `Target CPL Mốc 2 (120%): ${m2CplStr}`;
        const ttM2CplDiff = `Thực tế (${totCplStr}) - Target (${m2CplStr}) = ${m2MissingCplStr}`;
        const ttM2CplPct = `Target CPL (${m2CplStr}) / Thực tế (${totCplStr}) = ${m2CplPctStr} (CPL càng thấp càng tốt)`;

        // Mốc 1 - 100% KPI (Executive Mint Styling) with Merged Shared Chi Phí MKT (rowspan=6)
        html += `
            <tr style="background:#f0fdf4 !important;border-bottom:1px solid #dcfce7;">
                <td style="text-align:left;font-weight:800;color:#065f46;padding:10px 12px;" colspan="1">
                    <span style="margin-left:8px">🚩 Mốc 1 - 100% KPI</span>
                    ${m1Badge}
                </td>
                <td rowspan="6" style="vertical-align:middle;text-align:center;padding:6px;background:#ffffff;border-right:1.5px solid #cbd5e1;border-bottom:1.5px solid #cbd5e1;height:100%;">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-around;height:100%;min-height:250px;padding:22px 8px;background:#f8fafc;border:1.5px solid #0d9488;border-radius:14px;box-shadow:0 2px 8px rgba(13,148,136,0.08);box-sizing:border-box;">
                        <div style="font-size:10.5px;font-weight:900;color:#0d9488;background:#ccfbf1;padding:5px 12px;border-radius:10px;border:1px solid #5eead4;letter-spacing:0.3px;white-space:nowrap;">
                            📌 CHUNG MỐC 1 & 2
                        </div>
                        <div style="text-align:center;margin:6px 0;">
                            ${makePillRose(m1SpentStr, ttM1SpentTarget)}
                        </div>
                        <div style="text-align:center;margin:6px 0;">
                            ${formatNegativeCell(m1MissingSpentStr, 'rose', ttM1SpentDiff)}
                        </div>
                        <div style="text-align:center;margin:6px 0;">
                            ${makePillPct(m1SpentPctStr, ttM1SpentPct)}
                        </div>
                    </div>
                </td>
                <td style="text-align:center;font-weight:700;color:#d97706;padding:10px 12px;">${makePillOrange(m1OrdersStr, ttM1OrdersTarget)}</td>
                <td style="text-align:center;padding:10px 12px;">${makePillGreen(m1RevStr, ttM1RevTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillPurple(m1CostRatioStr, ttM1CostRatioTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillCyan(m1CloseRateStr, ttM1CloseRateTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillOrange(m1CpoStr, ttM1CpoTarget)}</td>
                <td style="text-align:center;padding:10px 12px;">${makePillBlue(m1LeadsStr, ttM1LeadsTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillBlue(m1CplStr, ttM1CplTarget)}</td>
            </tr>
            <tr style="background:#f0fdf4 !important;border-bottom:1px solid #dcfce7;">
                <td style="text-align:left;font-weight:800;color:#047857;padding:8px 12px;" colspan="1"><span style="margin-left:20px;font-size:12px;">🔻 Mốc 1 - Còn Thiếu</span></td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m1MissingOrdersStr, 'gold', ttM1OrdersDiff)}</td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m1MissingRevStr, 'green', ttM1RevDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m1MissingCostRatioStr, 'purple', ttM1CostRatioDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m1MissingCloseRateStr, 'cyan', ttM1CloseRateDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m1MissingCpoStr, 'orange', ttM1CpoDiff)}</td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m1MissingLeadsStr, 'blue', ttM1LeadsDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m1MissingCplStr, 'blue', ttM1CplDiff)}</td>
            </tr>
            <tr style="background:#f0fdf4 !important;border-bottom:2.5px solid #059669 !important;">
                <td style="text-align:left;font-weight:800;color:#065f46;padding:8px 12px;border-bottom:2.5px solid #059669 !important;" colspan="1"><span style="margin-left:20px;font-size:12px;">📊 Mốc 1 - Tỉ Lệ Hoàn Thành</span></td>
                <td style="text-align:center;padding:8px 12px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1OrdersPctStr, ttM1OrdersPct)}</td>
                <td style="text-align:center;padding:8px 12px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1RevPctStr, ttM1RevPct)}</td>
                <td style="text-align:center;padding:8px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1CostRatioPctStr, ttM1CostRatioPct)}</td>
                <td style="text-align:center;padding:8px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1CloseRatePctStr, ttM1CloseRatePct)}</td>
                <td style="text-align:center;padding:8px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1CpoPctStr, ttM1CpoPct)}</td>
                <td style="text-align:center;padding:8px 12px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1LeadsPctStr, ttM1LeadsPct)}</td>
                <td style="text-align:center;padding:8px;border-bottom:2.5px solid #059669 !important;">${makePillPct(m1CplPctStr, ttM1CplPct)}</td>
            </tr>
            <!-- Mốc 2 - 120% (Executive Ice Blue Styling) -->
            <tr style="background:#f0f9ff !important;border-bottom:1px solid #e0f2fe;">
                <td style="text-align:left;font-weight:800;color:#1e40af;padding:10px 12px;" colspan="1">
                    <span style="margin-left:8px">🏆 Mốc 2 - 120%</span>
                    ${m2Badge}
                </td>
                <td style="text-align:center;font-weight:700;color:#d97706;padding:10px 12px;">${makePillOrange(m2OrdersStr, ttM2OrdersTarget)}</td>
                <td style="text-align:center;padding:10px 12px;">${makePillGreen(m2RevStr, ttM2RevTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillPurple(m2CostRatioStr, ttM2CostRatioTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillCyan(m2CloseRateStr, ttM2CloseRateTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillOrange(m2CpoStr, ttM2CpoTarget)}</td>
                <td style="text-align:center;padding:10px 12px;">${makePillBlue(m2LeadsStr, ttM2LeadsTarget)}</td>
                <td style="text-align:center;padding:10px 8px;">${makePillBlue(m2CplStr, ttM2CplTarget)}</td>
            </tr>
            <tr style="background:#f0f9ff !important;border-bottom:1px solid #e0f2fe;">
                <td style="text-align:left;font-weight:800;color:#1d4ed8;padding:8px 12px;" colspan="1"><span style="margin-left:20px;font-size:12px;">🔻 Mốc 2 - Còn Thiếu</span></td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m2MissingOrdersStr, 'gold', ttM2OrdersDiff)}</td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m2MissingRevStr, 'green', ttM2RevDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m2MissingCostRatioStr, 'purple', ttM2CostRatioDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m2MissingCloseRateStr, 'cyan', ttM2CloseRateDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m2MissingCpoStr, 'orange', ttM2CpoDiff)}</td>
                <td style="text-align:center;padding:8px 12px;">${formatNegativeCell(m2MissingLeadsStr, 'blue', ttM2LeadsDiff)}</td>
                <td style="text-align:center;padding:8px;">${formatNegativeCell(m2MissingCplStr, 'blue', ttM2CplDiff)}</td>
            </tr>
            <tr style="background:#f0f9ff !important;border-bottom:1.5px solid #bae6fd;">
                <td style="text-align:left;font-weight:800;color:#1e40af;padding:8px 12px;" colspan="1"><span style="margin-left:20px;font-size:12px;">📊 Mốc 2 - Tỉ Lệ Hoàn Thành</span></td>
                <td style="text-align:center;padding:8px 12px;">${makePillPct(m2OrdersPctStr, ttM2OrdersPct)}</td>
                <td style="text-align:center;padding:8px 12px;">${makePillPct(m2RevPctStr, ttM2RevPct)}</td>
                <td style="text-align:center;padding:8px;">${makePillPct(m2CostRatioPctStr, ttM2CostRatioPct)}</td>
                <td style="text-align:center;padding:8px;">${makePillPct(m2CloseRatePctStr, ttM2CloseRatePct)}</td>
                <td style="text-align:center;padding:8px;">${makePillPct(m2CpoPctStr, ttM2CpoPct)}</td>
                <td style="text-align:center;padding:8px 12px;">${makePillPct(m2LeadsPctStr, ttM2LeadsPct)}</td>
                <td style="text-align:center;padding:8px;">${makePillPct(m2CplPctStr, ttM2CplPct)}</td>
            </tr>
        `;

        // Row 7: 🎁 LƯƠNG THƯỞNG KPI (Executive Warm Gold matching Image 3 with 4-corner rounded borders)
        html += `
            <tr style="background:#fef3c7 !important;font-size:12.5px;">
                <td style="text-align:left;font-weight:900;color:#78350f;padding:12px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-left:2.5px solid #d97706 !important;border-top-left-radius:10px !important;border-bottom-left-radius:10px !important;" colspan="1"><span style="margin-left:8px">🎁 LƯƠNG THƯỞNG KPI</span></td>
                <td colspan="8" style="text-align:left;padding:12px 16px;background:#fef3c7 !important;border-top:2.5px solid #d97706 !important;border-right:2.5px solid #d97706 !important;border-top-right-radius:10px !important;border-bottom-right-radius:10px !important;">
                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#78350f;font-size:13px;font-weight:800;">
                        <span style="${m1Achieved && targetBonusM1 > 0 ? 'background:#dcfce7;color:#14532d;border:2px solid #22c55e;box-shadow:0 0 6px rgba(34,197,94,0.3);' : 'background:#fffbeb;color:#78350f;border:1.5px solid #f59e0b;'}padding:4px 10px;border-radius:8px;">🎁 <strong>Thưởng Mốc 1 (100%):</strong> ${targetBonusM1 > 0 ? `+${formatVND(targetBonusM1)}` : 'Chưa cài'} ${m1Achieved ? '✅ (Đạt)' : '⏳ (Chưa Đạt)'}</span>
                        <span style="${m2Achieved && targetBonusM120 > 0 ? 'background:#dcfce7;color:#14532d;border:2px solid #22c55e;box-shadow:0 0 6px rgba(34,197,94,0.3);' : 'background:#fffbeb;color:#78350f;border:1.5px solid #f59e0b;'}padding:4px 10px;border-radius:8px;">🏆 <strong>Thưởng Mốc 2 (120%):</strong> ${targetBonusM120 > 0 ? `+${formatVND(targetBonusM120)}` : 'Chưa cài'} ${m2Achieved ? '🎉 (Đạt Mốc 2)' : '⏳ (Chưa Đạt)'}</span>
                        <span style="${m2Achieved ? 'background:#dcfce7;color:#14532d;border:1.5px solid #86efac;' : (m1Achieved ? 'background:#dcfce7;color:#14532d;border:1.5px solid #86efac;' : 'background:#fee2e2;color:#991b1b;border:1.5px solid #f87171;')}padding:4px 10px;border-radius:8px;">${m2Achieved ? '🎉 <strong>Trạng Thái:</strong> Đạt Mốc 2' : (m1Achieved ? '✅ <strong>Trạng Thái:</strong> Đạt Mốc 1' : '❌ <strong>Trạng Thái:</strong> Chưa Đạt')}</span>
                        <span style="background:#fffbeb;padding:4px 10px;border-radius:8px;border:1.5px solid #f59e0b;color:#92400e;">🎯 <strong>Tiêu Chí Xét:</strong> ${condsText}</span>
                        ${selectedCondLabels.length > 0 ? `<span style="background:#fffbeb;padding:4px 10px;border-radius:8px;border:1.5px solid #f59e0b;color:#92400e;">⚙️ <strong>Điều Kiện:</strong> ${logicBadgeText}</span>` : ''}
                        ${targetBonusNote ? `<span style="color:#78350f;">📝 <em>${escapeHtml(targetBonusNote)}</em></span>` : ''}
                    </div>
                </td>
            </tr>
        `;

        cardsHtml += `
            <div class="kpi-v2-tbl-wrap employee-card" style="background:#ffffff; border: 2.5px solid #0284c7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(2,132,199,0.12); margin-bottom: 24px; transition: all 0.2s;">
                <table class="kpi-v2-tbl" style="table-layout: fixed !important; width: 100%; border-collapse: separate; border-spacing: 0;">
                    <colgroup>
                        <col style="width: 45px;">
                        <col style="width: 160px;">
                        <col style="width: 280px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                        <col style="width: 135px;">
                    </colgroup>
                    <tbody>
                        ${html}
                    </tbody>
                </table>
            </div>
        `;
    });

    container.innerHTML = cardsHtml;
}

async function kpiMktOpenAssignModal(handlerName) {
    let modal = document.getElementById('kpiMktAssignModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiMktAssignModal';
        modal.className = 'kpi-v2-modal-overlay';
        document.body.appendChild(modal);
    }

    const categories = (_kpiMkt.data && (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories)) ? (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories) : [];

    const subCats = categories.filter(c => {
        // Điều kiện 1: Bắt buộc là mục con (có parent_id)
        const isChild = c.parent_id !== null && c.parent_id !== undefined;
        if (!isChild) return false;

        // Điều kiện 2: BẮT BUỘC hiển thị ở Bảng DANH SÁCH MỤC CON & CHỈ SỐ MARKETING CHI TIẾT
        const isShownInKpi = c.show_in_kpi_mkt !== false && c.show_in_kpi_mkt !== 0 && c.show_in_kpi_mkt !== '0' && c.show_in_kpi_mkt !== 'false';
        const catName = (c.name || c.category_name || '').trim();
        if (!catName || catName === '__NEW__') return false;
        if (!isShownInKpi) return false;

        // Điều kiện 3: Chỉ hiển thị Page của chính nhân viên này HOẶC Page chưa gán cho ai (Ẩn Page của nhân viên khác)
        const assignedOwner = (c.ads_handler_name || '').trim().toLowerCase();
        const currentTarget = handlerName.trim().toLowerCase();

        if (!assignedOwner) {
            return true; // Page chưa gán cho ai -> Hiển thị để gán
        }

        if (currentTarget === 'giám đốc') {
            return assignedOwner === 'giám đốc';
        }

        return assignedOwner === currentTarget;
    });

    let checkboxesHtml = subCats.map(c => {
        const ownerName = (c.ads_handler_name || '').trim();
        const isAlreadyAssigned = Boolean(ownerName);
        const pageLabel = c.pancake_page_name || c.linked_source_name || '';
        const catName = c.name || c.category_name || '';
        const displayLabel = pageLabel ? `${catName} — (🔗 ${pageLabel})` : catName;

        if (isAlreadyAssigned) {
            const ownerBadge = `<em style="font-size:11.5px;color:#475569;font-weight:700;background:#e2e8f0;padding:2px 7px;border-radius:6px;">🔒 Đã gán cho ${escapeHtml(ownerName)}</em>`;
            return `
                <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:10px;cursor:not-allowed;opacity:0.65;" title="Page này đã được gán cho ${escapeHtml(ownerName)}, không thể chọn lại">
                    <input type="checkbox" value="${c.id}" disabled class="kpi-assign-cat-checkbox" style="width:18px;height:18px;cursor:not-allowed;opacity:0.5;">
                    <span style="font-size:13px;font-weight:700;color:#64748b;">📌 ${escapeHtml(displayLabel)} ${ownerBadge}</span>
                </label>
            `;
        } else {
            const ownerBadge = `<em style="font-size:11px;color:#10b981;font-weight:700;">(Chưa gán)</em>`;
            return `
                <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#f0f9ff';this.style.borderColor='#0284c7'" onmouseout="this.style.background='#ffffff';this.style.borderColor='#cbd5e1'">
                    <input type="checkbox" value="${c.id}" class="kpi-assign-cat-checkbox" style="width:18px;height:18px;cursor:pointer;accent-color:#0284c7;">
                    <span style="font-size:13px;font-weight:700;color:#1e293b;">📌 ${escapeHtml(displayLabel)} ${ownerBadge}</span>
                </label>
            `;
        }
    }).join('');

    modal.innerHTML = `
        <div class="kpi-v2-modal" style="width:550px;max-width:94vw;">
            <div class="kpi-v2-modal-hdr">
                <div class="kpi-v2-modal-title">⚙️ Phân Công Page Cho Nhân Viên: 👤 ${escapeHtml(handlerName)}</div>
                <button class="kpi-v2-modal-close" onclick="document.getElementById('kpiMktAssignModal').style.display='none'">✕</button>
            </div>
            <div style="font-size:12.5px;color:#64748b;margin-bottom:14px;font-weight:600;">
                Tích chọn các Page / Mục Con do <strong>${escapeHtml(handlerName)}</strong> phụ trách chạy Ads:
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;padding-right:4px;margin-bottom:18px;">
                ${checkboxesHtml || '<div style="color:#94a3b8;font-weight:700;">Chưa có mục con nào trong hệ thống</div>'}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button type="button" onclick="document.getElementById('kpiMktAssignModal').style.display='none'" style="padding:10px 18px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;">Hủy</button>
                <button type="button" onclick="kpiMktSaveAssignHandler('${escapeHtml(handlerName)}')" style="padding:10px 22px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:none;border-radius:10px;font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 4px 14px rgba(2,132,199,0.35);">💾 Lưu Phân Công</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

async function kpiMktSaveAssignHandler(handlerName) {
    const checkboxes = document.querySelectorAll('.kpi-assign-cat-checkbox:checked');
    const categoryIds = Array.from(checkboxes).map(cb => Number(cb.value));

    try {
        let res = await kpiMktApiCall('/api/reports/kpi-marketing/assign-handler', 'POST', {
            ads_handler_name: handlerName,
            category_ids: categoryIds
        });

        if (res && res.success) {
            document.getElementById('kpiMktAssignModal').style.display = 'none';
            await loadKpimarketingData();
            alert(`Đã phân công Page cho ${handlerName} thành công!`);
        } else {
            alert(res?.error || res?.message || 'Có lỗi khi phân công Page');
        }
    } catch(e) {
        alert('Lỗi phân công Page: ' + e.message);
    }
}

async function kpiMktOpenSetTargetModal(handlerName, targetCatId = 0, targetCatName = '') {
    let modal = document.getElementById('kpiMktSetTargetModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiMktSetTargetModal';
        modal.className = 'kpi-v2-modal-overlay';
        document.body.appendChild(modal);
    }

    const handlers = (_kpiMkt.data && _kpiMkt.data.handlers) ? _kpiMkt.data.handlers : [];
    const h = handlers.find(item => (item.ads_handler_name || 'Giám Đốc').trim().toLowerCase() === handlerName.trim().toLowerCase()) || {};

    let targetObj = {};
    if (targetCatId > 0) {
        const itemObj = (h.items || []).find(i => Number(i.category_id) === Number(targetCatId));
        targetObj = itemObj ? (itemObj.targets || itemObj) : {};
    } else {
        targetObj = h.targets || h;
    }

    const targetBudget = Number(targetObj.target_budget || 0);
    const targetRevM1 = Number(targetObj.target_revenue_m1 || targetObj.target_revenue || 0);
    const targetRevM120 = Number(targetObj.target_revenue_m120 || (targetRevM1 > 0 ? Math.round(targetRevM1 * 1.2) : 0));
    const targetLeadsM1 = Number(targetObj.target_leads_m1 || targetObj.target_leads || 0);
    const targetLeadsM120 = Number(targetObj.target_leads_m120 || (targetLeadsM1 > 0 ? Math.round(targetLeadsM1 * 1.2) : 0));
    const targetOrdersM1 = Number(targetObj.target_orders_m1 || targetObj.target_orders || (targetLeadsM1 > 0 && targetCloseRate > 0 ? Math.round(targetLeadsM1 * targetCloseRate / 100) : (targetRevM1 > 0 && targetCpo > 0 ? Math.round(targetRevM1 / targetCpo) : 0)));
    const targetOrdersM120 = Number(targetObj.target_orders_m120 || (targetOrdersM1 > 0 ? Math.round(targetOrdersM1 * 1.2) : 0));
    const targetCostRatio = Number(targetObj.target_cost_ratio || 0);
    const targetCloseRate = Number(targetObj.target_close_rate || 0);
    const targetCpo = Number(targetObj.target_cpo || 0);
    const targetCpl = Number(targetObj.target_cpl || 0);
    const targetBonusM1 = Number(targetObj.target_bonus_m1 || 0);
    const targetBonusM120 = Number(targetObj.target_bonus_m120 || 0);
    const targetBonusNote = targetObj.target_bonus_note || '';
    let targetBonusConds = targetObj.target_bonus_conditions || [];
    if (typeof targetBonusConds === 'string') {
        try { targetBonusConds = JSON.parse(targetBonusConds); } catch(e) { targetBonusConds = []; }
    }
    if (!Array.isArray(targetBonusConds)) {
        targetBonusConds = [];
    }
    const targetBonusLogic = (targetObj.target_bonus_logic || 'ALL').toUpperCase();

    const [yStr, mStr] = (_kpiMkt.month || '').split('-');
    const monthText = yStr && mStr ? `Tháng ${parseInt(mStr, 10)}/${yStr}` : 'Tháng';

    const fmtBud = targetBudget > 0 ? targetBudget.toLocaleString('vi-VN') : '';
    const fmtRev1 = targetRevM1 > 0 ? targetRevM1.toLocaleString('vi-VN') : '';
    const fmtRev2 = targetRevM120 > 0 ? targetRevM120.toLocaleString('vi-VN') : '';
    const fmtOrd1 = targetOrdersM1 > 0 ? targetOrdersM1.toLocaleString('vi-VN') : '';
    const fmtOrd2 = targetOrdersM120 > 0 ? targetOrdersM120.toLocaleString('vi-VN') : '';
    const fmtLd1 = targetLeadsM1 > 0 ? targetLeadsM1.toLocaleString('vi-VN') : '';
    const fmtLd2 = targetLeadsM120 > 0 ? targetLeadsM120.toLocaleString('vi-VN') : '';
    const fmtCpo = targetCpo > 0 ? targetCpo.toLocaleString('vi-VN') : '';
    const fmtCpl = targetCpl > 0 ? targetCpl.toLocaleString('vi-VN') : '';
    const fmtBonus1 = targetBonusM1 > 0 ? targetBonusM1.toLocaleString('vi-VN') : '';
    const fmtBonus2 = targetBonusM120 > 0 ? targetBonusM120.toLocaleString('vi-VN') : '';

    const scopeOptionsHtml = `
        <option value="0" ${targetCatId === 0 ? 'selected' : ''}>⭐ KPI Tổng Cho Nhân Viên (${escapeHtml(handlerName)})</option>
        ${(h.items || []).filter(ci => ci.category_id).map(ci => `<option value="${ci.category_id}" ${Number(targetCatId) === Number(ci.category_id) ? 'selected' : ''}>📌 KPI Riêng Page: ${escapeHtml(ci.category_name)}</option>`).join('')}
    `;

    modal.innerHTML = `
        <div class="kpi-v2-modal" style="width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
            <!-- Modal Header -->
            <div style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:18px;color:#0f172a;font-weight:800;display:flex;align-items:center;gap:8px;font-family:'Inter',system-ui,-apple-system,sans-serif;">
                        <span>🎯 Cài Đặt Chi Tiêu KPI Marketing</span>
                    </div>
                    <div style="font-size:12.5px;color:#64748b;margin-top:4px;font-weight:600;">
                        Nhân viên: <strong style="color:#1e1b4b;">👤 ${escapeHtml(handlerName)}</strong> • <span>${monthText}</span>
                    </div>
                </div>
                <button type="button" class="kpi-v2-modal-close" style="cursor:pointer;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-weight:800;color:#64748b;" onclick="document.getElementById('kpiMktSetTargetModal').style.display='none'">✕</button>
            </div>

            <!-- SCOPE SELECTION DROPDOWN -->
            <div style="background:#f1f5f9;padding:12px 16px;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <label style="font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;font-family:'Inter',system-ui,-apple-system,sans-serif;">📌 Phạm vi áp dụng chỉ tiêu:</label>
                <select id="kpiTargetScopeSelect" onchange="kpiMktOnScopeChange(this.value, '${escapeHtml(handlerName)}')" style="width:100%;padding:9px 12px;border:1.5px solid #0284c7;border-radius:10px;font-family:'Inter',system-ui,-apple-system,sans-serif;font-weight:700;font-size:14px;color:#0f172a;outline:none;background:white;cursor:pointer;text-transform:none;letter-spacing:normal;">
                    ${scopeOptionsHtml}
                </select>
            </div>

            <!-- Form Content -->
            <form id="kpiMktTargetForm" onsubmit="kpiMktSaveTargetForHandler(event, '${escapeHtml(handlerName)}')" style="display:flex;flex-direction:column;gap:18px;">
                <input type="hidden" id="target_cat_id" value="${targetCatId}" />
                
                <!-- SECTION 1: NGÂN SÁCH MKT -->
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #cbd5e1;">
                    <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                        <span>💸 1. NGÂN SÁCH CHI PHÍ MARKETING ${targetCatId > 0 ? `(RIÊNG PAGE)` : `(CHUNG)`}</span>
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:800;color:#0284c7;display:block;margin-bottom:4px;">Chi Phí MKT Chi Tiêu / Ngân Sách (đ)</label>
                        <input type="text" id="target_budget" value="${fmtBud}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:9px 12px;border:2px solid #38bdf8;border-radius:8px;font-weight:800;font-size:14px;color:#0369a1;outline:none;background:#f0f9ff;" />
                    </div>
                </div>

                <!-- SECTION 2: MỐC 1 (100% KPI & CHỈ SỐ MỐC 1 & THƯỞNG MỐC 1) -->
                <div style="background:#ecfdf5;padding:16px;border-radius:12px;border:1.5px solid #a7f3d0;">
                    <div style="font-weight:800;font-size:13.5px;color:#064e3b;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                        <span>🚩 2. MỐC 1 - 100% ĐẠT KPI & CHỈ SỐ MỤC TIÊU MỐC 1</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">💰 Doanh Số Mốc 1 (đ)</label>
                            <input type="text" id="target_revenue_m1" value="${fmtRev1}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">📉 % CP / Doanh Số Mục Tiêu (%)</label>
                            <input type="number" step="0.01" id="target_cost_ratio" value="${targetCostRatio || ''}" placeholder="" oninput="kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>

                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">📦 Số Đơn Hàng Mốc 1 (Đơn)</label>
                            <input type="text" id="target_orders_m1" value="${fmtOrd1}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">🎯 Tỷ Lệ Chốt Mục Tiêu (%)</label>
                            <input type="number" step="0.01" id="target_close_rate" value="${targetCloseRate || ''}" placeholder="" oninput="kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>

                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">🎯 CPO Giá / Đơn Mục Tiêu (đ)</label>
                            <input type="text" id="target_cpo" value="${fmtCpo}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">📥 Số Lead Mốc 1 (Tin Nhắn)</label>
                            <input type="text" id="target_leads_m1" value="${fmtLd1}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>

                        <div style="grid-column: 1 / -1;">
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">📊 CPL Giá / Lead Mục Tiêu (đ)</label>
                            <input type="text" id="target_cpl" value="${fmtCpl}" placeholder="" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>

                        <div style="grid-column: 1 / -1;background:#d1fae5;padding:10px 12px;border-radius:8px;border:1px solid #6ee7b7;margin-top:4px;">
                            <label style="font-size:12px;font-weight:800;color:#065f46;display:block;margin-bottom:4px;">🎁 Lương Thưởng Đạt Mốc 1 (100% KPI) (đ)</label>
                            <input type="text" id="target_bonus_m1" value="${fmtBonus1}" placeholder="" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #34d399;border-radius:8px;font-weight:800;font-size:13.5px;color:#064e3b;outline:none;background:white;" />
                        </div>
                    </div>
                </div>

                <!-- SECTION 3: MỐC 2 (120% KHUYẾN KHÍCH & THƯỞNG MỐC 2) -->
                <div style="background:#eff6ff;padding:16px;border-radius:12px;border:1.5px solid #bfdbfe;">
                    <div style="font-weight:800;font-size:13.5px;color:#1e3a8a;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                        <span>🏆 3. MỐC 2 - 120% KHUYẾN KHÍCH & THƯỞNG MỐC 2</span>
                        <span style="font-size:11px;font-weight:600;color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:6px;">✨ Tự động = 120% Mốc 1</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">💰 Doanh Số Mốc 2 (Tự động 120%)</label>
                            <input type="text" id="target_revenue_m120" value="${fmtRev2}" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">📉 % CP / Doanh Số Mốc 2 (Tự động %)</label>
                            <input type="text" id="target_cost_ratio_m120" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>

                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">📦 Số Đơn Hàng Mốc 2 (Tự động 120%)</label>
                            <input type="text" id="target_orders_m120" value="${fmtOrd2}" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">🎯 Tỷ Lệ Chốt Mốc 2 (Tự động %)</label>
                            <input type="text" id="target_close_rate_m120" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>

                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">🎯 CPO Giá / Đơn Mốc 2 (Tự động đ)</label>
                            <input type="text" id="target_cpo_m120" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">📥 Số Lead Mốc 2 (Tự động 120%)</label>
                            <input type="text" id="target_leads_m120" value="${fmtLd2}" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>

                        <div style="grid-column: 1 / -1;">
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">📊 CPL Giá / Lead Mốc 2 (Tự động đ)</label>
                            <input type="text" id="target_cpl_m120" readonly tabindex="-1" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>

                        <div style="grid-column: 1 / -1;background:#dbeafe;padding:10px 12px;border-radius:8px;border:1px solid #93c5fd;margin-top:4px;">
                            <label style="font-size:12px;font-weight:800;color:#1e40af;display:block;margin-bottom:4px;">🏆 Lương Thưởng Đạt Mốc 2 (120% KPI) (đ)</label>
                            <input type="text" id="target_bonus_m120" value="${fmtBonus2}" placeholder="" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #60a5fa;border-radius:8px;font-weight:800;font-size:13.5px;color:#1e3a8a;outline:none;background:white;" />
                        </div>
                    </div>
                </div>

                <!-- SECTION 4: THỂ LỆ & QUY TẮC XÉT THƯỞNG -->
                <div style="background:#fffbeb;padding:16px;border-radius:12px;border:1.5px solid #fde68a;">
                    <div style="font-weight:800;font-size:13.5px;color:#92400e;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                        <span>⚙️ 4. THỂ LỆ & QUY TẮC XÉT THƯỞNG ${targetCatId > 0 ? `(PAGE)` : `(CHUNG)`}</span>
                    </div>

                    <!-- TIÊU CHÍ ÁP DỤNG THƯỞNG -->
                    <div>
                        <label style="font-size:12px;font-weight:800;color:#92400e;display:block;margin-bottom:6px;">🎯 Chọn các chỉ số làm TIÊU CHÍ XÉT THƯỞNG:</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:white;padding:10px 12px;border-radius:8px;border:1px solid #fde68a;">
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="revenue" ${targetBonusConds.includes('revenue') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>💰 Doanh Số</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="orders" ${targetBonusConds.includes('orders') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📦 Số Đơn Hàng (≥ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="leads" ${targetBonusConds.includes('leads') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📥 Số Lead (Tin Nhắn)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cost_ratio" ${targetBonusConds.includes('cost_ratio') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📉 % CP / Doanh Số (≤ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="close_rate" ${targetBonusConds.includes('close_rate') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>🎯 Tỷ Lệ Chốt % (≥ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cpo" ${targetBonusConds.includes('cpo') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>🎯 CPO Giá / Đơn (≤ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cpl" ${targetBonusConds.includes('cpl') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📊 CPL Giá / Lead (≤ mục tiêu)</span>
                            </label>
                        </div>ay:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="leads" ${targetBonusConds.includes('leads') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📥 Số Lead (Tin Nhắn)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cost_ratio" ${targetBonusConds.includes('cost_ratio') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📉 % CP / Doanh Số (≤ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="close_rate" ${targetBonusConds.includes('close_rate') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>🎯 Tỷ Lệ Chốt % (≥ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cpo" ${targetBonusConds.includes('cpo') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>🎯 CPO Giá / Đơn (≤ mục tiêu)</span>
                            </label>
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="cpl" ${targetBonusConds.includes('cpl') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>📊 CPL Giá / Lead (≤ mục tiêu)</span>
                            </label>
                        </div>
                        
                        <div style="display:flex;align-items:center;gap:16px;margin-top:10px;font-size:12px;font-weight:700;color:#92400e;">
                            <span>Điều kiện kết hợp:</span>
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                                <input type="radio" name="kpiBonusLogic" value="ALL" ${targetBonusLogic === 'ALL' ? 'checked' : ''} style="accent-color:#d97706;" />
                                <span>Đạt TẤT CẢ tiêu chí (AND)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                                <input type="radio" name="kpiBonusLogic" value="ANY" ${targetBonusLogic === 'ANY' ? 'checked' : ''} style="accent-color:#d97706;" />
                                <span>Đạt BẤT KỲ tiêu chí nào (OR)</span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-top:12px;">
                        <label style="font-size:12px;font-weight:700;color:#92400e;display:block;margin-bottom:4px;">📝 Nội Dung Thưởng / Ghi Chú Thưởng</label>
                        <input type="text" id="target_bonus_note" value="${escapeHtml(targetBonusNote)}" placeholder="" style="width:100%;padding:8px 12px;border:1.5px solid #fcd34d;border-radius:8px;font-weight:600;font-size:12.5px;color:#78350f;outline:none;background:white;" />
                    </div>
                </div>

                <!-- Footer Action Buttons -->
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:14px;">
                    <button type="button" onclick="document.getElementById('kpiMktSetTargetModal').style.display='none'" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Hủy Bỏ</button>
                    <button type="submit" style="background:#2563eb;color:white;border:none;padding:9px 24px;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.25);">💾 Lưu Chỉ Tiêu KPI</button>
                </div>
            </form>
        </div>
    `;

    modal.style.setProperty('display', 'flex', 'important');
    kpiMktAutoCalcM2();
}

function kpiMktOnScopeChange(catIdStr, handlerName) {
    const catId = parseInt(catIdStr, 10) || 0;
    kpiMktOpenSetTargetModal(handlerName, catId);
}

function kpiMktFormatInputNumber(el) {
    if (!el) return;
    const digits = el.value.replace(/[^0-9]/g, '');
    if (!digits) {
        el.value = '';
        return;
    }
    el.value = Number(digits).toLocaleString('vi-VN');
}

function kpiMktParseVnInt(val) {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const digits = String(val).replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

function kpiMktAutoCalcM2() {
    try {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const budget = kpiMktParseVnInt(getVal('target_budget'));
        const revM1 = kpiMktParseVnInt(getVal('target_revenue_m1'));
        const leadsM1 = kpiMktParseVnInt(getVal('target_leads_m1'));
        let ordersM1 = kpiMktParseVnInt(getVal('target_orders_m1'));
        const costRatioM1 = parseFloat(String(getVal('target_cost_ratio') || 0).replace(/,/g, '.')) || 0;
        const closeRateM1 = parseFloat(String(getVal('target_close_rate') || 0).replace(/,/g, '.')) || 0;
        const cpoM1 = kpiMktParseVnInt(getVal('target_cpo') || getVal('target_cpo_m1'));
        const cplM1 = kpiMktParseVnInt(getVal('target_cpl') || getVal('target_cpl_m1'));

        const setAll = (selector, val) => {
            document.querySelectorAll(selector).forEach(el => { el.value = val; });
        };

        // If ordersM1 not typed by user, try auto calculating from Leads * CloseRate or Rev / CPO
        if (!ordersM1 && leadsM1 > 0 && closeRateM1 > 0) {
            ordersM1 = Math.round(leadsM1 * (closeRateM1 / 100));
            const ord1El = document.getElementById('target_orders_m1');
            if (ord1El && !ord1El.value) ord1El.value = ordersM1.toLocaleString('vi-VN');
        } else if (!ordersM1 && revM1 > 0 && cpoM1 > 0) {
            ordersM1 = Math.round(revM1 / cpoM1);
            const ord1El = document.getElementById('target_orders_m1');
            if (ord1El && !ord1El.value) ord1El.value = ordersM1.toLocaleString('vi-VN');
        }

        // 1. Doanh Số Mốc 2 = Mốc 1 * 1.2
        const revM2 = revM1 > 0 ? Math.round(revM1 * 1.2) : 0;
        setAll('#target_revenue_m120', revM2 > 0 ? revM2.toLocaleString('vi-VN') : '');

        // 2. Số Lead Mốc 2 = Mốc 1 * 1.2
        const leadsM2 = leadsM1 > 0 ? Math.round(leadsM1 * 1.2) : 0;
        setAll('#target_leads_m120', leadsM2 > 0 ? leadsM2.toLocaleString('vi-VN') : '');

        // 3. Số Đơn Hàng Mốc 2 = Mốc 1 * 1.2
        const ordersM2 = ordersM1 > 0 ? Math.round(ordersM1 * 1.2) : 0;
        setAll('#target_orders_m120', ordersM2 > 0 ? ordersM2.toLocaleString('vi-VN') : '');

        // 4. % CP / Doanh Số Mốc 2 = Giảm 1.2 lần (CostRatio M1 / 1.2)
        let cr2 = 0;
        if (costRatioM1 > 0) {
            cr2 = Math.round((costRatioM1 / 1.2) * 100) / 100;
        } else if (budget > 0 && revM2 > 0) {
            cr2 = Math.round((budget / revM2) * 10000) / 100;
        }
        setAll('#target_cost_ratio_m120', cr2 > 0 ? `${cr2}%` : '');

        // 5. Tỷ Lệ Chốt Mốc 2 = Tăng 120% (CloseRate M1 * 1.2)
        const clr2 = closeRateM1 > 0 ? Math.round((closeRateM1 * 1.2) * 100) / 100 : 0;
        setAll('#target_close_rate_m120', clr2 > 0 ? `${clr2}%` : '');

        // 6. CPO Mốc 2 = Giảm 1.2 lần (CPO M1 / 1.2)
        let cpo2 = 0;
        if (cpoM1 > 0) {
            cpo2 = Math.round(cpoM1 / 1.2);
        } else if (budget > 0 && leadsM2 > 0 && closeRateM1 > 0) {
            const clr2Val = closeRateM1 * 1.2;
            const orders2 = leadsM2 * (clr2Val / 100);
            if (orders2 > 0) cpo2 = Math.round(budget / orders2);
        }
        setAll('#target_cpo_m120', cpo2 > 0 ? cpo2.toLocaleString('vi-VN') : '');
        setAll('#target_cpo_m2', cpo2 > 0 ? cpo2.toLocaleString('vi-VN') : '');

        // 7. CPL Mốc 2 = Giảm 1.2 lần (CPL M1 / 1.2)
        let cpl2 = 0;
        if (cplM1 > 0) {
            cpl2 = Math.round(cplM1 / 1.2);
        } else if (budget > 0 && leadsM1 > 0) {
            cpl2 = Math.round((budget / leadsM1) / 1.2);
        } else if (budget > 0 && leadsM2 > 0) {
            cpl2 = Math.round(budget / leadsM2);
        }
        setAll('#target_cpl_m120', cpl2 > 0 ? cpl2.toLocaleString('vi-VN') : '');
        setAll('#target_cpl_m2', cpl2 > 0 ? cpl2.toLocaleString('vi-VN') : '');
    } catch(err) {
        console.error('Error in kpiMktAutoCalcM2:', err);
    }
}

async function kpiMktSaveTargetForHandler(e, handlerName) {
    e.preventDefault();
    try {
        const targetCatId = parseInt(document.getElementById('target_cat_id')?.value, 10) || 0;
        const revM1 = kpiMktParseVnInt(document.getElementById('target_revenue_m1')?.value);
        const leadsM1 = kpiMktParseVnInt(document.getElementById('target_leads_m1')?.value);
        const ordersM1 = kpiMktParseVnInt(document.getElementById('target_orders_m1')?.value);
        const revM120 = kpiMktParseVnInt(document.getElementById('target_revenue_m120')?.value) || Math.round(revM1 * 1.2);
        const leadsM120 = kpiMktParseVnInt(document.getElementById('target_leads_m120')?.value) || Math.round(leadsM1 * 1.2);
        const ordersM120 = kpiMktParseVnInt(document.getElementById('target_orders_m120')?.value) || Math.round(ordersM1 * 1.2);

        const selectedConds = Array.from(document.querySelectorAll('input[name="kpiBonusCond"]:checked')).map(cb => cb.value);
        const selectedLogic = document.querySelector('input[name="kpiBonusLogic"]:checked')?.value || 'ALL';

        const payload = {
            period_value: _kpiMkt.month,
            targets: [
                {
                    category_id: targetCatId > 0 ? targetCatId : null,
                    ads_handler_name: handlerName,
                    target_budget: kpiMktParseVnInt(document.getElementById('target_budget')?.value),
                    target_revenue_m1: revM1,
                    target_revenue_m120: revM120,
                    target_leads_m1: leadsM1,
                    target_leads_m120: leadsM120,
                    target_orders_m1: ordersM1,
                    target_orders_m120: ordersM120,
                    target_cost_ratio: Number(String(document.getElementById('target_cost_ratio')?.value || 0).replace(/,/g, '.')) || 0,
                    target_close_rate: Number(String(document.getElementById('target_close_rate')?.value || 0).replace(/,/g, '.')) || 0,
                    target_cpo: kpiMktParseVnInt(document.getElementById('target_cpo')?.value),
                    target_cpl: kpiMktParseVnInt(document.getElementById('target_cpl')?.value),
                    target_bonus_m1: kpiMktParseVnInt(document.getElementById('target_bonus_m1')?.value),
                    target_bonus_m120: kpiMktParseVnInt(document.getElementById('target_bonus_m120')?.value),
                    target_bonus_note: document.getElementById('target_bonus_note')?.value || '',
                    target_bonus_conditions: selectedConds,
                    target_bonus_logic: selectedLogic
                }
            ]
        };

        const res = await kpiMktApiCall('/api/reports/kpi-marketing/targets', 'POST', payload);
        if (res && res.success) {
            document.getElementById('kpiMktSetTargetModal').style.display = 'none';
            await loadKpimarketingData();
            alert(`Thành công! Đã thiết lập KPI Tháng cho nhân viên "${handlerName}".`);
        } else {
            alert(res?.error || res?.message || 'Có lỗi khi lưu chỉ tiêu KPI Tháng');
        }
    } catch(err) {
        alert('Lỗi lưu chỉ tiêu KPI: ' + err.message);
    }
}

function kpiMktRenderCreateEmpCheckboxes(selectedHandlerName) {
    const container = document.getElementById('kpiCreateEmpCheckboxesContainer');
    if (!container) return;

    const categories = (_kpiMkt.data && (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories)) ? (_kpiMkt.data.all_system_categories || _kpiMkt.data.categories) : [];
    const subCats = categories.filter(c => {
        const isChild = c.parent_id !== null && c.parent_id !== undefined;
        if (!isChild) return false;
        const isShownInKpi = c.show_in_kpi_mkt !== false && c.show_in_kpi_mkt !== 0 && c.show_in_kpi_mkt !== '0' && c.show_in_kpi_mkt !== 'false';
        const catName = (c.name || c.category_name || '').trim();
        return catName && catName !== '__NEW__' && isShownInKpi;
    });

    const selNameClean = (selectedHandlerName || '').trim().toLowerCase();

    // Show ALL sub-category pages in system so user sees every page
    let filteredCats = subCats;

    let checkboxesHtml = filteredCats.map(c => {
        const pageLabel = c.pancake_page_name || c.linked_source_name || '';
        const catName = c.name || c.category_name || '';
        const displayLabel = pageLabel ? `${catName} — (🔗 ${pageLabel})` : catName;
        const ownerName = (c.ads_handler_name || '').trim();
        const isAlreadyAssigned = Boolean(ownerName);
        const belongsToSelected = isAlreadyAssigned && (ownerName.toLowerCase() === selNameClean);

        if (isAlreadyAssigned) {
            const ownerBadge = belongsToSelected 
                ? `<em style="font-size:11.5px;color:#0284c7;font-weight:700;background:#e0f2fe;padding:2px 7px;border-radius:6px;">🔒 Đã thuộc Bảng này</em>`
                : `<em style="font-size:11.5px;color:#475569;font-weight:700;background:#e2e8f0;padding:2px 7px;border-radius:6px;">🔒 Đã gán cho ${escapeHtml(ownerName)}</em>`;

            return `
                <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:10px;cursor:not-allowed;opacity:0.65;" title="Page này đã được gán cho ${escapeHtml(ownerName)}, không thể chọn lại">
                    <input type="checkbox" value="${c.id}" disabled class="kpi-create-emp-cat-checkbox" style="width:18px;height:18px;cursor:not-allowed;opacity:0.5;">
                    <span style="font-size:13px;font-weight:700;color:#64748b;">📌 ${escapeHtml(displayLabel)} ${ownerBadge}</span>
                </label>
            `;
        } else {
            const ownerBadge = `<em style="font-size:11px;color:#10b981;font-weight:700;">(Chưa gán)</em>`;
            return `
                <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#f0f9ff';this.style.borderColor='#0284c7'" onmouseout="this.style.background='#ffffff';this.style.borderColor='#cbd5e1'">
                    <input type="checkbox" value="${c.id}" class="kpi-create-emp-cat-checkbox" style="width:18px;height:18px;cursor:pointer;accent-color:#0284c7;">
                    <span style="font-size:13px;font-weight:700;color:#1e293b;">📌 ${escapeHtml(displayLabel)} ${ownerBadge}</span>
                </label>
            `;
        }
    }).join('');

    container.innerHTML = checkboxesHtml || '<div style="color:#64748b;font-style:italic;padding:12px;text-align:center;">Không có Page nào thuộc nhân viên này</div>';
}

function kpiMktUpdateExistingTablesDropdown(handlerName) {
    const container = document.getElementById('kpiExistingTableContainer');
    const select = document.getElementById('kpiExistingTableSelect');
    if (!container || !select) return;

    const baseClean = getCleanDisplayHandlerName(handlerName).toLowerCase();
    const handlers = (_kpiMkt.data && _kpiMkt.data.handlers) ? _kpiMkt.data.handlers : [];

    // Find all cards matching baseClean
    const matching = handlers.filter(h => getCleanDisplayHandlerName(h.ads_handler_name).toLowerCase() === baseClean);

    if (matching.length === 0) {
        select.innerHTML = `<option value="${escapeHtml(handlerName)}">📊 Bảng 1 (Bảng hiện tại của ${escapeHtml(handlerName)})</option>`;
    } else {
        select.innerHTML = matching.map((h, cardIdx) => {
            const hName = h.ads_handler_name;
            const items = h.items || [];
            const pageNames = items.map(i => i.category_name || i.name).filter(Boolean).slice(0, 2).join(', ');
            const summaryStr = pageNames ? ` — Đang có: ${pageNames}${items.length > 2 ? '...' : ''}` : ' — (Chưa có Page)';
            const cardNum = cardIdx + 1;
            const sttIndex = handlers.indexOf(h) + 1;
            return `<option value="${escapeHtml(hName)}">📊 Bảng ${cardNum} (STT ${sttIndex})${summaryStr}</option>`;
        }).join('');
    }
}

async function kpiMktOpenCreateEmployeeModal() {
    let modal = document.getElementById('kpiMktCreateEmpModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiMktCreateEmpModal';
        modal.className = 'kpi-v2-modal-overlay';
        document.body.appendChild(modal);
    }

    const presetNames = [
        'Giám Đốc',
        'mkt1',
        'mkt2'
    ];
    const existingHandlers = (_kpiMkt.data && _kpiMkt.data.handlers) ? _kpiMkt.data.handlers.map(h => getCleanDisplayHandlerName(h.ads_handler_name)).filter(Boolean) : [];
    const allHandlerNames = Array.from(new Set([...presetNames, ...existingHandlers]));

    let handlerOptionsHtml = allHandlerNames.map(n => `<option value="${escapeHtml(n)}">👤 ${escapeHtml(n)}</option>`).join('');
    handlerOptionsHtml += `<option value="__CUSTOM__">✍️ Tự nhập tên nhân viên mới...</option>`;

    const initialHandler = allHandlerNames[0] || 'Giám Đốc';

    modal.innerHTML = `
        <div class="kpi-v2-modal" style="width:600px;max-width:94vw;">
            <div class="kpi-v2-modal-hdr">
                <div class="kpi-v2-modal-title">➕ Tạo Nhân Viên Marketing & Gán Danh Sách Page</div>
                <button class="kpi-v2-modal-close" onclick="document.getElementById('kpiMktCreateEmpModal').style.display='none'">✕</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:16px;">
                <div class="kpi-v2-form-group">
                    <label class="kpi-v2-label">Tên Nhân Viên / Nhóm Marketing (Ads Handler):</label>
                    <select id="kpiCreateEmpNameSelect" class="kpi-v2-input" onchange="kpiMktOnCreateEmpSelectChange(this.value)">
                        ${handlerOptionsHtml}
                    </select>
                    <input type="text" id="kpiCreateEmpNameCustomInput" class="kpi-v2-input" style="display:none;margin-top:8px" placeholder="Nhập tên nhân viên mới (Ví dụ: Nguyễn Văn A, Giám Đốc Nhóm 3...)">
                    <div style="font-size:11.5px;color:#64748b;margin-top:5px;line-height:1.4;">💡 Anh có thể chọn nhanh từ danh sách trên hoặc chọn <strong>"Tự nhập tên..."</strong> để đặt tên nhóm linh hoạt!</div>
                </div>

                <!-- 2 OPTIONS FOR DISPLAY MODE: SAME CARD vs SEPARATE NEW CARD -->
                <div class="kpi-v2-form-group" style="background:#f8fafc;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:10px;margin-top:2px;">
                    <label class="kpi-v2-label" style="margin-bottom:8px;display:block;color:#0f172a;font-weight:800;font-size:13px;">⚙️ Chế độ hiển thị Bảng Báo Cáo khi thêm Page:</label>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#0284c7;cursor:pointer;">
                            <input type="radio" name="kpiAssignDisplayMode" value="same" checked style="width:16px;height:16px;accent-color:#0284c7;" onchange="kpiMktToggleAssignDisplayMode(this.value)">
                            <span>🔗 Lựa chọn 1: Thêm chung vào Bảng Báo Cáo hiện tại</span>
                        </label>

                        <!-- DROPDOWN TO CHOOSE EXISTING TABLE -->
                        <div id="kpiExistingTableContainer" style="margin-left:24px;margin-top:2px;padding:8px 12px;background:#ffffff;border:1.5px solid #bae6fd;border-radius:8px;">
                            <label style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:4px;display:block;">Chọn Bảng Báo Cáo hiện tại muốn thêm vào:</label>
                            <select id="kpiExistingTableSelect" class="kpi-v2-input" style="padding:6px 10px;font-size:12.5px;font-weight:700;border:1px solid #7dd3fc;background:#f0f9ff;color:#0369a1;">
                            </select>
                        </div>

                        <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#0f172a;cursor:pointer;margin-top:4px;">
                            <input type="radio" name="kpiAssignDisplayMode" value="new_card" style="width:16px;height:16px;accent-color:#0284c7;" onchange="kpiMktToggleAssignDisplayMode(this.value)">
                            <span>📑 Lựa chọn 2: Tách riêng ra tạo 1 Bảng Báo Cáo MỚI</span>
                        </label>
                    </div>
                </div>

                <div class="kpi-v2-form-group">
                    <label class="kpi-v2-label">Chọn các Page gán cho Nhân Viên / Nhóm này:</label>
                    <div id="kpiCreateEmpCheckboxesContainer" style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
                    </div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:12px;border-top:1.5px solid #e2e8f0;padding-top:16px">
                <button type="button" style="padding:10px 20px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;color:#334155" onclick="document.getElementById('kpiMktCreateEmpModal').style.display='none'">Hủy</button>
                <button type="button" class="kpi-v2-add-btn" onclick="kpiMktSaveCreateEmployee()">💾 Lưu Phân Công Page</button>
            </div>
        </div>
    `;

    kpiMktRenderCreateEmpCheckboxes(initialHandler);
    kpiMktUpdateExistingTablesDropdown(initialHandler);
    modal.style.display = 'flex';
}

function kpiMktToggleAssignDisplayMode(mode) {
    const container = document.getElementById('kpiExistingTableContainer');
    if (container) {
        container.style.display = (mode === 'same') ? 'block' : 'none';
    }
}

function kpiMktOnCreateEmpSelectChange(val) {
    const customInput = document.getElementById('kpiCreateEmpNameCustomInput');
    if (customInput) {
        if (val === '__CUSTOM__') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
        }
    }
    const handlerName = (val === '__CUSTOM__') ? '' : val;
    kpiMktRenderCreateEmpCheckboxes(handlerName);
    kpiMktUpdateExistingTablesDropdown(handlerName);
}

async function kpiMktSaveCreateEmployee() {
    const selectEl = document.getElementById('kpiCreateEmpNameSelect');
    const customInput = document.getElementById('kpiCreateEmpNameCustomInput');

    let baseHandlerName = selectEl ? selectEl.value.trim() : '';
    if (baseHandlerName === '__CUSTOM__' || !baseHandlerName) {
        baseHandlerName = customInput ? customInput.value.trim() : '';
    }

    if (!baseHandlerName) {
        alert('⚠️ Vui lòng chọn hoặc nhập Tên Nhân Viên Marketing!');
        return;
    }

    // Check display mode: same card vs separate new card
    const modeRadio = document.querySelector('input[name="kpiAssignDisplayMode"]:checked');
    const displayMode = modeRadio ? modeRadio.value : 'same';

    let finalHandlerName = baseHandlerName;
    if (displayMode === 'same') {
        const tableSelect = document.getElementById('kpiExistingTableSelect');
        if (tableSelect && tableSelect.value) {
            finalHandlerName = tableSelect.value.trim();
        }
    } else if (displayMode === 'new_card') {
        const existingHandlers = (_kpiMkt.data && _kpiMkt.data.handlers) ? _kpiMkt.data.handlers.map(h => h.ads_handler_name).filter(Boolean) : [];
        const cleanBase = getCleanDisplayHandlerName(baseHandlerName).toLowerCase();

        let count = 0;
        let maxIndex = 1;

        existingHandlers.forEach(hName => {
            if (getCleanDisplayHandlerName(hName).toLowerCase() === cleanBase) {
                count++;
                const m = hName.match(/\d+/);
                if (m) {
                    const num = parseInt(m[0], 10);
                    if (num > maxIndex) maxIndex = num;
                }
            }
        });

        const nextNum = Math.max(count + 1, maxIndex + 1);
        finalHandlerName = `${baseHandlerName} - Bảng ${nextNum}`;
    }

    const checkedCheckboxes = document.querySelectorAll('.kpi-create-emp-cat-checkbox:checked');
    const enabledUncheckedCheckboxes = document.querySelectorAll('.kpi-create-emp-cat-checkbox:not(:checked):not(:disabled)');

    const selectedIds = Array.from(checkedCheckboxes).map(cb => parseInt(cb.value, 10));
    const unselectedIds = Array.from(enabledUncheckedCheckboxes).map(cb => parseInt(cb.value, 10));

    if (selectedIds.length === 0 && unselectedIds.length === 0 && document.querySelectorAll('.kpi-create-emp-cat-checkbox').length === 0) {
        alert('⚠️ Không tìm thấy Page nào trong danh sách!');
        return;
    }

    if (selectedIds.length === 0) {
        alert('⚠️ Vui lòng tích chọn ít nhất 1 Page để gán!');
        return;
    }

    try {
        // 1. Assign selected pages to finalHandlerName
        let res = await kpiMktApiCall('/api/reports/kpi-marketing/assign-handler', 'POST', {
            ads_handler_name: finalHandlerName,
            category_ids: selectedIds
        });

        if (!res || !res.success) {
            alert('❌ Lỗi gán Page: ' + (res ? res.message || res.error : 'Không có phản hồi'));
            return;
        }

        // 2. Unassign only ENABLED unselected pages if user explicitly left them unchecked
        if (unselectedIds.length > 0 && displayMode === 'same') {
            await kpiMktApiCall('/api/reports/kpi-marketing/assign-handler', 'POST', {
                ads_handler_name: '',
                category_ids: unselectedIds
            }).catch(() => {});
        }

        const monthKey = _kpiMkt.month || '';
        localStorage.removeItem('kpi_mkt_cleared_assignments_' + monthKey);

        document.getElementById('kpiMktCreateEmpModal').style.display = 'none';
        const msgMode = displayMode === 'new_card' ? `tạo Bảng Báo Cáo Card riêng "${finalHandlerName}"` : `gán chung vào bảng "${finalHandlerName}"`;
        alert(`✅ Đã ${msgMode} thành công cho ${selectedIds.length} Page!`);
        await loadKpimarketingData();
    } catch(e) {
        alert('❌ Lỗi kết nối hệ thống: ' + e.message);
    }
}

async function kpiMktResetAllAssignments() {
    if (!confirm('⚠️ Anh có chắc chắn muốn xóa phân công tất cả các Page cũ để tạo nhân viên & gán lại từ đầu không?')) {
        return;
    }

    try {
        const monthKey = _kpiMkt.month || '';
        localStorage.setItem('kpi_mkt_cleared_assignments_' + monthKey, 'true');

        let allCatIds = [];
        if (_kpiMkt && _kpiMkt.data && Array.isArray(_kpiMkt.data.categories)) {
            allCatIds = _kpiMkt.data.categories.map(c => Number(c.id || c.category_id)).filter(id => !isNaN(id) && id > 0);
        }

        if (allCatIds.length > 0) {
            const clearTargets = allCatIds.map(cid => ({
                category_id: cid,
                ads_handler_name: '',
                target_budget: 0,
                target_leads_m1: 0,
                target_revenue_m1: 0
            }));

            await kpiMktApiCall('/api/reports/kpi-marketing/targets', 'POST', {
                period_value: monthKey,
                targets: clearTargets
            }).catch(() => {});
        }

        alert('✅ Đã xóa tất cả phân công Page thành công!');
        await loadKpimarketingData();
        setTimeout(() => {
            kpiMktOpenCreateEmployeeModal();
        }, 350);
    } catch(e) {
        alert('❌ Lỗi kết nối hệ thống: ' + e.message);
    }
}

async function kpiMktUnassignSinglePage(catId, catName) {
    if (!confirm(`Anh có chắc chắn muốn BỎ GÁN Page "${catName}" không?\n\nPage này sẽ được giải phóng (về trạng thái Chưa Gán) để Anh thoải mái chọn lại vào Bảng khác!`)) {
        return;
    }

    try {
        let res = await kpiMktApiCall('/api/reports/kpi-marketing/assign-handler', 'POST', {
            category_ids: [Number(catId)],
            ads_handler_name: ''
        });

        if (res && res.success) {
            await loadKpimarketingData();
            alert(`✅ Đã bỏ gán Page "${catName}" thành công! Page đã trở về trạng thái Chưa Gán.`);
        } else {
            alert(res?.error || res?.message || 'Có lỗi khi bỏ gán Page');
        }
    } catch(e) {
        alert('❌ Lỗi kết nối hệ thống: ' + e.message);
    }
}

async function kpiMktDeleteCard(handlerName) {
    if (!confirm(`⚠️ Anh có chắc chắn muốn XÓA BẢNG BÁO CÁO "${handlerName}" không?\n\nTất cả các Page trong bảng này sẽ được giải phóng (về trạng thái Chưa Gán) để Anh thoải mái gán lại vào Bảng mới!`)) {
        return;
    }

    try {
        const handlers = (_kpiMkt.data && _kpiMkt.data.handlers) ? _kpiMkt.data.handlers : [];
        const h = handlers.find(item => (item.ads_handler_name || '').trim().toLowerCase() === handlerName.trim().toLowerCase());
        const catIds = h && h.items ? h.items.map(i => Number(i.category_id)).filter(Boolean) : [];

        if (catIds.length > 0) {
            await kpiMktApiCall('/api/reports/kpi-marketing/assign-handler', 'POST', {
                category_ids: catIds,
                ads_handler_name: ''
            });
        }

        await loadKpimarketingData();
        alert(`🗑️ Đã xóa Bảng Báo Cáo "${handlerName}" thành công! Tất cả Page đã được giải phóng (về trạng thái Chưa Gán).`);
    } catch(e) {
        alert('❌ Lỗi kết nối hệ thống: ' + e.message);
    }
}

// ========== MARKETING ADS TREND ANALYSIS CHART ENGINE ==========
window._kpiMktTrendState = {
    cat_id: 'all',
    granularity: 'day', // 'day' | 'month'
    year: (new Date()).getFullYear(),
    selectedMetrics: new Set(['spent', 'orders', 'revenue']),
    yearlyCache: {}
};

async function _kpiMktEnsureChartJs() {
    if (window.Chart) return true;
    return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

function kpiInitMktTrendSection(res) {
    const container = document.getElementById('kpiMktTrendSection');
    if (!container) return;

    if (!document.getElementById('chartKpiMktTrend')) {
        const p = (_kpiMkt.month || '').split('-').map(Number);
        const curYr = p[0] || (new Date()).getFullYear();
        const curMo = p[1] || ((new Date()).getMonth() + 1);

        container.innerHTML = `
            <div style="background:#fff;border-radius:16px;border:1.5px solid #cbd5e1;box-shadow:0 4px 20px rgba(0,0,0,0.06);margin-bottom:24px;padding:20px;overflow:hidden">
                <!-- Header Controls -->
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
                    <div>
                        <h3 style="font-size:16px;font-weight:800;color:#1e1b4b;margin:0;display:flex;align-items:center;gap:8px">
                            <span>📈 BIỂU ĐỒ XU HƯỚNG HIỆU SUẤT MARKETING ADS</span>
                            <span id="kpiMktTrendModeBadge" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#e0e7ff;color:#4338ca">Theo Ngày (Tất Cả - Tháng ${curMo}/${curYr})</span>
                        </h3>
                        <div style="font-size:12px;color:#64748b;margin-top:2px">Thống kê Chi Phí, Đơn Hàng, Doanh Số, % CP/Doanh Số, Tỷ Lệ Chốt, CPO, Lead & CPL qua từng mốc thời gian</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <select id="kpiMktCatSelect" onchange="kpiChangeMktTrendFilter()" style="padding:7px 12px;border-radius:10px;border:1.5px solid #0284c7;font-weight:700;font-size:12px;color:#0369a1;outline:none;background:#f0f9ff;cursor:pointer">
                            <option value="all">🏢 Tất Cả Mục Con Marketing Ads</option>
                        </select>
                        <select id="kpiMktGranularitySelect" onchange="kpiChangeMktTrendFilter()" style="padding:7px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12px;color:#1e1b4b;outline:none;background:#f8fafc;cursor:pointer">
                            <option value="day">📅 Xem Theo Ngày (Trong Tháng)</option>
                            <option value="month">📆 Xem Theo Tháng (Trong Năm)</option>
                        </select>
                        <select id="kpiMktYearSelect" onchange="kpiChangeMktTrendFilter()" style="padding:7px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12px;color:#1e1b4b;outline:none;background:#f8fafc;cursor:pointer;display:none">
                        </select>
                    </div>
                </div>

                <!-- Multi Metric Toggles (8 Metrics) -->
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;background:#f8fafc;padding:10px 14px;border-radius:12px;border:1px solid #f1f5f9">
                    <span style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-right:4px">📊 CHỈ SỐ THEO DÕI (NHÁY ĐÚP ĐỂ XEM BẢNG PHÂN TÍCH):</span>
                    <button id="btnMktSpent" onclick="kpiToggleMktMetric('spent')" ondblclick="kpiMktOpenMetricDetailModal('spent')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #d97706;background:#d97706;color:#fff;font-size:11px;font-weight:700;cursor:pointer">💸 Chi Phí MKT ✖</button>
                    <button id="btnMktOrders" onclick="kpiToggleMktMetric('orders')" ondblclick="kpiMktOpenMetricDetailModal('orders')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #16a34a;background:#16a34a;color:#fff;font-size:11px;font-weight:700;cursor:pointer">📦 Đơn Hàng ✖</button>
                    <button id="btnMktRev" onclick="kpiToggleMktMetric('revenue')" ondblclick="kpiMktOpenMetricDetailModal('revenue')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #0284c7;background:#0284c7;color:#fff;font-size:11px;font-weight:700;cursor:pointer">💰 Doanh Số ✖</button>
                    <div style="height:16px;width:1px;background:#cbd5e1;margin:0 2px"></div>
                    <button id="btnMktCostRatio" onclick="kpiToggleMktMetric('cost_ratio')" ondblclick="kpiMktOpenMetricDetailModal('cost_ratio')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:700;cursor:pointer">📉 % CP / Doanh Số</button>
                    <button id="btnMktCloseRate" onclick="kpiToggleMktMetric('close_rate')" ondblclick="kpiMktOpenMetricDetailModal('close_rate')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:700;cursor:pointer">🎯 Tỷ Lệ Chốt</button>
                    <button id="btnMktCpo" onclick="kpiToggleMktMetric('cpo')" ondblclick="kpiMktOpenMetricDetailModal('cpo')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:700;cursor:pointer">🎯 CPO (Giá/Đơn)</button>
                    <button id="btnMktLeads" onclick="kpiToggleMktMetric('leads')" ondblclick="kpiMktOpenMetricDetailModal('leads')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:700;cursor:pointer">📥 Số Lead</button>
                    <button id="btnMktCpl" onclick="kpiToggleMktMetric('cpl')" ondblclick="kpiMktOpenMetricDetailModal('cpl')" title="Nhấn 1 lần để Bật/Tắt — NHÁY ĐÚP để mở Bảng Phân Tích Chi Tiết" class="kpi-metric-btn" style="padding:5px 12px;border-radius:20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:700;cursor:pointer">📊 CPL (Giá/Lead)</button>
                </div>

                <!-- Summary Cards -->
                <div id="kpiMktTrendSummaryCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px"></div>

                <!-- Canvas -->
                <div style="position:relative;height:330px;width:100%">
                    <canvas id="chartKpiMktTrend"></canvas>
                </div>
            </div>
        `;
    }

    // Populate Category Select Options
    const catSelect = document.getElementById('kpiMktCatSelect');
    if (catSelect && res) {
        const curVal = catSelect.value || 'all';
        let optHtml = '<option value="all">🏢 Tất Cả Mục Con Marketing Ads</option>';
        const addedIds = new Set();
        const cats = res.categories || [];
        cats.forEach(c => {
            const cid = c.category_id || c.id;
            if (cid && !addedIds.has(cid)) {
                addedIds.add(cid);
                optHtml += `<option value="${cid}">📌 ${c.category_name || c.name} (${c.channel_name || 'MKT'})</option>`;
            }
        });
        catSelect.innerHTML = optHtml;
        catSelect.value = addedIds.has(parseInt(curVal)) ? curVal : 'all';
    }

    // Populate Year Select
    const yearSelect = document.getElementById('kpiMktYearSelect');
    if (yearSelect && !yearSelect.hasChildNodes()) {
        const curY = (new Date()).getFullYear();
        let yHtml = '';
        for (let y = curY; y >= curY - 2; y--) {
            yHtml += `<option value="${y}">Năm ${y}</option>`;
        }
        yearSelect.innerHTML = yHtml;
        yearSelect.value = curY;
    }

    kpiRenderMktTrendChart();
}

function kpiToggleMktMetric(metric) {
    const st = window._kpiMktTrendState.selectedMetrics;
    if (st.has(metric)) {
        if (st.size > 1) st.delete(metric);
    } else {
        st.add(metric);
    }
    _updateKpiMktTrendButtonsUI();
    kpiRenderMktTrendChart();
}

function _updateKpiMktTrendButtonsUI() {
    const st = window._kpiMktTrendState.selectedMetrics;
    const configs = [
        { id: 'btnMktSpent', key: 'spent', label: '💸 Chi Phí MKT', activeBg: '#d97706' },
        { id: 'btnMktOrders', key: 'orders', label: '📦 Đơn Hàng', activeBg: '#16a34a' },
        { id: 'btnMktRev', key: 'revenue', label: '💰 Doanh Số', activeBg: '#0284c7' },
        { id: 'btnMktCostRatio', key: 'cost_ratio', label: '📉 % CP / Doanh Số', activeBg: '#4f46e5' },
        { id: 'btnMktCloseRate', key: 'close_rate', label: '🎯 Tỷ Lệ Chốt', activeBg: '#ea580c' },
        { id: 'btnMktCpo', key: 'cpo', label: '🎯 CPO (Giá/Đơn)', activeBg: '#dc2626' },
        { id: 'btnMktLeads', key: 'leads', label: '📥 Số Lead', activeBg: '#2563eb' },
        { id: 'btnMktCpl', key: 'cpl', label: '📊 CPL (Giá/Lead)', activeBg: '#7c3aed' }
    ];

    configs.forEach(cfg => {
        const btn = document.getElementById(cfg.id);
        if (btn) {
            if (st.has(cfg.key)) {
                btn.style.background = cfg.activeBg;
                btn.style.color = '#fff';
                btn.style.borderColor = cfg.activeBg;
                btn.innerText = cfg.label + ' ✖';
            } else {
                btn.style.background = '#fff';
                btn.style.color = '#475569';
                btn.style.borderColor = '#cbd5e1';
                btn.innerText = cfg.label;
            }
        }
    });
}

function kpiChangeMktTrendFilter() {
    const catSel = document.getElementById('kpiMktCatSelect');
    const granSel = document.getElementById('kpiMktGranularitySelect');
    const yearSel = document.getElementById('kpiMktYearSelect');

    if (catSel) window._kpiMktTrendState.cat_id = catSel.value || 'all';
    if (granSel) window._kpiMktTrendState.granularity = granSel.value;
    if (yearSel) window._kpiMktTrendState.year = parseInt(yearSel.value) || (new Date()).getFullYear();

    if (yearSel) {
        yearSel.style.display = window._kpiMktTrendState.granularity === 'month' ? 'inline-block' : 'none';
    }

    const badge = document.getElementById('kpiMktTrendModeBadge');
    if (badge) {
        let catText = 'Tất Cả';
        if (catSel && catSel.selectedIndex >= 0) {
            catText = catSel.options[catSel.selectedIndex].text.replace(/^[🏢📌]\s*/, '').split(' (')[0];
        }

        if (window._kpiMktTrendState.granularity === 'month') {
            badge.innerText = `Theo Tháng (${catText} - Năm ${window._kpiMktTrendState.year})`;
        } else {
            const p = (_kpiMkt.month || '').split('-').map(Number);
            badge.innerText = `Theo Ngày (${catText} - Tháng ${p[1]}/${p[0]})`;
        }
    }

    kpiRenderMktTrendChart();
}

async function kpiRenderMktTrendChart() {
    await _kpiMktEnsureChartJs();
    const canvas = document.getElementById('chartKpiMktTrend');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const st = window._kpiMktTrendState;
    const isDaily = st.granularity === 'day';
    const catId = st.cat_id;

    let labels = [];
    let spentArr = [], ordersArr = [], revArr = [], leadsArr = [];
    let cplArr = [], cpoArr = [], costRatioArr = [], closeRateArr = [];

    if (isDaily) {
        const data = _kpiMkt.data;
        if (!data || !data.summary) return;

        const daysInMonth = data.month?.days_in_month || 31;
        const mo = data.month?.month || 8;

        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(`${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}`);
        }

        let targetDailyObj = null;
        if (catId === 'all') {
            targetDailyObj = data.summary?.daily || {};
        } else {
            const foundCat = (data.categories || []).find(c => (c.category_id == catId || c.id == catId));
            if (foundCat) {
                targetDailyObj = foundCat.daily || {
                    spent: foundCat.daily_spent,
                    leads: foundCat.daily_leads,
                    orders: foundCat.daily_orders,
                    revenue: foundCat.daily_revenue,
                    cpl: foundCat.daily_cpl,
                    cpo: foundCat.daily_cpo,
                    close_rate: foundCat.daily_close_rate
                };
            }
        }

        spentArr = (targetDailyObj?.spent) || new Array(daysInMonth).fill(0);
        ordersArr = (targetDailyObj?.orders) || new Array(daysInMonth).fill(0);
        revArr = (targetDailyObj?.revenue) || new Array(daysInMonth).fill(0);
        leadsArr = (targetDailyObj?.leads) || new Array(daysInMonth).fill(0);
        cplArr = (targetDailyObj?.cpl) || new Array(daysInMonth).fill(0);
        cpoArr = (targetDailyObj?.cpo) || new Array(daysInMonth).fill(0);
        costRatioArr = (targetDailyObj?.cost_ratio) || revArr.map((r, i) => r > 0 ? Math.round((spentArr[i] / r) * 10000) / 100 : 0);
        closeRateArr = (targetDailyObj?.close_rate) || leadsArr.map((l, i) => l > 0 ? Math.round((ordersArr[i] / l) * 10000) / 100 : 0);

    } else {
        labels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const year = st.year;
        if (!st.yearlyCache[year]) {
            try {
                st.yearlyCache[year] = await kpiMktApiCall('/api/reports/kpi-marketing/yearly-trend?year=' + year + '&_t=' + Date.now());
            } catch(e) {
                st.yearlyCache[year] = null;
            }
        }
        const yData = st.yearlyCache[year];
        if (yData && yData.by_cat) {
            const catObj = yData.by_cat[catId] || yData.by_cat['all'] || {};
            spentArr = catObj.monthly_spent || new Array(12).fill(0);
            ordersArr = catObj.monthly_orders || new Array(12).fill(0);
            revArr = catObj.monthly_revenue || new Array(12).fill(0);
            leadsArr = catObj.monthly_leads || new Array(12).fill(0);
            cplArr = catObj.monthly_cpl || new Array(12).fill(0);
            cpoArr = catObj.monthly_cpo || new Array(12).fill(0);
            costRatioArr = catObj.monthly_cost_ratio || new Array(12).fill(0);
            closeRateArr = catObj.monthly_close_rate || new Array(12).fill(0);
        } else {
            spentArr = new Array(12).fill(0);
            ordersArr = new Array(12).fill(0);
            revArr = new Array(12).fill(0);
            leadsArr = new Array(12).fill(0);
            cplArr = new Array(12).fill(0);
            cpoArr = new Array(12).fill(0);
            costRatioArr = new Array(12).fill(0);
            closeRateArr = new Array(12).fill(0);
        }
    }

    // Render Highlights Summary Cards
    const cardEl = document.getElementById('kpiMktTrendSummaryCards');
    if (cardEl) {
        const maxRev = Math.max(0, ...revArr);
        const maxRevIdx = revArr.indexOf(maxRev);
        const maxRevLabel = maxRevIdx >= 0 ? labels[maxRevIdx] : '-';

        const maxOrd = Math.max(0, ...ordersArr);
        const maxOrdIdx = ordersArr.indexOf(maxOrd);
        const maxOrdLabel = maxOrdIdx >= 0 ? labels[maxOrdIdx] : '-';

        const totalSpent = spentArr.reduce((a, b) => a + b, 0);
        const totalRev = revArr.reduce((a, b) => a + b, 0);
        const totalOrd = ordersArr.reduce((a, b) => a + b, 0);
        const totalLeads = leadsArr.reduce((a, b) => a + b, 0);

        const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
        const avgCostRatio = totalRev > 0 ? (totalSpent / totalRev * 100).toFixed(1) : '0.0';

        cardEl.innerHTML = `
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase">🏆 Đỉnh Doanh Số (Peak)</div>
                <div style="font-size:18px;font-weight:900;color:#1e3a8a;margin-top:2px">${formatVND(maxRev)}</div>
                <div style="font-size:11px;color:#3b82f6;font-weight:700">Mốc: ${maxRevLabel}</div>
            </div>
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase">📦 Kỷ Lục Đơn Hàng (Max)</div>
                <div style="font-size:18px;font-weight:900;color:#14532d;margin-top:2px">${maxOrd} đơn</div>
                <div style="font-size:11px;color:#22c55e;font-weight:700">Mốc: ${maxOrdLabel}</div>
            </div>
            <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#3730a3;text-transform:uppercase">📉 % CP / Doanh Số TB</div>
                <div style="font-size:18px;font-weight:900;color:#312e81;margin-top:2px">${avgCostRatio}%</div>
                <div style="font-size:11px;color:#4f46e5;font-weight:700">CPL TB: ${formatVND(avgCpl)}</div>
            </div>
            <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#9a3412;text-transform:uppercase">💰 Tổng Cộng Trong Kỳ</div>
                <div style="font-size:18px;font-weight:900;color:#7c2d12;margin-top:2px">${formatVND(totalRev)}</div>
                <div style="font-size:11px;color:#ea580c;font-weight:700">Chi CP: ${formatVND(totalSpent)} | ${totalOrd} đơn</div>
            </div>
        `;
    }

    const selected = st.selectedMetrics;
    const datasets = [];
    const scalesConfig = {};

    let hasCurrency = false;
    let hasCount = false;
    let hasPct = false;

    if (selected.has('spent')) {
        hasCurrency = true;
        datasets.push({
            label: '💸 Chi Phí MKT (đ)',
            data: spentArr,
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            yAxisID: 'yRev',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('revenue')) {
        hasCurrency = true;
        datasets.push({
            label: '💰 Doanh Số (đ)',
            data: revArr,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            yAxisID: 'yRev',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('cpo')) {
        hasCurrency = true;
        datasets.push({
            label: '🎯 CPO Giá/Đơn (đ)',
            data: cpoArr,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            yAxisID: 'yRev',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('cpl')) {
        hasCurrency = true;
        datasets.push({
            label: '📊 CPL Giá/Lead (đ)',
            data: cplArr,
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
            yAxisID: 'yRev',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('orders')) {
        hasCount = true;
        datasets.push({
            label: '📦 Đơn Hàng (đơn)',
            data: ordersArr,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            yAxisID: 'yOrd',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('leads')) {
        hasCount = true;
        datasets.push({
            label: '📥 Số Lead (tin nhắn)',
            data: leadsArr,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            yAxisID: 'yOrd',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('cost_ratio')) {
        hasPct = true;
        datasets.push({
            label: '📉 % CP / Doanh Số (%)',
            data: costRatioArr,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            yAxisID: 'yPct',
            tension: 0.3,
            borderWidth: 2.5
        });
    }
    if (selected.has('close_rate')) {
        hasPct = true;
        datasets.push({
            label: '🎯 Tỷ Lệ Chốt (%)',
            data: closeRateArr,
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234, 88, 12, 0.08)',
            yAxisID: 'yPct',
            tension: 0.3,
            borderWidth: 2.5
        });
    }

    if (hasCurrency) {
        scalesConfig.yRev = {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v)) + 'đ' }
        };
    }
    if (hasCount) {
        scalesConfig.yOrd = {
            type: 'linear',
            display: true,
            position: hasCurrency ? 'right' : 'left',
            grid: { drawOnChartArea: !hasCurrency },
            ticks: { precision: 0 }
        };
    }
    if (hasPct) {
        scalesConfig.yPct = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: !(hasCurrency || hasCount) },
            ticks: { callback: v => v + '%' }
        };
    }

    if (window._chartKpiMktTrend) {
        window._chartKpiMktTrend.destroy();
    }

    window._chartKpiMktTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: datasets.length > 1, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                const val = context.parsed.y;
                                const yId = context.dataset.yAxisID;
                                if (yId === 'yRev') {
                                    label += formatVND(val);
                                } else if (yId === 'yPct') {
                                    label += val + '%';
                                } else {
                                    label += val;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: scalesConfig
        }
    });
    canvas.ondblclick = (evt) => {
        if (window._chartKpiMktTrend) {
            const points = window._chartKpiMktTrend.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
                const dsIndex = points[0].datasetIndex;
                const dataset = window._chartKpiMktTrend.data.datasets[dsIndex];
                if (dataset) {
                    const keyMap = {
                        '💸 Chi Phí MKT (đ)': 'spent',
                        '📦 Đơn Hàng (đơn)': 'orders',
                        '💰 Doanh Số (đ)': 'revenue',
                        '📉 % CP / Doanh Số (%)': 'cost_ratio',
                        '🎯 Tỷ Lệ Chốt (%)': 'close_rate',
                        '🎯 CPO Giá/Đơn (đ)': 'cpo',
                        '📥 Số Lead (tin nhắn)': 'leads',
                        '📊 CPL Giá/Lead (đ)': 'cpl'
                    };
                    const metricKey = keyMap[dataset.label] || 'revenue';
                    kpiMktOpenMetricDetailModal(metricKey);
                }
            }
        }
    };
}

function kpiMktOpenMetricDetailModal(metricKey) {
    const st = window._kpiMktTrendState || {};
    const isDaily = st.granularity === 'day';
    const catId = st.cat_id;
    const data = _kpiMkt.data;
    if (!data) return;

    const metricConfigs = {
        spent: { name: '💸 CHI PHÍ MKT', fullLabel: 'Chi phí Quảng Cáo', unit: 'đ', isCurrency: true, isLowerBetter: true, color: '#d97706', bg: '#fef3c7' },
        orders: { name: '📦 ĐƠN HÀNG', fullLabel: 'SL Đơn hàng mới', unit: 'đơn', isCurrency: false, isLowerBetter: false, color: '#16a34a', bg: '#dcfce7' },
        revenue: { name: '💰 DOANH SỐ', fullLabel: 'Doanh thu đơn hàng mới', unit: 'đ', isCurrency: true, isLowerBetter: false, color: '#0284c7', bg: '#e0f2fe' },
        cost_ratio: { name: '📉 % CP / DOANH SỐ', fullLabel: 'Tỷ lệ Chi phí MKT / Doanh số', unit: '%', isCurrency: false, isPct: true, isLowerBetter: true, color: '#4f46e5', bg: '#e0e7ff' },
        close_rate: { name: '🎯 TỶ LỆ CHỐT', fullLabel: 'Tỷ lệ Đơn hàng / Số lead', unit: '%', isCurrency: false, isPct: true, isLowerBetter: false, color: '#ea580c', bg: '#ffedd5' },
        cpo: { name: '🎯 CPO (GIÁ / ĐƠN)', fullLabel: 'Chi phí MKT / Đơn hàng', unit: 'đ', isCurrency: true, isLowerBetter: true, color: '#dc2626', bg: '#fee2e2' },
        leads: { name: '📥 SỐ LEAD', fullLabel: 'SL Lead (Tin nhắn phát sinh)', unit: 'khách', isCurrency: false, isLowerBetter: false, color: '#2563eb', bg: '#dbeafe' },
        cpl: { name: '📊 CPL (GIÁ / LEAD)', fullLabel: 'Chi phí MKT / Số lead', unit: 'đ', isCurrency: true, isLowerBetter: true, color: '#7c3aed', bg: '#f3e8ff' }
    };

    const cfg = metricConfigs[metricKey] || metricConfigs['revenue'];

    let labels = [];
    let spentArr = [], ordersArr = [], revArr = [], leadsArr = [];
    let cplArr = [], cpoArr = [], costRatioArr = [], closeRateArr = [];

    if (isDaily) {
        const daysInMonth = data.month?.days_in_month || 31;
        const mo = data.month?.month || 8;
        const yr = data.month?.year || 2026;
        const vnDays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(yr, mo - 1, d);
            const dayName = vnDays[dt.getDay()];
            labels.push(`${dayName} - ${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}`);
        }

        let targetDailyObj = null;
        if (catId === 'all') {
            targetDailyObj = data.summary?.daily || {};
        } else {
            const foundCat = (data.categories || []).find(c => (c.category_id == catId || c.id == catId));
            if (foundCat) {
                targetDailyObj = foundCat.daily || {
                    spent: foundCat.daily_spent,
                    leads: foundCat.daily_leads,
                    orders: foundCat.daily_orders,
                    revenue: foundCat.daily_revenue,
                    cpl: foundCat.daily_cpl,
                    cpo: foundCat.daily_cpo,
                    close_rate: foundCat.daily_close_rate
                };
            }
        }

        spentArr = (targetDailyObj?.spent) || new Array(daysInMonth).fill(0);
        ordersArr = (targetDailyObj?.orders) || new Array(daysInMonth).fill(0);
        revArr = (targetDailyObj?.revenue) || new Array(daysInMonth).fill(0);
        leadsArr = (targetDailyObj?.leads) || new Array(daysInMonth).fill(0);
        cplArr = (targetDailyObj?.cpl) || new Array(daysInMonth).fill(0);
        cpoArr = (targetDailyObj?.cpo) || new Array(daysInMonth).fill(0);
        costRatioArr = (targetDailyObj?.cost_ratio) || revArr.map((r, i) => r > 0 ? Math.round((spentArr[i] / r) * 10000) / 100 : 0);
        closeRateArr = (targetDailyObj?.close_rate) || leadsArr.map((l, i) => l > 0 ? Math.round((ordersArr[i] / l) * 10000) / 100 : 0);
    } else {
        labels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const yData = st.yearlyCache[st.year];
        if (yData && yData.by_cat) {
            const catObj = (catId && yData.by_cat[catId]) ? yData.by_cat[catId] : (yData.by_cat['all'] || {});
            spentArr = catObj.monthly_spent || new Array(12).fill(0);
            ordersArr = catObj.monthly_orders || new Array(12).fill(0);
            revArr = catObj.monthly_revenue || new Array(12).fill(0);
            leadsArr = catObj.monthly_leads || new Array(12).fill(0);
            cplArr = catObj.monthly_cpl || new Array(12).fill(0);
            cpoArr = catObj.monthly_cpo || new Array(12).fill(0);
            costRatioArr = catObj.monthly_cost_ratio || new Array(12).fill(0);
            closeRateArr = catObj.monthly_close_rate || new Array(12).fill(0);
        } else {
            spentArr = new Array(12).fill(0);
            ordersArr = new Array(12).fill(0);
            revArr = new Array(12).fill(0);
            leadsArr = new Array(12).fill(0);
            cplArr = new Array(12).fill(0);
            cpoArr = new Array(12).fill(0);
            costRatioArr = new Array(12).fill(0);
            closeRateArr = new Array(12).fill(0);
        }
    }

    let metricValMap = {
        spent: spentArr,
        orders: ordersArr,
        revenue: revArr,
        cost_ratio: costRatioArr,
        close_rate: closeRateArr,
        cpo: cpoArr,
        leads: leadsArr,
        cpl: cplArr
    };

    const targetArr = metricValMap[metricKey] || revArr;

    let bestIdx = 0, worstIdx = 0;
    let bestVal = 0, worstVal = 0;

    if (cfg.isLowerBetter) {
        const validItems = targetArr.map((v, i) => ({ val: v, i })).filter(item => item.val > 0);
        if (validItems.length > 0) {
            validItems.sort((a, b) => a.val - b.val);
            bestIdx = validItems[0].i;
            bestVal = validItems[0].val;
            worstIdx = validItems[validItems.length - 1].i;
            worstVal = validItems[validItems.length - 1].val;
        } else {
            bestIdx = 0; bestVal = 0;
            worstIdx = 0; worstVal = 0;
        }
    } else {
        const validItems = targetArr.map((v, i) => ({ val: v, i }));
        validItems.sort((a, b) => b.val - a.val);
        bestIdx = validItems[0].i;
        bestVal = validItems[0].val;

        const activeItems = validItems.filter(item => spentArr[item.i] > 0 || item.val > 0);
        if (activeItems.length > 0) {
            worstIdx = activeItems[activeItems.length - 1].i;
            worstVal = activeItems[activeItems.length - 1].val;
        } else {
            worstIdx = validItems[validItems.length - 1].i;
            worstVal = validItems[validItems.length - 1].val;
        }
    }

    const formatMetric = (val) => {
        if (cfg.isCurrency) return formatVND(val);
        if (cfg.isPct) return val + '%';
        return val + ' ' + cfg.unit;
    };

    let catLabel = '🏢 Tất Cả Mục Con Marketing Ads';
    const catSel = document.getElementById('kpiMktCatSelect');
    if (catSel && catSel.selectedIndex >= 0) {
        catLabel = catSel.options[catSel.selectedIndex].text;
    }

    const timeLabel = isDaily ? `Theo Ngày (Trong Tháng ${data.month?.month}/${data.month?.year})` : `Theo Tháng (Trong Năm ${st.year})`;

    let rowsHtml = '';
    labels.forEach((lbl, idx) => {
        const val = targetArr[idx];
        const s = spentArr[idx];
        const l = leadsArr[idx];
        const o = ordersArr[idx];
        const r = revArr[idx];

        let badgeHtml = '';
        if (idx === bestIdx && (val > 0 || cfg.isLowerBetter)) {
            badgeHtml = '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:12px;font-weight:800;font-size:11px">🟢 HIỆU QUẢ NHẤT</span>';
        } else if (idx === worstIdx && (s > 0 || val > 0)) {
            badgeHtml = '<span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:12px;font-weight:800;font-size:11px">🔴 KÉM HIỆU QUẢ</span>';
        } else if (s > 0 || r > 0 || l > 0 || o > 0) {
            badgeHtml = '<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:12px;font-weight:700;font-size:11px">🟡 TRUNG BÌNH</span>';
        } else {
            badgeHtml = '<span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px">⚪ CHƯA PHÁT SINH</span>';
        }

        const rowBg = idx === bestIdx ? '#f0fdf4' : (idx === worstIdx ? '#fff1f2' : (idx % 2 === 0 ? '#fff' : '#f8fafc'));

        rowsHtml += `
            <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;transition:all 0.15s">
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
                <td style="padding:10px 12px;font-weight:800;color:#1e1b4b">${lbl}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:900;color:${cfg.color};font-size:14px">${formatMetric(val)}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#d97706">${formatVND(s)}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#2563eb">${l} khách</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#16a34a">${o} đơn</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:#0284c7">${formatVND(r)}</td>
                <td style="padding:10px 12px;text-align:center">${badgeHtml}</td>
            </tr>
        `;
    });

    const existing = document.getElementById('kpiMktMetricDetailModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kpiMktMetricDetailModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';

    modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:960px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:kpiModalPop 0.25s ease-out">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:20px 24px;color:#fff;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:900;display:flex;align-items:center;gap:10px">
                        <span>📊 THỐNG KÊ CHI TIẾT & PHÂN TÍCH HIỆU SUẤT</span>
                        <span style="background:${cfg.bg};color:${cfg.color};font-size:12px;padding:3px 12px;border-radius:16px;font-weight:800">${cfg.name}</span>
                    </h3>
                    <div style="font-size:12px;color:#c7d2fe;margin-top:4px">
                        📌 ${catLabel} | 📅 ${timeLabel}
                    </div>
                </div>
                <button onclick="document.getElementById('kpiMktMetricDetailModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;font-weight:800;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s">✕</button>
            </div>

            <!-- Modal Content Body -->
            <div style="padding:20px 24px;overflow-y:auto;flex:1">
                <!-- Smart Analysis Cards -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px">
                    <!-- Best Card -->
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:14px;padding:16px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase">🌟 Mốc Hiệu Quả Nhất</span>
                            <span style="background:#22c55e;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px">${labels[bestIdx] || '-'}</span>
                        </div>
                        <div style="font-size:22px;font-weight:900;color:#14532d;margin-top:6px">${formatMetric(bestVal || 0)}</div>
                        <div style="font-size:12px;color:#15803d;margin-top:4px;font-weight:600">
                            Chi phí: <b>${formatVND(spentArr[bestIdx] || 0)}</b> | Doanh số: <b>${formatVND(revArr[bestIdx] || 0)}</b> | <b>${ordersArr[bestIdx] || 0} đơn</b>
                        </div>
                    </div>

                    <!-- Worst Card -->
                    <div style="background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1.5px solid #fca5a5;border-radius:14px;padding:16px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-size:11px;font-weight:800;color:#9f1239;text-transform:uppercase">⚠️ Mốc Kém Hiệu Quả Nhất</span>
                            <span style="background:#f43f5e;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px">${labels[worstIdx] || '-'}</span>
                        </div>
                        <div style="font-size:22px;font-weight:900;color:#881337;margin-top:6px">${formatMetric(worstVal || 0)}</div>
                        <div style="font-size:12px;color:#be123c;margin-top:4px;font-weight:600">
                            Chi phí: <b>${formatVND(spentArr[worstIdx] || 0)}</b> | Doanh số: <b>${formatVND(revArr[worstIdx] || 0)}</b> | <b>${ordersArr[worstIdx] || 0} đơn</b>
                        </div>
                    </div>
                </div>

                <!-- Detailed Table -->
                <div style="border:1.5px solid #cbd5e1;border-radius:14px;overflow:hidden">
                    <div style="background:#f8fafc;padding:12px 16px;font-size:13px;font-weight:800;color:#1e1b4b;border-bottom:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:space-between">
                        <span>📌 BẢNG THỐNG KÊ CHI TIẾT THEO MỐC THỜI GIAN (${labels.length} mốc)</span>
                        <span style="font-size:11px;color:#64748b">Cột màu rực rỡ thể hiện giá trị chỉ số đang xem</span>
                    </div>
                    <div style="max-height:360px;overflow-y:auto">
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <thead style="position:sticky;top:0;background:#f1f5f9;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
                                <tr>
                                    <th style="padding:10px;text-align:center;width:40px">STT</th>
                                    <th style="padding:10px;text-align:left">Mốc Thời Gian</th>
                                    <th style="padding:10px;text-align:right;background:${cfg.bg};color:${cfg.color};font-weight:900">${cfg.name}</th>
                                    <th style="padding:10px;text-align:right">Chi Phí MKT</th>
                                    <th style="padding:10px;text-align:right">Số Lead</th>
                                    <th style="padding:10px;text-align:right">Đơn Hàng</th>
                                    <th style="padding:10px;text-align:right">Doanh Số</th>
                                    <th style="padding:10px;text-align:center">Đánh Giá Hiệu Quả</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:12px;color:#64748b;font-weight:600">
                    💡 Mẹo: Nháy đúp vào bất kỳ nút chỉ số nào để mở bảng phân tích chi tiết.
                </div>
                <button onclick="document.getElementById('kpiMktMetricDetailModal').remove()" style="padding:8px 20px;border-radius:10px;background:#1e1b4b;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer">Đóng Cửa Sổ</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/* WINDOW EXPORTS FOR ROUTER */
if (typeof window !== 'undefined') {
    window.renderKpimarketingPage = renderKpimarketingPage;
    window.loadKpimarketingData = loadKpimarketingData;
    window.kpiMktChangeMonth = kpiMktChangeMonth;
    window.kpiMktPickMonth = kpiMktPickMonth;
    window.kpiMktOnMonthInput = kpiMktOnMonthInput;
    window.kpiMktOpenAddCatModal = kpiMktOpenAddCatModal;
    window.kpiMktCloseAddCatModal = kpiMktCloseAddCatModal;
    window.kpiMktOnChannelChange = kpiMktOnChannelChange;
    window.kpiMktOnSubCatSelectChange = kpiMktOnSubCatSelectChange;
    window.kpiMktOnPageSelectChange = kpiMktOnPageSelectChange;
    window.kpiMktOnHandlerSelectChange = kpiMktOnHandlerSelectChange;
    window.kpiMktSaveNewCategory = kpiMktSaveNewCategory;
    window.kpiMktDeleteCategory = kpiMktDeleteCategory;
    window.kpiMktOpenOrdersModal = kpiMktOpenOrdersModal;
    window.renderKpiMktHandlersTable = renderKpiMktHandlersTable;
    window.kpiMktOpenAssignModal = kpiMktOpenAssignModal;
    window.kpiMktSaveAssignHandler = kpiMktSaveAssignHandler;
    window.kpiMktOpenSetTargetModal = kpiMktOpenSetTargetModal;
    window.kpiMktAutoCalcM2 = kpiMktAutoCalcM2;
    window.kpiMktSaveTargetForHandler = kpiMktSaveTargetForHandler;
    window.kpiMktOnScopeChange = kpiMktOnScopeChange;
    window.kpiMktFormatInputNumber = kpiMktFormatInputNumber;
    window.kpiMktParseVnInt = kpiMktParseVnInt;
    window.kpiMktOpenCreateEmployeeModal = kpiMktOpenCreateEmployeeModal;
    window.kpiMktRenderCreateEmpCheckboxes = kpiMktRenderCreateEmpCheckboxes;
    window.kpiMktOnCreateEmpSelectChange = kpiMktOnCreateEmpSelectChange;
    window.kpiMktSaveCreateEmployee = kpiMktSaveCreateEmployee;
    window.kpiMktResetAllAssignments = kpiMktResetAllAssignments;
    window.kpiMktUnassignSinglePage = kpiMktUnassignSinglePage;
    window.kpiMktDeleteCard = kpiMktDeleteCard;
    window.kpiInitMktTrendSection = kpiInitMktTrendSection;
    window.kpiToggleMktMetric = kpiToggleMktMetric;
    window.kpiChangeMktTrendFilter = kpiChangeMktTrendFilter;
    window.kpiRenderMktTrendChart = kpiRenderMktTrendChart;
    window.kpiMktOpenMetricDetailModal = kpiMktOpenMetricDetailModal;

    setTimeout(function() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('kpimarketing') || path.includes('kpi-marketing')) {
            const container = document.getElementById('contentArea') || document.getElementById('mainContent') || document.getElementById('app');
            if (container && typeof window.renderKpimarketingPage === 'function') {
                window.renderKpimarketingPage(container);
            }
        }
    }, 100);
}

