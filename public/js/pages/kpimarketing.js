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

            <!-- TOP SUMMARY METRICS GRID -->
            <div class="kpi-v2-grid">
                <div class="kpi-v2-card" style="border-top: 4px solid #0284c7;">
                    <div class="kpi-v2-card-val" id="kpiMktAvgCpl" style="color:#0284c7">—</div>
                    <div class="kpi-v2-card-lbl">📊 CPL (GIÁ / LEAD)</div>
                </div>
                <div class="kpi-v2-card" style="border-top: 4px solid #6b21a8;">
                    <div class="kpi-v2-card-val" id="kpiMktAvgCostRatio" style="color:#6b21a8">—</div>
                    <div class="kpi-v2-card-lbl">📉 % CHI PHÍ / DOANH THU</div>
                </div>
                <div class="kpi-v2-card" style="border-top: 4px solid #c2410c;">
                    <div class="kpi-v2-card-val" id="kpiMktAvgCpo" style="color:#c2410c">—</div>
                    <div class="kpi-v2-card-lbl">🎯 CPO (GIÁ / ĐƠN)</div>
                </div>
                <div class="kpi-v2-card" style="border-top: 4px solid #0e7490;">
                    <div class="kpi-v2-card-val" id="kpiMktAvgCloseRate" style="color:#0e7490">—</div>
                    <div class="kpi-v2-card-lbl">🎯 TỶ LỆ CHỐT (DATA CHẤT)</div>
                </div>
                <div class="kpi-v2-card" style="border-top: 4px solid #16a34a;">
                    <div class="kpi-v2-card-val" id="kpiMktTotalRev" style="color:#16a34a">—</div>
                    <div class="kpi-v2-card-lbl">💰 DOANH SỐ TỔNG</div>
                </div>
                <div class="kpi-v2-card" style="border-top: 4px solid #d97706;">
                    <div class="kpi-v2-card-val" id="kpiMktTotalOrders" style="color:#d97706">—</div>
                    <div class="kpi-v2-card-lbl">📦 TỔNG ĐƠN HÀNG</div>
                </div>
            </div>

            <!-- SECTION TITLE -->
            <div class="kpi-v2-sec-hdr">
                <div class="kpi-v2-sec-title">
                    <span>📌 DANH SÁCH MỤC CON & CHỈ SỐ MARKETING CHI TIẾT</span>
                </div>
            </div>

            <!-- MAIN TABLE OF SUB-CATEGORIES -->
            <div class="kpi-v2-tbl-wrap">
                <table class="kpi-v2-tbl" id="kpiMktTable">
                    <thead>
                        <tr>
                            <th style="width:45px">STT</th>
                            <th style="text-align:left;min-width:220px">Mục Con / Mã Nguồn (Channel & Page)</th>
                            <th style="width:130px">📊 CPL (GIÁ/LEAD)</th>
                            <th style="width:140px">📉 % CP / DOANH THU</th>
                            <th style="width:130px">🎯 CPO (GIÁ/ĐƠN)</th>
                            <th style="width:130px">🎯 TỶ LỆ CHỐT</th>
                            <th style="width:140px">💰 DOANH SỐ (đ)</th>
                            <th style="width:110px">📦 ĐƠN HÀNG</th>
                            <th style="width:100px">📥 SỐ LEAD</th>
                            <th style="width:140px">💸 CHI MARKETING</th>
                        </tr>
                    </thead>
                    <tbody id="kpiMktTbody">
                        <tr><td colspan="10" style="text-align:center;padding:35px;color:#64748b;font-weight:700">⏳ Đang tải danh sách Mục Con & Chỉ số...</td></tr>
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

        // Render summary metric cards
        const s = res.summary || {};
        const avgCplEl = document.getElementById('kpiMktAvgCpl');
        if (avgCplEl) avgCplEl.innerText = formatVND(s.avg_cpl || 0);

        const avgCostEl = document.getElementById('kpiMktAvgCostRatio');
        if (avgCostEl) avgCostEl.innerText = `${s.avg_cost_ratio || 0}%`;

        const avgCpoEl = document.getElementById('kpiMktAvgCpo');
        if (avgCpoEl) avgCpoEl.innerText = s.avg_cpo > 0 ? formatVND(s.avg_cpo) : '0đ';

        const avgCloseEl = document.getElementById('kpiMktAvgCloseRate');
        if (avgCloseEl) avgCloseEl.innerText = `${s.avg_close_rate || 0}%`;

        const totalRevEl = document.getElementById('kpiMktTotalRev');
        if (totalRevEl) totalRevEl.innerText = formatVND(s.total_revenue || 0);

        const totalOrdersEl = document.getElementById('kpiMktTotalOrders');
        if (totalOrdersEl) totalOrdersEl.innerText = `${s.total_orders || 0} đơn`;

        // Render Sub-Category Items Table
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
        item.cost_ratio = item.revenue > 0 ? Math.round((item.spent / item.revenue) * 1000) / 10 : 0;
        item.close_rate = item.leads > 0 ? Math.round((item.orders / item.leads) * 1000) / 10 : 0;
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

    let html = '';
    let totalSpent = 0, totalLeads = 0, totalOrders = 0, totalRevenue = 0;

    itemsList.forEach((c, idx) => {
        totalSpent += Number(c.spent || 0);
        totalLeads += Number(c.leads || 0);
        totalOrders += Number(c.orders || 0);
        totalRevenue += Number(c.revenue || 0);

        const cplStr = formatVND(c.cpl || 0);
        const costRatioStr = `${c.cost_ratio || 0}%`;
        const cpoStr = c.cpo > 0 ? formatVND(c.cpo) : '0đ';
        const closeRateStr = `${c.close_rate || 0}%`;

        html += `
            <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td style="text-align:left">
                    <div style="font-weight:800;font-size:13.5px;color:#1e1b4b;display:flex;align-items:center;gap:6px">
                        <span>${c.icon || '📌'} ${escapeHtml(c.category_name)}</span>
                    </div>
                    <div style="font-size:11px;color:#475569;margin-top:3px;display:flex;gap:10px;align-items:center">
                        <span style="background:#f1f5f9;padding:1px 6px;border-radius:4px;color:#475569">Kênh: ${escapeHtml(c.channel_name || 'Khác')}</span>
                        ${c.pancake_page_name ? `<span style="color:#0284c7;font-weight:700">🔗 ${escapeHtml(c.pancake_page_name)}</span>` : ''}
                        <span style="background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:4px;font-weight:700">👤 ${escapeHtml(c.ads_handler_name || 'Giám Đốc')}</span>
                    </div>
                </td>
                <td><span class="kpi-pill kpi-pill-blue">${cplStr}</span></td>
                <td><span class="kpi-pill kpi-pill-purple">${costRatioStr}</span></td>
                <td><span class="kpi-pill kpi-pill-orange">${cpoStr}</span></td>
                <td><span class="kpi-pill kpi-pill-cyan">${closeRateStr}</span></td>
                <td style="font-weight:700;color:#16a34a">${formatVND(c.revenue || 0)}</td>
                <td style="font-weight:700;color:#d97706">${c.orders || 0} đơn</td>
                <td style="font-weight:700;color:#0284c7">${c.leads || 0}</td>
                <td style="font-weight:700;color:#e11d48">${formatVND(c.spent || 0)}</td>
            </tr>
        `;
    });

    // Total summary row
    const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
    const avgCostRatio = totalRevenue > 0 ? Math.round((totalSpent / totalRevenue) * 1000) / 10 : 0;
    const avgCpo = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
    const avgCloseRate = totalLeads > 0 ? Math.round((totalOrders / totalLeads) * 1000) / 10 : 0;

    html += `
        <tr class="total-row">
            <td style="text-align:center">★</td>
            <td style="text-align:left">🏆 TỔNG CỘNG MỤC MARKETING (${itemsList.length} Mục Con)</td>
            <td><span class="kpi-pill kpi-pill-blue">${formatVND(avgCpl)}</span></td>
            <td><span class="kpi-pill kpi-pill-purple">${avgCostRatio}%</span></td>
            <td><span class="kpi-pill kpi-pill-orange">${avgCpo > 0 ? formatVND(avgCpo) : '0đ'}</span></td>
            <td><span class="kpi-pill kpi-pill-cyan">${avgCloseRate}%</span></td>
            <td>${formatVND(totalRevenue)}</td>
            <td>${totalOrders} đơn</td>
            <td>${totalLeads}</td>
            <td>${formatVND(totalSpent)}</td>
        </tr>
    `;

    tbody.innerHTML = html;

    // Update top summary cards dynamically from calculated table totals
    const avgCplEl = document.getElementById('kpiMktAvgCpl');
    if (avgCplEl) avgCplEl.innerText = formatVND(avgCpl);

    const avgCostEl = document.getElementById('kpiMktAvgCostRatio');
    if (avgCostEl) avgCostEl.innerText = `${avgCostRatio}%`;

    const avgCpoEl = document.getElementById('kpiMktAvgCpo');
    if (avgCpoEl) avgCpoEl.innerText = avgCpo > 0 ? formatVND(avgCpo) : '0đ';

    const avgCloseEl = document.getElementById('kpiMktAvgCloseRate');
    if (avgCloseEl) avgCloseEl.innerText = `${avgCloseRate}%`;

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

    const categories = (_kpiMkt.data && _kpiMkt.data.categories) ? _kpiMkt.data.categories : [];
    const rootCats = categories.filter(c => c.parent_id === null || c.parent_id === undefined);

    // 1. Populate Channel (Parent) Dropdown
    const parentSelect = document.getElementById('kpiAddCatParent');
    if (parentSelect) {
        let parentHtml = '';
        if (rootCats.length === 0) {
            parentHtml = `<option value="1">📌 Facebook Ads</option><option value="2">🎵 Tiktok Ads</option><option value="3">🔍 Google Ads</option><option value="4">💬 Zalo Ads / OA</option>`;
        } else {
            rootCats.forEach(c => {
                parentHtml += `<option value="${c.id}">${c.icon || '📌'} ${escapeHtml(c.name)}</option>`;
            });
        }
        parentSelect.innerHTML = parentHtml;
        parentSelect.selectedIndex = 0;
    }

    // 2. Populate Page Pancake Dropdown
    const pageSelect = document.getElementById('kpiAddCatPageSelect');
    if (pageSelect) {
        const availPages = (_kpiMkt.data && _kpiMkt.data.available_pages) ? _kpiMkt.data.available_pages : [];
        const pageSet = new Set(['Page Công Ty 2', 'Page TEMVN', 'Seo Web HV.VN']);
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

    const categories = (_kpiMkt.data && _kpiMkt.data.categories) ? _kpiMkt.data.categories : [];
    
    const pIdNum = Number(parentId);
    const subCats = categories.filter(c => c.parent_id !== null && c.parent_id !== undefined && (Number(c.parent_id) === pIdNum || String(c.parent_id) === String(parentId)));

    let subHtml = '';
    const addedNames = new Set();

    // 1. Add sub-categories from DB (synced with /ngansachmkt)
    subCats.forEach(c => {
        if (c.name && !addedNames.has(c.name.trim())) {
            addedNames.add(c.name.trim());
            subHtml += `<option value="${escapeHtml(c.name.trim())}" data-page="${escapeHtml(c.linked_source_name || c.pancake_page_name || '')}" data-handler="${escapeHtml(c.ads_handler_name || 'Giám Đốc')}">📌 ${escapeHtml(c.name.trim())}</option>`;
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
        const fallbacks = realFallbackMap[String(parentId)] || realFallbackMap['1'] || [];
        fallbacks.forEach(item => {
            if (!addedNames.has(item.name)) {
                addedNames.add(item.name);
                subHtml += `<option value="${escapeHtml(item.name)}" data-page="${escapeHtml(item.page)}" data-handler="${escapeHtml(item.handler)}">📌 ${escapeHtml(item.name)}</option>`;
            }
        });
    }

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
    const categories = (_kpiMkt.data && _kpiMkt.data.categories) ? _kpiMkt.data.categories : [];
    const matchedCat = categories.find(c => c.name && c.name.trim().toLowerCase() === String(val).trim().toLowerCase());

    let pageName = matchedCat ? (matchedCat.linked_source_name || matchedCat.pancake_page_name || '') : '';
    let handlerName = matchedCat ? (matchedCat.ads_handler_name || 'Giám Đốc') : 'Giám Đốc';

    if (!pageName) {
        const valLower = String(val).toLowerCase();
        if (valLower.includes('xưởng in')) {
            pageName = 'Page TEMVN';
        } else if (valLower.includes('đồng phục hv') || valLower.includes('đồng phục công ty')) {
            pageName = 'Page Công Ty 2';
        } else if (valLower.includes('seo web')) {
            pageName = 'Seo Web HV.VN';
        } else {
            pageName = 'Page TEMVN';
        }
    }

    // ALWAYS STRICTLY LOCK Page Pancake field (cannot be edited)
    if (pageSelect) {
        let existingOptIndex = Array.from(pageSelect.options).findIndex(o => o.value === pageName);
        if (existingOptIndex >= 0) {
            pageSelect.selectedIndex = existingOptIndex;
        } else if (pageName) {
            const opt = document.createElement('option');
            opt.value = pageName;
            opt.textContent = `🔗 ${pageName}`;
            pageSelect.insertBefore(opt, pageSelect.firstChild);
            pageSelect.selectedIndex = 0;
        }
        pageSelect.disabled = true;
        pageSelect.setAttribute('disabled', 'disabled');
        pageSelect.style.backgroundColor = '#e2e8f0';
        pageSelect.style.color = '#475569';
        pageSelect.style.cursor = 'not-allowed';
        pageSelect.style.pointerEvents = 'none';
        pageSelect.style.opacity = '0.75';
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
