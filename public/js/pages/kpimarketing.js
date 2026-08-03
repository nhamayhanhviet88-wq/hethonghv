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
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        opts.body = JSON.stringify(body);
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
            .kpi-v2-tbl-wrap { background: #fff; border-radius: 14px; border: 1px solid #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow-x: auto; margin-bottom: 30px; }
            .kpi-v2-tbl { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
            .kpi-v2-tbl th { background: #1e293b; color: #f8fafc; padding: 12px 14px; font-weight: 800; font-size: 12px; letter-spacing: 0.3px; border-bottom: 2px solid #0f172a; white-space: nowrap; text-align: center; }
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

            <!-- SECTION TITLE -->
            <div class="kpi-v2-sec-hdr">
                <div class="kpi-v2-sec-title">
                    <span>📌 DANH SÁCH MỤC CON & CHỈ SỐ MARKETING CHI TIẾT</span>
                </div>
            </div>

            <!-- MAIN TABLE OF SUB-CATEGORIES -->
            <div class="kpi-v2-tbl-wrap" style="margin-bottom: 30px;">
                <table class="kpi-v2-tbl" id="kpiMktTable">
                    <thead>
                        <tr>
                            <th style="width:45px">STT</th>
                            <th style="text-align:left;min-width:220px">Mục Con / Mã Nguồn (Channel & Page)</th>
                            <th style="width:145px">
                                💸 CHI PHÍ MKT
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí Quảng Cáo)</span>
                            </th>
                            <th style="width:115px">
                                📦 ĐƠN HÀNG
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(SL đơn hàng)</span>
                            </th>
                            <th style="width:150px">
                                💰 DOANH SỐ (đ)
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Doanh thu đơn hàng)</span>
                            </th>
                            <th style="width:155px">
                                📉 % CP / DOANH SỐ
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí MKT / Doanh số)</span>
                            </th>
                            <th style="width:140px">
                                🎯 TỶ LỆ CHỐT
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Đơn hàng / Số lead)</span>
                            </th>
                            <th style="width:150px">
                                🎯 CPO (GIÁ/ĐƠN)
                                <span style="font-size:10px;font-weight:500;color:#cbd5e1;display:block;margin-top:3px;letter-spacing:0">(Chi phí MKT / Đơn hàng)</span>
                            </th>
                            <th style="width:120px">
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
            <div class="kpi-v2-sec-hdr" style="border-left-color: #0284c7; background: linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%);">
                <div class="kpi-v2-sec-title" style="color: #0369a1;">
                    <span>👥 BẢNG GÁN & BÁO CÁO KPI MARKETING ADS THEO NHÂN VIÊN</span>
                </div>
            </div>

            <!-- TABLE OF MARKETING HANDLERS / EMPLOYEES -->
            <div class="kpi-v2-tbl-wrap" style="margin-bottom: 30px;">
                <table class="kpi-v2-tbl" id="kpiMktHandlersTable">
                    <tbody id="kpiMktHandlersTbody">
                        <tr><td colspan="12" style="text-align:center;padding:30px;color:#64748b;font-weight:700">⏳ Đang tải dữ liệu KPI theo nhân viên...</td></tr>
                    </tbody>
                </table>
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

        const titleOrders = `${totalOrders.toLocaleString('vi-VN')} Đơn hàng chốt thành công trong ${periodText}`;
        const titleRevenue = `${formatVND(totalRevenue)} Doanh số thu về trong ${periodText}`;
        const titleCostRatio = `${formatVND(totalSpent)} Chi phí MKT / ${formatVND(totalRevenue)} Doanh số = ${costIncomeRatio}%`;
        const titleCpo = `${formatVND(totalSpent)} Chi phí MKT / ${totalOrders} Đơn = ${costPerOrder > 0 ? formatVND(costPerOrder) : '0đ'}`;
        const titleSpent = `${formatVND(totalSpent)} Chi phí MKT đã thực chi trong ${periodText}`;
        const titleLeads = `${totalLeads.toLocaleString('vi-VN')} Khách (Tin Nhắn) trong ${periodText}`;
        const titleCpl = `${formatVND(totalSpent)} Chi phí MKT / ${totalLeads} Tin Nhắn = ${formatVND(avgCpl)}`;
        const titleCloseRate = `${totalOrders} Đơn / ${totalLeads} Tin Nhắn = ${closeRate}%`;

        const cardsContainer = document.getElementById('kpiMktSummaryCards');
        if (cardsContainer) {
            cardsContainer.innerHTML = `
                <!-- HÀNG 1: 4 Ô THỐNG KÊ (Đơn Hàng | Doanh Số | % Chi Phí/Doanh Thu | Giá/Đơn) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
                    <div class="kpi-v2-card" onclick="kpiMktOpenOrdersModal()" data-tooltip="${titleOrders}" title="${titleOrders}" style="border-top:4px solid #2563eb;background:linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span>📦 TỔNG SỐ ĐƠN HÀNG</span>
                            <span style="font-size:10px;color:#2563eb;background:#dbeafe;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                        </div>
                        <div class="kpi-v2-card-val" style="color:#2563eb;margin-top:6px;font-size:22px;">${totalOrders.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">đơn</span></div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Phát sinh trong ${periodText}</div>
                    </div>
                    <div class="kpi-v2-card" onclick="kpiMktOpenOrdersModal()" data-tooltip="${titleRevenue}" title="${titleRevenue}" style="border-top:4px solid #0284c7;background:linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span>💰 DOANH SỐ MKT</span>
                            <span style="font-size:10px;color:#0284c7;background:#e0e7ff;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                        </div>
                        <div class="kpi-v2-card-val" style="color:#0284c7;margin-top:6px;font-size:22px;">${formatVND(totalRevenue)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Doanh số thu về</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCostRatio}" title="${titleCostRatio}" style="border-top:4px solid #4f46e5;background:linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📉 % CHI PHÍ / DOANH THU</div>
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
                    <div class="kpi-v2-card" data-tooltip="${titleSpent}" title="${titleSpent}" style="border-top:4px solid #059669;background:linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">💸 THỰC CHI MARKETING</div>
                        <div class="kpi-v2-card-val" style="color:#059669;margin-top:6px;font-size:22px;">${formatVND(totalSpent)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">${periodText}</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleLeads}" title="${titleLeads}" style="border-top:4px solid #d97706;background:linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📥 TỔNG SỐ LEAD (TIN NHẮN)</div>
                        <div class="kpi-v2-card-val" style="color:#d97706;margin-top:6px;font-size:22px;">${totalLeads.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">khách</span></div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Phát sinh trong ${periodText}</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCpl}" title="${titleCpl}" style="border-top:4px solid #7c3aed;background:linear-gradient(180deg, #f3e8ff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">📊 CPL (GIÁ / LEAD)</div>
                        <div class="kpi-v2-card-val" style="color:#7c3aed;margin-top:6px;font-size:22px;">${formatVND(avgCpl)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Chi phí / 1 tin nhắn</div>
                    </div>
                    <div class="kpi-v2-card" data-tooltip="${titleCloseRate}" title="${titleCloseRate}" style="border-top:4px solid #0891b2;background:linear-gradient(180deg, #ecfeff 0%, #ffffff 100%);text-align:left;align-items:flex-start;padding:16px 18px;">
                        <div class="kpi-v2-card-lbl">🎯 TỶ LỆ CHỐT (DATA CHẤT)</div>
                        <div class="kpi-v2-card-val" style="color:#0891b2;margin-top:6px;font-size:22px;">${closeRate}%</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Tổng số đơn / tổng số lead (tin nhắn)</div>
                    </div>
                </div>
            `;
        }

        // Render Sub-Category Items & Handlers Tables
        renderCategoryTable(res);

    } catch (e) {
        console.error('Error loading KPI Mkt data:', e);
    }
}

function renderCategoryTable(res) {
    const tbody = document.getElementById('kpiMktTbody');
    if (!tbody) return;

    const handlers = (res && res.handlers) ? res.handlers : [];
    const categories = (res && res.categories) ? res.categories : [];
    const catMap = new Map();
    categories.forEach(c => catMap.set(c.id, c));

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

        html += `
            <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td style="text-align:left">
                    <div style="font-weight:800;font-size:13.5px;color:#1e1b4b;display:flex;align-items:center;justify-content:space-between;gap:6px">
                        <span>${c.icon || '📌'} ${escapeHtml(c.category_name)}</span>
                        ${isGiamDoc ? `<button type="button" onclick="kpiMktDeleteCategory('${c.category_id || 0}', '${escapeHtml(c.category_name)}')" title="Xóa mục con này khỏi danh sách" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(220,38,38,0.1);transition:all 0.2s" onmouseover="this.style.background='#fee2e2';this.style.borderColor='#f87171'" onmouseout="this.style.background='#fef2f2';this.style.borderColor='#fca5a5'">🗑️ Xóa</button>` : ''}
                    </div>
                    <div style="font-size:11px;color:#475569;margin-top:3px;display:flex;gap:10px;align-items:center">
                        <span style="background:#f1f5f9;padding:1px 6px;border-radius:4px;color:#475569">Kênh: ${escapeHtml(c.channel_name || 'Khác')}</span>
                        ${c.pancake_page_name ? `<span style="color:#0284c7;font-weight:700">🔗 ${escapeHtml(c.pancake_page_name)}</span>` : ''}
                        <span style="background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:4px;font-weight:700">👤 ${escapeHtml(c.ads_handler_name || 'Giám Đốc')}</span>
                    </div>
                </td>
                <td style="font-weight:700;color:#e11d48">${formatVND(c.spent || 0)}</td>
                <td style="font-weight:700;color:#d97706">${c.orders || 0} đơn</td>
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
            <td style="text-align:left">🏆 TỔNG CỘNG MỤC MARKETING (${itemsList.length} Mục Con)</td>
            <td>${formatVND(totalSpent)}</td>
            <td>${totalOrders} đơn</td>
            <td>${formatVND(totalRevenue)}</td>
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

async function kpiMktOpenOrdersModal() {
    let modal = document.getElementById('kpiMktOrdersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiMktOrdersModal';
        modal.className = 'kpi-v2-modal-overlay';
        modal.innerHTML = `
            <div class="kpi-v2-modal" style="width:1100px;max-width:96vw;max-height:92vh;padding:24px;">
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

        const res = await kpiMktApiCall(url);
        if (res.success && Array.isArray(res.orders)) {
            const allOrders = res.orders;
            const periodTxt = yStr && mStr ? `Tháng ${parseInt(mStr, 10)}/${yStr}` : 'Tháng';

            if (subEl) subEl.textContent = `Báo cáo Đơn hàng First-Touch • ${periodTxt}`;

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
                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                        <td style="padding:11px 12px;text-align:center;font-weight:700;color:#64748b;font-size:12px;">${idx + 1}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#334155;font-size:12.5px;white-space:nowrap;">🕒 ${timeDisp}</td>
                        <td style="padding:11px 12px;font-weight:800;color:#2563eb;font-family:monospace;font-size:13px;white-space:nowrap;">
                            <span style="background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;">${o.order_code}</span>
                        </td>
                        <td style="padding:11px 12px;font-weight:800;color:#0f172a;font-size:13px;">${escapeHtml(o.customer_name)}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#475569;font-size:12.5px;">👤 ${escapeHtml(o.sale_name)}</td>
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
                                <thead>
                                    <tr style="background:#1e293b;border-bottom:2px solid #0f172a;">
                                        <th style="padding:12px;text-align:center;width:40px;color:#ffffff;font-weight:800;font-size:13px;">#</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Thời Gian Chốt</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Mã Đơn</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Tên Khách Hàng</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">NVKD / Sale</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Nguồn Quảng Cáo</th>
                                        <th style="padding:12px;text-align:center;color:#ffffff;font-weight:800;font-size:13px;">Tổng SL</th>
                                        <th style="padding:12px;text-align:right;color:#ffffff;font-weight:800;font-size:13px;">Đặt Cọc</th>
                                        <th style="padding:12px;text-align:right;color:#ffffff;font-weight:800;font-size:13px;">Doanh Số</th>
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

function renderKpiMktHandlersTable(res, itemsList) {
    const tbody = document.getElementById('kpiMktHandlersTbody');
    if (!tbody) return;

    const handlers = (res && res.handlers) ? res.handlers : [];
    const isGiamDoc = kpiMktIsGiamDoc();

    if (handlers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:30px;color:#94a3b8;font-weight:700">Chưa có thông tin nhân viên Marketing</td></tr>`;
        return;
    }

    const allCatList = itemsList || [];

    let html = '';
    handlers.forEach((h, idx) => {
        const handlerName = h.ads_handler_name || 'Giám Đốc';

        // Find all categories assigned to this handlerName
        const assignedItems = allCatList.filter(c => {
            const hN = (c.ads_handler_name || 'Giám Đốc').trim().toLowerCase();
            return hN === handlerName.trim().toLowerCase();
        });

        const displayItems = (h.items && h.items.length > 0) ? h.items : (assignedItems.length > 0 ? assignedItems : []);
        const totalRowsForHandler = Math.max(1, displayItems.length) + 1 + 7; // +1 for Employee Total row, +7 for KPI Target rows

        let totSpent = 0, totLeads = 0, totOrders = 0, totRevenue = 0;

        // Render Dark Header Bar Row for this employee (Matching Image 2 exactly)
        html += `
            <tr class="employee-block-header-row" style="background:#1e293b !important;color:#ffffff !important;font-weight:800 !important;font-size:12px !important;border-top:3px solid #0284c7 !important;border-bottom:2px solid #0f172a !important;">
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:9px 4px;background:#1e293b !important;vertical-align:middle;">STT</td>
                <td style="text-align:left;color:#ffffff;font-weight:800;padding:9px 6px;background:#1e293b !important;vertical-align:middle;">Nhân Viên Marketing (Ads Handler)</td>
                <td style="text-align:left;color:#ffffff;font-weight:800;padding:9px 6px;background:#1e293b !important;vertical-align:middle;">Danh Sách Page / Mục Con Đang Cầm</td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>💸 CHI PHÍ MKT</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Chi phí Quảng Cáo)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>📦 ĐƠN HÀNG</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(SL đơn hàng)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>💰 DOANH SỐ (đ)</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Doanh thu đơn hàng)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>📉 % CP / DOANH SỐ</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Chi phí MKT / Doanh số)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>🎯 TỶ LỆ CHỐT</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Đơn hàng / Số lead)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>🎯 CPO (GIÁ/ĐƠN)</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Chi phí MKT / Đơn hàng)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>📥 SỐ LEAD</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(SL Tin Nhắn)</span>
                </td>
                <td style="text-align:center;color:#ffffff;font-weight:800;padding:7px 4px;background:#1e293b !important;vertical-align:middle;">
                    <span>📊 CPL (GIÁ/LEAD)</span>
                    <span style="font-size:10.5px;font-weight:400;opacity:0.8;display:block;margin-top:2px">(Giá / Tin Nhắn)</span>
                </td>
            </tr>
        `;

        const actionButtonsHtml = isGiamDoc ? `
            <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;margin-top:8px;width:100%;max-width:145px;">
                <button type="button" onclick="kpiMktOpenAssignModal('${escapeHtml(handlerName)}')" style="background:#f3e8ff;color:#7e22ce;border:1.5px solid #d8b4fe;padding:5px 10px;border-radius:8px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 2px rgba(126,34,206,0.1);transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.background='#e9d5ff'" onmouseout="this.style.background='#f3e8ff'">⚙️ Gán Page</button>
                <button type="button" onclick="kpiMktOpenSetTargetModal('${escapeHtml(handlerName)}')" style="background:#ecfdf5;color:#047857;border:1.5px solid #a7f3d0;padding:5px 10px;border-radius:8px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 2px rgba(4,120,87,0.1);transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">🎯 Đặt KPI Tháng</button>
            </div>
        ` : '';

        if (displayItems.length === 0) {
            // Employee has no pages
            html += `
                <tr>
                    <td rowspan="${totalRowsForHandler}" style="text-align:center;vertical-align:middle;font-weight:800;background:#fff">${idx + 1}</td>
                    <td rowspan="${totalRowsForHandler}" style="text-align:left;vertical-align:middle;background:#fff;padding:12px 10px;">
                        <div style="font-weight:800;font-size:14px;color:#1e1b4b;display:flex;align-items:center;gap:6px">
                            <span>👤 ${escapeHtml(handlerName)}</span>
                        </div>
                        ${actionButtonsHtml}
                    </td>
                    <td style="text-align:left;color:#94a3b8;font-style:italic">Chưa gán Page nào</td>
                    <td>0đ</td>
                    <td>0 đơn</td>
                    <td>0đ</td>
                    <td><span class="kpi-pill kpi-pill-purple">0.00%</span></td>
                    <td><span class="kpi-pill kpi-pill-cyan">0.00%</span></td>
                    <td><span class="kpi-pill kpi-pill-orange">0đ</span></td>
                    <td>0</td>
                    <td><span class="kpi-pill kpi-pill-blue">0đ</span></td>
                </tr>
            `;
        } else {
            // Render each Page on its own row
            displayItems.forEach((it, pageIdx) => {
                const itemSpent = Number(it.spent || 0);
                const itemLeads = Number(it.leads || 0);
                const itemOrders = Number(it.orders || 0);
                const itemRevenue = Number(it.revenue || 0);

                totSpent += itemSpent;
                totLeads += itemLeads;
                totOrders += itemOrders;
                totRevenue += itemRevenue;

                const cTgts = it.targets || {};
                const cBudTarget = Number(cTgts.target_budget || 0);
                const cRevM1Target = Number(cTgts.target_revenue_m1 || cTgts.target_revenue || 0);
                const cRevM120Target = Number(cTgts.target_revenue_m120 || (cRevM1Target > 0 ? Math.round(cRevM1Target * 1.2) : 0));
                const cLeadsM1Target = Number(cTgts.target_leads_m1 || cTgts.target_leads || 0);
                const cLeadsM120Target = Number(cTgts.target_leads_m120 || (cLeadsM1Target > 0 ? Math.round(cLeadsM1Target * 1.2) : 0));
                const cBonusM1Target = Number(cTgts.target_bonus_m1 || 0);
                const cBonusM120Target = Number(cTgts.target_bonus_m120 || 0);
                const cBonusNoteTarget = cTgts.target_bonus_note || '';

                const itemCpl = itemLeads > 0 ? Math.round(itemSpent / itemLeads) : 0;
                const itemCpo = itemOrders > 0 ? Math.round(itemSpent / itemOrders) : 0;
                const itemCostRatio = itemRevenue > 0 ? (itemSpent / itemRevenue * 100).toFixed(2) : '0.00';
                const itemCloseRate = itemLeads > 0 ? (itemOrders / itemLeads * 100).toFixed(2) : '0.00';

                const itemCplStr = formatVND(itemCpl);
                const itemCostRatioStr = `${itemCostRatio}%`;
                const itemCpoStr = itemCpo > 0 ? formatVND(itemCpo) : '0đ';
                const itemCloseRateStr = `${itemCloseRate}%`;

                const titleCostRatio = `${formatVND(itemSpent)} Chi phí MKT / ${formatVND(itemRevenue)} Doanh số = ${itemCostRatioStr}`;
                const titleCloseRate = `${itemOrders} Đơn / ${itemLeads} Tin Nhắn = ${itemCloseRateStr}`;
                const titleCpo = `${formatVND(itemSpent)} Chi phí MKT / ${itemOrders} Đơn = ${itemCpoStr}`;
                const titleCpl = `${formatVND(itemSpent)} Chi phí MKT / ${itemLeads} Tin Nhắn = ${itemCplStr}`;

                const pageTooltipText = `📌 KPI Riêng Page: ${it.category_name || it.name || 'Mục'}\n` +
                    `💸 Ngân sách: ${cBudTarget > 0 ? formatVND(cBudTarget) : 'Chưa đặt'}\n` +
                    `🚩 Mốc 1 (100%): ${cRevM1Target > 0 ? formatVND(cRevM1Target) : '-'} | ${cLeadsM1Target > 0 ? cLeadsM1Target.toLocaleString('vi-VN') + ' Lead' : '-'}\n` +
                    `🏆 Mốc 2 (120%): ${cRevM120Target > 0 ? formatVND(cRevM120Target) : '-'} | ${cLeadsM120Target > 0 ? cLeadsM120Target.toLocaleString('vi-VN') + ' Lead' : '-'}\n` +
                    `🎁 Lương Thưởng: ${cBonusM1Target > 0 ? `Mốc 1 (+${formatVND(cBonusM1Target)})` : '-'}${cBonusM120Target > 0 ? ` • Mốc 2 (+${formatVND(cBonusM120Target)})` : ''}`;

                const catName = it.category_name || it.name || 'Mục Marketing';
                const channelName = it.channel_name || 'Facebook Ads';
                const pageLabel = it.pancake_page_name || it.linked_source_name || '';

                const itemLabelHtml = `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                        <div style="font-weight:800;font-size:13px;color:#0f172a;display:flex;align-items:center;gap:6px">
                            <span>📄 ${escapeHtml(catName)}</span>
                            ${cBonusM1Target > 0 ? `<span style="font-size:10.5px;font-weight:800;background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:2px 7px;border-radius:6px;" title="${escapeHtml(pageTooltipText)}">🎁 Thưởng: +${formatVND(cBonusM1Target)}</span>` : ''}
                        </div>
                        ${it.category_id ? `<button type="button" onclick="kpiMktOpenSetTargetModal('${escapeHtml(handlerName)}', ${it.category_id}, '${escapeHtml(catName)}')" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:2px 8px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;box-shadow:0 1px 2px rgba(4,120,87,0.1);" title="${escapeHtml(pageTooltipText)}">🎯 KPI Page</button>` : ''}
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:8px">
                        <span>Kênh: <strong>${escapeHtml(channelName)}</strong></span>
                        ${pageLabel ? `<span style="color:#0284c7;font-weight:700">🔗 ${escapeHtml(pageLabel)}</span>` : ''}
                    </div>
                `;

                html += `<tr>`;
                if (pageIdx === 0) {
                    html += `
                        <td rowspan="${totalRowsForHandler}" style="text-align:center;vertical-align:middle;font-weight:800;background:#fff">${idx + 1}</td>
                        <td rowspan="${totalRowsForHandler}" style="text-align:left;vertical-align:middle;background:#fff;padding:12px 10px;">
                            <div style="font-weight:800;font-size:14px;color:#1e1b4b;display:flex;align-items:center;gap:6px">
                                <span>👤 ${escapeHtml(handlerName)}</span>
                            </div>
                            ${actionButtonsHtml}
                        </td>
                    `;
                }
                html += `
                    <td style="text-align:left">${itemLabelHtml}</td>
                    <td style="font-weight:700;color:#e11d48">
                        <div>${formatVND(itemSpent)}</div>
                        ${cBudTarget > 0 ? `<div style="font-size:10.5px;font-weight:700;color:#94a3b8;margin-top:2px;" title="${escapeHtml(pageTooltipText)}">🎯 CT: ${formatVND(cBudTarget)}</div>` : ''}
                    </td>
                    <td style="font-weight:700;color:#d97706">${itemOrders} đơn</td>
                    <td style="font-weight:700;color:#16a34a">
                        <div>${formatVND(itemRevenue)}</div>
                        ${cRevM1Target > 0 ? `<div style="font-size:10.5px;font-weight:800;color:#047857;margin-top:2px;" title="${escapeHtml(pageTooltipText)}">🎯 Mốc 1: ${formatVND(cRevM1Target)}</div>` : ''}
                    </td>
                    <td><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleCostRatio}" title="${titleCostRatio}">${itemCostRatioStr}</span></td>
                    <td><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleCloseRate}" title="${titleCloseRate}">${itemCloseRateStr}</span></td>
                    <td><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleCpo}" title="${titleCpo}">${itemCpoStr}</span></td>
                    <td style="font-weight:700;color:#0284c7">${itemLeads}</td>
                    <td><span class="kpi-pill kpi-pill-blue" data-tooltip="${titleCpl}" title="${titleCpl}">${itemCplStr}</span></td>
                `;
                html += `</tr>`;
            });
        }

        if (totSpent === 0 && h.actual && h.actual.spent > 0) totSpent = Number(h.actual.spent);
        if (totLeads === 0 && h.actual && h.actual.leads > 0) totLeads = Number(h.actual.leads);
        if (totOrders === 0 && h.actual && h.actual.orders > 0) totOrders = Number(h.actual.orders);
        if (totRevenue === 0 && h.actual && h.actual.revenue > 0) totRevenue = Number(h.actual.revenue);

        // Render Total Row for Handler
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

        html += `
            <tr class="total-row" style="background:#fef3c7 !important;">
                <td style="text-align:left;font-weight:900;color:#78350f">
                    <span>★ TỔNG CỘNG KPI ${escapeHtml(handlerName).toUpperCase()} (${displayItems.length} Mục Con)</span>
                </td>
                <td style="font-weight:900;color:#e11d48">${formatVND(totSpent)}</td>
                <td style="font-weight:900;color:#d97706">${totOrders} đơn</td>
                <td style="font-weight:900;color:#16a34a">${formatVND(totRevenue)}</td>
                <td><span class="kpi-pill kpi-pill-purple" data-tooltip="${titleTotCostRatio}" title="${titleTotCostRatio}">${totCostRatioStr}</span></td>
                <td><span class="kpi-pill kpi-pill-cyan" data-tooltip="${titleTotCloseRate}" title="${titleTotCloseRate}">${totCloseRateStr}</span></td>
                <td><span class="kpi-pill kpi-pill-orange" data-tooltip="${titleTotCpo}" title="${titleTotCpo}">${totCpoStr}</span></td>
                <td style="font-weight:900;color:#0284c7">${totLeads}</td>
                <td><span class="kpi-pill kpi-pill-blue" data-tooltip="${titleTotCpl}" title="${titleTotCpl}">${totCplStr}</span></td>
            </tr>
        `;

        // Retrieve target metrics for this handler
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
        let targetBonusConds = h.target_bonus_conditions || tObj.target_bonus_conditions || ['revenue', 'leads'];
        if (typeof targetBonusConds === 'string') {
            try { targetBonusConds = JSON.parse(targetBonusConds); } catch(e) { targetBonusConds = ['revenue', 'leads']; }
        }
        if (!Array.isArray(targetBonusConds) || targetBonusConds.length === 0) {
            targetBonusConds = ['revenue', 'leads'];
        }
        const targetBonusLogic = (h.target_bonus_logic || tObj.target_bonus_logic || 'ALL').toUpperCase();

        // Mốc 1 Values
        const m1SpentStr = targetBudget > 0 ? formatVND(targetBudget) : '-';
        const m1RevStr = targetRevM1 > 0 ? formatVND(targetRevM1) : '-';
        const m1LeadsStr = targetLeadsM1 > 0 ? targetLeadsM1.toLocaleString('vi-VN') : '-';
        const m1CostRatioStr = targetRevM1 > 0 && targetBudget > 0 ? `${((targetBudget / targetRevM1) * 100).toFixed(2)}%` : (targetCostRatio > 0 ? `${targetCostRatio.toFixed(2)}%` : '-');
        const m1CloseRateStr = targetCloseRate > 0 ? `${targetCloseRate.toFixed(2)}%` : '-';
        const m1CpoStr = targetCpo > 0 ? formatVND(targetCpo) : '-';
        const m1CplStr = targetCpl > 0 ? formatVND(targetCpl) : '-';

        // Mốc 1 - Còn Thiếu
        const m1MissingSpent = targetBudget > 0 ? Math.max(0, targetBudget - totSpent) : 0;
        const m1MissingRev = targetRevM1 > 0 ? Math.max(0, targetRevM1 - totRevenue) : 0;
        const m1MissingLeads = targetLeadsM1 > 0 ? Math.max(0, targetLeadsM1 - totLeads) : 0;

        const m1MissingSpentStr = targetBudget > 0 ? (m1MissingSpent > 0 ? `-${formatVND(m1MissingSpent)}` : '0đ (Đã đạt)') : '-';
        const m1MissingRevStr = targetRevM1 > 0 ? (m1MissingRev > 0 ? `-${formatVND(m1MissingRev)}` : '0đ (Đã đạt)') : '-';
        const m1MissingLeadsStr = targetLeadsM1 > 0 ? (m1MissingLeads > 0 ? `-${m1MissingLeads.toLocaleString('vi-VN')}` : '0 (Đã đạt)') : '-';

        // Mốc 1 - Tỉ Lệ Hoàn Thành
        const m1SpentPctStr = targetBudget > 0 ? `${((totSpent / targetBudget) * 100).toFixed(2)}%` : '-';
        const m1RevPctStr = targetRevM1 > 0 ? `${((totRevenue / targetRevM1) * 100).toFixed(2)}%` : '-';
        const m1LeadsPctStr = targetLeadsM1 > 0 ? `${((totLeads / targetLeadsM1) * 100).toFixed(2)}%` : '-';

        // Mốc 2 Values (Shares the SAME targetBudget)
        const m2SpentStr = targetBudget > 0 ? formatVND(targetBudget) : '-';
        const m2RevStr = targetRevM120 > 0 ? formatVND(targetRevM120) : '-';
        const m2LeadsStr = targetLeadsM120 > 0 ? targetLeadsM120.toLocaleString('vi-VN') : '-';
        const m2CostRatioStr = targetRevM120 > 0 && targetBudget > 0 ? `${((targetBudget / targetRevM120) * 100).toFixed(2)}%` : (targetCostRatio > 0 ? `${targetCostRatio.toFixed(2)}%` : '-');
        const m2CloseRateStr = m1CloseRateStr;
        const m2CpoStr = m1CpoStr;
        const m2CplStr = m1CplStr;

        // Mốc 2 - Còn Thiếu (Shares the SAME targetBudget)
        const m2MissingSpent = targetBudget > 0 ? Math.max(0, targetBudget - totSpent) : 0;
        const m2MissingRev = targetRevM120 > 0 ? Math.max(0, targetRevM120 - totRevenue) : 0;
        const m2MissingLeads = targetLeadsM120 > 0 ? Math.max(0, targetLeadsM120 - totLeads) : 0;

        const m2MissingSpentStr = targetBudget > 0 ? (m2MissingSpent > 0 ? `-${formatVND(m2MissingSpent)}` : '0đ (Đã đạt)') : '-';
        const m2MissingRevStr = targetRevM120 > 0 ? (m2MissingRev > 0 ? `-${formatVND(m2MissingRev)}` : '0đ (Đã đạt)') : '-';
        const m2MissingLeadsStr = targetLeadsM120 > 0 ? (m2MissingLeads > 0 ? `-${m2MissingLeads.toLocaleString('vi-VN')}` : '0 (Đã đạt)') : '-';

        // Mốc 2 - Tỉ Lệ Hoàn Thành (Shares the SAME targetBudget)
        const m2SpentPctStr = targetBudget > 0 ? `${((totSpent / targetBudget) * 100).toFixed(2)}%` : '-';
        const m2RevPctStr = targetRevM120 > 0 ? `${((totRevenue / targetRevM120) * 100).toFixed(2)}%` : '-';
        const m2LeadsPctStr = targetLeadsM120 > 0 ? `${((totLeads / targetLeadsM120) * 100).toFixed(2)}%` : '-';

        // Row 1: Mốc 1 - 100%
        html += `
            <tr style="background:#ecfdf5 !important;">
                <td style="text-align:left;font-weight:800;color:#064e3b">
                    <span style="margin-left:12px">🚩 Mốc 1 - 100%</span>
                </td>
                <td style="font-weight:800;color:#064e3b">${m1SpentStr}</td>
                <td style="font-weight:700;color:#064e3b">-</td>
                <td style="font-weight:800;color:#064e3b">${m1RevStr}</td>
                <td><span class="kpi-pill kpi-pill-purple">${m1CostRatioStr}</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">${m1CloseRateStr}</span></td>
                <td><span class="kpi-pill kpi-pill-orange">${m1CpoStr}</span></td>
                <td style="font-weight:800;color:#064e3b">${m1LeadsStr}</td>
                <td><span class="kpi-pill kpi-pill-blue">${m1CplStr}</span></td>
            </tr>
        `;

        const formatNegativeCell = (str) => {
            if (!str || str === '-') return '-';
            if (typeof str === 'string' && str.startsWith('-')) {
                return `<span class="kpi-negative-badge">${escapeHtml(str)}</span>`;
            }
            return str;
        };

        // Row 2: Mốc 1 - Còn Thiếu
        html += `
            <tr style="background:#ecfdf5 !important;">
                <td style="text-align:left;font-weight:800;color:#064e3b">
                    <span style="margin-left:24px">🚩 Mốc 1 - Còn Thiếu</span>
                </td>
                <td style="font-weight:700;color:#064e3b">${formatNegativeCell(m1MissingSpentStr)}</td>
                <td style="font-weight:700;color:#064e3b">-</td>
                <td style="font-weight:700;color:#064e3b">${formatNegativeCell(m1MissingRevStr)}</td>
                <td><span class="kpi-pill kpi-pill-purple">-</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">-</span></td>
                <td><span class="kpi-pill kpi-pill-orange">-</span></td>
                <td style="font-weight:700;color:#064e3b">${formatNegativeCell(m1MissingLeadsStr)}</td>
                <td><span class="kpi-pill kpi-pill-blue">-</span></td>
            </tr>
        `;

        // Row 3: Mốc 1 - Tỉ Lệ Hoàn Thành
        html += `
            <tr style="background:#ecfdf5 !important;">
                <td style="text-align:left;font-weight:800;color:#064e3b">
                    <span style="margin-left:24px">🚩 Mốc 1 - Tỉ Lệ Hoàn Thành</span>
                </td>
                <td style="font-weight:800;color:#064e3b">${m1SpentPctStr}</td>
                <td style="font-weight:700;color:#064e3b">-</td>
                <td style="font-weight:800;color:#064e3b">${m1RevPctStr}</td>
                <td><span class="kpi-pill kpi-pill-purple">-</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">-</span></td>
                <td><span class="kpi-pill kpi-pill-orange">-</span></td>
                <td style="font-weight:800;color:#064e3b">${m1LeadsPctStr}</td>
                <td><span class="kpi-pill kpi-pill-blue">-</span></td>
            </tr>
        `;

        // Row 4: Mốc 2 - 120% (Uses SHARED targetBudget)
        html += `
            <tr style="background:#eff6ff !important;">
                <td style="text-align:left;font-weight:800;color:#1e3a8a">
                    <span style="margin-left:12px">🏆 Mốc 2 - 120%</span>
                </td>
                <td style="font-weight:800;color:#1e3a8a">${m2SpentStr}</td>
                <td style="font-weight:700;color:#1e3a8a">-</td>
                <td style="font-weight:800;color:#1e3a8a">${m2RevStr}</td>
                <td><span class="kpi-pill kpi-pill-purple">${m2CostRatioStr}</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">${m2CloseRateStr}</span></td>
                <td><span class="kpi-pill kpi-pill-orange">${m2CpoStr}</span></td>
                <td style="font-weight:800;color:#1e3a8a">${m2LeadsStr}</td>
                <td><span class="kpi-pill kpi-pill-blue">${m2CplStr}</span></td>
            </tr>
        `;

        // Row 5: Mốc 2 - Còn Thiếu (Uses SHARED targetBudget)
        html += `
            <tr style="background:#eff6ff !important;">
                <td style="text-align:left;font-weight:800;color:#1e3a8a">
                    <span style="margin-left:24px">🏆 Mốc 2 - Còn Thiếu</span>
                </td>
                <td style="font-weight:700;color:#1e3a8a">${formatNegativeCell(m2MissingSpentStr)}</td>
                <td style="font-weight:700;color:#1e3a8a">-</td>
                <td style="font-weight:700;color:#1e3a8a">${formatNegativeCell(m2MissingRevStr)}</td>
                <td><span class="kpi-pill kpi-pill-purple">-</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">-</span></td>
                <td><span class="kpi-pill kpi-pill-orange">-</span></td>
                <td style="font-weight:700;color:#1e3a8a">${formatNegativeCell(m2MissingLeadsStr)}</td>
                <td><span class="kpi-pill kpi-pill-blue">-</span></td>
            </tr>
        `;

        // Row 6: Mốc 2 - Tỉ Lệ Hoàn Thành (Uses SHARED targetBudget)
        html += `
            <tr style="background:#eff6ff !important;">
                <td style="text-align:left;font-weight:800;color:#1e3a8a">
                    <span style="margin-left:24px">🏆 Mốc 2 - Tỉ Lệ Hoàn Thành</span>
                </td>
                <td style="font-weight:800;color:#1e3a8a">${m2SpentPctStr}</td>
                <td style="font-weight:700;color:#1e3a8a">-</td>
                <td style="font-weight:800;color:#1e3a8a">${m2RevPctStr}</td>
                <td><span class="kpi-pill kpi-pill-purple">-</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">-</span></td>
                <td><span class="kpi-pill kpi-pill-orange">-</span></td>
                <td style="font-weight:800;color:#1e3a8a">${m2LeadsPctStr}</td>
                <td><span class="kpi-pill kpi-pill-blue">-</span></td>
            </tr>
        `;

        // Evaluate Mốc 1 & Mốc 2 Bonus Achievement Status
        const condEvalM1 = [];
        const condEvalM2 = [];
        const condLabelsArr = [];

        if (targetBonusConds.includes('revenue')) {
            condLabelsArr.push('💰 Doanh Số');
            condEvalM1.push(targetRevM1 > 0 ? totRevenue >= targetRevM1 : false);
            condEvalM2.push(targetRevM120 > 0 ? totRevenue >= targetRevM120 : false);
        }
        if (targetBonusConds.includes('leads')) {
            condLabelsArr.push('📥 Số Lead');
            condEvalM1.push(targetLeadsM1 > 0 ? totLeads >= targetLeadsM1 : false);
            condEvalM2.push(targetLeadsM120 > 0 ? totLeads >= targetLeadsM120 : false);
        }
        if (targetBonusConds.includes('cost_ratio')) {
            const label = targetCostRatio > 0 ? `📉 % CP/Doanh số (≤${targetCostRatio}%)` : '📉 % CP/Doanh số';
            condLabelsArr.push(label);
            const actualRatio = totRevenue > 0 ? (totSpent / totRevenue * 100) : 999;
            const ok = targetCostRatio > 0 ? actualRatio <= targetCostRatio : false;
            condEvalM1.push(ok);
            condEvalM2.push(ok);
        }
        if (targetBonusConds.includes('close_rate')) {
            const label = targetCloseRate > 0 ? `🎯 Tỷ lệ chốt (≥${targetCloseRate}%)` : '🎯 Tỷ lệ chốt';
            condLabelsArr.push(label);
            const actualRate = totLeads > 0 ? (totOrders / totLeads * 100) : 0;
            const ok = targetCloseRate > 0 ? actualRate >= targetCloseRate : false;
            condEvalM1.push(ok);
            condEvalM2.push(ok);
        }
        if (targetBonusConds.includes('cpo')) {
            const label = targetCpo > 0 ? `🎯 CPO (≤${formatVND(targetCpo)})` : '🎯 CPO';
            condLabelsArr.push(label);
            const actualCpo = totOrders > 0 ? (totSpent / totOrders) : 999999999;
            const ok = targetCpo > 0 ? actualCpo <= targetCpo : false;
            condEvalM1.push(ok);
            condEvalM2.push(ok);
        }
        if (targetBonusConds.includes('cpl')) {
            const label = targetCpl > 0 ? `📊 CPL (≤${formatVND(targetCpl)})` : '📊 CPL';
            condLabelsArr.push(label);
            const actualCpl = totLeads > 0 ? (totSpent / totLeads) : 999999999;
            const ok = targetCpl > 0 ? actualCpl <= targetCpl : false;
            condEvalM1.push(ok);
            condEvalM2.push(ok);
        }

        const isM1Achieved = condEvalM1.length > 0 ? (targetBonusLogic === 'ANY' ? condEvalM1.some(Boolean) : condEvalM1.every(Boolean)) : false;
        const isM2Achieved = condEvalM2.length > 0 ? (targetBonusLogic === 'ANY' ? condEvalM2.some(Boolean) : condEvalM2.every(Boolean)) : false;
        const condLabelsStr = condLabelsArr.join(targetBonusLogic === 'ANY' ? ' | ' : ' + ');

        // Row 7: LƯƠNG THƯỞNG ĐẠT KPI (Matches Total Row style in Image 2)
        html += `
            <tr class="total-row" style="background:#fef3c7 !important;border-top:2px solid #f59e0b !important;border-bottom:2px solid #f59e0b !important;">
                <td style="text-align:left;font-weight:900;color:#78350f">
                    <span>🎁 LƯƠNG THƯỞNG ĐẠT KPI</span>
                </td>
                <td style="font-weight:900;">
                    ${targetBonusM1 > 0 ? `
                        <span style="background:${isM1Achieved ? '#d1fae5' : '#fff1f2'};color:${isM1Achieved ? '#047857' : '#be123c'};border:1px solid ${isM1Achieved ? '#a7f3d0' : '#fda4af'};padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;" data-tooltip="Thưởng Mốc 1 (100% KPI)">
                            🎁 Mốc 1: +${formatVND(targetBonusM1)} ${isM1Achieved ? '✓ Đạt' : '⏳ Chưa đạt'}
                        </span>
                    ` : '-'}
                </td>
                <td style="font-weight:900;color:#78350f">-</td>
                <td style="font-weight:900;">
                    ${targetBonusM120 > 0 ? `
                        <span style="background:${isM2Achieved ? '#dbeafe' : '#fff1f2'};color:${isM2Achieved ? '#1d4ed8' : '#be123c'};border:1px solid ${isM2Achieved ? '#bfdbfe' : '#fda4af'};padding:3px 10px;border-radius:8px;font-weight:800;display:inline-block;" data-tooltip="Thưởng Mốc 2 (120% KPI)">
                            🏆 Mốc 2: +${formatVND(targetBonusM120)} ${isM2Achieved ? '✓ Đạt' : '⏳ Chưa đạt'}
                        </span>
                    ` : '-'}
                </td>
                <td colspan="5" style="text-align:left;vertical-align:middle;padding:6px 12px;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        ${condLabelsStr ? `
                            <span style="font-size:11.5px;color:#78350f;font-weight:800;background:#fef08a;padding:3px 10px;border-radius:6px;border:1px solid #fde047;display:inline-block;">
                                🎯 Tiêu chí (${targetBonusLogic === 'ANY' ? 'Đạt 1 trong các chỉ số' : 'Đạt tất cả'}): ${escapeHtml(condLabelsStr)}
                            </span>
                        ` : ''}
                        ${targetBonusNote ? `<span style="font-size:11.5px;color:#78350f;font-weight:700;background:#fffbeb;padding:3px 8px;border-radius:6px;border:1px solid #fde68a;">📝 ${escapeHtml(targetBonusNote)}</span>` : ''}
                    </div>
                </td>
            </tr>
        `;

        // Spacer / Divider Row between employee blocks
        html += `
            <tr class="kpi-employee-spacer-row">
                <td colspan="12" style="height:18px;background:#f1f5f9 !important;border-top:2px solid #cbd5e1 !important;border-bottom:2px solid #cbd5e1 !important;padding:0 !important;"></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
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
        const isAssigned = (c.ads_handler_name && c.ads_handler_name.trim().toLowerCase() === handlerName.trim().toLowerCase()) ||
                           (handlerName === 'Giám Đốc' && (!c.ads_handler_name || !c.ads_handler_name.trim()));
        const pageLabel = c.pancake_page_name || c.linked_source_name || '';
        const catName = c.name || c.category_name || '';
        const displayLabel = pageLabel ? `${catName} — (🔗 ${pageLabel})` : catName;

        return `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isAssigned ? '#f0f9ff' : '#f8fafc'};border:1.5px solid ${isAssigned ? '#0284c7' : '#e2e8f0'};border-radius:10px;cursor:pointer;transition:all 0.2s;">
                <input type="checkbox" value="${c.id}" class="kpi-assign-cat-checkbox" ${isAssigned ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;accent-color:#0284c7;">
                <span style="font-size:13.5px;font-weight:700;color:${isAssigned ? '#0369a1' : '#1e293b'};">📌 ${escapeHtml(displayLabel)}</span>
            </label>
        `;
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
    const targetCostRatio = Number(targetObj.target_cost_ratio || 0);
    const targetCloseRate = Number(targetObj.target_close_rate || 0);
    const targetCpo = Number(targetObj.target_cpo || 0);
    const targetCpl = Number(targetObj.target_cpl || 0);
    const targetBonusM1 = Number(targetObj.target_bonus_m1 || 0);
    const targetBonusM120 = Number(targetObj.target_bonus_m120 || 0);
    const targetBonusNote = targetObj.target_bonus_note || '';
    let targetBonusConds = targetObj.target_bonus_conditions || ['revenue', 'leads'];
    if (typeof targetBonusConds === 'string') {
        try { targetBonusConds = JSON.parse(targetBonusConds); } catch(e) { targetBonusConds = ['revenue', 'leads']; }
    }
    if (!Array.isArray(targetBonusConds) || targetBonusConds.length === 0) {
        targetBonusConds = ['revenue', 'leads'];
    }
    const targetBonusLogic = (targetObj.target_bonus_logic || 'ALL').toUpperCase();

    const [yStr, mStr] = (_kpiMkt.month || '').split('-');
    const monthText = yStr && mStr ? `Tháng ${parseInt(mStr, 10)}/${yStr}` : 'Tháng';

    const fmtBud = targetBudget > 0 ? targetBudget.toLocaleString('vi-VN') : '';
    const fmtRev1 = targetRevM1 > 0 ? targetRevM1.toLocaleString('vi-VN') : '';
    const fmtRev2 = targetRevM120 > 0 ? targetRevM120.toLocaleString('vi-VN') : '';
    const fmtLd1 = targetLeadsM1 > 0 ? targetLeadsM1.toLocaleString('vi-VN') : '';
    const fmtLd2 = targetLeadsM120 > 0 ? targetLeadsM120.toLocaleString('vi-VN') : '';
    const fmtCpo = targetCpo > 0 ? targetCpo.toLocaleString('vi-VN') : '';
    const fmtCpl = targetCpl > 0 ? targetCpl.toLocaleString('vi-VN') : '';
    const fmtBonus1 = targetBonusM1 > 0 ? targetBonusM1.toLocaleString('vi-VN') : '';
    const fmtBonus2 = targetBonusM120 > 0 ? targetBonusM120.toLocaleString('vi-VN') : '';

    const scopeOptionsHtml = `
        <option value="0" ${targetCatId === 0 ? 'selected' : ''}>⭐ KPI TỔNG CHO NHÂN VIÊN (${escapeHtml(handlerName)})</option>
        ${(h.items || []).filter(ci => ci.category_id).map(ci => `<option value="${ci.category_id}" ${Number(targetCatId) === Number(ci.category_id) ? 'selected' : ''}>📌 KPI RIÊNG PAGE: ${escapeHtml(ci.category_name)}</option>`).join('')}
    `;

    modal.innerHTML = `
        <div class="kpi-v2-modal" style="width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
            <!-- Modal Header -->
            <div style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:18px;color:#0f172a;font-weight:800;display:flex;align-items:center;gap:8px;">
                        <span>🎯 Cài Đặt Chỉ Tiêu KPI Marketing</span>
                    </div>
                    <div style="font-size:12.5px;color:#64748b;margin-top:4px;font-weight:600;">
                        Nhân viên: <strong style="color:#1e1b4b;">👤 ${escapeHtml(handlerName)}</strong> • <span>${monthText}</span>
                    </div>
                </div>
                <button type="button" class="kpi-v2-modal-close" style="cursor:pointer;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-weight:800;color:#64748b;" onclick="document.getElementById('kpiMktSetTargetModal').style.display='none'">✕</button>
            </div>

            <!-- SCOPE SELECTION DROPDOWN -->
            <div style="background:#f1f5f9;padding:12px 16px;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <label style="font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;">📌 Phạm vi áp dụng chỉ tiêu:</label>
                <select id="kpiTargetScopeSelect" onchange="kpiMktOnScopeChange(this.value, '${escapeHtml(handlerName)}')" style="width:100%;padding:8px 12px;border:1.5px solid #0284c7;border-radius:8px;font-weight:800;font-size:13px;color:#0369a1;outline:none;background:white;cursor:pointer;">
                    ${scopeOptionsHtml}
                </select>
            </div>

            <!-- Form Content -->
            <form id="kpiMktTargetForm" onsubmit="kpiMktSaveTargetForHandler(event, '${escapeHtml(handlerName)}')" style="display:flex;flex-direction:column;gap:18px;">
                <input type="hidden" id="target_cat_id" value="${targetCatId}" />
                
                <!-- SECTION 1: NGÂN SÁCH MKT -->
                <div style="background:#f8fafc;padding:14px 16px;border-radius:12px;border:1px solid #e2e8f0;">
                    <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                        <span>💸 NGÂN SÁCH CHI PHÍ MARKETING ${targetCatId > 0 ? `(RIÊNG PAGE)` : `(CHUNG)`}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr;gap:12px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Chi Phí MKT Chỉ Tiêu (đ)</label>
                            <input type="text" id="target_budget" value="${fmtBud}" placeholder="Ví dụ: 200.000.000" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;outline:none;" />
                        </div>
                    </div>
                </div>

                <!-- SECTION 2: MỐC 1 (100%) -->
                <div style="background:#ecfdf5;padding:14px 16px;border-radius:12px;border:1px solid #a7f3d0;">
                    <div style="font-weight:800;font-size:13.5px;color:#064e3b;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                        <span>🚩 MỐC 1 - 100% ĐẠT KPI</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">💰 Doanh Số Mốc 1 (đ)</label>
                            <input type="text" id="target_revenue_m1" value="${fmtRev1}" placeholder="Ví dụ: 300.000.000" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">📥 Số Lead Mốc 1 (Tin Nhắn)</label>
                            <input type="text" id="target_leads_m1" value="${fmtLd1}" placeholder="Ví dụ: 500" oninput="kpiMktFormatInputNumber(this); kpiMktAutoCalcM2();" style="width:100%;padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-weight:700;font-size:13px;color:#064e3b;outline:none;background:white;" />
                        </div>
                    </div>
                </div>

                <!-- SECTION 3: MỐC 2 (120%) -->
                <div style="background:#eff6ff;padding:14px 16px;border-radius:12px;border:1px solid #bfdbfe;">
                    <div style="font-weight:800;font-size:13.5px;color:#1e3a8a;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                        <span>🏆 MỐC 2 - 120% KHUYẾN KHÍCH</span>
                        <span style="font-size:11px;font-weight:600;color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:6px;">✨ Tự động = 120% Mốc 1</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">💰 Doanh Số Mốc 2 (Tự động 120%)</label>
                            <input type="text" id="target_revenue_m120" value="${fmtRev2}" readonly tabindex="-1" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">📥 Số Lead Mốc 2 (Tự động 120%)</label>
                            <input type="text" id="target_leads_m120" value="${fmtLd2}" readonly tabindex="-1" style="width:100%;padding:8px 12px;border:1.5px solid #93c5fd;border-radius:8px;font-weight:800;font-size:13px;color:#1e3a8a;outline:none;background:#dbeafe;cursor:not-allowed;" />
                        </div>
                    </div>
                </div>

                <!-- SECTION 4: LƯƠNG THƯỞNG ĐẠT KPI -->
                <div style="background:#fffbeb;padding:14px 16px;border-radius:12px;border:1px solid #fde68a;">
                    <div style="font-weight:800;font-size:13.5px;color:#92400e;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                        <span>🎁 LƯƠNG THƯỞNG ĐẠT KPI ${targetCatId > 0 ? `(THƯỞNG PAGE)` : `(THƯỞNG CHUNG)`}</span>
                        <span style="font-size:11.5px;font-weight:600;color:#b45309;">⚙️ Cấu hình mốc & tiêu chí thưởng</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#92400e;display:block;margin-bottom:4px;">💰 Thưởng Mốc 1 (100% KPI) (đ)</label>
                            <input type="text" id="target_bonus_m1" value="${fmtBonus1}" placeholder="Ví dụ: 2.000.000" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #fcd34d;border-radius:8px;font-weight:700;font-size:13px;color:#78350f;outline:none;background:white;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#92400e;display:block;margin-bottom:4px;">🏆 Thưởng Mốc 2 (120% KPI) (đ)</label>
                            <input type="text" id="target_bonus_m120" value="${fmtBonus2}" placeholder="Ví dụ: 5.000.000" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #fcd34d;border-radius:8px;font-weight:700;font-size:13px;color:#78350f;outline:none;background:white;" />
                        </div>
                    </div>

                    <!-- TIÊU CHÍ ÁP DỤNG THƯỞNG -->
                    <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #fde68a;">
                        <label style="font-size:12px;font-weight:800;color:#92400e;display:block;margin-bottom:6px;">🎯 Chọn các chỉ số làm TIÊU CHÍ XÉT THƯỞNG:</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:white;padding:10px 12px;border-radius:8px;border:1px solid #fde68a;">
                            <label style="font-size:12px;font-weight:700;color:#451a03;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" name="kpiBonusCond" value="revenue" ${targetBonusConds.includes('revenue') ? 'checked' : ''} style="width:15px;height:15px;accent-color:#d97706;" />
                                <span>💰 Doanh Số</span>
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
                        </div>
                        
                        <div style="display:flex;align-items:center;gap:16px;margin-top:8px;font-size:12px;font-weight:700;color:#92400e;">
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

                    <div style="margin-top:10px;">
                        <label style="font-size:12px;font-weight:700;color:#92400e;display:block;margin-bottom:4px;">📝 Nội Dung Thưởng / Ghi Chú Thưởng</label>
                        <input type="text" id="target_bonus_note" value="${escapeHtml(targetBonusNote)}" placeholder="Ví dụ: Thưởng nóng tiền mặt hoặc cộng vào lương tháng..." style="width:100%;padding:8px 12px;border:1.5px solid #fcd34d;border-radius:8px;font-weight:600;font-size:12.5px;color:#78350f;outline:none;background:white;" />
                    </div>
                </div>

                <!-- SECTION 5: TỶ LỆ MỞ RỘNG (TÙY CHỌN) -->
                <div style="background:#f8fafc;padding:14px 16px;border-radius:12px;border:1px solid #e2e8f0;">
                    <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                        <span>📈 CÁC CHỈ SỐ MỤC TIÊU MỞ RỘNG (TÙY CHỌN)</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">📉 % CP / Doanh Số Mục Tiêu (%)</label>
                            <input type="number" step="0.01" id="target_cost_ratio" value="${targetCostRatio || ''}" placeholder="Ví dụ: 15.00" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;outline:none;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">🎯 Tỷ Lệ Chốt Mục Tiêu (%)</label>
                            <input type="number" step="0.01" id="target_close_rate" value="${targetCloseRate || ''}" placeholder="Ví dụ: 20.00" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;outline:none;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">🎯 CPO Giá / Đơn Mục Tiêu (đ)</label>
                            <input type="text" id="target_cpo" value="${fmtCpo}" placeholder="Ví dụ: 100.000" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;outline:none;" />
                        </div>
                        <div>
                            <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">📊 CPL Giá / Lead Mục Tiêu (đ)</label>
                            <input type="text" id="target_cpl" value="${fmtCpl}" placeholder="Ví dụ: 50.000" oninput="kpiMktFormatInputNumber(this)" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;outline:none;" />
                        </div>
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
    const revM1 = kpiMktParseVnInt(document.getElementById('target_revenue_m1')?.value);
    const leadsM1 = kpiMktParseVnInt(document.getElementById('target_leads_m1')?.value);
    const revM2Inp = document.getElementById('target_revenue_m120');
    const leadsM2Inp = document.getElementById('target_leads_m120');
    if (revM2Inp) revM2Inp.value = revM1 > 0 ? Math.round(revM1 * 1.2).toLocaleString('vi-VN') : '';
    if (leadsM2Inp) leadsM2Inp.value = leadsM1 > 0 ? Math.round(leadsM1 * 1.2).toLocaleString('vi-VN') : '';
}

async function kpiMktSaveTargetForHandler(e, handlerName) {
    e.preventDefault();
    try {
        const targetCatId = parseInt(document.getElementById('target_cat_id')?.value, 10) || 0;
        const revM1 = kpiMktParseVnInt(document.getElementById('target_revenue_m1')?.value);
        const leadsM1 = kpiMktParseVnInt(document.getElementById('target_leads_m1')?.value);
        const revM120 = kpiMktParseVnInt(document.getElementById('target_revenue_m120')?.value) || Math.round(revM1 * 1.2);
        const leadsM120 = kpiMktParseVnInt(document.getElementById('target_leads_m120')?.value) || Math.round(leadsM1 * 1.2);

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
                    target_cost_ratio: Number(String(document.getElementById('target_cost_ratio')?.value || 0).replace(/,/g, '.')) || 0,
                    target_close_rate: Number(String(document.getElementById('target_close_rate')?.value || 0).replace(/,/g, '.')) || 0,
                    target_cpo: kpiMktParseVnInt(document.getElementById('target_cpo')?.value),
                    target_cpl: kpiMktParseVnInt(document.getElementById('target_cpl')?.value),
                    target_bonus_m1: kpiMktParseVnInt(document.getElementById('target_bonus_m1')?.value),
                    target_bonus_m120: kpiMktParseVnInt(document.getElementById('target_bonus_m120')?.value),
                    target_bonus_note: document.getElementById('target_bonus_note')?.value || '',
                    target_bonus_conditions: selectedConds.length > 0 ? selectedConds : ['revenue', 'leads'],
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
