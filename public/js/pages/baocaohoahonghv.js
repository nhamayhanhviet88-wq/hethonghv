// ========== BÁO CÁO HOA HỒNG HV — Combined Dashboard ==========
let _hvData = null, _hvActiveCard = 'all', _hvPage = 1;
const _hvPageSize = 50;

function _hvMoney(n) { return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0); }

// ===== DATE FILTER HELPERS =====
function _hvToday() { return new Date().toISOString().slice(0,10); }
function _hvYesterday() { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
function _hvDaysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
function _hvMonthRange(offset) {
    const d=new Date(); d.setMonth(d.getMonth()+offset);
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0');
    const last=new Date(y,d.getMonth()+1,0).getDate();
    return { from:`${y}-${m}-01`, to:`${y}-${m}-${last}` };
}

function _hvSetFilter(type) {
    let from='', to='';
    if (type==='today') { from=to=_hvToday(); }
    else if (type==='yesterday') { from=to=_hvYesterday(); }
    else if (type==='7days') { from=_hvDaysAgo(6); to=_hvToday(); }
    else if (type==='thismonth') { const r=_hvMonthRange(0); from=r.from; to=r.to; }
    else if (type==='lastmonth') { const r=_hvMonthRange(-1); from=r.from; to=r.to; }
    else if (type==='all') { from=''; to=''; }
    else if (type==='custom') { return; } // handled by date inputs
    
    document.querySelectorAll('.hv-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.hv-filter-btn[data-f="${type}"]`);
    if (btn) btn.classList.add('active');
    
    const fromEl=document.getElementById('hvDateFrom'), toEl=document.getElementById('hvDateTo');
    if (fromEl) fromEl.value = from;
    if (toEl) toEl.value = to;
    _hvApplyDateFilter();
}

function _hvApplyDateFilter() {
    if (!_hvData) return;
    const from = document.getElementById('hvDateFrom')?.value || '';
    const to = document.getElementById('hvDateTo')?.value || '';
    
    let items = [..._hvData.allItems];
    if (from) items = items.filter(i => (i.created_at||'').slice(0,10) >= from);
    if (to) items = items.filter(i => (i.created_at||'').slice(0,10) <= to);
    
    _hvData.filtered = items;
    _hvRenderCards();
    _hvPage = 1;
    _hvApplyCardFilter();
}

function _hvSetYear(sel) {
    // Update month picker range based on year
}

function _hvSetMonth(val) {
    if (!val) return;
    document.querySelectorAll('.hv-filter-btn').forEach(b => b.classList.remove('active'));
    const [y,m] = val.split('-');
    const last = new Date(Number(y), Number(m), 0).getDate();
    const fromEl=document.getElementById('hvDateFrom'), toEl=document.getElementById('hvDateTo');
    if (fromEl) fromEl.value = `${y}-${m}-01`;
    if (toEl) toEl.value = `${y}-${m}-${last}`;
    _hvApplyDateFilter();
}

// ===== RENDER SUMMARY CARDS — Reference-Style Dashboard =====
function _hvRenderCards() {
    const items = _hvData.filtered || [];
    const custItems = items.filter(i => i._src === 'customer');
    const affItems = items.filter(i => i._src === 'affiliate');
    const totalComm = window._hvBalanceData?.totalCommission || items.reduce((s,i) => s+(i.commission||0), 0);
    const totalOrders = items.reduce((s,i) => s+(i.order_count||0), 0);
    const totalCust = custItems.length;
    const cancelledCust = custItems.filter(i => i.cancel_approved===1).length;
    const totalAff = affItems.length;
    const affWithTK = affItems.filter(i => (window._hvAffApprovedIds||[]).includes(i.id)).length;
    const directRate = items.find(i=>i.is_direct)?.rate || 10;
    const childRate = items.find(i=>!i.is_direct)?.rate || 5;
    const totalWithdrawn = window._hvBalanceData?.totalWithdrawn || 0;
    const balance = window._hvBalanceData?.balance || 0;
    const isA = (id) => _hvActiveCard === id;
    const userName = (window.currentUser?.name || 'Đối Tác');

    document.getElementById('hvCards').innerHTML = `
        <!-- Welcome -->
        <div class="hv-welcome">
            <div class="hv-welcome-text">
                <img src="/images/logo.png" alt="HV" class="hv-welcome-logo"> Đồng Phục HV xin chào quý đối tác <strong>${userName}</strong>!
            </div>
            <div class="hv-welcome-date">${new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>

        <!-- ROW 1: 4 Stat Cards -->
        <div class="hv-stats-row">
            <div class="hv-stat hv-stat-primary ${isA('commission')?'hv-stat-selected':''}" onclick="_hvCardClick('commission')">
                <div class="hv-shimmer"></div>
                <div class="hv-stat-icon-wrap hv-stat-icon-gold"><span>💰</span></div>
                <div class="hv-stat-value-primary">${_hvMoney(totalComm)}</div>
                <div class="hv-stat-label-primary">Tổng Hoa Hồng</div>
                <div class="hv-stat-sub-primary">TT ${directRate}% · GT ${childRate}%</div>
            </div>
            <div class="hv-stat ${isA('orders')?'hv-stat-selected':''}" onclick="_hvCardClick('orders')">
                <div class="hv-shimmer"></div>
                <div class="hv-stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);"><span>📦</span></div>
                <div class="hv-stat-value ${isA('orders')?'hv-val-active':''}">${totalOrders}</div>
                <div class="hv-stat-label ${isA('orders')?'hv-lbl-active':''}">${isA('orders')?'▶ ':''}Tổng Đơn Hàng</div>
            </div>
            <div class="hv-stat ${isA('customers')?'hv-stat-selected':''}" onclick="_hvCardClick('customers')">
                <div class="hv-shimmer"></div>
                <div class="hv-stat-icon-wrap" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);"><span>👥</span></div>
                <div class="hv-stat-value ${isA('customers')?'hv-val-active':''}">${totalCust}</div>
                <div class="hv-stat-label ${isA('customers')?'hv-lbl-active':''}">${isA('customers')?'▶ ':''}Tổng Khách Hàng</div>
            </div>
            <div class="hv-stat ${isA('affiliates')?'hv-stat-selected':''}" onclick="_hvCardClick('affiliates')">
                <div class="hv-shimmer"></div>
                <div class="hv-stat-icon-wrap" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);"><span>🤝</span></div>
                <div class="hv-stat-value ${isA('affiliates')?'hv-val-active':''}">${totalAff}</div>
                <div class="hv-stat-label ${isA('affiliates')?'hv-lbl-active':''}">${isA('affiliates')?'▶ ':''}Tổng Affiliate</div>
            </div>
        </div>

        <!-- ROW 2: 3 KPI Panels -->
        <div class="hv-kpi-row">
            <div class="hv-kpi" onclick="_hvCardClick('cancelled')">
                <div class="hv-kpi-top">
                    <span class="hv-kpi-title">💸 Đã Rút</span>
                </div>
                <div class="hv-kpi-val" style="color:#be185d;">${_hvMoney(totalWithdrawn)}</div>
            </div>
            <div class="hv-kpi">
                <div class="hv-kpi-top">
                    <span class="hv-kpi-title">💎 Còn Lại</span>
                </div>
                <div class="hv-kpi-val" style="color:#047857;">${_hvMoney(balance)}</div>
            </div>
            <div class="hv-kpi">
                <div class="hv-kpi-top">
                    <span class="hv-kpi-title">📋 Chi Tiết</span>
                </div>
                <div class="hv-kpi-detail">
                    <div class="hv-kpi-item ${isA('cancelled')?'hv-kpi-item-active':''}" onclick="event.stopPropagation();_hvCardClick('cancelled')">
                        <span class="hv-kpi-dot" style="background:#ef4444;"></span>Hủy KH: <strong>${cancelledCust}</strong>
                    </div>
                    <div class="hv-kpi-item ${isA('afftk')?'hv-kpi-item-active':''}" onclick="event.stopPropagation();_hvCardClick('afftk')">
                        <span class="hv-kpi-dot" style="background:#f59e0b;"></span>Có TK: <strong>${affWithTK}</strong>
                    </div>
                </div>
            </div>
        </div>`;
}

function _hvCardClick(type) {
    _hvActiveCard = (_hvActiveCard === type) ? 'all' : type;
    _hvPage = 1;
    _hvRenderCards();
    _hvApplyCardFilter();
}

function _hvApplyCardFilter() {
    const items = _hvData.filtered || [];
    let display = items;
    
    if (_hvActiveCard === 'commission') display = items.filter(i => i.commission > 0);
    else if (_hvActiveCard === 'orders') display = items.filter(i => i.order_count > 0);
    else if (_hvActiveCard === 'customers') display = items.filter(i => i._src === 'customer');
    else if (_hvActiveCard === 'cancelled') display = items.filter(i => i._src === 'customer' && i.cancel_approved === 1);
    else if (_hvActiveCard === 'affiliates') display = items.filter(i => i._src === 'affiliate');
    else if (_hvActiveCard === 'afftk') display = items.filter(i => i._src === 'affiliate' && (window._hvAffApprovedIds||[]).includes(i.id));
    
    // Apply search
    const q = (document.getElementById('hvSearch')?.value || '').toLowerCase().trim();
    if (q) {
        display = display.filter(i => 
            (i.customer_name||'').toLowerCase().includes(q) ||
            (i.phone||'').includes(q) ||
            (i.referrer_name||'').toLowerCase().includes(q)
        );
    }
    
    // Referrer filter
    const gtFilter = document.getElementById('hvFilterGT')?.value || '';
    if (gtFilter) display = display.filter(i => i.referrer_name === gtFilter);
    
    _hvRenderTable(display);
}

function _hvRenderTable(items) {
    const tbody = document.getElementById('hvTableBody');
    const pgEl = document.getElementById('hvPagination');
    if (!tbody) return;
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#9ca3af;">Không có dữ liệu</td></tr>';
        if (pgEl) pgEl.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(items.length / _hvPageSize);
    if (_hvPage > totalPages) _hvPage = totalPages;
    const start = (_hvPage-1)*_hvPageSize;
    const page = items.slice(start, start+_hvPageSize);
    
    tbody.innerHTML = page.map((item, i) => {
        const idx = start+i+1;
        const srcBadge = item._src==='affiliate' 
            ? '<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#ede9fe;color:#7c3aed;font-weight:600;">AFF</span>'
            : '<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#dbeafe;color:#2563eb;font-weight:600;">KH</span>';
        const keyIcon = (window._hvAffApprovedIds||[]).includes(item.id) ? '🔑' : ((window._hvAffLockedIds||[]).includes(item.id) ? '🔒' : '');
        const refLabel = item.is_direct ? '<span style="color:#10b981;font-weight:600;">🎯 Trực tiếp</span>' : `<span style="color:#8b5cf6;font-weight:600;">👥 ${item.referrer_name||'-'}</span>`;
        const statusBadge = _hvGetStatusBadge(item);
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '—';
        
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 6px;text-align:center;font-size:12px;color:#64748b;">${idx}</td>
            <td style="padding:8px 6px;text-align:center;">${keyIcon}</td>
            <td style="padding:8px 6px;"><span style="font-weight:700;color:#1e3a5f;font-size:13px;">${item.customer_name}</span> ${srcBadge}</td>
            <td style="padding:8px 6px;font-size:12px;">${refLabel}</td>
            <td style="padding:8px 6px;font-size:12px;color:#475569;">${item.phone||'—'}</td>
            <td style="padding:8px 6px;text-align:center;">${statusBadge}</td>
            <td style="padding:8px 6px;font-size:12px;font-weight:600;color:#1e40af;">${_hvMoney(item.total_revenue)}</td>
            <td style="padding:8px 6px;font-size:12px;">${item.rate||0}%</td>
            <td style="padding:8px 6px;font-size:12px;font-weight:700;color:${item.commission>0?'#059669':'#94a3b8'};">${_hvMoney(item.commission)}</td>
            <td style="padding:8px 6px;font-size:11px;color:#64748b;">${item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('vi-VN') : '—'}</td>
            <td style="padding:8px 6px;font-size:11px;color:#64748b;">${date}</td>
        </tr>`;
    }).join('');
    
    // Pagination
    if (pgEl && totalPages > 1) {
        const prevDis = _hvPage<=1 ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        const nextDis = _hvPage>=totalPages ? 'opacity:0.4;pointer-events:none;' : 'cursor:pointer;';
        pgEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0;">
            <span onclick="_hvPage--;_hvApplyCardFilter()" style="padding:5px 14px;border-radius:8px;background:#1e3a5f;color:white;font-size:12px;font-weight:600;${prevDis}">◀ Trước</span>
            <span style="font-size:12px;font-weight:700;color:#1e293b;">Trang ${_hvPage} / ${totalPages} · ${items.length} KH</span>
            <span onclick="_hvPage++;_hvApplyCardFilter()" style="padding:5px 14px;border-radius:8px;background:#1e3a5f;color:white;font-size:12px;font-weight:600;${nextDis}">Sau ▶</span>
        </div>`;
    } else if (pgEl) {
        pgEl.innerHTML = items.length > 0 ? `<div style="text-align:center;font-size:12px;color:#64748b;padding:8px;">Tất cả ${items.length} khách hàng</div>` : '';
    }
}

function _hvGetStatusBadge(item) {
    if (item.cancel_approved === 1) return '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fef2f2;color:#dc2626;font-weight:600;border:1px solid #fecaca;">❌ Đã Hủy</span>';
    const map = { dang_tu_van:'⏳ Đang TV', bao_gia:'💰 Báo Giá', dat_coc:'✅ Đặt Cọc', chot_don:'🎯 Chốt Đơn', san_xuat:'🏭 Sản Xuất', giao_hang:'🚚 Giao Hàng', hoan_thanh:'✅ Hoàn Thành' };
    const colors = { dang_tu_van:'#3b82f6', bao_gia:'#f59e0b', dat_coc:'#10b981', chot_don:'#8b5cf6', san_xuat:'#6366f1', giao_hang:'#06b6d4', hoan_thanh:'#059669' };
    const s = item.order_status || 'dang_tu_van';
    return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${(colors[s]||'#6b7280')}15;color:${colors[s]||'#6b7280'};font-weight:600;border:1px solid ${(colors[s]||'#6b7280')}30;">${map[s]||s}</span>`;
}

// ===== MAIN RENDER =====
async function renderBaoCaoHoaHongHVPage(container) {
    const btnStyle = 'padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:white;color:#334155;transition:all 0.15s;';
    const activeBtnStyle = 'padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #3b82f6;background:#3b82f6;color:white;';
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>📊 Báo Cáo Hoa Hồng HV</h3></div>
            <div class="card-body">
                <!-- Date Filter Bar -->
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                    <span style="font-size:13px;margin-right:4px;">📅</span>
                    <button class="hv-filter-btn" data-f="today" onclick="_hvSetFilter('today')" style="${btnStyle}">📅 Hôm nay</button>
                    <button class="hv-filter-btn" data-f="yesterday" onclick="_hvSetFilter('yesterday')" style="${btnStyle}">📅 Hôm qua</button>
                    <button class="hv-filter-btn" data-f="7days" onclick="_hvSetFilter('7days')" style="${btnStyle}">📅 7 ngày</button>
                    <button class="hv-filter-btn" data-f="thismonth" onclick="_hvSetFilter('thismonth')" style="${btnStyle}">📅 Tháng này</button>
                    <button class="hv-filter-btn" data-f="lastmonth" onclick="_hvSetFilter('lastmonth')" style="${btnStyle}">📅 Tháng trước</button>
                    <button class="hv-filter-btn active" data-f="all" onclick="_hvSetFilter('all')" style="${activeBtnStyle}">Tất cả</button>
                    <span style="font-size:11px;color:#94a3b8;margin:0 4px;">|</span>
                    <span style="font-size:12px;color:#475569;font-weight:600;">📅 Tùy chọn</span>
                    <input type="date" id="hvDateFrom" onchange="_hvApplyDateFilter()" style="padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
                    <span style="color:#94a3b8;">—</span>
                    <input type="date" id="hvDateTo" onchange="_hvApplyDateFilter()" style="padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
                    <select onchange="_hvSetYear(this)" style="padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
                        <option value="2026" selected>2026</option><option value="2025">2025</option>
                    </select>
                    <span style="font-size:12px;color:#475569;font-weight:600;">🗓 CHỌN THÁNG</span>
                    <input type="month" id="hvMonthPicker" onchange="_hvSetMonth(this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
                </div>
                
                <!-- Summary Cards -->
                <div id="hvCards" style="margin-bottom:16px;">
                    <div style="text-align:center;padding:30px;color:#9ca3af;">Đang tải dữ liệu...</div>
                </div>
                
                <!-- Search -->
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">
                    <div style="position:relative;flex:1;min-width:200px;">
                        <input type="text" id="hvSearch" placeholder="🔍 Tìm tên KH, SĐT, Người GT..." 
                            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;outline:none;"
                            oninput="_hvApplyCardFilter()">
                    </div>
                    <select id="hvFilterGT" onchange="_hvApplyCardFilter()" style="padding:9px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;min-width:140px;outline:none;cursor:pointer;">
                        <option value="">Tất cả Người GT</option>
                    </select>
                </div>
                
                <!-- Table -->
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
                    <table style="width:100%;min-width:900px;border-collapse:collapse;">
                        <thead><tr style="background:#1e293b;">
                            <th style="padding:10px 6px;text-align:center;font-size:11px;color:#fff;font-weight:700;width:40px;">#</th>
                            <th style="padding:10px 6px;text-align:center;font-size:11px;color:#fff;font-weight:700;width:30px;">🔑</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Tên KH</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Người GT</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">SĐT</th>
                            <th style="padding:10px 6px;text-align:center;font-size:11px;color:#fff;font-weight:700;">Trạng Thái</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Doanh Thu</th>
                            <th style="padding:10px 6px;text-align:center;font-size:11px;color:#fff;font-weight:700;">Tỷ Lệ HH</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Hoa Hồng</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Ngày Hẹn</th>
                            <th style="padding:10px 6px;text-align:left;font-size:11px;color:#fff;font-weight:700;">Ngày Liên Hệ</th>
                        </tr></thead>
                        <tbody id="hvTableBody">
                            <tr><td colspan="11" style="text-align:center;padding:40px;color:#9ca3af;">Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="hvPagination"></div>
            </div>
        </div>
        <style>
            .hv-filter-btn:hover { background:#eff6ff !important; border-color:#93c5fd !important; }
            .hv-filter-btn.active { background:#6c5ce7 !important; color:white !important; border-color:#6c5ce7 !important; }

            /* ===== WELCOME ===== */
            .hv-welcome { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
            .hv-welcome-text { font-size:20px; color:#2d3436; font-weight:700; display:flex; align-items:center; gap:10px; }
            .hv-welcome-text strong { color:#6c5ce7; }
            .hv-welcome-logo { width:36px; height:36px; object-fit:contain; border-radius:8px; }
            .hv-welcome-date { font-size:12px; color:#b2bec3; font-weight:500; }

            /* ===== SHIMMER ANIMATION ===== */
            .hv-shimmer {
                position:absolute; top:0; left:-100%; width:100%; height:100%;
                background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
                animation:hvShimmer 3s ease-in-out infinite;
                pointer-events:none; z-index:1;
            }
            .hv-stat-primary .hv-shimmer {
                background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
            }
            @keyframes hvShimmer { 0%{left:-100%} 50%{left:100%} 100%{left:100%} }

            /* ===== STAT CARDS ROW ===== */
            .hv-stats-row { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:14px; margin-bottom:16px; }
            .hv-stat {
                background:white; border-radius:16px; padding:20px 16px; cursor:pointer;
                border:2px solid #f1f5f9; transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
                box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative; overflow:hidden;
            }
            .hv-stat:hover { transform:translateY(-3px); box-shadow:0 8px 25px rgba(0,0,0,0.1); }

            /* White card selected → purple gradient */
            .hv-stat-selected:not(.hv-stat-primary) {
                background:linear-gradient(135deg,#ede9fe 0%,#e0d4ff 100%) !important;
                border-color:#6c5ce7 !important;
                box-shadow:0 4px 20px rgba(108,92,231,0.25) !important;
            }
            .hv-val-active { color:#6c5ce7 !important; }
            .hv-lbl-active { color:#6c5ce7 !important; font-weight:700 !important; }

            /* Primary card (purple) */
            .hv-stat-primary {
                background:linear-gradient(135deg,#6c5ce7 0%,#a855f7 100%) !important;
                border-color:transparent !important;
                box-shadow:0 4px 20px rgba(108,92,231,0.3);
            }
            .hv-stat-primary:hover { box-shadow:0 8px 30px rgba(108,92,231,0.4); }
            .hv-stat-primary.hv-stat-selected {
                border-color:#fbbf24 !important;
                box-shadow:0 0 0 2px #fbbf24, 0 4px 24px rgba(250,204,21,0.35) !important;
            }

            .hv-stat-icon-wrap {
                width:48px; height:48px; border-radius:14px; display:flex;
                align-items:center; justify-content:center; font-size:22px; margin-bottom:14px;
                position:relative; z-index:2;
            }
            .hv-stat-icon-gold { background:rgba(255,255,255,0.2); }
            .hv-stat-value { font-size:28px; font-weight:900; color:#2d3436; line-height:1; margin-bottom:6px; position:relative; z-index:2; transition:color 0.3s; }
            .hv-stat-label { font-size:12px; color:#636e72; font-weight:500; position:relative; z-index:2; transition:all 0.3s; }
            .hv-stat-value-primary { font-size:22px; font-weight:900; color:white; line-height:1.1; margin-bottom:6px; word-break:break-all; position:relative; z-index:2; }
            .hv-stat-label-primary { font-size:12px; color:rgba(255,255,255,0.8); font-weight:500; position:relative; z-index:2; }
            .hv-stat-sub-primary { font-size:10px; color:rgba(255,255,255,0.5); margin-top:4px; font-weight:600; position:relative; z-index:2; }

            /* ===== KPI ROW ===== */
            .hv-kpi-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:16px; }
            .hv-kpi {
                background:white; border-radius:14px; padding:18px; position:relative; overflow:hidden;
                border:1.5px solid #f1f5f9; transition:all 0.25s ease;
                box-shadow:0 1px 4px rgba(0,0,0,0.03);
            }
            .hv-kpi:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); }
            .hv-kpi-top { margin-bottom:8px; }
            .hv-kpi-title { font-size:12px; color:#636e72; font-weight:600; }
            .hv-kpi-val { font-size:20px; font-weight:900; line-height:1.2; }
            .hv-kpi-detail { display:flex; flex-direction:column; gap:6px; }
            .hv-kpi-item {
                display:flex; align-items:center; gap:6px; font-size:13px; color:#2d3436;
                padding:6px 10px; border-radius:8px; cursor:pointer; transition:all 0.2s;
            }
            .hv-kpi-item:hover { background:#f8f9fa; }
            .hv-kpi-item-active { background:#6c5ce7; color:white !important; font-weight:700; }
            .hv-kpi-item-active .hv-kpi-dot { box-shadow:0 0 6px currentColor; }
            .hv-kpi-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

            /* ===== RESPONSIVE ===== */
            @media (max-width:768px) {
                .hv-stats-row { grid-template-columns:1fr 1fr; }
                .hv-kpi-row { grid-template-columns:1fr; }
                .hv-welcome { flex-direction:column; align-items:flex-start; gap:4px; }
                .hv-welcome-text { font-size:16px; }
                .hv-stat-value-primary { font-size:18px; }
            }
            @media (max-width:480px) {
                .hv-stats-row { grid-template-columns:1fr; }
            }
        </style>`;

    try {
        // Fetch ALL data in parallel (no crm_filter → gets ALL crm_types)
        const [allData, affStatus, balanceData] = await Promise.all([
            apiCall('/api/affiliate/commission'),
            apiCall('/api/affiliate-account/batch-status').catch(() => ({approvedCustomerIds:[],lockedCustomerIds:[],pendingCustomerIds:[]})),
            apiCall('/api/affiliate/balance').catch(() => ({totalCommission:0,totalWithdrawn:0,balance:0}))
        ]);
        
        window._hvAffApprovedIds = affStatus.approvedCustomerIds || [];
        window._hvAffLockedIds = affStatus.lockedCustomerIds || [];
        window._hvBalanceData = { totalCommission: balanceData.totalCommission||0, totalWithdrawn: balanceData.totalWithdrawn||0, balance: balanceData.balance||0 };
        
        // Tag items by crm_type: nhu_cau → customer, ctv_hoa_hong → affiliate, others → based on type
        const allItems = (allData.items||[]).map(i => ({
            ...i,
            _src: (i.crm_type === 'ctv_hoa_hong') ? 'affiliate' : 'customer'
        }));
        allItems.sort((a,b) => new Date(b.last_contact_date||b.created_at) - new Date(a.last_contact_date||a.created_at));
        
        _hvData = { allItems, filtered: [...allItems] };
        
        // Populate referrer dropdown
        const names = [...new Set(allItems.map(i => i.referrer_name).filter(Boolean))];
        const gtSel = document.getElementById('hvFilterGT');
        if (gtSel) names.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; gtSel.appendChild(o); });
        
        _hvRenderCards();
        _hvApplyCardFilter();
    } catch(e) {
        document.getElementById('hvTableBody').innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:#ef4444;">Lỗi: ${e.message}</td></tr>`;
    }
}

// ===== HƯỚNG DẪN SỬ DỤNG (placeholder) =====
function renderHuongDanSuDungPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>📖 Hướng Dẫn Sử Dụng</h3></div>
            <div class="card-body">
                <div style="text-align:center;padding:60px 20px;">
                    <div style="font-size:60px;margin-bottom:16px;">📖</div>
                    <h2 style="color:#1e3a5f;margin-bottom:8px;">Hướng Dẫn Sử Dụng</h2>
                    <p style="color:#64748b;font-size:14px;">Nội dung hướng dẫn sẽ được cập nhật sớm.</p>
                </div>
            </div>
        </div>`;
}
