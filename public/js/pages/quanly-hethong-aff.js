// ========== QUẢN LÝ HỆ THỐNG AFFILIATE ==========
let _affSysSearch = '';
let _affSysTab = 'list';
let _affOrgData = null;
let _affOrgExpanded = new Set();
let _aff_datePreset = 'all';
let _aff_dateFrom = '';
let _aff_dateTo = '';
let _aff_selectedYear = new Date().getFullYear();
let _aff_selectedMgrId = null;
let _aff_selectedMgrName = '';
let _aff_allUsers = [];
let _aff_allDepts = [];
let _aff_monthValue = ''; // format: YYYY-MM

function _aff_getDateRange() {
    const today = new Date(); today.setHours(0,0,0,0);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (_aff_datePreset) {
        case 'today': return { from: fmt(today), to: fmt(today) };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return { from: fmt(y), to: fmt(y) }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: fmt(today) }; }
        case 'this_month': { const m = new Date(_aff_selectedYear, today.getMonth(), 1); return { from: fmt(m), to: fmt(today) }; }
        case 'last_month': { const m1 = new Date(_aff_selectedYear, today.getMonth()-1, 1); const m2 = new Date(_aff_selectedYear, today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2) }; }
        case 'month': { if (!_aff_monthValue) return { from: '', to: '' }; const [yr,mo]=_aff_monthValue.split('-').map(Number); const m1=new Date(yr,mo-1,1); const m2=new Date(yr,mo,0); const fmt2=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; return { from: fmt2(m1), to: fmt2(m2) }; }
        case 'custom': return { from: _aff_dateFrom, to: _aff_dateTo };
        case 'all': return { from: `${_aff_selectedYear}-01-01`, to: `${_aff_selectedYear}-12-31` };
        default: return { from: fmt(today), to: fmt(today) };
    }
}
function _aff_switchDate(preset) {
    _aff_datePreset = preset;
    _aff_monthValue = ''; // clear month picker khi chọn preset khác
    if (preset === 'custom') return;
    if (_affSysTab === 'org') _affOrgLoad(); else _affSysLoad();
}
function _aff_applyCustom() {
    _aff_dateFrom = document.getElementById('affDateFrom')?.value || '';
    _aff_dateTo = document.getElementById('affDateTo')?.value || '';
    if (_aff_dateFrom && _aff_dateTo) { if (_affSysTab === 'org') _affOrgLoad(); else _affSysLoad(); }
}
function _aff_selectMonth(val) {
    if (!val) return;
    _aff_monthValue = val;
    _aff_datePreset = 'month';
    if (_affSysTab === 'org') _affOrgLoad(); else _affSysLoad();
}
function _aff_dateFilterHtml() {
    const dr = _aff_getDateRange();
    const presets = [{key:'today',label:'Hôm nay',icon:'📅'},{key:'yesterday',label:'Hôm qua',icon:'⏪'},{key:'7days',label:'7 ngày',icon:'📆'},{key:'this_month',label:'Tháng này',icon:'🗓️'},{key:'last_month',label:'Tháng trước',icon:'📋'},{key:'all',label:'Tất cả',icon:'♾️'}];
    return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1.5px solid #e2e8f0;border-radius:12px;">
        <span style="font-size:13px;font-weight:800;color:#334155;margin-right:4px;">📅</span>
        ${presets.map(p=>{const a=_aff_datePreset===p.key;return `<button onclick="_aff_switchDate('${p.key}')" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${a?'#2563eb':'#e2e8f0'};background:${a?'linear-gradient(135deg,#2563eb,#3b82f6)':'white'};color:${a?'white':'#64748b'};box-shadow:${a?'0 2px 8px rgba(37,99,235,0.3)':'none'};">${p.icon} ${p.label}</button>`;}).join('')}
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <button onclick="_aff_datePreset='custom';document.getElementById('affCustomArea').style.display='flex';" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${_aff_datePreset==='custom'?'#7c3aed':'#e2e8f0'};background:${_aff_datePreset==='custom'?'linear-gradient(135deg,#7c3aed,#8b5cf6)':'white'};color:${_aff_datePreset==='custom'?'white':'#64748b'};transition:all .2s;">🔧 Tùy chọn</button>
        <select onchange="_aff_selectedYear=parseInt(this.value);_aff_switchDate('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;cursor:pointer;">
            ${(()=>{const cur=new Date().getFullYear();let o='';for(let y=cur;y>=2024;y--)o+=`<option value="${y}" ${y===_aff_selectedYear?'selected':''}>${y}</option>`;return o;})()}
        </select>
        <div id="affCustomArea" style="display:${_aff_datePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="affDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_aff_dateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="affDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_aff_dateTo=this.value">
            <button onclick="_aff_applyCustom()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px;font-weight:800;color:#334155;">📅 CHỌN THÁNG</span>
            <input type="month" value="${_aff_monthValue}" onchange="_aff_selectMonth(this.value)" style="padding:4px 8px;border:1.5px solid ${_aff_datePreset==='month'?'#2563eb':'#e2e8f0'};border-radius:8px;font-size:11px;font-weight:600;background:${_aff_datePreset==='month'?'linear-gradient(135deg,#eff6ff,#dbeafe)':'white'};color:#1e40af;cursor:pointer;">
        </div>
    </div>`;
}

async function renderQuanLyHTAffPage(container) {
    _affSysSearch = '';
    const isGD = currentUser.role !== 'tkaffiliate';
    if (isGD) {
        container.innerHTML = `<div style="display:flex;height:calc(100vh - 120px);gap:0;">
            <div id="affSidebar" style="width:280px;min-width:280px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-right:1.5px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;border-radius:12px 0 0 12px;">
                <div style="padding:14px;border-bottom:1.5px solid #e2e8f0;">
                    <h4 style="margin:0;color:#122546;font-size:14px;font-weight:800;">📊 QL Affiliate</h4>
                </div>
                <div id="affSidebarList" class="ts-scroll" style="flex:1;overflow:auto;padding:8px;"></div>
            </div>
            <div id="affSysArea" style="flex:1;overflow:auto;padding:20px;"></div>
        </div>`;
        // Fetch users & depts for sidebar
        try {
            const [usersRes, deptsRes] = await Promise.all([apiCall('/api/users/dropdown'), apiCall('/api/departments')]);
            _aff_allUsers = usersRes.users || usersRes || [];
            _aff_allDepts = deptsRes.departments || deptsRes || [];
        } catch(e) { _aff_allUsers = []; _aff_allDepts = []; }
        _aff_selectedMgrId = null;
        _aff_selectedMgrName = 'Tổng Phòng KD';
        _aff_renderSidebar();
    } else {
        container.innerHTML = `<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><h3 style="margin:0;">📊 Quản Lý Hệ Thống Affiliate</h3></div><div class="card-body" id="affSysArea"><div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div></div></div>`;
    }
    if (isGD && _affSysTab === 'org') await _affOrgLoad();
    else { _affSysTab = 'list'; await _affSysLoad(); }
}

function _affRenderTabs() {
    if (currentUser.role === 'tkaffiliate') return '';
    return `<div style="display:flex;gap:4px;margin-bottom:20px;background:#f1f5f9;border-radius:12px;padding:4px;">
        <button onclick="_affSwitchTab('list')" style="flex:1;padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;${_affSysTab==='list'?'background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;box-shadow:0 2px 8px rgba(37,99,235,0.3);':'background:transparent;color:#64748b;'}">📋 Danh Sách Affiliate</button>
        <button onclick="_affSwitchTab('org')" style="flex:1;padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;${_affSysTab==='org'?'background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;box-shadow:0 2px 8px rgba(109,40,217,0.3);':'background:transparent;color:#64748b;'}">🏢 Theo Tổ Chức</button>
    </div>`;
}

async function _affSwitchTab(tab) { _affSysTab = tab; if (tab === 'org') await _affOrgLoad(); else await _affSysLoad(); }

function _affStatBar(stats, dark) {
    const items = [
        { icon: '👥', label: 'Affiliate', val: stats.affiliates, c: dark ? '#a5b4fc' : '#6366f1', bg: dark ? 'rgba(165,180,252,0.2)' : '#6366f115' },
        { icon: '📋', label: 'KH', val: stats.customers, c: dark ? '#93c5fd' : '#3b82f6', bg: dark ? 'rgba(147,197,253,0.2)' : '#3b82f615' },
        { icon: '💰', label: 'DS', val: Number(stats.revenue).toLocaleString('vi-VN')+'đ', c: dark ? '#fcd34d' : '#d97706', bg: dark ? 'rgba(252,211,77,0.25)' : '#d9770615' },
        { icon: '✅', label: 'Chốt', val: stats.closed, c: dark ? '#6ee7b7' : '#16a34a', bg: dark ? 'rgba(110,231,183,0.2)' : '#16a34a15' }
    ];
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">${items.map(i => `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${i.bg};color:${i.c};">${i.icon} ${i.val}</span>`).join('')}</div>`;
}

// ==================== TAB 1: DANH SÁCH ====================
async function _affSysLoad() {
    const area = document.getElementById('affSysArea'); if (!area) return;
    try {
        const isGD = currentUser.role !== 'tkaffiliate';
        const dr = _aff_getDateRange();
        let apiUrl = '/api/affiliate/my-system';
        if (isGD) {
            const params = [];
            if (_aff_selectedMgrId) params.push(`managerId=${_aff_selectedMgrId}`);
            if (dr.from) params.push(`from=${dr.from}`);
            if (dr.to) params.push(`to=${dr.to}`);
            if (params.length) apiUrl += '?' + params.join('&');
        }
        const data = await apiCall(apiUrl);
        if (!data.success) { area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Lỗi</h3></div>`; return; }
        const { children, selfStats, stats, cardStats } = data;
        const cs = cardStats || {};
        const _fmtRev = (v) => { const n=Number(v||0); if(n>=1000000) return (n/1000000).toFixed(n%1000000===0?0:1).replace(/\.0$/,'')+'tr'; return n.toLocaleString('vi-VN')+'đ'; };
        let html = '';
        if (isGD) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">📊 ${_aff_selectedMgrId ? _aff_selectedMgrName : 'Tổng Phòng Kinh Doanh'}</h3>
                    <span style="padding:4px 12px;background:linear-gradient(135deg,#122546,#1e3a5f);color:white;border-radius:8px;font-size:11px;font-weight:700;">${children.length} affiliate</span>
                </div>
            </div>`;
            html += _aff_dateFilterHtml();
        }
        html += _affRenderTabs();
        html += `<div class="aff-stat-grid">
            <div class="aff-stat-card" style="background:linear-gradient(135deg,#6366f1,#4f46e5);cursor:pointer;" onclick="_affStatDrill('affiliates')"><div class="aff-stat-val">${cs.newAffiliates||0}</div><div class="aff-stat-lbl">👥 Tổng Affiliate</div></div>
            <div class="aff-stat-card" style="background:linear-gradient(135deg,#3b82f6,#2563eb);cursor:pointer;" onclick="_affStatDrill('customers')"><div class="aff-stat-val">${cs.totalCustomers||0}</div><div class="aff-stat-lbl">📋 Tổng KH Giới Thiệu</div></div>
            <div class="aff-stat-card" style="background:linear-gradient(135deg,#f59e0b,#d97706);cursor:pointer;" onclick="_affStatDrill('revenue')"><div class="aff-stat-val">${_fmtRev(cs.totalRevenue)}</div><div class="aff-stat-lbl">💰 Tổng Doanh Số</div></div>
            <div class="aff-stat-card" style="background:linear-gradient(135deg,#10b981,#059669);cursor:pointer;" onclick="_affStatDrill('orders')"><div class="aff-stat-val">${cs.totalOrders||0}</div><div class="aff-stat-lbl">📦 Đơn Hàng</div></div></div>`;
        // Banner "Khách Hàng Trực Tiếp" đã ẩn — KH trực tiếp xem ở "Theo Dõi Tư Vấn Khách"
        html += `<div style="margin-bottom:16px;"><input type="text" class="form-control" placeholder="🔍 Tìm theo tên, SĐT..." value="${_affSysSearch}" oninput="_affSysFilter(this.value)" style="max-width:360px;font-size:13px;"></div>`;
        if (children.length === 0) { html += `<div class="empty-state"><div class="icon">👥</div><h3>Chưa có affiliate</h3></div>`; }
        else {
            const RL = { hoa_hong:'Hoa Hồng', ctv:'CTV', nuoi_duong:'Nuôi Dưỡng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };
            const RC = { hoa_hong:'#f59e0b', ctv:'#3b82f6', nuoi_duong:'#8b5cf6', sinh_vien:'#10b981', tkaffiliate:'#ec4899' };
            const filtered = _affSysSearch ? children.filter(c => { const q = _affSysSearch.toLowerCase(); return (c.full_name||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.parent_affiliate_name||'').toLowerCase().includes(q); }) : children;
            // Desktop table
            html += `<div class="aff-table-wrap"><table class="table"><thead><tr><th style="width:40px;">#</th><th>Tên</th><th>SĐT</th>${isGD?'<th>Aff Cha</th>':''}<th>NV Phụ Trách</th><th>Loại</th><th style="text-align:center;">KH</th><th style="text-align:center;">Chốt</th><th style="text-align:right;">Doanh Số</th><th style="text-align:center;">TT</th><th>Ngày TG</th></tr></thead><tbody>`;
            filtered.forEach((c,i) => {
                const sb = c.status==='active'?'<span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">✅</span>':'<span style="background:#fef2f2;color:#991b1b;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">🔒</span>';
                html += `<tr onclick="showAffDetail(${c.id})" style="cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''"><td style="font-weight:600;color:#6b7280;">${i+1}</td><td style="font-weight:700;color:#1e293b;">${c.full_name}</td><td style="color:#334155;">${c.phone||'—'}</td>`;
                if (isGD) html += `<td style="font-size:12px;color:#6366f1;font-weight:600;">${c.parent_affiliate_name||'<span style="color:#9ca3af;">— Gốc —</span>'}</td>`;
                html += `<td style="font-size:12px;color:#0ea5e9;font-weight:600;">${c.manager_name||'<span style="color:#9ca3af;">—</span>'}</td>`;
                html += `<td><span style="background:${RC[c.role]||'#6b7280'}20;color:${RC[c.role]||'#6b7280'};padding:2px 10px;border-radius:8px;font-size:11px;font-weight:700;">${RL[c.role]||c.role}</span></td>
                    <td style="text-align:center;font-weight:700;color:#3b82f6;">${c.total_customers}</td><td style="text-align:center;font-weight:700;color:#16a34a;">${c.closed_count}</td>
                    <td style="text-align:right;font-weight:700;color:#d97706;">${Number(c.total_revenue).toLocaleString('vi-VN')} đ</td><td style="text-align:center;">${sb}</td>
                    <td style="font-size:12px;color:#6b7280;">${c.created_at?new Date(c.created_at).toLocaleDateString('vi-VN'):'—'}</td></tr>`;
            });
            html += `</tbody></table></div>`;
            // Mobile card list
            html += `<div class="aff-mobile-list">`;
            filtered.forEach((c) => {
                const roleBadge = `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${RC[c.role]||'#6b7280'}20;color:${RC[c.role]||'#6b7280'};font-weight:700;">${RL[c.role]||c.role}</span>`;
                html += `<div class="aff-m-card" onclick="showAffDetail(${c.id})" style="cursor:pointer;">
                    <div class="aff-m-left">
                        <div class="aff-m-name-row"><span class="aff-m-name">${c.full_name}</span> ${roleBadge}</div>
                        <div class="aff-m-ref">📱 ${c.phone||'—'}</div>
                    </div>
                    <div class="aff-m-right">
                        <div class="aff-m-rev">${Number(c.total_revenue).toLocaleString('vi-VN')} đ</div>
                        <div class="aff-m-hh">KH: ${c.total_customers} · Chốt: ${c.closed_count}</div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        area.innerHTML = html;
    } catch (err) { area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${err.message||'Lỗi'}</h3></div>`; }
}
function _affSysFilter(q) { _affSysSearch = q; _affSysLoad(); }

// ==================== TAB 2: THEO TỔ CHỨC ====================
async function _affOrgLoad() {
    const area = document.getElementById('affSysArea'); if (!area) return;
    area.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>`;
    try {
        const dr = _aff_getDateRange();
        const params = [];
        if (dr.from) params.push(`from=${dr.from}`);
        if (dr.to) params.push(`to=${dr.to}`);
        const apiUrl = '/api/affiliate/org-stats' + (params.length ? '?' + params.join('&') : '');
        const data = await apiCall(apiUrl);
        if (!data.success) { area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Lỗi</h3></div>`; return; }
        // ★ CHỈ giữ PHÒNG KINH DOANH
        _affOrgData = data.departments.filter(d => d.name && d.name.toUpperCase().includes('KINH DOANH'));
        const _orgCardStats = data.cardStats || {};
        const _fmtRev = (v) => { const n=Number(v||0); if(n>=1000000) return (n/1000000).toFixed(n%1000000===0?0:1).replace(/\.0$/,'')+'tr'; return n.toLocaleString('vi-VN')+'đ'; };
        // Store cardStats for rendering
        window._affOrgCardStats = _orgCardStats;
        window._affOrgFmtRev = _fmtRev;
        // ★ Auto-expand dept + team (không mở affiliate list của NV)
        _affOrgExpanded.clear();
        _affOrgData.forEach(dept => {
            _affOrgExpanded.add('dept_' + dept.id);
            (dept.teams || []).forEach(team => _affOrgExpanded.add('team_' + team.id));
        });
        _affRenderOrg();
    } catch (err) { area.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${err.message||'Lỗi'}</h3></div>`; }
}

function _affToggleOrg(key) {
    if (_affOrgExpanded.has(key)) _affOrgExpanded.delete(key); else _affOrgExpanded.add(key);
    _affRenderOrg();
}

function _affRenderOrg() {
    const area = document.getElementById('affSysArea');
    if (!area || !_affOrgData) return;
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
            <h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">📊 ${_aff_selectedMgrId ? _aff_selectedMgrName : 'Tổng Phòng Kinh Doanh'}</h3>
        </div>
    </div>`;
    html += _aff_dateFilterHtml();
    html += _affRenderTabs();
    const cs = window._affOrgCardStats || {};
    const _fmtRev = window._affOrgFmtRev || ((v) => Number(v||0).toLocaleString('vi-VN')+'đ');

    html += `<div class="aff-stat-grid">
        <div class="aff-stat-card" style="background:linear-gradient(135deg,#6366f1,#4f46e5);cursor:pointer;" onclick="_affStatDrill('affiliates')"><div class="aff-stat-val">${cs.newAffiliates||0}</div><div class="aff-stat-lbl">👥 Tổng Affiliate</div></div>
        <div class="aff-stat-card" style="background:linear-gradient(135deg,#3b82f6,#2563eb);cursor:pointer;" onclick="_affStatDrill('customers')"><div class="aff-stat-val">${cs.totalCustomers||0}</div><div class="aff-stat-lbl">📋 Tổng KH Giới Thiệu</div></div>
        <div class="aff-stat-card" style="background:linear-gradient(135deg,#f59e0b,#d97706);cursor:pointer;" onclick="_affStatDrill('revenue')"><div class="aff-stat-val">${_fmtRev(cs.totalRevenue)}</div><div class="aff-stat-lbl">💰 Tổng Doanh Số</div></div>
        <div class="aff-stat-card" style="background:linear-gradient(135deg,#10b981,#059669);cursor:pointer;" onclick="_affStatDrill('orders')"><div class="aff-stat-val">${cs.totalOrders||0}</div><div class="aff-stat-lbl">📦 Đơn Hàng</div></div></div>`;

    const ROLE_LABELS = { truong_phong:'⭐ Trưởng Phòng', nhan_vien:'👤 Nhân Viên', quan_ly:'🔷 Quản Lý', quan_ly_cap_cao:'💎 QL Cấp Cao', thu_viec:'🔰 Thử Việc' };
    const MGR_ROLES = ['quan_ly', 'quan_ly_cap_cao'];

    _affOrgData.forEach(dept => {
        const dKey = 'dept_' + dept.id;
        const dOpen = _affOrgExpanded.has(dKey);

        // ★ Nhân viên cấp phòng (quản lý) — từ API phongEmployees
        const phongManagers = dept.phongEmployees || [];

        html += `<div style="margin-bottom:12px;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,0.12);">
            <div onclick="_affToggleOrg('${dKey}')" style="padding:14px 18px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;cursor:pointer;display:flex;align-items:center;gap:10px;" onmouseover="this.style.opacity='0.92'" onmouseout="this.style.opacity='1'">
                <span style="font-size:18px;">🏢</span>
                <div style="flex:1;"><div style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">${dept.name}</div>${_affStatBar(dept.stats, true)}</div>
                <span style="font-size:12px;opacity:0.7;transform:rotate(${dOpen?'0':'-90'}deg);">▼</span>
            </div>`;

        if (dOpen) {
            html += `<div style="background:#f8fafc;">`;

            // ★ Quản lý hiển thị ngay dưới PHÒNG KD, trên các TEAM
            phongManagers.forEach(emp => {
                const eKey = 'emp_' + emp.id;
                const eOpen = _affOrgExpanded.has(eKey);
                const roleLabel = ROLE_LABELS[emp.role] || emp.role;
                html += `<div onclick="_affToggleOrg('${eKey}')" style="padding:12px 18px 12px 24px;background:linear-gradient(135deg,#fef3c7,#fde68a);cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:2px solid #f59e0b;transition:all .15s;" onmouseover="this.style.opacity='0.92'" onmouseout="this.style.opacity='1'">
                    <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:17px;color:white;flex-shrink:0;font-weight:900;">👑</div>
                    <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#92400e;display:flex;align-items:center;gap:6px;">${emp.name} <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#f59e0b;color:white;font-weight:700;">${roleLabel}</span> <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#7c3aed;color:white;font-weight:700;">${emp.stats.affiliates} affiliate</span></div>${_affStatBar(emp.stats, false)}</div>
                    <span style="font-size:10px;color:#92400e;transform:rotate(${eOpen?'0':'-90'}deg);">▼</span>
                </div>`;
                if (eOpen) html += _affRenderEmpAffiliates(emp, '40px');
            });

            // ★ Teams
            dept.teams.forEach(team => {
                const tKey = 'team_' + team.id;
                const tOpen = _affOrgExpanded.has(tKey);
                html += `<div onclick="_affToggleOrg('${tKey}')" style="padding:12px 18px 12px 24px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid #c7d2fe;transition:all .15s;" onmouseover="this.style.background='linear-gradient(135deg,#c7d2fe,#a5b4fc)'" onmouseout="this.style.background='linear-gradient(135deg,#e0e7ff,#c7d2fe)'">
                    <span style="font-size:15px;">🏛️</span>
                    <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#312e81;text-transform:uppercase;">${team.name}</div>${_affStatBar(team.stats, false)}</div>
                    <span style="font-size:11px;color:#6366f1;transform:rotate(${tOpen?'0':'-90'}deg);">▼</span>
                </div>`;

                if (tOpen) {
                    team.employees.forEach(emp => {
                        const eKey = 'emp_' + emp.id;
                        const eOpen = _affOrgExpanded.has(eKey);
                        const roleLabel = ROLE_LABELS[emp.role] || '👤 NV';
                        html += `<div onclick="_affToggleOrg('${eKey}')" style="padding:10px 18px 10px 44px;background:white;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f1f5f9;transition:all .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">👤</div>
                            <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;">${emp.name} <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#f1f5f9;color:#64748b;font-weight:600;">${roleLabel}</span> <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#ede9fe;color:#6d28d9;font-weight:700;">${emp.stats.affiliates} aff</span></div>${_affStatBar(emp.stats, false)}</div>
                            <span style="font-size:10px;color:#94a3b8;transform:rotate(${eOpen?'0':'-90'}deg);">▼</span>
                        </div>`;
                        if (eOpen) html += _affRenderEmpAffiliates(emp, '60px');
                    });
                }
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    if (_affOrgData.length === 0) html += `<div class="empty-state"><div class="icon">🏢</div><h3>Chưa có dữ liệu</h3></div>`;
    area.innerHTML = html;
}

function _affRenderEmpAffiliates(emp, indent) {
    if (!emp.affiliates || emp.affiliates.length === 0) return '';
    let h = `<div style="padding:8px 18px 8px ${indent};background:#fafbff;border-bottom:1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:linear-gradient(135deg,#0f172a,#1e3a5f);">
            <th style="padding:6px 8px;text-align:left;font-weight:800;color:white;">#</th>
            <th style="padding:6px 8px;text-align:left;font-weight:800;color:white;">Tên Affiliate</th>
            <th style="padding:6px 8px;text-align:left;font-weight:800;color:white;">SĐT</th>
            <th style="padding:6px 8px;text-align:left;font-weight:800;color:white;">Aff Cha</th>
            <th style="padding:6px 8px;text-align:center;font-weight:800;color:white;">KH</th>
            <th style="padding:6px 8px;text-align:center;font-weight:800;color:white;">Chốt</th>
            <th style="padding:6px 8px;text-align:right;font-weight:800;color:white;">Doanh Số</th>
            <th style="padding:6px 8px;text-align:center;font-weight:800;color:white;">TT</th>
        </tr></thead><tbody>`;
    emp.affiliates.forEach((a, i) => {
        const st = a.status==='active'?'<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;">✅</span>':'<span style="background:#fef2f2;color:#991b1b;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;">🔒</span>';
        h += `<tr onclick="showAffDetail(${a.id})" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''">
            <td style="padding:5px 8px;color:#94a3b8;">${i+1}</td>
            <td style="padding:5px 8px;font-weight:600;color:#1e293b;">${a.full_name}</td>
            <td style="padding:5px 8px;color:#475569;">${a.phone||'—'}</td>
            <td style="padding:5px 8px;color:#6366f1;font-weight:600;font-size:11px;">${a.parent_affiliate_name||'<span style="color:#cbd5e1;">— Gốc —</span>'}</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#3b82f6;">${a.total_customers}</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#16a34a;">${a.closed_count}</td>
            <td style="padding:5px 8px;text-align:right;font-weight:700;color:#d97706;">${Number(a.total_revenue).toLocaleString('vi-VN')} đ</td>
            <td style="padding:5px 8px;text-align:center;">${st}</td></tr>`;
    });
    h += `</tbody></table></div>`;
    return h;
}

// ========== SIDEBAR BỘ PHẬN ==========
function _aff_avatarColor(n) { let h=0; for(let i=0;i<(n||'').length;i++) h=n.charCodeAt(i)+((h<<5)-h); return ['#3b82f6','#059669','#f59e0b','#8b5cf6','#06b6d4','#f43f5e','#ec4899','#6366f1'][Math.abs(h)%8]; }
function _aff_initials(n) { if(!n) return '?'; const p=n.trim().split(/\s+/); return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():n.substring(0,2).toUpperCase(); }

function _aff_selectMgr(id, name) {
    _aff_selectedMgrId = id;
    _aff_selectedMgrName = name;
    _aff_renderSidebar();
    if (_affSysTab === 'org') _affOrgLoad(); else _affSysLoad();
}

function _aff_renderSidebar() {
    const list = document.getElementById('affSidebarList');
    if (!list) return;
    const ROLE_BADGE = { truong_phong:'TP', quan_ly:'QL', quan_ly_cap_cao:'QL', giam_doc:'GĐ' };
    const ROLE_BG = { truong_phong:'#059669', quan_ly:'#2563eb', quan_ly_cap_cao:'#7c3aed', giam_doc:'#dc2626' };
    const myRole = currentUser.role;
    const myDeptId = currentUser.department_id;

    // ★ SCOPE: determine which users are visible in sidebar
    let allowedUserIds = null; // null = see all
    if (myRole === 'giam_doc') {
        allowedUserIds = null;
    } else if (myRole === 'quan_ly' || myRole === 'quan_ly_cap_cao') {
        // QL sees TP + NV under their dept tree
        const childDeptIds = new Set();
        function getChildDepts(pid) { childDeptIds.add(pid); _aff_allDepts.filter(d => d.parent_id === pid).forEach(d => getChildDepts(d.id)); }
        if (myDeptId) getChildDepts(myDeptId);
        const AFF_ROLES = ['tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien'];
        allowedUserIds = new Set(_aff_allUsers.filter(u => childDeptIds.has(u.department_id) && !AFF_ROLES.includes(u.role)).map(u => u.id));
    } else if (myRole === 'truong_phong') {
        // TP sees only NV + themselves in their team (no QL)
        const childDeptIds = new Set();
        function getChildDepts(pid) { childDeptIds.add(pid); _aff_allDepts.filter(d => d.parent_id === pid).forEach(d => getChildDepts(d.id)); }
        if (myDeptId) getChildDepts(myDeptId);
        const BLOCKED_ROLES = ['tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien','quan_ly','quan_ly_cap_cao'];
        allowedUserIds = new Set(_aff_allUsers.filter(u => childDeptIds.has(u.department_id) && !BLOCKED_ROLES.includes(u.role)).map(u => u.id));
    } else {
        // NV only sees themselves
        allowedUserIds = new Set([currentUser.id]);
    }

    // "Tổng Phòng KD" button — only for GĐ/QL
    const isAll = !_aff_selectedMgrId;
    let html = '';
    if (myRole === 'giam_doc' || myRole === 'quan_ly' || myRole === 'quan_ly_cap_cao') {
        html += `<div onclick="_aff_selectMgr(null,'Tổng Phòng KD')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:10px;margin-bottom:8px;transition:all 0.15s;${isAll?'background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;box-shadow:0 4px 12px rgba(245,158,11,0.3);':'background:white;border:1.5px solid #e2e8f0;color:#374151;'}">
            <span style="font-size:20px;">📊</span>
            <div style="flex:1;"><div style="font-size:12px;font-weight:800;">Tổng Phòng KD</div><div style="font-size:9px;opacity:0.7;">Xem tổng hợp tất cả NV</div></div>
        </div>`;
    }
    // Build department tree — only PHÒNG KINH DOANH
    const deptMap = {}; _aff_allDepts.forEach(d => { deptMap[d.id] = d; });
    const kdDept = _aff_allDepts.find(d => d.name && d.name.toUpperCase().includes('KINH DOANH') && (!d.parent_id || (deptMap[d.parent_id] && deptMap[d.parent_id].name && deptMap[d.parent_id].name.startsWith('HỆ THỐNG'))));
    if (!kdDept) { list.innerHTML = html; return; }
    const kdChildIds = new Set(_aff_allDepts.filter(d => d.parent_id === kdDept.id).map(d => d.id));
    const allKdIds = new Set([kdDept.id, ...kdChildIds]);
    // Filter users in KD tree, exclude affiliate roles
    const AFF_ROLES = ['tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien'];
    let kdUsers = _aff_allUsers.filter(u => allKdIds.has(u.department_id) && !AFF_ROLES.includes(u.role));
    // ★ Apply scope filter
    if (allowedUserIds !== null) {
        kdUsers = kdUsers.filter(u => allowedUserIds.has(u.id));
    }
    // Group: phong-level managers vs team members
    const phongManagers = kdUsers.filter(u => u.department_id === kdDept.id);
    const teamGroups = {};
    _aff_allDepts.filter(d => d.parent_id === kdDept.id).sort((a,b) => (a.display_order||0)-(b.display_order||0)).forEach(d => { teamGroups[d.id] = { name: d.name, users: [] }; });
    kdUsers.filter(u => u.department_id !== kdDept.id && kdChildIds.has(u.department_id)).forEach(u => {
        if (teamGroups[u.department_id]) teamGroups[u.department_id].users.push(u);
    });

    // ★ Filter out empty teams for non-GĐ
    const visibleTeams = Object.entries(teamGroups).filter(([id, team]) => {
        if (myRole === 'giam_doc') return true;
        if (allowedUserIds === null) return true;
        return team.users.length > 0;
    });

    // Header
    html += `<div style="padding:6px 8px;background:linear-gradient(135deg,#1e3a5f,#122546);border-radius:10px;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:800;color:#93c5fd;">📁 PHÒNG KINH DOANH</span>
    </div>`;
    // Phong-level managers
    const sortPriority = r => r==='quan_ly_cap_cao'?0:r==='quan_ly'?1:r==='truong_phong'?2:3;
    phongManagers.sort((a,b) => sortPriority(a.role)-sortPriority(b.role));
    phongManagers.forEach(u => { html += _aff_userCard(u, 12, ROLE_BADGE, ROLE_BG); });
    // Teams
    visibleTeams.forEach(([id, team]) => {
        html += `<div style="padding:3px 8px 3px 16px;margin-bottom:2px;">
            <span style="font-size:10px;font-weight:700;color:#64748b;">└ ${team.name}${team.users.length===0?' <span style="color:#9ca3af;font-size:9px;">(trống)</span>':''}</span>
        </div>`;
        team.users.sort((a,b) => sortPriority(a.role)-sortPriority(b.role));
        team.users.forEach(u => { html += _aff_userCard(u, 24, ROLE_BADGE, ROLE_BG); });
    });
    list.innerHTML = html;
}

function _aff_userCard(u, indent, ROLE_BADGE, ROLE_BG) {
    const active = u.id === _aff_selectedMgrId;
    const c = _aff_avatarColor(u.full_name || u.username);
    const badge = ROLE_BADGE[u.role];
    const bg = ROLE_BG[u.role] || '#6b7280';
    const name = (u.full_name || u.username || '').replace(/'/g, "\\\\'");
    return `<div onclick="_aff_selectMgr(${u.id},'${name}')"
        style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:10px;margin-bottom:3px;margin-left:${indent}px;transition:all 0.15s;
        ${active?'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;box-shadow:0 4px 12px rgba(18,37,70,0.3);':'background:white;border:1px solid #e5e7eb;color:#374151;'}">`
        + `<span style="width:32px;height:32px;border-radius:10px;background:${active?'rgba(255,255,255,0.2)':c};display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:800;flex-shrink:0;">${_aff_initials(u.full_name||u.username)}</span>`
        + `<div style="flex:1;min-width:0;">`
        + `<div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${u.full_name||u.username}${badge?`<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:${bg};color:white;font-weight:800;">${badge}</span>`:''}</div>`
        + `</div></div>`;
}

// ==================== DRILL-DOWN STAT CARD MODAL ====================
const _AFF_DRILL_TITLES = {
    affiliates: '👥 Danh Sách Affiliate',
    customers: '📋 Danh Sách KH Giới Thiệu',
    revenue: '💰 Danh Sách Đơn Hàng (Doanh Số)',
    orders: '📦 Danh Sách Đơn Hàng'
};
const _AFF_DRILL_COLORS = { affiliates: '#6366f1', customers: '#3b82f6', revenue: '#d97706', orders: '#059669' };

async function _affStatDrill(type, page = 1) {
    // Build params
    const dr = _aff_getDateRange();
    const params = [`type=${type}`, `page=${page}`];
    if (_aff_selectedMgrId) params.push(`managerId=${_aff_selectedMgrId}`);
    if (dr.from) params.push(`from=${dr.from}`);
    if (dr.to) params.push(`to=${dr.to}`);

    // Show loading overlay
    let overlay = document.getElementById('affDrillOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'affDrillOverlay';
        document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };

    const color = _AFF_DRILL_COLORS[type] || '#6366f1';
    overlay.innerHTML = `<div style="background:white;border-radius:16px;width:95%;max-width:950px;max-height:88vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;">
        <div style="padding:20px 24px;background:linear-gradient(135deg,${color},${color}dd);color:white;display:flex;align-items:center;justify-content:space-between;">
            <h3 style="margin:0;font-size:16px;font-weight:800;">${_AFF_DRILL_TITLES[type]}</h3>
            <button onclick="document.getElementById('affDrillOverlay').style.display='none'" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:10px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;"><div style="font-size:14px;color:#94a3b8;">⏳ Đang tải dữ liệu...</div></div>
    </div>`;

    try {
        const data = await apiCall('/api/affiliate/stat-detail?' + params.join('&'));
        if (!data.success) throw new Error('API error');

        const { rows, total, pageSize } = data;
        const totalPages = Math.ceil(total / pageSize);
        let tableHtml = '';

        if (type === 'affiliates') {
            tableHtml = `<table class="table" style="font-size:13px;">
                <thead><tr><th style="width:36px">#</th><th>Tên Affiliate</th><th>SĐT</th><th>NV Quản Lý</th><th style="text-align:right">Doanh Số</th><th>Ngày Tạo TK</th></tr></thead><tbody>`;
            rows.forEach((r, i) => {
                tableHtml += `<tr onclick="document.getElementById('affDrillOverlay').style.display='none';showAffDetail(${r.id})" style="cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''">
                    <td style="font-weight:600;color:#6b7280;">${(page-1)*pageSize+i+1}</td>
                    <td style="font-weight:700;color:#1e293b;">${r.full_name}</td>
                    <td style="color:#334155;">${r.phone||'—'}</td>
                    <td><span style="padding:2px 8px;border-radius:6px;background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;">${r.manager_name||'—'}</span></td>
                    <td style="text-align:right;font-weight:700;color:#d97706;">${Number(r.total_revenue||0).toLocaleString('vi-VN')} đ</td>
                    <td style="font-size:12px;color:#6b7280;">${r.created_at?new Date(r.created_at).toLocaleDateString('vi-VN'):'—'}</td>
                </tr>`;
            });
            tableHtml += '</tbody></table>';
        } else if (type === 'customers') {
            tableHtml = `<table class="table" style="font-size:13px;">
                <thead><tr><th style="width:36px">#</th><th>Tên KH</th><th>Affiliate GT</th><th>NV Quản Lý</th><th style="text-align:right">Doanh Số</th><th>Ngày GT</th></tr></thead><tbody>`;
            rows.forEach((r, i) => {
                tableHtml += `<tr>
                    <td style="font-weight:600;color:#6b7280;">${(page-1)*pageSize+i+1}</td>
                    <td style="font-weight:700;color:#1e293b;">${r.customer_name||'—'}</td>
                    <td><span style="padding:2px 8px;border-radius:6px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700;">${r.affiliate_name||'—'}</span></td>
                    <td><span style="padding:2px 8px;border-radius:6px;background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;">${r.manager_name||'—'}</span></td>
                    <td style="text-align:right;font-weight:700;color:#d97706;">${Number(r.total_revenue||0).toLocaleString('vi-VN')} đ</td>
                    <td style="font-size:12px;color:#6b7280;">${r.created_at?new Date(r.created_at).toLocaleDateString('vi-VN'):'—'}</td>
                </tr>`;
            });
            tableHtml += '</tbody></table>';
        } else {
            // orders / revenue
            const _fmtMoney = (v) => { const n = Number(v||0); if (n >= 1000000) return (n/1000000).toFixed(n%1000000===0?0:1).replace(/\.0$/,'') + 'tr'; return n.toLocaleString('vi-VN') + 'đ'; };
            tableHtml = `<table class="table" style="font-size:13px;">
                <thead><tr><th style="width:36px">#</th><th>MÃ ĐƠN</th><th>TÊN KHÁCH</th><th>NV CHĂM SÓC</th><th>AFFILIATE</th><th style="text-align:right">DOANH SỐ</th><th>THỜI GIAN</th></tr></thead><tbody>`;
            rows.forEach((r, i) => {
                tableHtml += `<tr>
                    <td style="font-weight:600;color:#6b7280;">${(page-1)*pageSize+i+1}</td>
                    <td style="font-weight:800;color:#1e293b;">${r.order_code||'—'}</td>
                    <td style="color:#374151;">${r.customer_name||'—'}</td>
                    <td><span style="padding:2px 8px;border-radius:6px;background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;">${r.manager_name||'—'}</span></td>
                    <td><span style="padding:2px 8px;border-radius:6px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700;">${r.affiliate_name||'—'}</span></td>
                    <td style="text-align:right;font-weight:800;color:#d97706;">${_fmtMoney(r.revenue)}</td>
                    <td style="font-size:12px;color:#6b7280;">${r.created_at?new Date(r.created_at).toLocaleDateString('vi-VN'):'—'}</td>
                </tr>`;
            });
            tableHtml += '</tbody></table>';
        }

        // Pagination
        let pagHtml = '';
        if (totalPages > 1) {
            pagHtml = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-top:1px solid #e5e7eb;flex-wrap:wrap;gap:8px;">
                <div style="font-size:12px;color:#6b7280;font-weight:600;">Trang ${page}/${totalPages} · ${total} kết quả</div>
                <div style="display:flex;align-items:center;gap:6px;">`;
            if (page > 1) pagHtml += `<button onclick="_affStatDrill('${type}',${page-1})" style="padding:6px 14px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">← Trước</button>`;
            // Page numbers
            const maxShow = 5;
            let startP = Math.max(1, page - Math.floor(maxShow/2));
            let endP = Math.min(totalPages, startP + maxShow - 1);
            if (endP - startP < maxShow - 1) startP = Math.max(1, endP - maxShow + 1);
            if (startP > 1) pagHtml += `<button onclick="_affStatDrill('${type}',1)" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:12px;color:#6b7280;">1</button>`;
            if (startP > 2) pagHtml += `<span style="color:#9ca3af;font-size:12px;">...</span>`;
            for (let p = startP; p <= endP; p++) {
                const isActive = p === page;
                pagHtml += `<button onclick="_affStatDrill('${type}',${p})" style="padding:6px 10px;border:${isActive?'none':'1px solid #d1d5db'};border-radius:8px;background:${isActive?color:'white'};color:${isActive?'white':'#374151'};cursor:pointer;font-size:12px;font-weight:${isActive?'800':'600'};">${p}</button>`;
            }
            if (endP < totalPages - 1) pagHtml += `<span style="color:#9ca3af;font-size:12px;">...</span>`;
            if (endP < totalPages) pagHtml += `<button onclick="_affStatDrill('${type}',${totalPages})" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:12px;color:#6b7280;">${totalPages}</button>`;
            if (page < totalPages) pagHtml += `<button onclick="_affStatDrill('${type}',${page+1})" style="padding:6px 14px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">Sau →</button>`;
            pagHtml += `</div></div>`;
        }

        const modalBody = overlay.querySelector('div > div:last-child') || overlay.querySelector('div').children[1];
        // Replace entire modal content
        overlay.innerHTML = `<div style="background:white;border-radius:16px;width:95%;max-width:950px;max-height:88vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;">
            <div style="padding:16px 24px;background:linear-gradient(135deg,${color},${color}dd);color:white;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:800;">${_AFF_DRILL_TITLES[type]}</h3>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:13px;font-weight:600;opacity:0.9;">${total} kết quả</span>
                    <button onclick="document.getElementById('affDrillOverlay').style.display='none'" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:10px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
            </div>
            <div style="flex:1;overflow:auto;padding:0;">
                ${rows.length > 0 ? tableHtml : '<div style="padding:40px;text-align:center;color:#94a3b8;">Không có dữ liệu</div>'}
            </div>
            ${pagHtml}
        </div>`;
        overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
    } catch (err) {
        overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:40px;text-align:center;max-width:400px;box-shadow:0 25px 60px rgba(0,0,0,0.3);">
            <div style="font-size:36px;margin-bottom:12px;">❌</div>
            <div style="color:#991b1b;font-weight:700;">Lỗi: ${err.message||'Không tải được dữ liệu'}</div>
            <button onclick="document.getElementById('affDrillOverlay').style.display='none'" style="margin-top:16px;padding:8px 24px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Đóng</button>
        </div>`;
    }
}

// Inject mobile CSS once
(function(){
    if (document.getElementById('affMobileCss')) return;
    var s = document.createElement('style'); s.id = 'affMobileCss';
    s.textContent = `
        .aff-stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:24px; }
        .aff-stat-card { border-radius:14px; padding:20px; color:white; box-shadow:0 4px 20px rgba(0,0,0,0.15); transition:transform 0.15s,box-shadow 0.15s; }
        .aff-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 30px rgba(0,0,0,0.25); }
        .aff-stat-val { font-size:28px; font-weight:900; }
        .aff-stat-lbl { font-size:12px; opacity:0.85; margin-top:4px; }
        .aff-mobile-list { display:none; flex-direction:column; gap:8px; }
        .aff-table-wrap { overflow-x:auto; }
        @media (max-width:768px) {
            .aff-stat-grid { grid-template-columns:1fr 1fr !important; gap:10px !important; }
            .aff-stat-card { padding:14px 12px !important; border-radius:16px !important; }
            .aff-stat-val { font-size:20px !important; }
            .aff-stat-lbl { font-size:11px !important; }
            .aff-table-wrap { display:none !important; }
            .aff-mobile-list { display:flex !important; }
            .aff-m-card { display:flex; align-items:center; justify-content:space-between; background:white; border-radius:14px; padding:12px 14px; border-left:4px solid #6366f1; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
            .aff-m-left { flex:1; min-width:0; }
            .aff-m-name-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
            .aff-m-name { font-weight:700; font-size:13px; color:#1e3a5f; background:#fef3c7; padding:2px 10px; border-radius:8px; border:1px solid #fbbf24; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; display:inline-block; }
            .aff-m-ref { margin-top:4px; font-size:11px; color:#64748b; }
            .aff-m-right { text-align:right; flex-shrink:0; padding-left:10px; }
            .aff-m-rev { font-size:13px; font-weight:800; color:#dc2626; }
            .aff-m-hh { font-size:11px; color:#64748b; font-weight:600; margin-top:2px; }
        }
    `;
    document.head.appendChild(s);
})();
