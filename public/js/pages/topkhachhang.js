/**
 * Page: /topkhachhang — renderTopkhachhangPage(container)
 * Báo cáo & Thống kê Top Khách Hàng Doanh Số / Số Đơn nhiều nhất
 */

var _topCustState = {
    period_type: 'month',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    field: 'all',
    sort_by: 'revenue',
    search: '',
    data: null
};

async function renderTopkhachhangPage(container) {
    if (!container) return;

    const cssId = 'top-cust-custom-css';
    if (!document.getElementById(cssId)) {
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = `
            .top-cust-wrap { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 16px; color: #1e293b; max-width: 1440px; margin: 0 auto; }
            .top-cust-hdr { background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .top-cust-title { font-size: 22px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
            
            .top-cust-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
            .top-cust-filter-group { display: flex; align-items: center; gap: 6px; }
            .top-cust-label { font-size: 13px; font-weight: 700; color: #475569; }
            .top-cust-select, .top-cust-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fff; outline: none; }
            .top-cust-select:focus, .top-cust-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
            
            .top-cust-export-btn { margin-left: auto; background: #10b981; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
            .top-cust-export-btn:hover { background: #059669; }

            .top-cust-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .top-cust-card { background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; }
            .top-cust-card-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
            .top-cust-card-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
            .top-cust-card-sub { font-size: 12px; font-weight: 600; color: #475569; }

            .top-cust-panel { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden; }
            .top-cust-panel-hdr { background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 800; color: #1e293b; }
            
            .top-cust-tbl-wrap { overflow-x: auto; }
            .top-cust-tbl { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            .top-cust-tbl th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 12px 14px; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
            .top-cust-tbl td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-weight: 500; }
            .top-cust-tbl tr:hover { background: #f8fafc; }
            .top-cust-tbl .num { text-align: right; }
            .top-cust-tbl .center { text-align: center; }

            .top-rank-badge { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
            .rank-1 { background: #fef3c7; color: #d97706; border: 2px solid #f59e0b; }
            .rank-2 { background: #f1f5f9; color: #475569; border: 2px solid #94a3b8; }
            .rank-3 { background: #ffedd5; color: #c2410c; border: 2px solid #fb923c; }
            .rank-other { background: #f3f4f6; color: #6b7280; font-size: 12px; }

            .field-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
            .tag-tempet { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }
            .tag-dongphuc { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="top-cust-wrap">
            <div class="top-cust-hdr">
                <div class="top-cust-title">👑 TOP KHÁCH HÀNG THÂN THIẾT & DOANH SỐ LỚN</div>
                
                <div class="top-cust-filters">
                    <!-- PERIOD TYPE -->
                    <div class="top-cust-filter-group">
                        <span class="top-cust-label">Thời gian:</span>
                        <select class="top-cust-select" id="topCustPeriodType" onchange="topCustOnPeriodChange(this.value)">
                            <option value="month">Theo Tháng</option>
                            <option value="quarter">Theo Quý</option>
                            <option value="year">Theo Năm</option>
                            <option value="all">Tất Cả Thời Gian</option>
                        </select>
                    </div>

                    <!-- MONTH SELECTOR -->
                    <div class="top-cust-filter-group" id="topCustMonthBox">
                        <select class="top-cust-select" id="topCustMonth" onchange="topCustOnFilterChange()">
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${_topCustState.month === m ? 'selected' : ''}>Tháng ${m}</option>`).join('')}
                        </select>
                    </div>

                    <!-- QUARTER SELECTOR -->
                    <div class="top-cust-filter-group" id="topCustQuarterBox" style="display:none">
                        <select class="top-cust-select" id="topCustQuarter" onchange="topCustOnFilterChange()">
                            <option value="1" ${_topCustState.quarter === 1 ? 'selected' : ''}>Quý 1 (T1 - T3)</option>
                            <option value="2" ${_topCustState.quarter === 2 ? 'selected' : ''}>Quý 2 (T4 - T6)</option>
                            <option value="3" ${_topCustState.quarter === 3 ? 'selected' : ''}>Quý 3 (T7 - T9)</option>
                            <option value="4" ${_topCustState.quarter === 4 ? 'selected' : ''}>Quý 4 (T10 - T12)</option>
                        </select>
                    </div>

                    <!-- YEAR SELECTOR -->
                    <div class="top-cust-filter-group" id="topCustYearBox">
                        <select class="top-cust-select" id="topCustYear" onchange="topCustOnFilterChange()">
                            ${[2024,2025,2026,2027,2028,2029,2030].map(y => `<option value="${y}" ${_topCustState.year === y ? 'selected' : ''}>Năm ${y}</option>`).join('')}
                        </select>
                    </div>

                    <!-- FIELD FILTER -->
                    <div class="top-cust-filter-group">
                        <span class="top-cust-label">Lĩnh vực:</span>
                        <select class="top-cust-select" id="topCustField" onchange="topCustOnFilterChange()">
                            <option value="all">Tất Cả Lĩnh Vực</option>
                            <option value="tem_pet">🏷️ PET TEM</option>
                            <option value="dong_phuc">👕 ĐỒNG PHỤC</option>
                        </select>
                    </div>

                    <!-- SORT FILTER -->
                    <div class="top-cust-filter-group">
                        <span class="top-cust-label">Xếp hạng theo:</span>
                        <select class="top-cust-select" id="topCustSort" onchange="topCustOnFilterChange()">
                            <option value="revenue">💰 Top Doanh Số Cao Nhất</option>
                            <option value="order_count">📦 Top Số Đơn Nhiều Nhất</option>
                        </select>
                    </div>

                    <!-- SEARCH INPUT -->
                    <div class="top-cust-filter-group">
                        <input type="text" class="top-cust-input" id="topCustSearch" placeholder="🔍 Tìm tên KH / SĐT..." onkeyup="topCustOnSearchKey(event)">
                    </div>

                    <button class="top-cust-export-btn" onclick="topCustExportCsv()">📥 Xuất File Excel/CSV</button>
                </div>
            </div>

            <!-- SUMMARY CARDS -->
            <div class="top-cust-summary" id="topCustSummaryCards">
                <div class="top-cust-card">
                    <div class="top-cust-card-title"><span>TỔNG DOANH SỐ TOP KH</span> <span>💰</span></div>
                    <div class="top-cust-card-val" id="topCustValTotalRev">—</div>
                    <div class="top-cust-card-sub" id="topCustSubCustCount">Khách hàng: —</div>
                </div>
                <div class="top-cust-card">
                    <div class="top-cust-card-title"><span>TỔNG SỐ ĐƠN CHỐT</span> <span>📦</span></div>
                    <div class="top-cust-card-val" id="topCustValTotalOrds">—</div>
                    <div class="top-cust-card-sub" id="topCustSubAvgAov">AOV trung bình: —</div>
                </div>
                <div class="top-cust-card">
                    <div class="top-cust-card-title"><span>QUÁN QUÂN DOANH SỐ</span> <span>🥇</span></div>
                    <div class="top-cust-card-val" style="font-size:18px;color:#d97706" id="topCustValChampRev">—</div>
                    <div class="top-cust-card-sub" id="topCustSubChampRevVal">Doanh số: —</div>
                </div>
                <div class="top-cust-card">
                    <div class="top-cust-card-title"><span>QUÁN QUÂN ĐẶT ĐƠN</span> <span>⚡</span></div>
                    <div class="top-cust-card-val" style="font-size:18px;color:#2563eb" id="topCustValChampOrds">—</div>
                    <div class="top-cust-card-sub" id="topCustSubChampOrdsVal">Số đơn: —</div>
                </div>
            </div>

            <!-- MAIN TABLE PANEL -->
            <div class="top-cust-panel">
                <div class="top-cust-panel-hdr">
                    <span>👑 DANH SÁCH BẢNG VINH DANH TOP KHÁCH HÀNG VIP</span>
                    <span style="font-size:13px;font-weight:600;color:#64748b" id="topCustPeriodBadge">...</span>
                </div>
                <div class="top-cust-tbl-wrap">
                    <table class="top-cust-tbl" id="topCustMainTable">
                        <thead>
                            <tr>
                                <th class="center" style="width:60px">HẠNG</th>
                                <th>Khách Hàng</th>
                                <th>Số Điện Thoại</th>
                                <th class="center">Lĩnh Vực</th>
                                <th>NV Phụ Trách</th>
                                <th class="num">Số Đơn</th>
                                <th class="num">Tổng Doanh Số (đ)</th>
                                <th class="num">AOV Đơn TB (đ)</th>
                                <th class="center">Đơn Gần Nhất</th>
                                <th class="center" style="width:90px">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody id="topCustTbody">
                            <tr><td colspan="10" class="center" style="padding:30px;color:#94a3b8">Đang tải dữ liệu Top Khách Hàng...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Load initial data
    await loadTopCustData();
}

async function loadTopCustData() {
    try {
        const period_type = document.getElementById('topCustPeriodType')?.value || _topCustState.period_type;
        const year = document.getElementById('topCustYear')?.value || _topCustState.year;
        const month = document.getElementById('topCustMonth')?.value || _topCustState.month;
        const quarter = document.getElementById('topCustQuarter')?.value || _topCustState.quarter;
        const field = document.getElementById('topCustField')?.value || _topCustState.field;
        const sort_by = document.getElementById('topCustSort')?.value || _topCustState.sort_by;
        const search = document.getElementById('topCustSearch')?.value || _topCustState.search;

        _topCustState.period_type = period_type;
        _topCustState.year = Number(year);
        _topCustState.month = Number(month);
        _topCustState.quarter = Number(quarter);
        _topCustState.field = field;
        _topCustState.sort_by = sort_by;
        _topCustState.search = search;

        const queryParams = new URLSearchParams({
            period_type,
            year,
            month,
            quarter,
            field,
            sort_by,
            search,
            limit: 100
        });

        const res = await apiCall(`/api/reports/top-customers?${queryParams.toString()}`);
        if (!res || !res.customers) {
            const tbody = document.getElementById('topCustTbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="center" style="padding:30px;color:#ef4444">⚠️ Không thể tải dữ liệu. <button onclick="loadTopCustData()" style="padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;margin-left:8px">🔄 Thử lại</button></td></tr>`;
            return;
        }

        _topCustState.data = res;

        // Render Period Badge Title
        const periodBadge = document.getElementById('topCustPeriodBadge');
        if (periodBadge && res.filter) {
            periodBadge.innerText = `${res.filter.period_label} — Lọc: ${field === 'tem_pet' ? 'PET TEM' : (field === 'dong_phuc' ? 'ĐỒNG PHỤC' : 'Tất cả')}`;
        }

        // Render Summary Cards
        const s = res.summary || {};
        document.getElementById('topCustValTotalRev').innerText = formatVnd(s.total_revenue || 0);
        document.getElementById('topCustSubCustCount').innerText = `Tổng Top: ${s.total_customers || 0} khách hàng VIP`;

        document.getElementById('topCustValTotalOrds').innerText = (s.total_orders || 0).toLocaleString('vi-VN') + ' đơn';
        document.getElementById('topCustSubAvgAov').innerText = `AOV TB: ${formatVnd(s.avg_revenue_per_cust || 0)}`;

        if (s.champion_revenue) {
            document.getElementById('topCustValChampRev').innerText = `🥇 ${s.champion_revenue.customer_name || 'N/A'}`;
            document.getElementById('topCustSubChampRevVal').innerText = `Doanh số: ${formatVnd(s.champion_revenue.revenue || 0)}`;
        } else {
            document.getElementById('topCustValChampRev').innerText = '—';
            document.getElementById('topCustSubChampRevVal').innerText = 'Chưa có dữ liệu';
        }

        if (s.champion_orders) {
            document.getElementById('topCustValChampOrds').innerText = `⚡ ${s.champion_orders.customer_name || 'N/A'}`;
            document.getElementById('topCustSubChampOrdsVal').innerText = `Đã chốt: ${s.champion_orders.orders || 0} đơn`;
        } else {
            document.getElementById('topCustValChampOrds').innerText = '—';
            document.getElementById('topCustSubChampOrdsVal').innerText = 'Chưa có dữ liệu';
        }

        // Render Table Rows
        renderTopCustTable(res.customers || []);

    } catch (e) {
        console.error('Error loading top customers:', e);
    }
}

function renderTopCustTable(customers) {
    const tbody = document.getElementById('topCustTbody');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="center" style="padding:30px;color:#64748b">Không tìm thấy khách hàng nào theo bộ lọc lựa chọn.</td></tr>`;
        return;
    }

    let h = '';
    customers.forEach((c, idx) => {
        let rankBadge = `<span class="top-rank-badge rank-other">${idx + 1}</span>`;
        if (idx === 0) rankBadge = `<span class="top-rank-badge rank-1" title="Quán quân Top 1">🥇</span>`;
        else if (idx === 1) rankBadge = `<span class="top-rank-badge rank-2" title="Á quân Top 2">🥈</span>`;
        else if (idx === 2) rankBadge = `<span class="top-rank-badge rank-3" title="Hạng 3 Top 3">🥉</span>`;

        const fieldTag = c.crm_type === 'tem_pet' 
            ? `<span class="field-tag tag-tempet">🏷️ PET TEM</span>`
            : `<span class="field-tag tag-dongphuc">👕 ĐỒNG PHỤC</span>`;

        const lastDateStr = c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('vi-VN') : '—';

        h += `
            <tr>
                <td class="center">${rankBadge}</td>
                <td>
                    <strong style="color:#0f172a;font-size:14px">${c.customer_name}</strong>
                    ${c.province ? `<div style="font-size:11px;color:#64748b">📍 ${c.province}</div>` : ''}
                </td>
                <td>
                    <span style="font-weight:700;color:#2563eb">${c.phone || 'N/A'}</span>
                </td>
                <td class="center">${fieldTag}</td>
                <td>
                    <div style="font-weight:600;color:#334155">👤 ${c.assigned_to_name}</div>
                </td>
                <td class="num" style="font-weight:800;color:#1e293b">${c.order_count.toLocaleString('vi-VN')}</td>
                <td class="num" style="font-weight:800;color:#059669;font-size:14px">${formatVnd(c.total_revenue)}</td>
                <td class="num" style="color:#64748b">${formatVnd(c.avg_order_value)}</td>
                <td class="center" style="font-size:12px;color:#64748b">${lastDateStr}</td>
                <td class="center">
                    <button style="padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer" onclick="topCustOpenDetail(${c.customer_id})">🤝 Xem KH</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = h;
}

function topCustOnPeriodChange(val) {
    const mBox = document.getElementById('topCustMonthBox');
    const qBox = document.getElementById('topCustQuarterBox');
    const yBox = document.getElementById('topCustYearBox');

    if (val === 'month') {
        if (mBox) mBox.style.display = 'flex';
        if (qBox) qBox.style.display = 'none';
        if (yBox) yBox.style.display = 'flex';
    } else if (val === 'quarter') {
        if (mBox) mBox.style.display = 'none';
        if (qBox) qBox.style.display = 'flex';
        if (yBox) yBox.style.display = 'flex';
    } else if (val === 'year') {
        if (mBox) mBox.style.display = 'none';
        if (qBox) qBox.style.display = 'none';
        if (yBox) yBox.style.display = 'flex';
    } else {
        if (mBox) mBox.style.display = 'none';
        if (qBox) qBox.style.display = 'none';
        if (yBox) yBox.style.display = 'none';
    }

    loadTopCustData();
}

function topCustOnFilterChange() {
    loadTopCustData();
}

let _topCustSearchTimer = null;
function topCustOnSearchKey(e) {
    clearTimeout(_topCustSearchTimer);
    _topCustSearchTimer = setTimeout(() => {
        loadTopCustData();
    }, 400);
}

function topCustOpenDetail(custId) {
    if (window.openCustomerModalById) {
        window.openCustomerModalById(custId);
    } else {
        alert('Mã Khách Hàng: #' + custId);
    }
}

function topCustExportCsv() {
    if (!_topCustState.data || !_topCustState.data.customers || _topCustState.data.customers.length === 0) {
        alert('Chưa có dữ liệu để xuất file!');
        return;
    }

    const customers = _topCustState.data.customers;
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'Hạng,Tên Khách Hàng,Số Điện Thoại,Lĩnh Vực,NV Phụ Trách,Số Đơn Hàng,Tổng Doanh Số (đ),AOV Đơn Trung Bình (đ),Đơn Gần Nhất\n';

    customers.forEach(c => {
        const name = `"${(c.customer_name || '').replace(/"/g, '""')}"`;
        const phone = `"${c.phone || ''}"`;
        const field = `"${c.field_label || ''}"`;
        const staff = `"${(c.assigned_to_name || '').replace(/"/g, '""')}"`;
        const lastDate = c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('vi-VN') : '';

        csv += `${c.rank},${name},${phone},${field},${staff},${c.order_count},${c.total_revenue},${c.avg_order_value},"${lastDate}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Top_Khach_Hang_${_topCustState.period_type}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
