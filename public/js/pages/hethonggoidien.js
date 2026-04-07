// ========== HỆ THỐNG PHÂN CHIA GỌI ĐIỆN — PREMIUM UI ==========

let _htgd_sources = [];
let _htgd_activeSourceId = localStorage.getItem('htgd_sourceId') || null;
let _htgd_page = 1;
let _htgd_search = '';
let _htgd_statusFilter = '';
let _htgd_carrierFilter = '';
let _htgd_carrierStats = {};
let _htgd_members = [];
let _htgd_stats = [];
let _htgd_tab = localStorage.getItem('htgd_tab') || 'data';
let _htgd_depts = [];
let _htgd_activeCrm = localStorage.getItem('htgd_crm') || 'all';
let _htgd_lastData = [];
let _htgd_settingsCrm = localStorage.getItem('htgd_settingsCrm') || 'nuoi_duong';
const _carrierMap = {
    'Viettel': { label:'Viettel', bg:'#ecfdf5', color:'#059669' },
    'Mobi': { label:'Mobi', bg:'#eff6ff', color:'#2563eb' },
    'Vina': { label:'Vina', bg:'#fefce8', color:'#ca8a04' },
    'Vnmb': { label:'Vnmb', bg:'#f0fdf4', color:'#16a34a' },
    'Gmob': { label:'Gmob', bg:'#faf5ff', color:'#9333ea' },
    'iTel': { label:'iTel', bg:'#fff7ed', color:'#ea580c' },
    'Reddi': { label:'Reddi', bg:'#fef2f2', color:'#b91c1c' },
    'invalid': { label:'Sai', bg:'#fef2f2', color:'#dc2626' },
};

const _HTGD_CRM_TABS = [
    { key: 'all', label: 'Tất Cả', icon: '★', color: '#334155', bg: 'linear-gradient(135deg,#334155,#475569)' },
    { key: 'hoa_hong_crm', label: 'CRM Tự Tìm Kiếm', icon: '🔍', color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { key: 'nuoi_duong', label: 'CRM GĐ Hợp Tác', icon: '🤝', color: '#059669', bg: 'linear-gradient(135deg,#059669,#14b8a6)' },
    { key: 'sinh_vien', label: 'CRM GĐ Bán Hàng', icon: '📞', color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
];
const _HTGD_GRADIENTS = [
    'linear-gradient(135deg,#3b82f6,#6366f1)', // blue-indigo
    'linear-gradient(135deg,#059669,#14b8a6)', // emerald-teal
    'linear-gradient(135deg,#f59e0b,#f97316)', // amber-orange
    'linear-gradient(135deg,#8b5cf6,#a855f7)', // violet-purple
    'linear-gradient(135deg,#06b6d4,#0ea5e9)', // cyan-sky
    'linear-gradient(135deg,#f43f5e,#ef4444)', // rose-red
];
const _HTGD_AVATAR_COLORS = ['#3b82f6','#059669','#f59e0b','#8b5cf6','#06b6d4','#f43f5e','#ec4899','#6366f1','#14b8a6','#f97316'];

function _htgd_avatarColor(name) { let h = 0; for(let i=0;i<(name||'').length;i++) h = name.charCodeAt(i)+((h<<5)-h); return _HTGD_AVATAR_COLORS[Math.abs(h) % _HTGD_AVATAR_COLORS.length]; }
function _htgd_initials(name) { if(!name) return '?'; const p = name.trim().split(/\s+/); return p.length > 1 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : name.substring(0,2).toUpperCase(); }

async function renderHeThongGoiDienPage(container) {
    const isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(currentUser.role);
    if (!isManager) {
        container.innerHTML = `<div class="ts-empty"><span class="ts-empty-icon">⛔</span><div class="ts-empty-title">Không có quyền truy cập</div><div class="ts-empty-desc">Trang này chỉ dành cho Quản lý trở lên.</div></div>`;
        return;
    }
    const isAll = _htgd_activeCrm === 'all';
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;height:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="margin:0;color:#122546;font-size:20px;font-weight:800;">📊 Hệ Thống Phân Chia Gọi Điện</h2>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Quản lý data pool, import CSV, phân chia tự động cho NV</p>
                </div>
                <div id="htgdActionBtns" style="display:flex;gap:8px;flex-wrap:wrap;${isAll ? 'visibility:hidden;' : ''}">
                    <button class="ts-btn ts-btn-green" onclick="_htgd_importCSV()">📥 Import CSV</button>
                    <button class="ts-btn ts-btn-blue" onclick="_htgd_manualPump()">🚀 Bơm Thủ Công</button>
                    <button class="ts-btn ts-btn-red" onclick="_htgd_manualRecall()">🔄 Thu Hồi</button>
                    <button class="ts-btn" onclick="_htgd_dedupCrm()" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border:none;">🧹 Lọc Trùng</button>
                </div>
            </div>
            <div style="display:flex;gap:2px;border-bottom:2px solid #e5e7eb;">
                <button class="ts-tab active" onclick="_htgd_switchTab('data',this)">📞 Data Pool</button>
                <button class="ts-tab" onclick="_htgd_switchTab('members',this)">👥 NV Telesale</button>

                <button class="ts-tab" onclick="_htgd_switchTab('settings',this)">⚙️ Cài Đặt</button>
            </div>
            <div id="htgdContent" style="flex:1;overflow:auto;">
                <div style="text-align:center;padding:30px;color:#6b7280;">⏳ Đang tải...</div>
            </div>
        </div>`;
    _htgd_tab = 'data';
    _htgd_activeSourceId = null;
    await _htgd_loadSources();
}

async function _htgd_switchCrm(crmType) {
    _htgd_activeCrm = crmType;
    localStorage.setItem('htgd_crm', crmType);
    _htgd_activeSourceId = null;
    _htgd_carrierFilter = '';
    _htgd_page = 1;
    // Update CRM tab UI
    const tabs = document.querySelectorAll('.htgd-crm-tab');
    tabs.forEach(tab => {
        const key = tab.dataset.crm;
        const cfg = _HTGD_CRM_TABS.find(t => t.key === key);
        if (!cfg) return;
        const isActive = key === crmType;
        tab.style.background = isActive ? cfg.bg : 'linear-gradient(135deg,#f8fafc,#ffffff)';
        tab.style.color = isActive ? 'white' : '#475569';
        tab.style.borderColor = isActive ? cfg.color : '#e2e8f0';
        tab.style.boxShadow = isActive ? '0 6px 20px ' + cfg.color + '35, 0 2px 6px ' + cfg.color + '20' : '0 1px 3px rgba(0,0,0,0.05)';
        tab.style.transform = isActive ? 'scale(1.02)' : 'scale(1)';
    });
    // Toggle action buttons visibility
    const actionBtns = document.getElementById('htgdActionBtns');
    if (actionBtns) actionBtns.style.visibility = crmType === 'all' ? 'hidden' : 'visible';
    await _htgd_loadSources();
}

function _htgd_switchTab(tab, el) {
    _htgd_tab = tab;
    localStorage.setItem('htgd_tab', tab);
    document.querySelectorAll('.ts-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const actionBtns = document.getElementById('htgdActionBtns');
    if (actionBtns) actionBtns.style.visibility = (tab === 'settings' || _htgd_activeCrm === 'all') ? 'hidden' : 'visible';
    if (tab === 'data') _htgd_renderDataTab();
    else if (tab === 'members') _htgd_renderMembersTab();

    else if (tab === 'settings') _htgd_renderSettingsTab();
}

async function _htgd_loadSources() {
    const isAll = _htgd_activeCrm === 'all';
    const crmParam = isAll ? '' : `crm_type=${_htgd_activeCrm}`;
    const [srcRes, statsRes] = await Promise.all([
        apiCall(`/api/telesale/sources${crmParam ? '?' + crmParam : ''}`),
        apiCall(`/api/telesale/data/stats${crmParam ? '?' + crmParam : ''}`)
    ]);
    _htgd_sources = srcRes.sources || [];
    _htgd_stats = statsRes.stats || [];
    if (!_htgd_activeSourceId && _htgd_sources.length > 0) _htgd_activeSourceId = _htgd_sources[0].id;
    if (_htgd_tab === 'data') _htgd_renderDataTab();
    else if (_htgd_tab === 'members') _htgd_renderMembersTab();
    else if (_htgd_tab === 'invalid') _htgd_renderInvalidTab();
    else if (_htgd_tab === 'settings') _htgd_renderSettingsTab();
}

// ========== DATA TAB ==========
async function _htgd_renderDataTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    const isAll = _htgd_activeCrm === 'all';
    const t = _htgd_stats.reduce((a, s) => ({
        total: a.total + parseInt(s.total || 0), available: a.available + parseInt(s.available || 0),
        assigned: a.assigned + parseInt(s.assigned || 0), answered: a.answered + parseInt(s.answered || 0),
        cold: a.cold + parseInt(s.cold || 0), transferred: a.transferred + parseInt(s.transferred || 0),
        cold_answered: a.cold_answered + parseInt(s.cold_answered || 0),
        ncc_answered: a.ncc_answered + parseInt(s.ncc_answered || 0),
        no_answer_busy: a.no_answer_busy + parseInt(s.no_answer_busy || 0),
    }), { total:0, available:0, assigned:0, answered:0, cold:0, transferred:0, cold_answered:0, ncc_answered:0, no_answer_busy:0 });

    const cards = [
        { icon:'✅', label:'Tổng Data Sẵn Sàng', val:t.available, grad:_HTGD_GRADIENTS[1], txtColor:'white', filterKey:'available' },
        { icon:'📤', label:'Đã Phân', val:t.assigned, grad:_HTGD_GRADIENTS[2], txtColor:'white', filterKey:'assigned' },
        { icon:'📞', label:'Đã Gọi Bắt Máy', val:t.answered, grad:_HTGD_GRADIENTS[3], txtColor:'white', filterKey:'answered' },
        { icon:'🔥', label:'Chuyển Số', val:t.transferred, grad:'linear-gradient(135deg,#f59e0b,#ea580c)', txtColor:'white', filterKey:'transferred' },
        { icon:'📵', label:'Không Nghe, Bận', val:t.no_answer_busy, grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', txtColor:'white', filterKey:'no_answer_busy' },
        { icon:'🚫', label:'Không Có Nhu Cầu', val:t.cold_answered, grad:_HTGD_GRADIENTS[4], txtColor:'white', filterKey:'cold_answered' },
        { icon:'🏪', label:'Đã Có Nhà Cung Cấp', val:t.ncc_answered, grad:'linear-gradient(135deg,#854d0e,#a16207)', txtColor:'white', filterKey:'ncc_answered' },
    ];

    // CRM tabs HTML (rendered below stats) — premium style
    const crmTabsHtml = _HTGD_CRM_TABS.map(ct => {
        const isActive = ct.key === _htgd_activeCrm;
        return `<button class="htgd-crm-tab ${isActive ? 'active' : ''}" data-crm="${ct.key}"
            onclick="_htgd_switchCrm('${ct.key}')"
            style="padding:7px 16px;border:1.5px solid ${isActive ? ct.color : '#e2e8f0'};
            border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.25s ease;
            background:${isActive ? ct.bg : 'linear-gradient(135deg,#f8fafc,#ffffff)'};
            color:${isActive ? 'white' : '#475569'};
            box-shadow:${isActive ? '0 4px 14px ' + ct.color + '30' : '0 1px 3px rgba(0,0,0,0.04)'};
            display:inline-flex;align-items:center;gap:5px;">
            ${ct.icon} ${ct.label}
        </button>`;
    }).join('');

    if (isAll) {
        // "Tất cả" mode → stats + CRM tabs only, no data table
        el.innerHTML = `
            <div class="ts-stats-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px;">
                ${cards.map(c => { const isActive = _htgd_statusFilter===c.filterKey; return `<div class="ts-stat-card" style="background:${c.grad};color:${c.txtColor};cursor:pointer;transition:all .2s;${isActive?'outline:3px solid white;outline-offset:2px;transform:scale(1.05);':''}" onclick="_htgd_filterByCard('${c.filterKey}')">
                    <span class="ts-stat-icon">${c.icon}</span>
                    <div class="ts-stat-val">${c.val.toLocaleString()}</div>
                    <div class="ts-stat-label">${c.label}</div>
                </div>`; }).join('')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
                ${crmTabsHtml}
            </div>
            <div style="text-align:center;padding:40px 20px;">
                <div style="font-size:48px;margin-bottom:12px;">📊</div>
                <div style="font-size:16px;font-weight:700;color:#334155;margin-bottom:6px;">Tổng Quan Tất Cả CRM</div>
                <div style="font-size:13px;color:#6b7280;max-width:400px;margin:0 auto;">Chọn CRM cụ thể ở trên để xem data pool chi tiết, import CSV và thao tác dữ liệu.</div>
            </div>`;
        return;
    }

    // Specific CRM mode → full data tab
    el.innerHTML = `
        <div class="ts-stats-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px;">
            ${cards.map(c => { const isActive = _htgd_statusFilter===c.filterKey; return `<div class="ts-stat-card" style="background:${c.grad};color:${c.txtColor};cursor:pointer;transition:all .2s;${isActive?'outline:3px solid white;outline-offset:2px;transform:scale(1.05);':''}" onclick="_htgd_filterByCard('${c.filterKey}')">
                <span class="ts-stat-icon">${c.icon}</span>
                <div class="ts-stat-val">${c.val.toLocaleString()}</div>
                <div class="ts-stat-label">${c.label}</div>
            </div>`; }).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
            ${crmTabsHtml}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
            ${_htgd_sources.map(s => {
                const stat = _htgd_stats.find(st => st.id === s.id) || {};
                const active = s.id === _htgd_activeSourceId;
                return `<button class="ts-source-pill${active?' active':''}" onclick="_htgd_selectSource(${s.id})">
                    ${s.icon||'📁'} ${s.name} <span class="ts-pill-count">${stat.total||0}</span>
                </button>`;
            }).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap;">
            <div class="ts-search-wrap" style="flex:1;min-width:200px;">
                <input type="text" class="ts-search" id="htgdSearch" placeholder="Tìm SĐT, Tên KH, Công ty..." value="${_htgd_search}"
                    onkeyup="if(event.key==='Enter'){_htgd_search=this.value;_htgd_page=1;_htgd_loadData();}">
            </div>
            <select class="ts-select" id="htgdStatusFilter" onchange="_htgd_statusFilter=this.value;_htgd_page=1;_htgd_loadData();">
                <option value="" ${_htgd_statusFilter===''?'selected':''}>Tất cả trạng thái</option>
                <option value="available" ${_htgd_statusFilter==='available'?'selected':''}>✅ Sẵn sàng</option>
                <option value="assigned" ${_htgd_statusFilter==='assigned'?'selected':''}>📤 Đã phân</option>
                <option value="answered" ${_htgd_statusFilter==='answered'?'selected':''}>📞 Đã gọi</option>
                <option value="transferred" ${_htgd_statusFilter==='transferred'?'selected':''}>🔥 Chuyển số</option>
                <option value="no_answer_busy" ${_htgd_statusFilter==='no_answer_busy'?'selected':''}>📵 Không nghe, bận</option>
                <option value="cold_answered" ${_htgd_statusFilter==='cold_answered'?'selected':''}>🚫 Không có nhu cầu</option>
                <option value="ncc_answered" ${_htgd_statusFilter==='ncc_answered'?'selected':''}>🏪 Đã có NCC</option>
                <option value="cold" ${_htgd_statusFilter==='cold'?'selected':''}>❄️ Cold</option>
            </select>
            <select class="ts-select" id="htgdCarrierFilter" onchange="_htgd_carrierFilter=this.value;_htgd_page=1;_htgd_loadData();">
                <option value="">Tất cả nhà mạng</option>
                <option value="Viettel" ${_htgd_carrierFilter==='Viettel'?'selected':''}>🟩 Viettel</option>
                <option value="Mobi" ${_htgd_carrierFilter==='Mobi'?'selected':''}>🟦 Mobi</option>
                <option value="Vina" ${_htgd_carrierFilter==='Vina'?'selected':''}>🟨 Vina</option>
                <option value="Vnmb" ${_htgd_carrierFilter==='Vnmb'?'selected':''}>🟩 Vnmb</option>
                <option value="Gmob" ${_htgd_carrierFilter==='Gmob'?'selected':''}>🟪 Gmob</option>
                <option value="iTel" ${_htgd_carrierFilter==='iTel'?'selected':''}>🟧 iTel</option>
                <option value="Reddi" ${_htgd_carrierFilter==='Reddi'?'selected':''}>🟫 Reddi</option>
                <option value="invalid" ${_htgd_carrierFilter==='invalid'?'selected':''}>❌ Sai</option>
            </select>
            <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="document.getElementById('htgdSearch').value='';_htgd_search='';_htgd_statusFilter='';_htgd_carrierFilter='';_htgd_page=1;_htgd_loadData();">🔄 Reset</button>
            <button class="ts-btn ts-btn-green ts-btn-xs" onclick="_htgd_addDataManual()">➕ Thêm</button>
        </div>
        <div id="htgdDataTable" style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <div style="text-align:center;padding:20px;color:#6b7280;">⏳ Đang tải data...</div>
        </div>
        <div id="htgdPagination" style="margin-top:12px;display:flex;justify-content:center;gap:4px;"></div>`;
    _htgd_loadData();
}

async function _htgd_selectSource(sourceId) {
    _htgd_activeSourceId = sourceId;
    _htgd_page = 1;
    _htgd_renderDataTab();
}

function _htgd_filterByCard(filterKey) {
    // Toggle: click same card again → reset filter
    if (_htgd_statusFilter === filterKey) {
        _htgd_statusFilter = '';
    } else {
        _htgd_statusFilter = filterKey;
    }
    _htgd_page = 1;
    // If in "all" mode, switch to first specific CRM
    if (_htgd_activeCrm === 'all' && _htgd_sources.length > 0) {
        // Stay in all mode but still re-render to update card highlight
        _htgd_renderDataTab();
        return;
    }
    _htgd_renderDataTab();
}

async function _htgd_loadData() {
    const tbl = document.getElementById('htgdDataTable');
    if (!tbl) return;
    const params = new URLSearchParams({ source_id: _htgd_activeSourceId, page: _htgd_page, limit: 50 });
    if (_htgd_search) params.set('search', _htgd_search);
    if (_htgd_statusFilter) params.set('status', _htgd_statusFilter);
    if (_htgd_carrierFilter) params.set('carrier', _htgd_carrierFilter);

    const [res, statsRes] = await Promise.all([
        apiCall(`/api/telesale/data?${params}`),
        apiCall(`/api/telesale/data/stats?crm_type=${_htgd_activeCrm}${_htgd_activeSourceId ? '&source_id='+_htgd_activeSourceId : ''}`)
    ]);
    const data = res.data || [];
    _htgd_lastData = data;
    _htgd_carrierStats = statsRes.carrierStats || {};
    const total = parseInt(res.total || 0);
    // Update carrier filter dropdown counts
    const dd = document.getElementById('htgdCarrierFilter');
    if (dd) {
        const carriers = ['Viettel','Mobi','Vina','Vnmb','Gmob','iTel','Reddi','invalid'];
        const icons = ['🟩','🟦','🟨','🟩','🟪','🟧','🟫','❌'];
        const labels = ['Viettel','Mobi','Vina','Vnmb','Gmob','iTel','Reddi','Sai'];
        let opts = '<option value="">Tất cả nhà mạng</option>';
        carriers.forEach((c,i) => {
            const cnt = _htgd_carrierStats[c] || 0;
            opts += `<option value="${c}" ${_htgd_carrierFilter===c?'selected':''}>${icons[i]} ${labels[i]} (${cnt.toLocaleString()})</option>`;
        });
        dd.innerHTML = opts;
    }
    const totalPages = Math.ceil(total / 50);

    const statusBadge = (s) => {
        const map = {
            available: { icon:'✅', label:'Sẵn sàng', bg:'#dcfce7', color:'#16a34a' },
            assigned: { icon:'📤', label:'Đã phân', bg:'#dbeafe', color:'#2563eb' },
            answered: { icon:'📞', label:'Đã gọi', bg:'#fef3c7', color:'#d97706' },
            cold: { icon:'🚫', label:'Không có nhu cầu', bg:'#eef2ff', color:'#6366f1' },
        };
        const m = map[s] || map.available;
        return `<span class="ts-badge" style="background:${m.bg};color:${m.color};">${m.icon} ${m.label}</span>`;
    };

    const nvAvatar = (name) => {
        if (!name) return '<span style="color:#9ca3af;font-size:11px;">—</span>';
        const c = _htgd_avatarColor(name);
        return `<div style="display:flex;align-items:center;gap:6px;">
            <span class="ts-avatar ts-avatar-sm" style="background:${c};">${_htgd_initials(name)}</span>
            <span style="font-size:11px;font-weight:600;color:#374151;">${name}</span>
        </div>`;
    };

    if (data.length === 0) {
        tbl.innerHTML = `<div class="ts-empty">
            <span class="ts-empty-icon">📭</span>
            <div class="ts-empty-title">Không có data nào</div>
            <div class="ts-empty-desc">Thử thay đổi bộ lọc hoặc import data mới</div>
            <button class="ts-btn ts-btn-green" onclick="_htgd_importCSV()">📥 Import CSV</button>
        </div>`;
        return;
    }

    tbl.innerHTML = `
        <table class="ts-table">
            <thead><tr>
                <th style="text-align:left;width:40px;">#</th>
                <th style="text-align:left;">Tên Công Ty</th>
                <th style="text-align:left;">Tên KH</th>
                <th style="text-align:left;">Nội Dung ĐB</th>
                <th style="text-align:left;">SĐT</th>
                <th style="text-align:center;">NM</th>
                <th style="text-align:left;">Địa Chỉ</th>
                <th style="text-align:center;">Trạng Thái</th>
                <th style="text-align:left;">Phân Cho</th>
                <th style="text-align:center;width:60px;">Xóa</th>
            </tr></thead>
            <tbody>
                ${data.map((d,i) => {
                    const carriers = (d.carrier||'').split('|').filter(Boolean);
                    const carrierHtml = carriers.length > 0 ? carriers.map(c => {
                        const cm = _carrierMap[c] || _carrierMap['invalid'];
                        return `<span class="ts-badge" style="background:${cm.bg};color:${cm.color};font-size:9px;padding:1px 5px;">${cm.label}</span>`;
                    }).join(' ') : '<span style="color:#d1d5db;font-size:10px;">—</span>';
                    const phoneFull = d.phone ? d.phone.replace(/^84/, '0') : '—';
                    return `<tr onclick="_htgd_viewDetail(${d.id})" style="cursor:pointer;">
                    <td style="color:#9ca3af;font-weight:600;">${((_htgd_page-1)*50)+i+1}</td>
                    <td style="font-weight:600;color:#374151;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.company_name||'').replace(/"/g,'&quot;')}">${d.company_name || '—'}</td>
                    <td style="font-weight:700;color:#122546;">${d.customer_name || '—'}</td>
                    <td style="color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;" title="${(d.post_content||'').replace(/"/g,'&quot;')}">${d.post_content || '—'}</td>
                    <td style="font-family:'SF Mono',monospace;font-weight:700;color:#2563eb;letter-spacing:0.5px;">${phoneFull}</td>
                    <td style="text-align:center;">${carrierHtml}</td>
                    <td style="color:#6b7280;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.address||'').replace(/"/g,'&quot;')}">${d.address || '—'}</td>
                    <td style="text-align:center;">${statusBadge(d.status)}</td>
                    <td>${nvAvatar(d.last_assigned_user_name)}</td>
                    <td style="text-align:center;" onclick="event.stopPropagation();"><button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_deleteData(${d.id})" title="Xóa">🗑️</button></td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
        <div style="padding:10px 14px;background:#f8fafc;font-size:11px;color:#6b7280;display:flex;justify-content:space-between;border-top:1px solid #f1f5f9;">
            <span>Hiển thị <b>${data.length}</b> / <b>${total}</b> bản ghi</span>
            <span>Trang <b>${_htgd_page}</b> / <b>${totalPages || 1}</b></span>
        </div>`;

    const pag = document.getElementById('htgdPagination');
    if (pag && totalPages > 1) {
        let html = '';
        if (_htgd_page > 1) html += `<button class="ts-page-btn" onclick="_htgd_page=${_htgd_page-1};_htgd_loadData();">◀</button>`;
        for (let p = Math.max(1,_htgd_page-2); p <= Math.min(totalPages,_htgd_page+2); p++) {
            html += `<button class="ts-page-btn${p===_htgd_page?' active':''}" onclick="_htgd_page=${p};_htgd_loadData();">${p}</button>`;
        }
        if (_htgd_page < totalPages) html += `<button class="ts-page-btn" onclick="_htgd_page=${_htgd_page+1};_htgd_loadData();">▶</button>`;
        pag.innerHTML = html;
    } else if (pag) pag.innerHTML = '';
}

// ========== DATA ACTIONS ==========
async function _htgd_deleteData(id) {
    if (!confirm('Xóa data này?')) return;
    const res = await apiCall(`/api/telesale/data/${id}`, 'DELETE');
    if (res.success) { showToast(res.message); _htgd_loadData(); await _htgd_refreshStats(); }
    else showToast(res.error, 'error');
}

async function _htgd_refreshStats() {
    const isAll = _htgd_activeCrm === 'all';
    const crmParam = isAll ? '' : `?crm_type=${_htgd_activeCrm}`;
    const statsRes = await apiCall(`/api/telesale/data/stats${crmParam}`);
    _htgd_stats = statsRes.stats || [];
}

async function _htgd_addDataManual() {
    if (!_htgd_activeSourceId) return showToast('Chọn nguồn trước', 'error');
    const src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
    openModal('➕ Thêm Data - ' + (src?.name || ''), `
        <div class="form-group"><label>📞 SĐT *</label><input type="text" id="addDataPhone" class="form-control" placeholder="0901234567"></div>
        <div class="form-group"><label>👤 Tên KH</label><input type="text" id="addDataName" class="form-control"></div>
        <div class="form-group"><label>🏢 Tên Công Ty</label><input type="text" id="addDataCompany" class="form-control"></div>
        <div class="form-group"><label>👥 Tên Nhóm</label><input type="text" id="addDataGroup" class="form-control"></div>
        <div class="form-group"><label>📍 Địa Chỉ</label><input type="text" id="addDataAddress" class="form-control"></div>
        <div class="form-group"><label>🔗 Link Đăng Bài</label><input type="text" id="addDataLink" class="form-control"></div>
        <div class="form-group"><label>📝 Nội Dung</label><textarea id="addDataContent" class="form-control" rows="2"></textarea></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" onclick="_htgd_submitAddData()">💾 Thêm</button>`);
}

async function _htgd_submitAddData() {
    const phone = document.getElementById('addDataPhone')?.value?.trim();
    if (!phone) return showToast('Nhập SĐT', 'error');
    const res = await apiCall('/api/telesale/data', 'POST', {
        source_id: _htgd_activeSourceId, phone,
        customer_name: document.getElementById('addDataName').value,
        company_name: document.getElementById('addDataCompany').value,
        group_name: document.getElementById('addDataGroup').value,
        address: document.getElementById('addDataAddress').value,
        post_link: document.getElementById('addDataLink').value,
        post_content: document.getElementById('addDataContent').value,
    });
    if (res.success) { showToast(res.message); closeModal(); _htgd_loadData(); await _htgd_refreshStats(); _htgd_renderDataTab(); }
    else showToast(res.error, 'error');
}

// ========== IMPORT CSV ==========
function _htgd_importCSV() {
    if (!_htgd_activeSourceId) return showToast('Chọn nguồn trước', 'error');
    const src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
    openModal('📥 Import CSV/Excel - ' + (src?.name || ''), `
        <div style="margin-bottom:14px;padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                <span style="font-size:14px;">📋</span>
                <span style="font-size:13px;font-weight:800;color:#0c4a6e;">Format cột Excel/CSV</span>
                <span style="margin-left:auto;font-size:10px;color:#0369a1;background:#e0f2fe;padding:2px 8px;border-radius:6px;font-weight:600;">7 cột</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">①</span> Tên Công Ty</span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">②</span> Tên Nhóm</span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">③</span> Link Đăng Bài</span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">④</span> Nội Dung ĐB</span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">⑤</span> Tên KH</span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;border:1px solid #86efac;"><span style="color:#16a34a;font-size:10px;">⑥</span> SĐT <span style="color:#dc2626;font-size:9px;">*</span></span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:10px;">⑦</span> Địa Chỉ</span>
            </div>
            <div style="display:flex;gap:12px;font-size:10px;color:#64748b;">
                <span>🔹 Hàng 1 = header (bỏ qua)</span>
                <span>🟢 <span style="color:#dc2626;font-weight:700;">*</span> SĐT bắt buộc</span>
                <span>🔸 SĐT trùng tự bỏ qua</span>
            </div>
        </div>
        <div class="form-group"><label>📄 Chọn file CSV/Excel</label><input type="file" id="importFile" accept=".csv,.xlsx,.xls" class="form-control" onchange="_htgd_previewImport(this)"></div>
        <div id="importPreviewArea" style="display:none;"></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" id="importSubmitBtn" disabled onclick="_htgd_submitImport()">📥 Import</button>`);
}

let _htgd_importRows = [];
async function _htgd_previewImport(input) {
    const file = input.files[0]; if (!file) return;
    const preview = document.getElementById('importPreviewArea');
    preview.style.display = 'block'; preview.innerHTML = '⏳ Đang đọc file...';
    try {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { preview.innerHTML = '❌ File rỗng hoặc chỉ có header'; return; }
        const rows = [];
            const _src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
            const _cm = _src?.column_mapping || {};
            const _colIdx = (letter) => letter ? letter.charCodeAt(0) - 65 : -1;
        for (let i = 1; i < lines.length; i++) {
            const cols = _htgd_parseCSVLine(lines[i]);
            if (cols.length < 1) continue;
            const getCol = (key) => { const idx = _colIdx(_cm[key]); return idx >= 0 && idx < cols.length ? (cols[idx]||'').trim() : ''; };
            let addr = '';
            if (_cm.address === 'AUTO') {
                // Extract address from post_content - look for Vietnamese address patterns
                const pc = getCol('post_content');
                const addrMatch = pc.match(/(?:địa chỉ|đc|dc|Đ\/c)[:\s]*([^\n,]+)/i) || pc.match(/(\d+[^,\n]*(?:phố|đường|ngõ|phường|quận|tp|hcm|hà nội|hn)[^,\n]*)/i);
                addr = addrMatch ? addrMatch[1].trim() : '';
            } else {
                addr = getCol('address');
            }
            rows.push({ company_name:getCol('company_name'), group_name:getCol('group_name'), post_link:getCol('post_link'), post_content:getCol('post_content'), customer_name:getCol('customer_name'), phone:getCol('phone'), address:addr });
        }
        _htgd_importRows = rows;
        const sizeColor = fileSizeMB > 10 ? '#dc2626' : fileSizeMB > 5 ? '#d97706' : '#059669';
        preview.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:8px;">
                <strong style="color:#059669;">📊 ${rows.length.toLocaleString()} bản ghi</strong> sẽ được import
                <span style="margin-left:auto;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${sizeColor}15;color:${sizeColor};border:1px solid ${sizeColor}40;">📦 ${fileSizeMB} MB</span>
            </div>
            <div style="max-height:200px;overflow:auto;border:1.5px solid #e5e7eb;border-radius:12px;">
                <table class="ts-table"><thead><tr><th style="text-align:left;">Tên CT</th><th style="text-align:left;">Tên KH</th><th style="text-align:left;">SĐT</th><th style="text-align:left;">Địa Chỉ</th></tr></thead>
                <tbody>${rows.slice(0,10).map(r => `<tr><td>${r.company_name}</td><td>${r.customer_name}</td><td style="font-family:monospace;">${r.phone}</td><td>${r.address}</td></tr>`).join('')}
                ${rows.length > 10 ? `<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:8px;">... và ${(rows.length-10).toLocaleString()} bản ghi nữa</td></tr>` : ''}</tbody></table>
            </div>
            <div id="importProgressArea" style="display:none;margin-top:10px;"></div>`;
        document.getElementById('importSubmitBtn').disabled = false;
    } catch(e) { preview.innerHTML = `❌ Lỗi đọc file: ${e.message}`; }
}

function _htgd_parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuotes = !inQuotes; }
        else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += c; }
    }
    result.push(current.trim()); return result;
}

async function _htgd_submitImport() {
    if (_htgd_importRows.length === 0) return;
    const btn = document.getElementById('importSubmitBtn');
    btn.disabled = true; btn.textContent = '⏳ Đang import...';

    const CHUNK = 5000;
    const total = _htgd_importRows.length;
    const progressArea = document.getElementById('importProgressArea');

    if (total > CHUNK && progressArea) {
        progressArea.style.display = 'block';
        progressArea.innerHTML = `
            <div style="background:#f1f5f9;border-radius:10px;overflow:hidden;height:22px;position:relative;">
                <div id="importProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#059669,#10b981);transition:width 0.3s ease;border-radius:10px;"></div>
                <span id="importProgressText" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#334155;">0%</span>
            </div>
            <div id="importProgressDetail" style="font-size:10px;color:#6b7280;margin-top:4px;text-align:center;"></div>`;
    }

    let totalInserted = 0, totalSkipped = 0;
    const chunks = Math.ceil(total / CHUNK);

    for (let i = 0; i < total; i += CHUNK) {
        const chunkRows = _htgd_importRows.slice(i, i + CHUNK);
        const chunkNum = Math.floor(i / CHUNK) + 1;
        const pct = Math.round((i / total) * 100);

        if (progressArea?.style.display !== 'none') {
            const bar = document.getElementById('importProgressBar');
            const txt = document.getElementById('importProgressText');
            const det = document.getElementById('importProgressDetail');
            if (bar) bar.style.width = pct + '%';
            if (txt) txt.textContent = pct + '%';
            if (det) det.textContent = `Đang gửi phần ${chunkNum}/${chunks} (${Math.min(i + CHUNK, total).toLocaleString()}/${total.toLocaleString()} dòng)`;
        }

        const res = await apiCall('/api/telesale/data/import', 'POST', { source_id: _htgd_activeSourceId, rows: chunkRows });
        if (!res.success) { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = '📥 Import'; return; }
        totalInserted += (res.inserted || 0);
        totalSkipped += (res.skipped || 0);
    }

    // Final 100%
    if (progressArea?.style.display !== 'none') {
        const bar = document.getElementById('importProgressBar');
        const txt = document.getElementById('importProgressText');
        if (bar) bar.style.width = '100%';
        if (txt) txt.textContent = '100% ✅';
    }

    showToast(`Import thành công: ${totalInserted.toLocaleString()} mới, ${totalSkipped.toLocaleString()} bỏ qua`);
    closeModal(); _htgd_importRows = []; await _htgd_refreshStats(); _htgd_renderDataTab();
}

// ========== PUMP & RECALL ==========
async function _htgd_manualPump() {
    if (!confirm('Bơm data cho tất cả NV active ngay bây giờ?\n(Tương đương cron 7:00 sáng)')) return;
    showToast('⏳ Đang bơm...', 'info');
    const res = await apiCall('/api/telesale/pump', 'POST');
    if (res.success) {
        showToast(res.message);
        if (res.alerts && res.alerts.length > 0) alert('⚠️ Cảnh báo nguồn hết data:\n\n' + res.alerts.map(a => `⚠️ ${a.source}: cần ${a.needed}, còn ${a.available}`).join('\n'));
        await _htgd_refreshStats(); _htgd_renderDataTab();
    } else showToast(res.error, 'error');
}
async function _htgd_manualRecall() {
    if (!confirm('Thu hồi tất cả data chưa gọi?\n(Tương đương cron 00:00)')) return;
    showToast('⏳ Đang thu hồi...', 'info');
    const res = await apiCall('/api/telesale/recall', 'POST');
    if (res.success) { showToast(res.message); await _htgd_refreshStats(); _htgd_renderDataTab(); }
    else showToast(res.error, 'error');
}

// ========== MEMBERS TAB ==========
async function _htgd_renderMembersTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải NV...</div>';
    const isAll = _htgd_activeCrm === 'all';
    const crmParam = isAll ? '' : `?crm_type=${_htgd_activeCrm}`;

    const [memRes, usersRes, deptRes] = await Promise.all([
        apiCall(`/api/telesale/active-members${crmParam}`),
        apiCall('/api/users'),
        apiCall('/api/departments')
    ]);
    _htgd_members = memRes.members || [];
    const allUsers = (usersRes.users || usersRes || []).filter(u => u.status === 'active');
    _htgd_depts = deptRes.departments || deptRes.teams || (Array.isArray(deptRes) ? deptRes : []);

    // TP/NV: chỉ xem chính mình
    const _htgd_isMgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(currentUser.role);
    if (!_htgd_isMgr) {
        _htgd_members = _htgd_members.filter(m => m.user_id === currentUser.id);
    }

    const memberIds = new Set(_htgd_members.map(m => m.user_id));
    const availableUsers = _htgd_isMgr ? allUsers.filter(u => !memberIds.has(u.id)) : [];

    // Group available users by department
    const deptMap = {};
    _htgd_depts.forEach(d => { deptMap[d.id] = d.name; });
    const groupedUsers = {};
    availableUsers.forEach(u => {
        const dId = u.department_id || 0;
        const dName = deptMap[dId] || 'Chưa phân phòng';
        if (!groupedUsers[dId]) groupedUsers[dId] = { name: dName, users: [] };
        groupedUsers[dId].users.push(u);
    });

    const crmLabelMap = { hoa_hong_crm: '🔍 Tự TK', nuoi_duong: '🤝 Hợp Tác', sinh_vien: '📞 Bán Hàng' };
    const crmColorMap = { hoa_hong_crm: '#6366f1', nuoi_duong: '#059669', sinh_vien: '#f59e0b' };

    el.innerHTML = `
        <div class="ts-members-grid" style="display:grid;grid-template-columns:${isAll ? '1fr' : '1fr 320px'};gap:18px;">
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="margin:0;color:#122546;font-size:15px;font-weight:800;">👥 NV Telesale Active (${_htgd_members.filter(m=>m.is_active).length})${isAll ? ' — Tất cả CRM' : ''}</h4>
                </div>
                ${_htgd_members.length === 0 ? `<div class="ts-empty">
                    <span class="ts-empty-icon">👥</span>
                    <div class="ts-empty-title">Chưa có NV nào</div>
                    <div class="ts-empty-desc">${isAll ? 'Chọn CRM cụ thể để thêm NV' : 'Thêm NV vào Telesale từ sidebar bên phải'}</div>
                </div>` : `
                <div>
                    ${(() => {
                        // Build department hierarchy for active members
                        const deptById = {};
                        _htgd_depts.forEach(d => { deptById[d.id] = d; });
                        
                        // Find parent dept (phòng) for each member
                        const tree = {}; // { parentId: { name, teams: { teamId: { name, members: [] } } } }
                        _htgd_members.forEach(m => {
                            const deptId = m.department_id;
                            const dept = deptById[deptId];
                            let parentId = 0, parentName = "Chưa phân phòng", teamId = 0, teamName = "";
                            if (dept) {
                                // If dept has a parent that also has a parent → dept is a team
                                const parent = deptById[dept.parent_id];
                                if (parent && deptById[parent.parent_id]) {
                                    // dept is team, parent is phòng
                                    parentId = parent.id; parentName = parent.name;
                                    teamId = dept.id; teamName = dept.name;
                                } else if (parent) {
                                    // dept is phòng (only 1 level under root)
                                    parentId = dept.id; parentName = dept.name;
                                    teamId = 0; teamName = "";
                                } else {
                                    parentId = dept.id; parentName = dept.name;
                                }
                            }
                            if (!tree[parentId]) tree[parentId] = { name: parentName, teams: {} };
                            if (!tree[parentId].teams[teamId]) tree[parentId].teams[teamId] = { name: teamName, members: [] };
                            tree[parentId].teams[teamId].members.push(m);
                        });
                        
                        return Object.entries(tree).map(([pId, pData]) => {
                            const teamsHtml = Object.entries(pData.teams).map(([tId, tData]) => {
                                const teamHeader = tData.name ? `<div style="padding:4px 10px;margin:8px 0 4px;font-size:11px;font-weight:700;color:#6366f1;">👥 ${tData.name} (${tData.members.length})</div>` : "";
                                const cards = tData.members.map(m => {
                                    const c = _htgd_avatarColor(m.full_name || m.username);
                                    const crmBadge = isAll ? `<span style="font-size:9px;padding:2px 6px;border-radius:6px;font-weight:700;background:${crmColorMap[m.crm_type] || "#6b7280"}20;color:${crmColorMap[m.crm_type] || "#6b7280"}">${crmLabelMap[m.crm_type] || m.crm_type}</span>` : "";
                                    return `<div class="ts-nv-card" style="animation:ts-fadeInUp 0.3s ease both;">
                                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                                            <span class="ts-avatar" style="background:${c};width:38px;height:38px;font-size:14px;">${_htgd_initials(m.full_name || m.username)}</span>
                                            <div style="flex:1;min-width:0;">
                                                <div style="font-weight:700;color:#122546;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name || m.username}</div>
                                                <div style="font-size:10px;color:#6366f1;font-weight:600;">${m.dept_name || "—"} ${crmBadge}</div>
                                            </div>
                                            ${m.is_active ? '<span class="ts-badge" style="background:#dcfce7;color:#16a34a;font-size:9px;">● Active</span>' : '<span class="ts-badge" style="background:#fef2f2;color:#dc2626;font-size:9px;">● Inactive</span>'}
                                        </div>
                                        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
                                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                                <span style="font-size:10px;color:#6b7280;font-weight:600;">Quota/ngày:</span>
                                                ${isAll
                                                    ? `<span style="font-weight:700;font-size:12px;color:#334155;">${m.daily_quota != null ? m.daily_quota : 'Mặc định'}</span>`
                                                    : (m.daily_quota != null
                                                        ? `<input type="number" value="${m.daily_quota}" style="width:65px;padding:4px 6px;border:1.5px solid #e5e7eb;border-radius:8px;text-align:center;font-weight:700;font-size:12px;" onchange="_htgd_updateQuota(${m.user_id},this.value)">
                                                           <button class="ts-btn ts-btn-xs" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:9px;padding:3px 6px;" onclick="_htgd_setDefaultQuota(${m.user_id})" title="Đặt về mặc định">🔄 MĐ</button>`
                                                        : `<span style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#15803d;padding:3px 10px;border-radius:8px;font-weight:700;font-size:11px;">✅ Mặc định</span>
                                                           <button class="ts-btn ts-btn-xs" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:9px;padding:3px 6px;" onclick="_htgd_setCustomQuota(${m.user_id})" title="Đặt số tùy chỉnh">✏️ Custom</button>`)}
                                            </div>
                                            ${isAll ? '' : `<button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_removeMember(${m.user_id},'${(m.full_name||m.username).replace(/'/g,"\\\\\\\\\\\\'")}')" title="Bỏ NV">❌</button>`}
                                        </div>
                                    </div>`;
                                }).join("");
                                return teamHeader + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">${cards}</div>`;
                            }).join("");
                            return `<div style="margin-bottom:16px;"><div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:10px;margin-bottom:6px;cursor:pointer;" onclick="var el=this.nextElementSibling;el.style.display=el.style.display==='none'?'block':'none';this.querySelector('[data-arrow]').textContent=el.style.display==='none'?'▶':'▼'"><span style="font-size:13px;font-weight:800;color:#334155;">📁 ${pData.name}</span><span style="font-size:11px;color:#6b7280;margin-left:auto;">(${Object.values(pData.teams).reduce((s,t)=>s+t.members.length,0)})</span><span data-arrow style="font-size:11px;color:#9ca3af;margin-left:4px;">▼</span></div><div>${teamsHtml}</div></div>`;
                        }).join("");
                    })()}
                </div>
                ${!isAll && _htgd_isMgr && _htgd_members.length > 0 ? `
                <div style="margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:12px;color:#0369a1;font-weight:700;">🔄 Đồng bộ quota:</span>
                    <input type="number" id="syncQuotaValue" value="250" style="width:80px;padding:5px 8px;border:1.5px solid #bae6fd;border-radius:8px;text-align:center;font-weight:700;">
                    <button class="ts-btn ts-btn-blue ts-btn-xs" onclick="_htgd_syncQuota()">Đồng bộ tất cả</button>
                    <span style="width:1px;height:20px;background:#bae6fd;"></span>
                    <button class="ts-btn ts-btn-xs" style="background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;font-weight:700;" onclick="_htgd_setDefaultAll()">🔄 Đặt mặc định tất cả</button>
                </div>` : ''}`}
            </div>
            ${isAll || !_htgd_isMgr ? '' : `<div style="background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;">
                <h4 style="margin:0 0 12px;color:#122546;font-size:13px;font-weight:800;">➕ Thêm NV vào Telesale</h4>
                <div id="addMemberList" class="ts-scroll" style="max-height:500px;overflow:auto;">
                    ${availableUsers.length === 0 ? '<div class="ts-empty" style="padding:24px;"><span class="ts-empty-icon" style="font-size:32px;">✅</span><div class="ts-empty-title" style="font-size:12px;">Tất cả NV đã được thêm</div></div>' : ''}
                    ${Object.entries(groupedUsers).map(([dId,g]) => {
                        const memberCards = g.users.map(u => {
                            const c2 = _htgd_avatarColor(u.full_name || u.username);
                            return `<div class="htgd-add-member-item" data-name="${(u.full_name||u.username).toLowerCase()}" data-dept="${u.department_id||0}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;padding-left:16px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:8px;transition:background 0.15s;" onmouseenter="this.style.background='#eff6ff'" onmouseleave="this.style.background='transparent'" onclick="_htgd_addMember(${u.id})"><span class="ts-avatar ts-avatar-sm" style="background:${c2};">${_htgd_initials(u.full_name || u.username)}</span><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div></div><span class="ts-btn ts-btn-green ts-btn-xs" style="padding:3px 8px;">➕</span></div>`;
                        }).join('');
                        return `<div style="margin-bottom:8px;"><div onclick="var el=this.nextElementSibling;el.style.display=el.style.display==='none'?'block':'none';this.querySelector('[data-arrow]').textContent=el.style.display==='none'?'▶':'▼'" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:8px;margin-bottom:2px;cursor:pointer;"><span style="font-size:11px;font-weight:800;color:#334155;">📁 ${g.name}</span><span style="font-size:10px;color:#6b7280;margin-left:auto;">(${g.users.length})</span><span data-arrow style="font-size:10px;color:#9ca3af;margin-left:4px;">▼</span></div><div>${memberCards}</div></div>`;
                    }).join('')}
                </div>
            </div>`}
        </div>`;
}

function _htgd_filterByDept(deptId) {
    document.querySelectorAll('.htgd-add-member-item').forEach(el => {
        el.style.display = (!deptId || el.dataset.dept === deptId) ? 'flex' : 'none';
    });
}

function _htgd_filterAddMembers(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.htgd-add-member-item').forEach(el => {
        el.style.display = el.dataset.name.includes(q) ? 'flex' : 'none';
    });
}

async function _htgd_addMember(userId) {
    const res = await apiCall('/api/telesale/active-members', 'POST', { user_id: userId, crm_type: _htgd_activeCrm });
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_updateQuota(userId, quota) {
    const val = parseInt(quota);
    if (isNaN(val) || val <= 0) return showToast('Nhập số hợp lệ (> 0)', 'error');
    const res = await apiCall(`/api/telesale/active-members/${userId}`, 'PUT', { daily_quota: val, crm_type: _htgd_activeCrm });
    if (res.success) showToast('✅ Đã cập nhật quota');
    else showToast(res.error, 'error');
}

async function _htgd_setDefaultQuota(userId) {
    const res = await apiCall(`/api/telesale/active-members/${userId}`, 'PUT', { set_default: true, crm_type: _htgd_activeCrm });
    if (res.success) { showToast('✅ Đã đặt về mặc định'); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_setCustomQuota(userId) {
    const val = prompt('Nhập số lượng quota/ngày:');
    if (!val || isNaN(parseInt(val))) return;
    const res = await apiCall(`/api/telesale/active-members/${userId}`, 'PUT', { daily_quota: parseInt(val), crm_type: _htgd_activeCrm });
    if (res.success) { showToast('✅ Đã cập nhật quota'); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_setDefaultAll() {
    if (!confirm('Đặt TẤT CẢ NV về chế độ Mặc định (nhận đủ Source quota)?')) return;
    const res = await apiCall('/api/telesale/active-members/set-default-all', 'POST', { crm_type: _htgd_activeCrm });
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_removeMember(userId, name) {
    if (!confirm(`Bỏ "${name}" khỏi Telesale?`)) return;
    const res = await apiCall(`/api/telesale/active-members/${userId}?crm_type=${_htgd_activeCrm}`, 'DELETE');
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_syncQuota() {
    const quota = parseInt(document.getElementById('syncQuotaValue')?.value) || 250;
    const ids = _htgd_members.filter(m => m.is_active).map(m => m.user_id);
    if (ids.length === 0) return showToast('Không có NV active', 'error');
    const res = await apiCall('/api/telesale/active-members/sync-quota', 'POST', { user_ids: ids, daily_quota: quota, crm_type: _htgd_activeCrm });
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

// ========== INVALID NUMBERS TAB ==========
async function _htgd_renderInvalidTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';
    const isAll = _htgd_activeCrm === 'all';
    const crmParam = isAll ? '' : `?crm_type=${_htgd_activeCrm}`;
    const res = await apiCall(`/api/telesale/invalid-numbers${crmParam}`);
    const numbers = res.numbers || [];

    el.innerHTML = `
        <div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#fef2f2,#fff1f2);border:1.5px solid #fecaca;border-radius:14px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:32px;">🚫</span>
            <div>
                <div style="font-size:15px;font-weight:800;color:#991b1b;">Kho Số Không Tồn Tại (${numbers.length})</div>
                <div style="font-size:12px;color:#b91c1c;">Các số bị báo "không tồn tại" ≥ 2 lần. GĐ kiểm tra và khôi phục nếu cần.</div>
            </div>
        </div>
        ${numbers.length === 0 ? `<div class="ts-empty">
            <span class="ts-empty-icon">✅</span>
            <div class="ts-empty-title">Tuyệt vời! Chưa có số nào bị báo lỗi</div>
            <div class="ts-empty-desc">Khi NV báo số không tồn tại ≥ 2 lần, số sẽ tự động chuyển vào đây</div>
        </div>` : `
        <div style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <table class="ts-table">
                <thead><tr style="background:linear-gradient(135deg,#7f1d1d,#991b1b);">
                    <th style="text-align:left;width:40px;">#</th>
                    <th style="text-align:left;">SĐT</th>
                    <th style="text-align:left;">Tên KH</th>
                    <th style="text-align:left;">Công Ty</th>
                    <th style="text-align:left;">Nguồn</th>
                    <th style="text-align:center;">Lần Báo</th>
                    <th style="text-align:center;">Thao Tác</th>
                </tr></thead>
                <tbody>
                    ${numbers.map((n,i) => `<tr>
                        <td style="color:#9ca3af;font-weight:600;">${i+1}</td>
                        <td style="font-family:monospace;font-weight:700;color:#dc2626;">${n.phone}</td>
                        <td style="font-weight:600;">${n.customer_name || '—'}</td>
                        <td style="color:#6b7280;">${n.company_name || '—'}</td>
                        <td>${n.source_icon||''} ${n.source_name||'—'}</td>
                        <td style="text-align:center;"><span class="ts-badge" style="background:#fef2f2;color:#dc2626;">${n.invalid_count}x</span></td>
                        <td style="text-align:center;"><button class="ts-btn ts-btn-green ts-btn-xs" onclick="_htgd_restoreNumber(${n.id})">♻️ Khôi phục</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`}`;
}

async function _htgd_restoreNumber(id) {
    if (!confirm('Khôi phục số này về pool sẵn sàng?')) return;
    const res = await apiCall(`/api/telesale/invalid-numbers/${id}/restore`, 'POST');
    if (res.success) { showToast(res.message); await _htgd_renderInvalidTab(); }
    else showToast(res.error, 'error');
}

// ========== SETTINGS TAB ==========

async function _htgd_renderSettingsTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';

    const [srcRes, srcHopTac, srcBanHang, cStatsRes] = await Promise.all([
        apiCall(`/api/telesale/sources?crm_type=${_htgd_settingsCrm}`),
        apiCall('/api/telesale/sources?crm_type=nuoi_duong'),
        apiCall('/api/telesale/sources?crm_type=sinh_vien'),
        apiCall(`/api/telesale/data/stats?crm_type=${_htgd_settingsCrm}`)
    ]);
    const sources = srcRes.sources || [];
    const sourceCarrierStats = cStatsRes.sourceCarrierStats || {};
    const totalQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
    const hopTacTotal = (srcHopTac.sources || []).reduce((s, src) => s + (src.daily_quota || 0), 0);
    const banHangTotal = (srcBanHang.sources || []).reduce((s, src) => s + (src.daily_quota || 0), 0);
    const combinedTotal = hopTacTotal + banHangTotal;
    const hopTacPct = combinedTotal > 0 ? Math.round((hopTacTotal / combinedTotal) * 100) : 0;
    const banHangPct = combinedTotal > 0 ? 100 - hopTacPct : 0;
    const crmOptions = [
        { value: 'hoa_hong_crm', label: 'CRM Tự Tìm Kiếm', icon: '🔍', color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
        { value: 'nuoi_duong', label: 'CRM GĐ Hợp Tác', icon: '🤝', color: '#059669', bg: 'linear-gradient(135deg,#059669,#14b8a6)' },
        { value: 'sinh_vien', label: 'CRM GĐ Bán Hàng', icon: '📞', color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
    ];
    const activeCfg = crmOptions.find(o => o.value === _htgd_settingsCrm);

    const crmTabsHtml = crmOptions.map(ct => {
        const isActive = ct.value === _htgd_settingsCrm;
        return `<button class="htgd-settings-crm ${isActive ? 'active' : ''}"
            onclick="_htgd_switchSettingsCrm('${ct.value}')"
            style="padding:7px 16px;border:1.5px solid ${isActive ? ct.color : '#e2e8f0'};
            border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.25s ease;
            background:${isActive ? ct.bg : 'linear-gradient(135deg,#f8fafc,#ffffff)'};
            color:${isActive ? 'white' : '#475569'};
            box-shadow:${isActive ? '0 4px 14px ' + ct.color + '30' : '0 1px 3px rgba(0,0,0,0.04)'};
            display:inline-flex;align-items:center;gap:5px;">
            ${ct.icon} ${ct.label}
        </button>`;
    }).join('');

    el.innerHTML = `
        <div style="margin:16px 0 12px;">
            <h4 style="color:#122546;margin:0 0 8px;font-size:16px;font-weight:800;">⚙️ Cài Đặt Nguồn Gọi Điện</h4>
            <p style="font-size:12px;color:#6b7280;margin:0;">Quản lý các nguồn data gọi điện.</p>
        </div>
        <div style="margin-bottom:18px;padding:18px 22px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <div><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📊 Tổng Quota/NV/Ngày</div></div>
                <div style="font-size:36px;font-weight:900;background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${combinedTotal}</div>
            </div>
            <div style="display:flex;gap:16px;margin-bottom:12px;">
                <div style="flex:1;padding:10px 14px;background:rgba(5,150,105,0.15);border:1px solid rgba(5,150,105,0.3);border-radius:10px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:700;color:#6ee7b7;">🤝 Hợp Tác</span><span style="font-size:18px;font-weight:900;color:#34d399;">${hopTacTotal}</span></div></div>
                <div style="flex:1;padding:10px 14px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:10px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:700;color:#fcd34d;">📞 Bán Hàng</span><span style="font-size:18px;font-weight:900;color:#fbbf24;">${banHangTotal}</span></div></div>
            </div>
            <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;display:flex;"><div style="width:${hopTacPct}%;background:linear-gradient(90deg,#059669,#34d399);border-radius:6px 0 0 6px;"></div><div style="width:${banHangPct}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:0 6px 6px 0;"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">${crmTabsHtml}</div>

        <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <span style="font-size:12px;color:#6b7280;">Tổng quota <strong style="color:${activeCfg?.color || '#122546'}">${activeCfg?.label || ''}</strong>: <strong style="color:#122546;font-size:14px;">${totalQuota} SĐT/NV/ngày</strong></span>
            <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:10px;">
                <span style="font-size:11px;font-weight:700;color:#0369a1;">🔄 Đồng bộ quota:</span>
                <input type="number" id="htgdSyncQuotaVal" value="${sources.length > 0 ? sources[0].daily_quota : 15}" min="0" style="width:70px;padding:4px 8px;border:1.5px solid #93c5fd;border-radius:8px;text-align:center;font-weight:700;font-size:13px;">
                <button class="ts-btn ts-btn-blue ts-btn-xs" onclick="_htgd_syncSourceQuota()" style="white-space:nowrap;">Đồng bộ tất cả</button>
            </div>
        </div>
        <div style="border:1.5px solid #e5e7eb;border-radius:14px;overflow:auto;">
            <table class="ts-table" style="min-width:900px;"><thead><tr>
                <th style="text-align:left;">Icon</th><th style="text-align:left;">Tên Nguồn</th><th style="text-align:center;">Quota</th>
                <th style="text-align:center;color:#059669;">🟩Vtel</th><th style="text-align:center;color:#2563eb;">🟦Mobi</th><th style="text-align:center;color:#ca8a04;">🟨Vina</th>
                <th style="text-align:center;color:#16a34a;">🟩Vnmb</th><th style="text-align:center;color:#9333ea;">🟪Gmob</th><th style="text-align:center;color:#ea580c;">🟧iTel</th><th style="text-align:center;color:#b91c1c;">🟫Redd</th>
                <th style="text-align:center;">Chế Độ</th><th style="text-align:center;">Import</th><th style="text-align:center;">Thao Tác</th>
            </tr></thead><tbody>
                ${sources.map(s => {
                    const cs = sourceCarrierStats[s.id] || {};
                    const hasMapping = s.column_mapping && Object.values(s.column_mapping).some(v => v);
                    const mappingBadge = hasMapping ? '<span class="ts-badge" style="background:#dcfce7;color:#16a34a;cursor:pointer;" onclick="_htgd_configColumns('+s.id+')">✅</span>' : '<span class="ts-badge" style="background:#fef3c7;color:#92400e;cursor:pointer;" onclick="_htgd_configColumns('+s.id+')">⚠️</span>';
                    const mode = s.distribution_mode || 'priority';
                    const modeBadge = mode === 'even' ? '<span class="ts-badge" style="background:#dbeafe;color:#1e40af;cursor:pointer;font-size:10px;" onclick="_htgd_carrierPriorityModal('+s.id+')">⚖️ Đều</span>' : '<span class="ts-badge" style="background:#dcfce7;color:#059669;cursor:pointer;font-size:10px;" onclick="_htgd_carrierPriorityModal('+s.id+')">🎯 Ưu tiên</span>';
                    const cb = (v) => v ? '<span style="font-weight:700;font-size:11px;">'+v.toLocaleString()+'</span>' : '<span style="color:#d1d5db;">0</span>';
                    const safeName = (s.name||'').replace(/'/g,'');
                    return '<tr><td style="font-size:20px;">'+(s.icon||'📁')+'</td><td style="font-weight:700;color:#122546;white-space:nowrap;">'+s.name+'</td><td style="text-align:center;"><span class="ts-badge" style="background:#dbeafe;color:#1e40af;">'+s.daily_quota+'</span></td><td style="text-align:center;">'+cb(cs.Viettel)+'</td><td style="text-align:center;">'+cb(cs.Mobi)+'</td><td style="text-align:center;">'+cb(cs.Vina)+'</td><td style="text-align:center;">'+cb(cs.Vnmb)+'</td><td style="text-align:center;">'+cb(cs.Gmob)+'</td><td style="text-align:center;">'+cb(cs.iTel)+'</td><td style="text-align:center;">'+cb(cs.Reddi)+'</td><td style="text-align:center;">'+modeBadge+'</td><td style="text-align:center;">'+mappingBadge+'</td><td style="text-align:center;white-space:nowrap;"><button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_editSource('+s.id+')">✏️</button> <button class="ts-btn ts-btn-xs" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;" onclick="_htgd_deleteSource('+s.id+')">🗑️</button></td></tr>';
                }).join('')}
                ${sources.length === 0 ? '<tr><td colspan="13" class="ts-empty" style="padding:20px;">Chưa có nguồn nào</td></tr>' : ''}
            </tbody></table>
        </div>

        <div style="margin-top:16px;padding:16px;background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:12px;">➕ Thêm Nguồn Mới vào <span style="color:${activeCfg?.color || '#122546'}">${activeCfg?.icon || ''} ${activeCfg?.label || ''}</span></div>
            <div style="display:grid;grid-template-columns:60px 1fr 80px auto;gap:10px;align-items:end;">
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Icon</label>
                    <input type="text" id="htgdNewIcon" value="📁" class="ts-select" style="width:100%;text-align:center;font-size:18px;padding:6px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Tên Nguồn</label>
                    <input type="text" id="htgdNewName" placeholder="VD: NHÂN SỰ" class="ts-search" style="padding:8px 12px;">
                </div>
                <div>
                    <label style="font-size:10px;color:#6b7280;font-weight:600;">Quota</label>
                    <input type="number" id="htgdNewQuota" value="15" class="ts-select" style="width:100%;">
                </div>
                <button class="ts-btn ts-btn-green" onclick="_htgd_addSource()" style="height:38px;">➕ Thêm</button>
            </div>
        </div>
    `;
}

async function _htgd_switchSettingsCrm(crmType) {
    _htgd_settingsCrm = crmType;
    localStorage.setItem('htgd_settingsCrm', crmType);
    await _htgd_renderSettingsTab();
}

async function _htgd_saveConfig(key, value) {
    await apiCall(`/api/app-config/${key}`, 'PUT', { value: String(value) });
    showToast('✅ Đã lưu');
}

async function _htgd_addSource() {
    const name = document.getElementById('htgdNewName')?.value?.trim();
    if (!name) return showToast('Nhập tên nguồn', 'error');
    const data = await apiCall('/api/telesale/sources', 'POST', {
        name, icon: document.getElementById('htgdNewIcon').value,
        daily_quota: parseInt(document.getElementById('htgdNewQuota').value) || 15,
        crm_type: _htgd_settingsCrm
    });
    if (data.success) { showToast(data.message); await _htgd_renderSettingsTab(); }
    else showToast(data.error, 'error');
}

async function _htgd_editSource(id) {
    const srcRes = await apiCall(`/api/telesale/sources?crm_type=${_htgd_settingsCrm}`);
    const src = (srcRes.sources || []).find(s => s.id === id);
    if (!src) return;
    openModal('✏️ Sửa Nguồn: ' + src.name, `
        <div class="form-group"><label>Tên</label><input type="text" id="editHtgdName" class="form-control" value="${src.name}"></div>
        <div style="display:grid;grid-template-columns:80px 1fr;gap:12px;">
            <div class="form-group"><label>Icon</label><input type="text" id="editHtgdIcon" class="form-control" value="${src.icon || '📁'}" style="text-align:center;font-size:18px;"></div>
            <div class="form-group"><label>Quota/NV/Ngày</label><input type="number" id="editHtgdQuota" class="form-control" value="${src.daily_quota}"></div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="_htgd_submitEditSource(${id})">💾 Lưu</button>`);
}

async function _htgd_submitEditSource(id) {
    const data = await apiCall(`/api/telesale/sources/${id}`, 'PUT', {
        name: document.getElementById('editHtgdName').value,
        icon: document.getElementById('editHtgdIcon').value,
        daily_quota: parseInt(document.getElementById('editHtgdQuota').value) || 0
    });
    if (data.success) { showToast(data.message); closeModal(); await _htgd_renderSettingsTab(); }
    else showToast(data.error, 'error');
}

async function _htgd_deleteSource(id, name) {
    if (!confirm(`Xóa nguồn "${name}"?`)) return;
    const data = await apiCall(`/api/telesale/sources/${id}`, 'DELETE');
    if (data.success) { showToast(data.message); await _htgd_renderSettingsTab(); }
    else showToast(data.error, 'error');
}

// ========== SYNC QUOTA ==========
async function _htgd_syncSourceQuota() {
    const val = parseInt(document.getElementById('htgdSyncQuotaVal')?.value) || 15;
    const srcRes = await apiCall(`/api/telesale/sources?crm_type=${_htgd_settingsCrm}`);
    const sources = srcRes.sources || [];
    for (const s of sources) {
        await apiCall(`/api/telesale/sources/${s.id}`, 'PUT', { daily_quota: val });
    }
    showToast(`✅ Đã đồng bộ ${sources.length} nguồn = ${val} quota/NV/ngày`);
    await _htgd_renderSettingsTab();
}

// ========== CARRIER PRIORITY MODAL ==========
async function _htgd_carrierPriorityModal(sourceId) {
    const srcRes = await apiCall(`/api/telesale/sources?crm_type=${_htgd_settingsCrm}`);
    const src = (srcRes.sources || []).find(s => s.id === sourceId);
    if (!src) return;
    const allCarriers = ['Viettel','Mobi','Vina','Vnmb','Gmob','iTel','Reddi'];
    const currentPriority = src.carrier_priority || allCarriers;
    const currentMode = src.distribution_mode || 'priority';
    const body = `
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:700;margin-bottom:6px;display:block;">Chế độ phân chia:</label>
            <div style="display:flex;gap:8px;">
                <button id="cpModePriority" class="ts-btn ${currentMode==='priority'?'ts-btn-green':'ts-btn-ghost'}" onclick="document.getElementById('cpModePriority').classList.add('ts-btn-green');document.getElementById('cpModePriority').classList.remove('ts-btn-ghost');document.getElementById('cpModeEven').classList.remove('ts-btn-blue');document.getElementById('cpModeEven').classList.add('ts-btn-ghost');document.getElementById('cpModeVal').value='priority';">🎯 Ưu tiên</button>
                <button id="cpModeEven" class="ts-btn ${currentMode==='even'?'ts-btn-blue':'ts-btn-ghost'}" onclick="document.getElementById('cpModeEven').classList.add('ts-btn-blue');document.getElementById('cpModeEven').classList.remove('ts-btn-ghost');document.getElementById('cpModePriority').classList.remove('ts-btn-green');document.getElementById('cpModePriority').classList.add('ts-btn-ghost');document.getElementById('cpModeVal').value='even';">⚖️ Chia đều</button>
            </div>
            <input type="hidden" id="cpModeVal" value="${currentMode}">
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;margin-bottom:6px;display:block;">Thứ tự ưu tiên nhà mạng (kéo thả):</label>
            <div id="cpPriorityList" style="display:flex;flex-direction:column;gap:4px;">
                ${currentPriority.map((c, i) => {
                    const cm = _carrierMap[c] || {};
                    return `<div class="cp-item" draggable="true" data-carrier="${c}" style="padding:8px 12px;background:${cm.bg||'#f8fafc'};border:1.5px solid ${cm.color||'#e5e7eb'};border-radius:8px;cursor:grab;display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:${cm.color||'#334155'};">
                        <span style="color:#9ca3af;">☰</span> ${i+1}. ${cm.label||c}
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
    openModal('🎯 Cấu Hình Ưu Tiên Nhà Mạng: ' + src.name, body,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
         <button class="btn btn-success" onclick="_htgd_saveCarrierPriority(${sourceId})">💾 Lưu</button>`);
    // Setup drag-and-drop
    setTimeout(() => {
        const list = document.getElementById('cpPriorityList');
        if (!list) return;
        let dragEl = null;
        list.querySelectorAll('.cp-item').forEach(item => {
            item.addEventListener('dragstart', e => { dragEl = item; item.style.opacity = '0.4'; });
            item.addEventListener('dragend', e => { item.style.opacity = '1'; });
            item.addEventListener('dragover', e => { e.preventDefault(); });
            item.addEventListener('drop', e => {
                e.preventDefault();
                if (dragEl && dragEl !== item) {
                    const items = [...list.querySelectorAll('.cp-item')];
                    const fromIdx = items.indexOf(dragEl);
                    const toIdx = items.indexOf(item);
                    if (fromIdx < toIdx) item.after(dragEl);
                    else item.before(dragEl);
                }
            });
        });
    }, 200);
}

async function _htgd_saveCarrierPriority(sourceId) {
    const list = document.getElementById('cpPriorityList');
    const mode = document.getElementById('cpModeVal')?.value || 'priority';
    const priority = [...list.querySelectorAll('.cp-item')].map(el => el.dataset.carrier);
    const res = await apiCall(`/api/telesale/sources/${sourceId}`, 'PUT', {
        carrier_priority: priority,
        distribution_mode: mode
    });
    if (res.success) { showToast('✅ Đã lưu cấu hình nhà mạng'); closeModal(); await _htgd_renderSettingsTab(); }
    else showToast(res.error, 'error');
}

// ========== VIEW DETAIL ==========
async function _htgd_viewDetail(dataId) {
    const res = await apiCall(`/api/telesale/data/${dataId}`);
    if (!res.success) return showToast(res.error || 'Không tìm thấy data', 'error');
    const d = res.data;
    const assignments = res.assignments || [];
    const carriers = (d.carrier||'').split('|').filter(Boolean);
    const carrierHtml = carriers.map(c => {
        const cm = _carrierMap[c] || _carrierMap['invalid'];
        return `<span class="ts-badge" style="background:${cm.bg};color:${cm.color};font-size:11px;padding:2px 8px;">${cm.label}</span>`;
    }).join(' ') || '—';
    const statusMap = {
        available: { icon:'✅', label:'Sẵn sàng', bg:'#dcfce7', color:'#16a34a' },
        assigned: { icon:'📤', label:'Đã phân', bg:'#dbeafe', color:'#2563eb' },
        answered: { icon:'📞', label:'Đã gọi', bg:'#fef3c7', color:'#d97706' },
        cold: { icon:'🚫', label:'Không có nhu cầu', bg:'#eef2ff', color:'#6366f1' },
    };
    const sm = statusMap[d.status] || statusMap.available;
    const statusHtml = `<span class="ts-badge" style="background:${sm.bg};color:${sm.color};">${sm.icon} ${sm.label}</span>`;
    let assignHtml = '<div style="color:#9ca3af;font-size:12px;text-align:center;padding:12px;">Chưa có lịch sử phân bổ</div>';
    if (assignments.length > 0) {
        assignHtml = `<table class="ts-table" style="font-size:12px;"><thead><tr>
            <th>Ngày</th><th>NV</th><th>Trạng thái</th><th>Ghi chú</th>
        </tr></thead><tbody>
        ${assignments.map(a => `<tr>
            <td style="white-space:nowrap;">${a.assigned_date ? new Date(a.assigned_date).toLocaleDateString('vi-VN') : '—'}</td>
            <td style="font-weight:600;">${a.user_name || '—'}</td>
            <td>${a.call_status || '—'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${a.notes || '—'}</td>
        </tr>`).join('')}
        </tbody></table>`;
    }
    openModal('📋 Chi Tiết Data #' + d.id, `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
            <div style="background:#f0f9ff;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📱 SĐT</label><div style="font-size:18px;font-weight:800;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:1px;">${d.phone}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📡 Nhà Mạng</label><div style="margin-top:2px;">${carrierHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">👤 Tên KH</label><div style="font-weight:700;font-size:15px;color:#122546;">${d.customer_name || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">🏢 Công Ty</label><div style="font-weight:600;color:#374151;">${d.company_name || '—'}</div></div>
            <div style="background:#fffbeb;padding:12px;border-radius:10px;grid-column:1/-1;"><label style="font-size:10px;color:#92400e;font-weight:600;display:block;margin-bottom:4px;">📝 Nội Dung ĐB</label><div style="color:#374151;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${d.post_content || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📍 Địa Chỉ</label><div style="color:#374151;">${d.address || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📊 Trạng Thái</label><div style="margin-top:2px;">${statusHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">👨‍💼 NV Phân Cho</label><div style="font-weight:600;color:#374151;">${d.last_assigned_user_name || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📅 Ngày Phân</label><div style="color:#374151;">${d.last_assigned_date ? new Date(d.last_assigned_date).toLocaleDateString('vi-VN') : '—'}</div></div>
        </div>
        <div style="border-top:1.5px solid #e5e7eb;padding-top:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:10px;">📜 Lịch Sử Phân Bổ (${assignments.length})</div>
            <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;max-height:200px;overflow-y:auto;">${assignHtml}</div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
}

// ========== DEDUP ==========
async function _htgd_dedupCrm() {
    if (!confirm('Lọc trùng SĐT trong CRM ' + (_htgd_activeCrm === 'all' ? 'tất cả' : _htgd_activeCrm) + '? Sẽ giữ bản ghi cũ nhất.')) return;
    showToast('⏳ Đang lọc trùng...');
    const res = await apiCall('/api/telesale/data/dedup', 'POST', { crm_type: _htgd_activeCrm });
    if (res.success) {
        showToast('✅ Đã xóa ' + (res.removed || 0) + ' bản ghi trùng');
        await _htgd_loadSources();
    } else showToast(res.error || 'Lỗi', 'error');
}

// ========== CONFIG COLUMNS ==========
async function _htgd_configColumns(sourceId) {
    const srcRes = await apiCall(`/api/telesale/sources?crm_type=${_htgd_settingsCrm}`);
    const src = (srcRes.sources || []).find(s => s.id === sourceId);
    if (!src) return;
    const mapping = src.column_mapping || {};
    const fields = [
        { key: 'company_name', label: '🏢 Tên Công Ty' },
        { key: 'group_name', label: '👥 Tên Nhóm' },
        { key: 'post_link', label: '🔗 Link Đăng Bài' },
        { key: 'post_content', label: '📝 Nội Dung ĐB' },
        { key: 'customer_name', label: '👤 Tên KH' },
        { key: 'phone', label: '📱 SĐT (bắt buộc)', required: true },
        { key: 'address', label: '📍 Địa Chỉ', hasAuto: true },
    ];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const body = `<div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Chọn cột Excel/CSV tương ứng với mỗi trường dữ liệu:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
    ${fields.map(f => {
        const curVal = mapping[f.key] || '';
        let opts = f.required ? '' : '<option value="">— Bỏ qua —</option>';
        if (f.hasAuto) opts += '<option value="AUTO" ' + (curVal === 'AUTO' ? 'selected' : '') + '>🔄 AUTO (lấy từ Nội Dung ĐB)</option>';
        letters.forEach((l, i) => {
            opts += '<option value="' + l + '" ' + (curVal === l ? 'selected' : '') + '>' + l + ' (Cột ' + (i+1) + ')</option>';
        });
        const borderColor = f.required ? '#dc2626' : '#e5e7eb';
        return '<div style="margin-bottom:4px;"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">' + f.label + (f.required ? ' <span style=\\"color:#dc2626;\\">*</span>' : '') + '</label><select id="colMap_' + f.key + '" class="form-control" style="border:1.5px solid ' + borderColor + ';border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;">' + opts + '</select></div>';
    }).join('')}
    </div>`;
    openModal('📝 Cấu Hình Cột Import: ' + src.name, body,
        `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
         <button class="btn btn-success" onclick="_htgd_saveColumns(${sourceId})">💾 Lưu</button>`);
}

async function _htgd_saveColumns(sourceId) {
    const mapping = {};
    ['company_name','group_name','post_link','post_content','customer_name','phone','address'].forEach(k => {
        const v = document.getElementById('colMap_'+k)?.value?.trim();
        if (v) mapping[k] = v;
    });
    if (!mapping.phone) return showToast('SĐT là bắt buộc', 'error');
    const res = await apiCall(`/api/telesale/sources/${sourceId}`, 'PUT', { column_mapping: mapping });
    if (res.success) { showToast('✅ Đã lưu cấu hình cột'); closeModal(); await _htgd_renderSettingsTab(); }
    else showToast(res.error, 'error');
}
