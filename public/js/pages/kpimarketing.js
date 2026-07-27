/**
 * Page: /kpimarketing — renderKpimarketingPage(container)
 * Thống kê chỉ số KPI Marketing & Giao chỉ tiêu tháng mới
 */

var _kpiMkt = { month: '', data: null };
var _mcMktSessions = [];
var _mcMktCollapsed = false;

async function renderKpimarketingPage(container) {
    if (!container) return;

    const now = new Date();
    if (!_kpiMkt.month) {
        _kpiMkt.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const cssId = 'kpi-mkt-custom-css';
    if (!document.getElementById(cssId)) {
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = `
            .kpi-mkt-wrap { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 16px; color: #1e293b; max-width: 1400px; margin: 0 auto; }
            .kpi-mkt-topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; background: #fff; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
            .kpi-mkt-title { font-size: 20px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
            .kpi-mkt-month-nav { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 4px 8px; border-radius: 10px; border: 1px solid #e2e8f0; }
            .kpi-mkt-nav-btn { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; width: 32px; height: 32px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
            .kpi-mkt-nav-btn:hover { background: #f1f5f9; color: #2563eb; }
            .kpi-mkt-month-lbl { font-size: 15px; font-weight: 700; color: #2563eb; cursor: pointer; padding: 0 8px; }
            .kpi-mkt-set-btn { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 2px 4px rgba(59,130,246,0.3); transition: all 0.2s; }
            .kpi-mkt-set-btn:hover { opacity: 0.92; transform: translateY(-1px); }

            .kpi-mkt-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .kpi-mkt-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; }
            .kpi-mkt-card-hdr { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
            .kpi-mkt-card-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
            .kpi-mkt-card-sub { font-size: 12px; color: #64748b; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
            .kpi-mkt-badge-pct { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
            .kpi-mkt-badge-green { background: #dcfce7; color: #166534; }
            .kpi-mkt-badge-blue { background: #dbeafe; color: #1e40af; }
            .kpi-mkt-badge-orange { background: #ffedd5; color: #9a3412; }

            .kpi-mkt-panel { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden; }
            .kpi-mkt-panel-hdr { background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; justify-content: space-between; }
            
            .kpi-mkt-tbl-wrap { overflow-x: auto; }
            .kpi-mkt-tbl { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            .kpi-mkt-tbl th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 12px 14px; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
            .kpi-mkt-tbl td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-weight: 500; }
            .kpi-mkt-tbl tr:hover { background: #f8fafc; }
            .kpi-mkt-tbl .num { text-align: right; }
            .kpi-mkt-tbl .center { text-align: center; }

            /* Modal */
            .kpi-mkt-modal { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); display: none; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
            .kpi-mkt-modal-box { background: #fff; border-radius: 16px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
            .kpi-mkt-modal-hdr { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; }
            .kpi-mkt-modal-title { font-size: 16px; font-weight: 800; color: #0f172a; }
            .kpi-mkt-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
            .kpi-mkt-modal-ftr { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="kpi-mkt-wrap">
            <div class="kpi-mkt-topbar">
                <div class="kpi-mkt-title">🎯 BÁO CÁO & KPI MARKETING</div>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="kpi-mkt-month-nav">
                        <button class="kpi-mkt-nav-btn" onclick="kpiMktChangeMonth(-1)">‹</button>
                        <span class="kpi-mkt-month-lbl" id="kpiMktMonthText" onclick="kpiMktPickMonth()">...</span>
                        <button class="kpi-mkt-nav-btn" onclick="kpiMktChangeMonth(1)">›</button>
                        <input type="month" id="kpiMktMonthInput" style="display:none" onchange="kpiMktOnMonthInput(this.value)">
                    </div>
                    <button class="kpi-mkt-set-btn" id="kpiMktSetBtn" onclick="kpiMktOpenTargetModal()" style="display:none">🎯 Đặt KPI Tháng</button>
                </div>
            </div>

            <!-- CARDS SUMMARY -->
            <div class="kpi-mkt-summary" id="kpiMktCards">
                <div class="kpi-mkt-card">
                    <div class="kpi-mkt-card-hdr"><span>CHI PHÍ MKT</span> <span>💰</span></div>
                    <div class="kpi-mkt-card-val" id="kpiMktValSpent">—</div>
                    <div class="kpi-mkt-card-sub">
                        <span>Chỉ tiêu: <strong id="kpiMktTargetBudget">—</strong></span>
                        <span class="kpi-mkt-badge-pct kpi-mkt-badge-blue" id="kpiMktPctBudget">0%</span>
                    </div>
                </div>
                <div class="kpi-mkt-card">
                    <div class="kpi-mkt-card-hdr"><span>TỔNG SỐ LEAD</span> <span>📩</span></div>
                    <div class="kpi-mkt-card-val" id="kpiMktValLeads">—</div>
                    <div class="kpi-mkt-card-sub">
                        <span>Chỉ tiêu: <strong id="kpiMktTargetLeads">—</strong></span>
                        <span class="kpi-mkt-badge-pct kpi-mkt-badge-green" id="kpiMktPctLeads">0%</span>
                    </div>
                </div>
                <div class="kpi-mkt-card">
                    <div class="kpi-mkt-card-hdr"><span>CPL TRUNG BÌNH</span> <span>📊</span></div>
                    <div class="kpi-mkt-card-val" id="kpiMktValCpl">—</div>
                    <div class="kpi-mkt-card-sub">
                        <span>Số Đơn: <strong id="kpiMktValOrders">—</strong></span>
                        <span style="font-weight:700" id="kpiMktValCpo">CPO: —</span>
                    </div>
                </div>
                <div class="kpi-mkt-card">
                    <div class="kpi-mkt-card-hdr"><span>DOANH SỐ MKT</span> <span>💵</span></div>
                    <div class="kpi-mkt-card-val" id="kpiMktValRevenue">—</div>
                    <div class="kpi-mkt-card-sub">
                        <span>Chỉ tiêu: <strong id="kpiMktTargetRevenue">—</strong></span>
                        <span class="kpi-mkt-badge-pct kpi-mkt-badge-green" id="kpiMktPctRevenue">0%</span>
                    </div>
                </div>
                <div class="kpi-mkt-card">
                    <div class="kpi-mkt-card-hdr"><span>ROAS TỔNG</span> <span>📈</span></div>
                    <div class="kpi-mkt-card-val" id="kpiMktValRoas">—</div>
                    <div class="kpi-mkt-card-sub">
                        <span>Doanh Số / Chi Phí</span>
                        <span class="kpi-mkt-badge-pct kpi-mkt-badge-orange" id="kpiMktBadgeRoas">ROAS</span>
                    </div>
                </div>
            </div>

            <!-- MAIN TABLE -->
            <div class="kpi-mkt-panel">
                <div class="kpi-mkt-panel-hdr">
                    <span>📊 THỐNG KÊ CHI TIẾT THEO NHÂN VIÊN MARKETING</span>
                    <input type="text" id="kpiMktSearchInput" placeholder="🔍 Tìm nhân viên..." style="padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;width:200px" onkeyup="kpiMktFilterTable(this.value)">
                </div>
                <div class="kpi-mkt-tbl-wrap">
                    <table class="kpi-mkt-tbl" id="kpiMktMainTable">
                        <thead>
                            <tr>
                                <th class="center" style="width:50px">STT</th>
                                <th>Nhân Viên Marketing / Cầm Ads</th>
                                <th class="num">Chi Phí (đ)</th>
                                <th class="num">Chỉ Tiêu Chi Phí</th>
                                <th class="num">Số Lead</th>
                                <th class="num">Chỉ Tiêu Lead</th>
                                <th class="num">CPL (đ/lead)</th>
                                <th class="num">Số Đơn</th>
                                <th class="num">Doanh Số (đ)</th>
                                <th class="num">Chỉ Tiêu Doanh Số</th>
                                <th class="num">ROAS (%)</th>
                                <th class="center">% Đạt Lead</th>
                                <th class="center">% Đạt Doanh Số</th>
                            </tr>
                        </thead>
                        <tbody id="kpiMktTbody">
                            <tr><td colspan="13" class="center" style="padding:30px;color:#94a3b8">Đang tải dữ liệu...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- MEETING COMMITMENT SECTION -->
            <div id="kpiMktMeetingCommit"></div>
        </div>

        <!-- MODAL SET TARGETS -->
        <div class="kpi-mkt-modal" id="kpiMktTargetModal">
            <div class="kpi-mkt-modal-box">
                <div class="kpi-mkt-modal-hdr">
                    <div class="kpi-mkt-modal-title">🎯 Đặt Chỉ Tiêu KPI Marketing — <span id="kpiMktModalMonthLbl"></span></div>
                    <button style="border:none;background:none;font-size:18px;cursor:pointer;color:#64748b" onclick="kpiMktCloseTargetModal()">✕</button>
                </div>
                <div class="kpi-mkt-modal-body">
                    <p style="font-size:13px;color:#64748b;margin-bottom:16px">Nhập chỉ tiêu tháng cho từng nhân viên Marketing hoặc kênh quảng cáo:</p>
                    <table class="kpi-mkt-tbl" style="border:1px solid #e2e8f0">
                        <thead>
                            <tr style="background:#f8fafc">
                                <th>Tên NV / Cầm Ads</th>
                                <th style="width:160px">Chỉ Tiêu Chi Phí (đ)</th>
                                <th style="width:120px">Chỉ Tiêu Lead</th>
                                <th style="width:160px">Chỉ Tiêu Doanh Số (đ)</th>
                                <th style="width:130px">CPL Mục Tiêu (đ)</th>
                                <th style="width:110px">ROAS Target (%)</th>
                            </tr>
                        </thead>
                        <tbody id="kpiMktModalTbody"></tbody>
                    </table>
                </div>
                <div class="kpi-mkt-modal-ftr">
                    <button style="padding:8px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;font-weight:600;cursor:pointer" onclick="kpiMktCloseTargetModal()">Hủy</button>
                    <button class="kpi-mkt-set-btn" onclick="kpiMktSaveTargets()">💾 Lưu Chỉ Tiêu</button>
                </div>
            </div>
        </div>
    `;

    // Load data
    await loadKpimarketingData();
}

async function loadKpimarketingData() {
    try {
        const user = window.currentUser || {};
        const isManager = ['giam_doc', 'admin', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role) || user.username === 'admin';
        
        const setBtn = document.getElementById('kpiMktSetBtn');
        if (setBtn) setBtn.style.display = isManager ? 'inline-block' : 'none';

        const res = await apiCall(`/api/reports/kpi-marketing?month=${_kpiMkt.month}`);
        if (!res) return;

        _kpiMkt.data = res;

        // Update Month Label
        const monthTxt = document.getElementById('kpiMktMonthText');
        if (monthTxt && res.month) {
            monthTxt.innerText = res.month.label;
        }

        // Render Summary Cards
        const s = res.summary || {};
        document.getElementById('kpiMktValSpent').innerText = formatVnd(s.total_spent || 0);
        document.getElementById('kpiMktTargetBudget').innerText = formatVnd(s.target_budget || 0);
        const budgetPct = s.target_budget > 0 ? Math.round((s.total_spent / s.target_budget) * 100) : 0;
        document.getElementById('kpiMktPctBudget').innerText = `${budgetPct}%`;

        document.getElementById('kpiMktValLeads').innerText = (s.total_leads || 0).toLocaleString('vi-VN');
        document.getElementById('kpiMktTargetLeads').innerText = (s.target_leads || 0).toLocaleString('vi-VN');
        const leadsPct = s.target_leads > 0 ? Math.round((s.total_leads / s.target_leads) * 100) : 0;
        document.getElementById('kpiMktPctLeads').innerText = `${leadsPct}%`;

        document.getElementById('kpiMktValCpl').innerText = formatVnd(s.avg_cpl || 0);
        document.getElementById('kpiMktValOrders').innerText = (s.total_orders || 0).toLocaleString('vi-VN');
        document.getElementById('kpiMktValCpo').innerText = `CPO: ${formatVnd(s.avg_cpo || 0)}`;

        document.getElementById('kpiMktValRevenue').innerText = formatVnd(s.total_revenue || 0);
        document.getElementById('kpiMktTargetRevenue').innerText = formatVnd(s.target_revenue || 0);
        const revPct = s.target_revenue > 0 ? Math.round((s.total_revenue / s.target_revenue) * 100) : 0;
        document.getElementById('kpiMktPctRevenue').innerText = `${revPct}%`;

        document.getElementById('kpiMktValRoas').innerText = `${s.avg_roas || 0}%`;

        // Render Table
        renderKpimarketingTable(res.handlers || []);

        // Render Meeting Commitment section
        loadKpiMktMeetingCommit();

    } catch (e) {
        console.error('Error loading KPI Mkt data:', e);
    }
}

function renderKpimarketingTable(handlers) {
    const tbody = document.getElementById('kpiMktTbody');
    if (!tbody) return;

    if (!handlers || handlers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="center" style="padding:24px;color:#64748b">Không có dữ liệu nhân viên Marketing trong tháng này.</td></tr>`;
        return;
    }

    let h = '';
    handlers.forEach((item, index) => {
        const a = item.actual || {};
        const t = item.targets || {};
        const r = item.rate || {};

        const leadClass = r.leads_pct >= 100 ? 'color:#16a34a;font-weight:700' : 'color:#dc2626;font-weight:700';
        const revClass = r.revenue_pct >= 100 ? 'color:#16a34a;font-weight:700' : 'color:#dc2626;font-weight:700';

        h += `
            <tr data-name="${(item.ads_handler_name || '').toLowerCase()}">
                <td class="center" style="color:#64748b;font-weight:600">${index + 1}</td>
                <td><strong style="color:#1e293b">👤 ${item.ads_handler_name}</strong></td>
                <td class="num">${formatVnd(a.spent || 0)}</td>
                <td class="num" style="color:#64748b">${t.target_budget > 0 ? formatVnd(t.target_budget) : '—'}</td>
                <td class="num" style="font-weight:700;color:#2563eb">${(a.leads || 0).toLocaleString('vi-VN')}</td>
                <td class="num" style="color:#64748b">${t.target_leads > 0 ? t.target_leads.toLocaleString('vi-VN') : '—'}</td>
                <td class="num">${a.cpl > 0 ? formatVnd(a.cpl) : '—'}</td>
                <td class="num">${(a.orders || 0).toLocaleString('vi-VN')}</td>
                <td class="num" style="font-weight:700;color:#059669">${formatVnd(a.revenue || 0)}</td>
                <td class="num" style="color:#64748b">${t.target_revenue > 0 ? formatVnd(t.target_revenue) : '—'}</td>
                <td class="num" style="font-weight:700;color:#d97706">${a.roas > 0 ? a.roas + '%' : '—'}</td>
                <td class="center" style="${leadClass}">${t.target_leads > 0 ? r.leads_pct + '%' : '—'}</td>
                <td class="center" style="${revClass}">${t.target_revenue > 0 ? r.revenue_pct + '%' : '—'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = h;
}

function kpiMktFilterTable(q) {
    const term = (q || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#kpiMktTbody tr');
    rows.forEach(r => {
        const name = r.getAttribute('data-name') || '';
        r.style.display = name.includes(term) ? '' : 'none';
    });
}

function kpiMktChangeMonth(offset) {
    const [y, m] = _kpiMkt.month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    _kpiMkt.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadKpimarketingData();
}

function kpiMktPickMonth() {
    const inp = document.getElementById('kpiMktMonthInput');
    if (inp) {
        inp.value = _kpiMkt.month;
        inp.click();
        inp.showPicker && inp.showPicker();
    }
}

function kpiMktOnMonthInput(val) {
    if (val && /^\d{4}-\d{2}$/.test(val)) {
        _kpiMkt.month = val;
        loadKpimarketingData();
    }
}

function kpiMktOpenTargetModal() {
    const modal = document.getElementById('kpiMktTargetModal');
    const lbl = document.getElementById('kpiMktModalMonthLbl');
    const tbody = document.getElementById('kpiMktModalTbody');
    if (!modal || !_kpiMkt.data) return;

    if (lbl && _kpiMkt.data.month) lbl.innerText = _kpiMkt.data.month.label;

    const handlers = _kpiMkt.data.handlers || [];
    let h = '';
    handlers.forEach(item => {
        const t = item.targets || {};
        h += `
            <tr data-handler="${item.ads_handler_name}">
                <td style="font-weight:700">👤 ${item.ads_handler_name}</td>
                <td><input type="number" class="mkt-inp-budget" value="${t.target_budget || 0}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"></td>
                <td><input type="number" class="mkt-inp-leads" value="${t.target_leads || 0}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"></td>
                <td><input type="number" class="mkt-inp-rev" value="${t.target_revenue || 0}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"></td>
                <td><input type="number" class="mkt-inp-cpl" value="${t.target_cpl || 0}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"></td>
                <td><input type="number" class="mkt-inp-roas" value="${t.target_roas || 0}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"></td>
            </tr>
        `;
    });

    tbody.innerHTML = h;
    modal.style.display = 'flex';
}

function kpiMktCloseTargetModal() {
    const modal = document.getElementById('kpiMktTargetModal');
    if (modal) modal.style.display = 'none';
}

async function kpiMktSaveTargets() {
    try {
        const tbody = document.getElementById('kpiMktModalTbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        const targets = [];

        rows.forEach(r => {
            const ads_handler_name = r.getAttribute('data-handler');
            const target_budget = Number(r.querySelector('.mkt-inp-budget')?.value || 0);
            const target_leads = Number(r.querySelector('.mkt-inp-leads')?.value || 0);
            const target_revenue = Number(r.querySelector('.mkt-inp-rev')?.value || 0);
            const target_cpl = Number(r.querySelector('.mkt-inp-cpl')?.value || 0);
            const target_roas = Number(r.querySelector('.mkt-inp-roas')?.value || 0);

            if (ads_handler_name) {
                targets.push({
                    ads_handler_name,
                    target_budget,
                    target_leads,
                    target_revenue,
                    target_cpl,
                    target_roas
                });
            }
        });

        const res = await apiCall('/api/reports/kpi-marketing/targets', 'POST', {
            period_value: _kpiMkt.month,
            targets
        });

        if (res && res.success) {
            alert('✅ Đã lưu chỉ tiêu KPI Marketing thành công!');
            kpiMktCloseTargetModal();
            loadKpimarketingData();
        } else {
            alert('❌ Có lỗi khi lưu chỉ tiêu KPI!');
        }
    } catch (e) {
        console.error('Error saving KPI Mkt targets:', e);
        alert('❌ Có lỗi xảy ra: ' + e.message);
    }
}

/* Format VNĐ helper */
function formatVnd(val) {
    if (!val || isNaN(val)) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}

/* Meeting commitments integration for KPI Marketing */
async function loadKpiMktMeetingCommit() {
    const el = document.getElementById('kpiMktMeetingCommit');
    if (!el) return;

    try {
        const user = window.currentUser || {};
        const isGD = ['giam_doc', 'admin'].includes(user.role) || user.username === 'admin';
        const [selYear, selMonth] = _kpiMkt.month.split('-').map(Number);
        
        // Fetch commitments for kpimarketing page
        const res = await apiCall(`/api/meeting-commitments?page_key=kpimarketing&month=${_kpiMkt.month}`);
        _mcMktSessions = res && Array.isArray(res.sessions) ? res.sessions : [];

        let h = `
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;margin-top:20px">
                <div style="background:#f8fafc;padding:14px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
                    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#1e293b">
                        <span>📝 Cam Kết Cuộc Họp: KPI Marketing</span>
                        <span style="font-size:13px;font-weight:500;color:#64748b">— ${_kpiMkt.month} (${_mcMktSessions.length} cuộc họp)</span>
                    </div>
                    <div style="display:flex;gap:8px">
                        <a href="/camketcuochop" style="padding:6px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:600;color:#475569;text-decoration:none">📜 Quản Lý Cuộc Họp</a>
                    </div>
                </div>
                <div style="padding:20px">
        `;

        if (_mcMktSessions.length === 0) {
            h += `
                <div style="text-align:center;padding:30px;color:#64748b">
                    <div style="font-size:36px;margin-bottom:8px">📫</div>
                    <div style="font-size:14px;font-weight:600">Chưa có cuộc họp cam kết KPI Marketing trong tháng ${_kpiMkt.month}</div>
                    <div style="font-size:12px;margin-top:4px">Tạo cuộc họp tại mục Cam Kết Cuộc Họp để giao nhiệm vụ và ghi nhận ý kiến.</div>
                </div>
            `;
        } else {
            _mcMktSessions.forEach(s => {
                h += `
                    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:12px;background:#fafafa">
                        <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:6px">📌 ${s.title || 'Cuộc họp KPI Marketing'} (${s.meeting_date || ''})</div>
                        <div style="font-size:13px;color:#475569;margin-bottom:8px">${s.notes || 'Không có ghi chú'}</div>
                        <div style="font-size:12px;color:#64748b">Người tạo: ${s.creator_name || 'Quản lý'} • Số cam kết: ${s.commitments ? s.commitments.length : 0}</div>
                    </div>
                `;
            });
        }

        h += `</div></div>`;
        el.innerHTML = h;
    } catch (e) {
        console.error('Error loading MKT meeting commitments:', e);
    }
}
