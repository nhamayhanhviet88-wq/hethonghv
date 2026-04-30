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

// ===== RENDER SUMMARY CARDS =====
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

    // Balance data (fetched once, stored globally)
    const totalWithdrawn = window._hvBalanceData?.totalWithdrawn || 0;
    const balance = window._hvBalanceData?.balance || 0;

    const card = (bg, border, onclick, value, label, sub, active) => 
        `<div onclick="${onclick}" data-card="${active}" class="hv-card ${_hvActiveCard===active?'hv-card-active':''}" style="background:linear-gradient(135deg,${bg});padding:14px 10px;border-radius:12px;text-align:center;cursor:${onclick?'pointer':'default'};transition:all 0.2s;border:2px solid ${_hvActiveCard===active?border:'transparent'};" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform=''">
            <div style="font-size:22px;font-weight:800;color:${border};word-break:break-all;">${value}</div>
            <div style="font-size:11px;color:${border};margin-top:4px;opacity:0.85;">${label}</div>
            ${sub?`<div style="font-size:9px;color:${border};opacity:0.5;margin-top:2px;">▶ Xem chi tiết</div>`:''}
        </div>`;

    document.getElementById('hvCards').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${card('#fef3c7,#fde68a','#92400e',`_hvCardClick('commission')`,_hvMoney(totalComm),`💰 Tổng Hoa Hồng (TT ${directRate}%, GT ${childRate}%)`,true,'commission')}
            ${card('#dbeafe,#bfdbfe','#1e40af',`_hvCardClick('orders')`,totalOrders,`📦 Tổng Đơn Đặt Hàng`,true,'orders')}
            ${card('#d1fae5,#a7f3d0','#065f46',`_hvCardClick('customers')`,totalCust,`👥 Tổng Số Lượng Khách Hàng`,true,'customers')}
            ${card('#fee2e2,#fecaca','#dc2626',`_hvCardClick('cancelled')`,cancelledCust,`❌ Tổng Số Hủy Khách Hàng`,true,'cancelled')}
            ${card('#d1fae5,#a7f3d0','#065f46',`_hvCardClick('affiliates')`,totalAff,`👥 Tổng Số Lượng Affiliate`,true,'affiliates')}
            ${card('#ede9fe,#ddd6fe','#5b21b6',`_hvCardClick('afftk')`,affWithTK,`🔑 Tổng Số Affiliate Có TK`,true,'afftk')}
            ${card('#fce7f3,#fbcfe8','#be185d','',_hvMoney(totalWithdrawn),`💸 Tổng Số Tiền Đã Rút`,false,'withdrawn')}
            ${card('#ecfdf5,#d1fae5','#047857','',_hvMoney(balance),`💎 Tổng Số Tiền Còn Lại`,false,'balance')}
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
            .hv-filter-btn.active { background:#3b82f6 !important; color:white !important; border-color:#3b82f6 !important; }
            .hv-card-active { box-shadow:0 4px 15px rgba(0,0,0,0.12); }
        </style>`;

    try {
        // Fetch BOTH datasets in parallel
        const [custData, affData, affStatus, balanceData] = await Promise.all([
            apiCall('/api/affiliate/commission?crm_filter=nhu_cau'),
            apiCall('/api/affiliate/commission?crm_filter=ctv_hoa_hong'),
            apiCall('/api/affiliate-account/batch-status').catch(() => ({approvedCustomerIds:[],lockedCustomerIds:[],pendingCustomerIds:[]})),
            apiCall('/api/affiliate/balance').catch(() => ({totalWithdrawn:0,balance:0}))
        ]);
        
        window._hvAffApprovedIds = affStatus.approvedCustomerIds || [];
        window._hvAffLockedIds = affStatus.lockedCustomerIds || [];
        window._hvBalanceData = { totalCommission: balanceData.totalCommission||0, totalWithdrawn: balanceData.totalWithdrawn||0, balance: balanceData.balance||0 };
        
        // Tag and merge
        const custItems = (custData.items||[]).map(i => ({...i, _src:'customer'}));
        const affItems = (affData.items||[]).map(i => ({...i, _src:'affiliate'}));
        const allItems = [...custItems, ...affItems];
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
