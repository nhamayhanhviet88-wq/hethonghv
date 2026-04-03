// ========== QUẢN LÝ AFFILIATE HV ==========

const AFF_ROLE_LABELS = {
    hoa_hong: 'Hoa Hồng', ctv: 'CTV',
    nuoi_duong: 'Nuôi Dưỡng', sinh_vien: 'Sinh Viên'
};

let _affData = { departments: [], employees: [], affiliates: [] };
let _affVisibleDepts = JSON.parse(localStorage.getItem('aff_visible_depts') || '[]');
let _affHiddenChildDepts = JSON.parse(localStorage.getItem('aff_hidden_child_depts') || '[]');
let _affSelectedDeptId = null;
let _affAssignEmpId = null;
let _affSelectedAffId = null;
let _affExpandedDepts = {};
let _affExpandedEmps = {};
let _affDateFrom = '';
let _affDateTo = '';
let _affActivePreset = '';
let _affFilterDeptId = '';
let _affFilterEmpId = '';

function renderQuanLyAffiliatePage(container) {
    container.innerHTML = `
        <style>
            .aff-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:12px; }
            .aff-toolbar h2 { color:#122546; font-size:20px; margin:0; }
            .aff-toolbar .actions { display:flex; gap:10px; }
            .aff-filter-bar { display:flex; align-items:flex-end; gap:10px; margin-bottom:20px; flex-wrap:wrap; padding:14px 18px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; }
            .aff-filter-bar label { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; }
            .aff-preset-btn { padding:6px 14px; border-radius:8px; border:1px solid #d1d5db; background:white; font-size:12px; font-weight:600; cursor:pointer; transition:all .2s; color:#374151; }
            .aff-preset-btn:hover { background:#e0e7ff; border-color:#818cf8; color:#4338ca; }
            .aff-preset-btn.active { background:#4338ca; color:white; border-color:#4338ca; }
            .aff-date-input { padding:7px 12px; border-radius:10px; border:1px solid #d1d5db; font-size:12px; background:white; font-weight:600; color:#1e3a5f; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:border-color .2s,box-shadow .2s; }
            .aff-date-input:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
            .aff-filter-label { font-size:10px; color:#6b7280; font-weight:600; margin-bottom:3px; text-transform:uppercase; letter-spacing:.3px; }
            .aff-filter-sep { width:1px; height:32px; background:#d1d5db; margin:0 4px; align-self:flex-end; margin-bottom:4px; }
            .stats-row { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
            .stat-card { background:white; border-radius:12px; padding:20px; flex:1; min-width:180px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
            .stat-card .label { font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase; }
            .stat-card .value { font-size:26px; font-weight:700; color:#122546; margin-top:4px; }
            .stat-card .sub { font-size:10px; color:#9ca3af; margin-top:2px; }
            .tree-container { background:white; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden; }
            .dept-row { padding:14px 20px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background .15s; display:flex; align-items:center; justify-content:space-between; }
            .dept-row:hover { background:#f8fafc; }
            .dept-row .dept-info { display:flex; align-items:center; gap:10px; }
            .dept-row .dept-name { font-weight:700; color:#122546; font-size:14px; }
            .dept-row .dept-stats { display:flex; gap:16px; font-size:11px; color:#6b7280; }
            .dept-row .badge { background:#e0e7ff; color:#4338ca; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; }
            .dept-row.root { background:#122546; }
            .dept-row.root .dept-name { color:#fad24c; }
            .dept-row.root .dept-stats { color:rgba(255,255,255,.6); }
            .dept-row.root .badge { background:rgba(250,210,76,.2); color:#fad24c; }
            .dept-row.root:hover { background:#1a3563; }
            .child-dept { padding-left:24px; }
            .child-dept .dept-row { background:#fafbfc; }
            .child-dept .dept-row:hover { background:#f0f4ff; }
            .emp-row { padding:10px 20px 10px 56px; border-bottom:1px solid #f3f4f6; display:flex; align-items:center; justify-content:space-between; transition:background .15s; cursor:pointer; }
            .emp-row:hover { background:#f8fafc; }
            .emp-row .emp-info { display:flex; align-items:center; gap:10px; }
            .emp-row .emp-name { font-weight:600; color:#374151; font-size:13px; }
            .emp-row .emp-role { font-size:11px; color:#6b7280; }
            .emp-row .emp-stats { display:flex; gap:14px; font-size:11px; color:#6b7280; }
            .aff-row { padding:8px 20px 8px 80px; border-bottom:1px solid #f9fafb; display:flex; align-items:center; justify-content:space-between; background:#fefce8; transition:background .15s; }
            .aff-row:hover { background:#fef9c3; }
            .aff-row .aff-info { display:flex; align-items:center; gap:8px; }
            .aff-row .aff-name { font-size:13px; color:#92400e; font-weight:500; }
            .aff-row .aff-role { font-size:10px; padding:1px 8px; border-radius:10px; font-weight:600; }
            .aff-row .aff-role.hoa_hong { background:#fce7f3; color:#be185d; }
            .aff-row .aff-role.ctv { background:#dbeafe; color:#1d4ed8; }
            .aff-row .aff-role.nuoi_duong { background:#d1fae5; color:#065f46; }
            .aff-row .aff-role.sinh_vien { background:#ede9fe; color:#5b21b6; }
            .aff-row .aff-stats { display:flex; gap:14px; font-size:11px; color:#6b7280; }
            .btn-aff-assign { background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:4px 12px; border-radius:8px; font-size:11px; cursor:pointer; font-weight:600; transition:all .2s; }
            .btn-aff-assign:hover { background:#d1fae5; }
            .btn-aff-unassign { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:3px 10px; border-radius:8px; font-size:11px; cursor:pointer; transition:all .2s; }
            .btn-aff-unassign:hover { background:#fee2e2; }
            .no-affiliate { padding:6px 20px 6px 80px; font-size:12px; color:#9ca3af; font-style:italic; }
            .expand-icon { font-size:12px; transition:transform .2s; display:inline-block; width:16px; }
            .expand-icon.open { transform:rotate(90deg); }
        </style>
        <div class="aff-toolbar">
            <h2>🤝 Chỉ Số Affiliate HV</h2>
            <div class="actions">
                <button class="btn btn-secondary" onclick="affLoadData()">🔄 Tải lại</button>
                <button class="btn btn-success" onclick="affOpenAddDeptModal()">➕ Thêm Đơn Vị</button>
            </div>
        </div>
        <div class="aff-filter-bar">
            <div>
                <div class="aff-filter-label">📅 Khoảng thời gian</div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="aff-preset-btn" onclick="affSetPreset('1m',this)">1 Tháng</button>
                    <button class="aff-preset-btn" onclick="affSetPreset('2m',this)">2 Tháng</button>
                    <button class="aff-preset-btn" onclick="affSetPreset('3m',this)">3 Tháng</button>
                    <button class="aff-preset-btn" onclick="affSetPreset('6m',this)">6 Tháng</button>
                    <button class="aff-preset-btn" onclick="affSetPreset('1y',this)">1 Năm</button>
                    <button class="aff-preset-btn" onclick="affSetPreset('all',this)">Tất cả</button>
                </div>
            </div>
            <div class="aff-filter-sep"></div>
            <div>
                <div class="aff-filter-label">📅 Chọn tháng</div>
                <input type="month" class="aff-date-input" id="affMonthPicker" onchange="affApplyMonth()">
            </div>
            <div class="aff-filter-sep"></div>
            <div>
                <div class="aff-filter-label">Từ ngày</div>
                <input type="date" class="aff-date-input" id="affDateFrom" onchange="affApplyCustomDate()">
            </div>
            <div style="display:flex;align-items:center;padding-bottom:4px;">
                <span style="color:#3b82f6;font-size:16px;font-weight:700;">→</span>
            </div>
            <div>
                <div class="aff-filter-label">Đến ngày</div>
                <input type="date" class="aff-date-input" id="affDateTo" onchange="affApplyCustomDate()">
            </div>
            <div class="aff-filter-sep"></div>
            <div>
                <div class="aff-filter-label">🏢 Phòng ban</div>
                <select class="aff-date-input" id="affFilterDept" onchange="affOnFilterDeptChange()" style="min-width:140px;">
                    <option value="">Tất cả phòng ban</option>
                </select>
            </div>
            <div>
                <div class="aff-filter-label">👤 Nhân viên</div>
                <select class="aff-date-input" id="affFilterEmp" onchange="affOnFilterEmpChange()" style="min-width:140px;">
                    <option value="">Tất cả nhân viên</option>
                </select>
            </div>
        </div>
        <div class="stats-row" id="affStatsRow"></div>
        <div class="tree-container" id="affTreeContainer">
            <div style="padding:40px;text-align:center;color:#6b7280;">⏳ Đang tải dữ liệu...</div>
        </div>
    `;
    // Reset expand states so default view is applied fresh
    _affExpandedDepts = {};
    _affExpandedEmps = {};
    // Auto-select current month
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    _affDateFrom = `${curYear}-${pad(curMonth)}-01`;
    _affDateTo = `${curYear}-${pad(curMonth)}-${pad(new Date(curYear, curMonth, 0).getDate())}`;
    _affActivePreset = '';
    setTimeout(() => {
        const mp = document.getElementById('affMonthPicker');
        if (mp) mp.value = `${curYear}-${pad(curMonth)}`;
        const fromEl = document.getElementById('affDateFrom');
        const toEl = document.getElementById('affDateTo');
        if (fromEl) fromEl.value = _affDateFrom;
        if (toEl) toEl.value = _affDateTo;
    }, 0);
    affLoadData();
}

function affFormatMoney(n) {
    if (!n) return '0đ';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'tr';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
    return n.toLocaleString('vi-VN') + 'đ';
}
function affFormatDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }

function affSetPreset(preset, btn) {
    _affActivePreset = preset;
    document.querySelectorAll('.aff-preset-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const now = new Date();
    let from = '';
    if (preset === '1m') { from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); }
    else if (preset === '2m') { from = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()); }
    else if (preset === '3m') { from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); }
    else if (preset === '6m') { from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); }
    else if (preset === '1y') { from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); }
    else { _affDateFrom = ''; _affDateTo = ''; }  // 'all'

    if (from) {
        const pad = n => String(n).padStart(2, '0');
        _affDateFrom = `${from.getFullYear()}-${pad(from.getMonth()+1)}-${pad(from.getDate())}`;
        _affDateTo = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    }

    const fromEl = document.getElementById('affDateFrom');
    const toEl = document.getElementById('affDateTo');
    if (fromEl) fromEl.value = _affDateFrom;
    if (toEl) toEl.value = _affDateTo;
    affLoadData();
}

function affApplyMonth() {
    const val = document.getElementById('affMonthPicker')?.value; // "2026-03"
    if (!val) return;
    const [year, month] = val.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // last day of month
    const pad = n => String(n).padStart(2, '0');
    _affDateFrom = `${firstDay.getFullYear()}-${pad(firstDay.getMonth()+1)}-${pad(firstDay.getDate())}`;
    _affDateTo = `${lastDay.getFullYear()}-${pad(lastDay.getMonth()+1)}-${pad(lastDay.getDate())}`;

    _affActivePreset = '';
    document.querySelectorAll('.aff-preset-btn').forEach(b => b.classList.remove('active'));
    const fromEl = document.getElementById('affDateFrom');
    const toEl = document.getElementById('affDateTo');
    if (fromEl) fromEl.value = _affDateFrom;
    if (toEl) toEl.value = _affDateTo;
    affLoadData();
}

function affApplyCustomDate() {
    _affDateFrom = document.getElementById('affDateFrom')?.value || '';
    _affDateTo = document.getElementById('affDateTo')?.value || '';
    _affActivePreset = '';
    document.querySelectorAll('.aff-preset-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('affMonthPicker').value = '';
    affLoadData();
}

async function affLoadData() {
    let url = '/api/affiliate/org-tree';
    const params = [];
    if (_affDateFrom) params.push(`from=${_affDateFrom}`);
    if (_affDateTo) params.push(`to=${_affDateTo}`);
    if (params.length) url += '?' + params.join('&');
    _affData = await apiCall(url);
    affPopulateFilterDropdowns();
    affRenderStats();
    affRenderTree();
}

function affPopulateFilterDropdowns() {
    const deptSel = document.getElementById('affFilterDept');
    const empSel = document.getElementById('affFilterEmp');
    if (!deptSel || !empSel) return;
    const { departments, employees, affiliates } = _affData;
    // Show visible depts but exclude root-level system depts (no parent_id)
    const visibleDepts = departments.filter(d => {
        if (!d.parent_id) return false; // skip root depts like "HỆ THỐNG VĂN PHÒNG HV"
        if (_affHiddenChildDepts.includes(d.id)) return false;
        if (_affVisibleDepts.includes(d.id)) return true;
        let parent = d.parent_id;
        while (parent) {
            if (_affVisibleDepts.includes(parent)) return true;
            const p = departments.find(x => x.id === parent);
            parent = p ? p.parent_id : null;
        }
        return false;
    });
    let deptHTML = '<option value="">Tất cả phòng ban</option>';
    visibleDepts.forEach(d => deptHTML += `<option value="${d.id}">${d.name}</option>`);
    deptSel.innerHTML = deptHTML;
    deptSel.value = _affFilterDeptId;
    // Emp dropdown
    affPopulateEmpFilter();
}

function affPopulateEmpFilter() {
    const empSel = document.getElementById('affFilterEmp');
    if (!empSel) return;
    const { departments, employees } = _affData;
    // Get all visible dept IDs
    const visibleDeptIds = new Set();
    departments.forEach(d => {
        let isVisible = _affVisibleDepts.includes(d.id);
        if (!isVisible) {
            let parent = d.parent_id;
            while (parent) {
                if (_affVisibleDepts.includes(parent)) { isVisible = true; break; }
                const p = departments.find(x => x.id === parent);
                parent = p ? p.parent_id : null;
            }
        }
        if (isVisible) visibleDeptIds.add(d.id);
    });
    let emps = employees.filter(e => visibleDeptIds.has(e.department_id));
    if (_affFilterDeptId) emps = emps.filter(e => e.department_id === Number(_affFilterDeptId));
    let empHTML = '<option value="">Tất cả nhân viên</option>';
    emps.forEach(e => empHTML += `<option value="${e.id}">${e.full_name}</option>`);
    empSel.innerHTML = empHTML;
    empSel.value = _affFilterEmpId;
}

function affOnFilterDeptChange() {
    _affFilterDeptId = document.getElementById('affFilterDept')?.value || '';
    _affFilterEmpId = '';
    affPopulateEmpFilter();
    affRenderStats();
    affRenderTree();
}

function affOnFilterEmpChange() {
    _affFilterEmpId = document.getElementById('affFilterEmp')?.value || '';
    affRenderStats();
    affRenderTree();
}

function affGetFilteredAffiliates() {
    let affs = _affData.affiliates || [];
    if (_affFilterDeptId) {
        // Get all employee IDs in this dept and its children recursively
        const { departments, employees } = _affData;
        const childrenOf = pid => departments.filter(d => d.parent_id === pid);
        function getAllDeptEmpIds(deptId) {
            let ids = employees.filter(e => e.department_id === deptId).map(e => e.id);
            childrenOf(deptId).forEach(child => ids.push(...getAllDeptEmpIds(child.id)));
            return ids;
        }
        const empIds = getAllDeptEmpIds(Number(_affFilterDeptId));
        affs = affs.filter(a => empIds.includes(a.managed_by_user_id));
    }
    if (_affFilterEmpId) affs = affs.filter(a => a.managed_by_user_id === Number(_affFilterEmpId));
    return affs;
}

function affRenderStats() {
    const affiliates = affGetFilteredAffiliates();
    const activeAffs = affiliates.filter(a => a.status !== 'locked');
    const totalAffs = activeAffs.length;
    const lockedCount = affiliates.filter(a => a.status === 'locked').length;
    const totalCustomers = affiliates.reduce((s, a) => s + (a.total_customers || 0), 0);
    const totalOrders = affiliates.reduce((s, a) => s + (a.total_orders || 0), 0);
    const totalRevenue = affiliates.reduce((s, a) => s + (a.total_revenue || 0), 0);

    // CRM breakdown
    const CRM_TYPES = [
        { key: 'nhu_cau', label: 'Nhu Cầu', color: '#f59e0b', bg: '#fffbeb' },
        { key: 'ctv', label: 'CTV', color: '#1d4ed8', bg: '#dbeafe' },
        { key: 'hoa_hong_crm', label: 'Hoa Hồng', color: '#be185d', bg: '#fce7f3' },
        { key: 'nuoi_duong', label: 'Nuôi Dưỡng', color: '#065f46', bg: '#d1fae5' },
        { key: 'sinh_vien', label: 'Sinh Viên', color: '#5b21b6', bg: '#ede9fe' },
        { key: 'koc_tiktok', label: 'KOC Tiktok', color: '#dc2626', bg: '#fef2f2' },
    ];
    const crmCounts = {};
    CRM_TYPES.forEach(c => crmCounts[c.key] = 0);
    activeAffs.forEach(a => { if (a.source_crm_type && crmCounts[a.source_crm_type] !== undefined) crmCounts[a.source_crm_type]++; });

    const el = document.getElementById('affStatsRow');
    if (!el) return;
    el.innerHTML = `
        <div class="stat-card"><div class="label">Tổng Affiliate</div><div class="value">${totalAffs}</div><div class="sub">HH / CTV / ND / SV${lockedCount ? ' • 🔒' + lockedCount + ' khóa' : ''}</div></div>
        <div class="stat-card"><div class="label">Khách Giới Thiệu</div><div class="value">${totalCustomers}</div><div class="sub">Từ affiliate</div></div>
        <div class="stat-card"><div class="label">Đơn Hàng</div><div class="value">${totalOrders}</div><div class="sub">Từ khách affiliate</div></div>
        <div class="stat-card"><div class="label">Doanh Thu</div><div class="value">${affFormatMoney(totalRevenue)}</div><div class="sub">Tổng doanh thu</div></div>
    `;
    // CRM breakdown row - remove old first
    const oldBreakdown = document.getElementById('affCrmBreakdown');
    if (oldBreakdown) oldBreakdown.remove();
    el.insertAdjacentHTML('afterend', `
        <div id="affCrmBreakdown" style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            ${CRM_TYPES.map(c => `
                <div style="flex:1;min-width:120px;background:${c.bg};border-radius:10px;padding:12px 16px;border:1px solid ${c.color}22;text-align:center;">
                    <div style="font-size:10px;font-weight:700;color:${c.color};text-transform:uppercase;letter-spacing:.5px;">CRM ${c.label}</div>
                    <div style="font-size:22px;font-weight:800;color:${c.color};margin-top:2px;">${crmCounts[c.key]}</div>
                </div>
            `).join('')}
        </div>
    `);
}

function affRenderTree() {
    const { departments, employees, affiliates } = _affData;
    const container = document.getElementById('affTreeContainer');
    if (!container) return;

    if (_affVisibleDepts.length === 0) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#6b7280;">
            <div style="font-size:40px;margin-bottom:12px;">🏢</div>
            <div style="font-size:14px;margin-bottom:16px;">Chưa có đơn vị nào. Thêm đơn vị từ Cơ Cấu Tổ Chức.</div>
            <button class="btn btn-success" onclick="affOpenAddDeptModal()">➕ Thêm Đơn Vị</button>
        </div>`;
        return;
    }

    // Helper: generate CRM mini-badges for a list of affiliates
    const CRM_BADGE_MAP = {
        nhu_cau: { label:'NC', color:'#f59e0b', bg:'#fffbeb' },
        ctv: { label:'CTV', color:'#1d4ed8', bg:'#dbeafe' },
        hoa_hong_crm: { label:'HH', color:'#be185d', bg:'#fce7f3' },
        nuoi_duong: { label:'ND', color:'#065f46', bg:'#d1fae5' },
        sinh_vien: { label:'SV', color:'#5b21b6', bg:'#ede9fe' },
        koc_tiktok: { label:'KOC', color:'#dc2626', bg:'#fef2f2' },
    };
    function crmBadges(affList) {
        const counts = {};
        affList.forEach(a => { if (a.source_crm_type) counts[a.source_crm_type] = (counts[a.source_crm_type] || 0) + 1; });
        return Object.entries(counts).map(([k, v]) => {
            const m = CRM_BADGE_MAP[k];
            if (!m) return '';
            return `<span style="background:${m.bg};color:${m.color};padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;">${m.label}:${v}</span>`;
        }).join(' ');
    }

    let html = '';
    const empsOf = deptId => employees.filter(e => e.department_id === deptId);
    const affsOf = empId => affiliates.filter(a => a.managed_by_user_id === empId);
    const childrenOf = pid => departments.filter(d => d.parent_id === pid && !_affHiddenChildDepts.includes(d.id));

    // Recursively get all affiliates under a dept (its employees + child dept employees)
    function getAllDeptAffs(deptId) {
        const directEmps = empsOf(deptId);
        let result = [];
        directEmps.forEach(emp => result.push(...affsOf(emp.id)));
        childrenOf(deptId).forEach(child => result.push(...getAllDeptAffs(child.id)));
        return result;
    }

    function renderDeptBlock(dept, isRoot) {
        const children = childrenOf(dept.id);
        const allEmps = empsOf(dept.id);
        const deptAffs = getAllDeptAffs(dept.id);
        const deptRevenue = deptAffs.reduce((s, a) => s + (a.total_revenue || 0), 0);
        if (_affExpandedDepts[dept.id] === undefined) _affExpandedDepts[dept.id] = isRoot;
        const isExpanded = !!_affExpandedDepts[dept.id];

        // Count all employees recursively (including child depts)
        function getAllDeptEmpCount(deptId) {
            let count = empsOf(deptId).length;
            childrenOf(deptId).forEach(child => count += getAllDeptEmpCount(child.id));
            return count;
        }
        const totalEmpCount = getAllDeptEmpCount(dept.id);

        // Determine icon: root=🏢, TEAM (parent has parent)=◆, PHÒNG=📁
        const parentDept = dept.parent_id ? departments.find(d => d.id === dept.parent_id) : null;
        const isTeam = parentDept && parentDept.parent_id;
        const deptIcon = isRoot ? '🏢' : (isTeam ? '<span style="color:#dc2626;">◆</span>' : '📁');

        html += `
        <div class="dept-row ${isRoot ? 'root' : ''}" onclick="affToggleDept(${dept.id})">
            <div class="dept-info">
                <span class="expand-icon ${isExpanded ? 'open' : ''}">▶</span>
                <span class="dept-name">${deptIcon} ${dept.name}</span>
                <span class="badge">${deptAffs.length} affiliate</span>
            </div>
            <div class="dept-stats">
                <span style="background:#dbeafe;color:#1e40af;padding:3px 12px;border-radius:10px;font-size:13px;font-weight:800;">👥 ${totalEmpCount} NV</span>
                <span style="background:#fef3c7;color:#92400e;padding:3px 12px;border-radius:10px;font-size:13px;font-weight:800;">💰 ${affFormatMoney(deptRevenue)}</span>
                ${_affVisibleDepts.includes(dept.id) ? `<button class="btn-aff-unassign" onclick="event.stopPropagation();affRemoveDept(${dept.id})" style="display:inline-block;margin-left:8px;font-size:11px;padding:3px 10px;" title="Xóa đơn vị">🗑️ Xóa</button>` : (!isRoot ? `<button class="btn-aff-unassign" onclick="event.stopPropagation();affHideChildDept(${dept.id})" style="display:inline-block;margin-left:8px;font-size:11px;padding:3px 10px;" title="Ẩn phòng ban">🗑️ Xóa</button>` : '')}
            </div>
        </div>`;

        if (isExpanded) {
            // Render head user FIRST (directly under department)
            const headId = dept.head_user_id;
            const headEmp = headId ? (allEmps.find(e => e.id === headId) || employees.find(e => e.id === headId)) : null;
            if (headEmp) {
                const headAffs = affsOf(headEmp.id);
                const headRevenue = headAffs.reduce((s, a) => s + (a.total_revenue || 0), 0);
                const isHeadExpanded = _affExpandedEmps[headEmp.id] === true;
                const headIcon = !dept.parent_id ? '👑' : '⭐';
                const ROLE_LABEL = { giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', part_time: 'Part Time' };

                html += `
                <div class="emp-row" onclick="affToggleEmp(${headEmp.id})" style="background:#fffbeb;border-left:3px solid #f59e0b;">
                    <div class="emp-info">
                        <span class="expand-icon ${isHeadExpanded ? 'open' : ''}">▶</span>
                        <span class="emp-name" style="color:#92400e;font-weight:700;">${headIcon} ${headEmp.full_name}</span>
                        <span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">${ROLE_LABEL[headEmp.role] || headEmp.role}</span>
                        <span style="background:#e0e7ff;color:#4338ca;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;">${headAffs.length} affiliate</span>

                    </div>
                    <div class="emp-stats">
                        <span>💰 ${affFormatMoney(headRevenue)}</span>

                    </div>
                </div>`;

                if (isHeadExpanded) {
                    if (headAffs.length === 0) {
                        html += `<div class="no-affiliate">— Chưa có affiliate —</div>`;
                    } else {
                         headAffs.forEach(aff => {
                            const isLocked = aff.status === 'locked';
                            html += `
                            <div class="aff-row" ${isLocked ? 'style="opacity:0.6;"' : ''}>
                                <div class="aff-info">
                                    <span class="aff-name" style="cursor:pointer;${isLocked ? 'text-decoration:line-through;color:#9ca3af;' : 'text-decoration:underline;'}" onclick="event.stopPropagation();affShowDetail(${aff.id})">${aff.full_name}</span>
                                    <span style="font-size:11px;color:#9ca3af;">${aff.phone || ''}</span>
                                    ${isLocked ? '<span style="background:#fef2f2;color:#dc2626;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">🔒 Khóa</span>' : ''}
                                    ${aff.source_customer_name ? `<span style="font-size:10px;color:#6b7280;background:#f3f4f6;padding:1px 6px;border-radius:6px;">📋 ${aff.source_customer_name}</span>` : ''}
                                </div>
                                <div class="aff-stats">
                                    <span>👥 ${aff.total_customers} KH</span>
                                    <span>📦 ${aff.total_orders} đơn</span>
                                    <span>💰 ${affFormatMoney(aff.total_revenue)}</span>
                                    <button class="btn-aff-unassign" onclick="affUnassign(${aff.id})" title="Bỏ gán" style="display:none;">✕</button>
                                </div>
                            </div>`;
                        });
                    }
                }
            }

            // Render child departments
            if (children.length > 0) {
                html += '<div class="child-dept">';
                children.forEach(c => renderDeptBlock(c, false));
                html += '</div>';
            }
            // Render remaining employees (exclude head)
            allEmps.forEach(emp => {
                if (headEmp && emp.id === headEmp.id) return; // skip head
                const empAffs = affsOf(emp.id);
                const empRevenue = empAffs.reduce((s, a) => s + (a.total_revenue || 0), 0);
                const isEmpExpanded = _affExpandedEmps[emp.id] === true;
                const ROLE_LABEL2 = { giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', part_time: 'Part Time' };

                html += `
                <div class="emp-row" onclick="affToggleEmp(${emp.id})">
                    <div class="emp-info">
                        <span class="expand-icon ${isEmpExpanded ? 'open' : ''}">▶</span>
                        <span class="emp-name">👤 ${emp.full_name}</span>
                        <span style="background:#f3f4f6;color:#6b7280;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;">${ROLE_LABEL2[emp.role] || emp.role}</span>
                        <span style="background:#e0e7ff;color:#4338ca;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;">${empAffs.length} affiliate</span>

                    </div>
                    <div class="emp-stats">
                        <span>💰 ${affFormatMoney(empRevenue)}</span>

                    </div>
                </div>`;

                if (isEmpExpanded) {
                    if (empAffs.length === 0) {
                        html += `<div class="no-affiliate">— Chưa có affiliate —</div>`;
                    } else {
                        empAffs.forEach(aff => {
                            const isLocked = aff.status === 'locked';
                            html += `
                            <div class="aff-row" ${isLocked ? 'style="opacity:0.6;"' : ''}>
                                <div class="aff-info">
                                    <span class="aff-name" style="cursor:pointer;${isLocked ? 'text-decoration:line-through;color:#9ca3af;' : 'text-decoration:underline;'}" onclick="event.stopPropagation();affShowDetail(${aff.id})">${aff.full_name}</span>
                                    <span style="font-size:11px;color:#9ca3af;">${aff.phone || ''}</span>
                                    ${isLocked ? '<span style="background:#fef2f2;color:#dc2626;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;">🔒 Khóa</span>' : ''}
                                    ${aff.source_customer_name ? `<span style="font-size:10px;color:#6b7280;background:#f3f4f6;padding:1px 6px;border-radius:6px;">📋 ${aff.source_customer_name}</span>` : ''}
                                </div>
                                <div class="aff-stats">
                                    <span>👥 ${aff.total_customers} KH</span>
                                    <span>📦 ${aff.total_orders} đơn</span>
                                    <span>💰 ${affFormatMoney(aff.total_revenue)}</span>
                                    <button class="btn-aff-unassign" onclick="affUnassign(${aff.id})" title="Bỏ gán" style="display:none;">✕</button>
                                </div>
                            </div>`;
                        });
                    }
                }
            });
        }
    }

    // Which depts to render
    const allVisibleDepts = departments.filter(d => {
        // Exclude hidden child depts
        if (_affHiddenChildDepts.includes(d.id)) return false;
        if (_affVisibleDepts.includes(d.id)) return true;
        let parent = d.parent_id;
        while (parent) {
            if (_affVisibleDepts.includes(parent)) return true;
            const p = departments.find(x => x.id === parent);
            parent = p ? p.parent_id : null;
        }
        return false;
    });
    const rootDepts = allVisibleDepts.filter(d => !d.parent_id || !allVisibleDepts.find(x => x.id === d.parent_id));
    // Auto-expand top-level visible depts on first load
    rootDepts.forEach(d => { if (_affExpandedDepts[d.id] === undefined) _affExpandedDepts[d.id] = true; });
    rootDepts.forEach(d => renderDeptBlock(d, !d.parent_id));

    container.innerHTML = html || `<div style="padding:30px;text-align:center;color:#6b7280;">Không có dữ liệu</div>`;
}

function affToggleDept(id) { _affExpandedDepts[id] = !_affExpandedDepts[id]; affRenderTree(); }
function affToggleEmp(id) { _affExpandedEmps[id] = !_affExpandedEmps[id]; affRenderTree(); }

function affRemoveDept(id) {
    _affVisibleDepts = _affVisibleDepts.filter(d => d !== id);
    localStorage.setItem('aff_visible_depts', JSON.stringify(_affVisibleDepts));
    affRenderTree();
    showToast('Đã ẩn đơn vị');
}

// Hide a child department (phòng ban / team)

function affHideChildDept(id) {
    if (!_affHiddenChildDepts.includes(id)) _affHiddenChildDepts.push(id);
    localStorage.setItem('aff_hidden_child_depts', JSON.stringify(_affHiddenChildDepts));
    affRenderTree();
    showToast('Đã ẩn phòng ban. Có thể thêm lại qua "Thêm Đơn Vị"');
}

// ===== Add Dept Modal =====
function affOpenAddDeptModal() {
    const { departments } = _affData;
    // Build set of dept IDs already visible (either directly or as child of visible parent)
    const alreadyVisible = new Set();
    function markVisible(deptId) {
        alreadyVisible.add(deptId);
        departments.filter(d => d.parent_id === deptId).forEach(child => {
            if (!_affHiddenChildDepts.includes(child.id)) markVisible(child.id);
        });
    }
    _affVisibleDepts.forEach(id => markVisible(id));
    // Show: hidden child depts (to re-add) + depts not visible at all
    const filtered = departments.filter(d => !alreadyVisible.has(d.id));

    const bodyHTML = `
        <input type="text" class="form-control" placeholder="🔍 Tìm đơn vị / phòng ban..." id="affSearchDept" oninput="affFilterDeptList()" style="margin-bottom:12px;">
        <div id="affDeptList">${affBuildDeptListHTML(filtered)}</div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-success" onclick="affAddSelectedDept()">Thêm</button>
    `;
    openModal('➕ Thêm Đơn Vị Hiển Thị', bodyHTML, footerHTML);
}

function affBuildDeptListHTML(depts) {
    if (depts.length === 0) return '<div style="padding:20px;text-align:center;color:#9ca3af;">Không có đơn vị nào</div>';
    const { departments } = _affData;
    return depts.map(d => {
        const parentDept = d.parent_id ? departments.find(x => x.id === d.parent_id) : null;
        const isTeam = parentDept && parentDept.parent_id;
        const icon = !d.parent_id ? '🏢' : (isTeam ? '<span style="color:#dc2626;">◆</span>' : '📁');
        return `
        <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6;border-radius:8px;margin-bottom:4px;transition:background .15s;${_affSelectedDeptId === d.id ? 'background:#e0e7ff;' : ''}"
             onclick="affSelectDeptPick(${d.id})">
            <div style="font-weight:600;color:#122546;font-size:13px;">${icon} ${d.name}</div>
            <div style="font-size:11px;color:#6b7280;">${d.code || ''}</div>
        </div>`;
    }).join('');
}

function affFilterDeptList() {
    const search = (document.getElementById('affSearchDept')?.value || '').toLowerCase();
    const { departments } = _affData;
    // Same visible logic as modal open
    const alreadyVisible = new Set();
    function markVisible(deptId) {
        alreadyVisible.add(deptId);
        departments.filter(d => d.parent_id === deptId).forEach(child => {
            if (!_affHiddenChildDepts.includes(child.id)) markVisible(child.id);
        });
    }
    _affVisibleDepts.forEach(id => markVisible(id));
    const filtered = departments.filter(d => !alreadyVisible.has(d.id) && d.name.toLowerCase().includes(search));
    const el = document.getElementById('affDeptList');
    if (el) el.innerHTML = affBuildDeptListHTML(filtered);
}

function affSelectDeptPick(id) { _affSelectedDeptId = id; affFilterDeptList(); }

function affAddSelectedDept() {
    if (!_affSelectedDeptId) { showToast('Chọn đơn vị trước', 'error'); return; }
    // Add to visible depts if it's a root/parent
    if (!_affVisibleDepts.includes(_affSelectedDeptId)) {
        _affVisibleDepts.push(_affSelectedDeptId);
        localStorage.setItem('aff_visible_depts', JSON.stringify(_affVisibleDepts));
    }
    // Also unhide if it was a hidden child dept
    _affHiddenChildDepts = _affHiddenChildDepts.filter(id => id !== _affSelectedDeptId);
    localStorage.setItem('aff_hidden_child_depts', JSON.stringify(_affHiddenChildDepts));
    _affSelectedDeptId = null;
    closeModal();
    affRenderTree();
    showToast('✅ Đã thêm đơn vị', 'success');
}

// ===== Assign Modal =====
async function affOpenAssignModal(empId, empName) {
    _affAssignEmpId = empId;
    _affSelectedAffId = null;

    const data = await apiCall('/api/affiliate/unassigned');
    const list = data.affiliates || [];

    const bodyHTML = `
        <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">Chọn tài khoản affiliate chưa gán:</p>
        <div id="affUnassignedList">${list.length === 0
            ? '<div style="padding:20px;text-align:center;color:#9ca3af;">Không có affiliate chưa gán</div>'
            : list.map(a => `
                <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6;border-radius:8px;margin-bottom:4px;transition:background .15s;"
                     onclick="affSelectAffPick(${a.id}, this)">
                    <div style="font-weight:600;color:#122546;font-size:13px;">
                        <span class="aff-role ${a.role}" style="font-size:10px;padding:1px 8px;border-radius:10px;font-weight:600;">${AFF_ROLE_LABELS[a.role]}</span>
                        ${a.full_name}
                    </div>
                    <div style="font-size:11px;color:#6b7280;">${a.phone || ''} · Tạo: ${affFormatDate(a.created_at)}</div>
                </div>
            `).join('')}
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-success" onclick="affConfirmAssign()">Gán</button>
    `;
    openModal(`🔗 Gán Affiliate cho ${empName}`, bodyHTML, footerHTML);
}

function affSelectAffPick(id, el) {
    _affSelectedAffId = id;
    document.querySelectorAll('#affUnassignedList > div').forEach(d => d.style.background = '');
    if (el) el.style.background = '#e0e7ff';
}

async function affConfirmAssign() {
    if (!_affAssignEmpId || !_affSelectedAffId) { showToast('Chọn affiliate trước', 'error'); return; }
    const data = await apiCall('/api/affiliate/assign', 'POST', {
        affiliate_user_id: _affSelectedAffId,
        employee_user_id: _affAssignEmpId
    });
    if (data.success) {
        showToast('✅ ' + data.message, 'success');
        closeModal();
        await affLoadData();
    } else {
        showToast('❌ ' + (data.error || 'Lỗi'), 'error');
    }
}

async function affUnassign(affId) {
    if (!confirm('Bỏ gán affiliate này?')) return;
    const data = await apiCall('/api/affiliate/unassign', 'POST', { affiliate_user_id: affId });
    if (data.success) {
        showToast('✅ ' + data.message, 'success');
        await affLoadData();
    } else {
        showToast('❌ ' + (data.error || 'Lỗi'), 'error');
    }
}

// ===== Detail Modal (read-only) =====
async function affShowDetail(userId) {
    const data = await apiCall(`/api/users/${userId}`);
    if (!data.user) { showToast('Không tìm thấy tài khoản', 'error'); return; }
    const user = data.user;

    const CRM_LABELS = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',hoa_hong_crm:'CRM Giáo Viên/Học Sinh/Sinh Viên',nuoi_duong:'CRM Nhân Sự/Kế Toán/P.Mua Hàng',sinh_vien:'CRM Thể Thao/Thời Trang Local',koc_tiktok:'CRM KOL Tiktok/Mẹ Bỉm Sữa'};
    const ROLE_MAP = {hoa_hong:'Hoa Hồng',ctv:'CTV',nuoi_duong:'Nuôi Dưỡng',sinh_vien:'Sinh Viên'};

    // Get department name
    const depts = _affData.departments || [];
    const dept = depts.find(d => d.id === user.department_id);
    const deptName = dept ? dept.name : '—';

    let bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" class="form-control" value="${user.username}" disabled>
            </div>
            <div class="form-group">
                <label>Vai trò</label>
                <input type="text" class="form-control" value="${ROLE_MAP[user.role] || user.role}" disabled>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên</label>
                <input type="text" class="form-control" value="${user.full_name}" disabled>
            </div>
            <div class="form-group">
                <label>🎂 Sinh nhật</label>
                <input type="text" class="form-control" value="${user.birth_date ? new Date(user.birth_date).toLocaleDateString('vi-VN') : '—'}" disabled>
            </div>
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban</label>
            <input type="text" class="form-control" value="${deptName}" disabled>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>👤 Nhân viên quản lý</label>
                <input type="text" class="form-control" value="${user.manager_name || '—'}" disabled>
            </div>
            <div class="form-group">
                <label>📋 Khách hàng nguồn</label>
                <input type="text" class="form-control" value="${user.source_customer_name || '—'}" disabled>
            </div>
        </div>
        <div class="form-group">
            <label>📌 Khách CRM từ đâu?</label>
            <input type="text" class="form-control" value="${CRM_LABELS[user.source_crm_type] || user.source_crm_type || '—'}" disabled style="background:#f9fafb;color:var(--navy);font-weight:600;">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>SĐT</label>
                <input type="text" class="form-control" value="${user.phone || '—'}" disabled>
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành phố</label>
                <input type="text" class="form-control" value="${user.province || '—'}" disabled>
            </div>
        </div>
        <div class="form-group">
            <label>Địa chỉ</label>
            <input type="text" class="form-control" value="${user.address || '—'}" disabled>
        </div>
    `;

    // Hoa Hong section
    if (user.role === 'hoa_hong') {
        bodyHTML += `
        <hr style="margin:15px 0;border-color:var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
        <div class="form-row">
            <div class="form-group">
                <label>Tầng chiết khấu</label>
                <input type="text" class="form-control" value="${user.tier_name ? user.tier_name + ' (' + user.tier_percentage + '%)' : '—'}" disabled>
            </div>
            <div class="form-group">
                <label>Gán cho nhân viên</label>
                <input type="text" class="form-control" value="${user.assigned_to_name || '—'}" disabled>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Ngân hàng</label>
                <input type="text" class="form-control" value="${user.bank_name || '—'}" disabled>
            </div>
            <div class="form-group">
                <label>Số tài khoản</label>
                <input type="text" class="form-control" value="${user.bank_account || '—'}" disabled>
            </div>
        </div>
        <div class="form-group">
            <label>Chủ tài khoản</label>
            <input type="text" class="form-control" value="${user.bank_holder || '—'}" disabled>
        </div>
        `;
    }

    const footerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`;
    openModal('👁️ Chi Tiết Affiliate: ' + user.full_name, bodyHTML, footerHTML);
}
