// ========== HỆ THỐNG PHÂN CHIA GỌI ĐIỆN — PREMIUM UI ==========

let _htgd_sources = [];
let _htgd_activeSourceId = null;
let _htgd_page = 1;
let _htgd_search = '';
let _htgd_statusFilter = '';
let _htgd_members = [];
let _htgd_stats = [];
let _htgd_tab = 'data';
let _htgd_depts = [];

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
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;height:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="margin:0;color:#122546;font-size:20px;font-weight:800;">📊 Hệ Thống Phân Chia Gọi Điện</h2>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Quản lý data pool, import CSV, phân chia tự động cho NV</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="ts-btn ts-btn-green" onclick="_htgd_importCSV()">📥 Import CSV</button>
                    <button class="ts-btn ts-btn-blue" onclick="_htgd_manualPump()">🚀 Bơm Thủ Công</button>
                    <button class="ts-btn ts-btn-red" onclick="_htgd_manualRecall()">🔄 Thu Hồi</button>
                </div>
            </div>
            <div style="display:flex;gap:2px;border-bottom:2px solid #e5e7eb;">
                <button class="ts-tab active" onclick="_htgd_switchTab('data',this)">📞 Data Pool</button>
                <button class="ts-tab" onclick="_htgd_switchTab('members',this)">👥 NV Telesale</button>
                <button class="ts-tab" onclick="_htgd_switchTab('invalid',this)">❌ Kho Số Không Tồn Tại</button>
            </div>
            <div id="htgdContent" style="flex:1;overflow:auto;">
                <div style="text-align:center;padding:30px;color:#6b7280;">⏳ Đang tải...</div>
            </div>
        </div>`;
    _htgd_tab = 'data';
    await _htgd_loadSources();
}

function _htgd_switchTab(tab, el) {
    _htgd_tab = tab;
    document.querySelectorAll('.ts-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    if (tab === 'data') _htgd_renderDataTab();
    else if (tab === 'members') _htgd_renderMembersTab();
    else if (tab === 'invalid') _htgd_renderInvalidTab();
}

async function _htgd_loadSources() {
    const [srcRes, statsRes] = await Promise.all([
        apiCall('/api/telesale/sources'),
        apiCall('/api/telesale/data/stats')
    ]);
    _htgd_sources = srcRes.sources || [];
    _htgd_stats = statsRes.stats || [];
    if (!_htgd_activeSourceId && _htgd_sources.length > 0) _htgd_activeSourceId = _htgd_sources[0].id;
    _htgd_renderDataTab();
}

// ========== DATA TAB ==========
async function _htgd_renderDataTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    const t = _htgd_stats.reduce((a, s) => ({
        total: a.total + parseInt(s.total || 0), available: a.available + parseInt(s.available || 0),
        assigned: a.assigned + parseInt(s.assigned || 0), answered: a.answered + parseInt(s.answered || 0),
        cold: a.cold + parseInt(s.cold || 0), invalid: a.invalid + parseInt(s.invalid || 0),
    }), { total:0, available:0, assigned:0, answered:0, cold:0, invalid:0 });

    const cards = [
        { icon:'📊', label:'Tổng Data', val:t.total, grad:_HTGD_GRADIENTS[0], txtColor:'white' },
        { icon:'✅', label:'Sẵn Sàng', val:t.available, grad:_HTGD_GRADIENTS[1], txtColor:'white' },
        { icon:'📤', label:'Đã Phân', val:t.assigned, grad:_HTGD_GRADIENTS[2], txtColor:'white' },
        { icon:'📞', label:'Đã Gọi', val:t.answered, grad:_HTGD_GRADIENTS[3], txtColor:'white' },
        { icon:'🧊', label:'Kho Lạnh', val:t.cold, grad:_HTGD_GRADIENTS[4], txtColor:'white' },
        { icon:'❌', label:'Không Tồn Tại', val:t.invalid, grad:_HTGD_GRADIENTS[5], txtColor:'white' },
    ];

    el.innerHTML = `
        <div class="ts-stats-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px;">
            ${cards.map(c => `<div class="ts-stat-card" style="background:${c.grad};color:${c.txtColor};">
                <span class="ts-stat-icon">${c.icon}</span>
                <div class="ts-stat-val">${c.val.toLocaleString()}</div>
                <div class="ts-stat-label">${c.label}</div>
            </div>`).join('')}
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
                <option value="">Tất cả trạng thái</option>
                <option value="available" ${_htgd_statusFilter==='available'?'selected':''}>✅ Sẵn sàng</option>
                <option value="assigned" ${_htgd_statusFilter==='assigned'?'selected':''}>📤 Đã phân</option>
                <option value="answered" ${_htgd_statusFilter==='answered'?'selected':''}>📞 Đã gọi</option>
                <option value="cold" ${_htgd_statusFilter==='cold'?'selected':''}>🧊 Kho lạnh</option>
            </select>
            <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="document.getElementById('htgdSearch').value='';_htgd_search='';_htgd_statusFilter='';_htgd_page=1;_htgd_loadData();">🔄 Reset</button>
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

async function _htgd_loadData() {
    const tbl = document.getElementById('htgdDataTable');
    if (!tbl) return;
    const params = new URLSearchParams({ source_id: _htgd_activeSourceId, page: _htgd_page, limit: 50 });
    if (_htgd_search) params.set('search', _htgd_search);
    if (_htgd_statusFilter) params.set('status', _htgd_statusFilter);

    const res = await apiCall(`/api/telesale/data?${params}`);
    const data = res.data || [];
    const total = parseInt(res.total || 0);
    const totalPages = Math.ceil(total / 50);

    const statusBadge = (s) => {
        const map = {
            available: { icon:'✅', label:'Sẵn sàng', bg:'#dcfce7', color:'#16a34a' },
            assigned: { icon:'📤', label:'Đã phân', bg:'#dbeafe', color:'#2563eb' },
            answered: { icon:'📞', label:'Đã gọi', bg:'#fef3c7', color:'#d97706' },
            cold: { icon:'🧊', label:'Kho lạnh', bg:'#eef2ff', color:'#6366f1' },
            invalid: { icon:'❌', label:'K.tồn tại', bg:'#fef2f2', color:'#dc2626' },
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
                <th style="text-align:left;">SĐT</th>
                <th style="text-align:left;">Địa Chỉ</th>
                <th style="text-align:center;">Trạng Thái</th>
                <th style="text-align:left;">Phân Cho</th>
                <th style="text-align:center;width:60px;">Xóa</th>
            </tr></thead>
            <tbody>
                ${data.map((d,i) => `<tr>
                    <td style="color:#9ca3af;font-weight:600;">${((_htgd_page-1)*50)+i+1}</td>
                    <td style="font-weight:600;color:#374151;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.company_name||'').replace(/"/g,'&quot;')}">${d.company_name || '—'}</td>
                    <td style="font-weight:700;color:#122546;">${d.customer_name || '—'}</td>
                    <td style="font-family:'SF Mono',monospace;font-weight:700;color:#2563eb;letter-spacing:0.5px;">${d.phone}</td>
                    <td style="color:#6b7280;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.address||'').replace(/"/g,'&quot;')}">${d.address || '—'}</td>
                    <td style="text-align:center;">${statusBadge(d.status)}</td>
                    <td>${nvAvatar(d.last_assigned_user_name)}</td>
                    <td style="text-align:center;"><button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_deleteData(${d.id})" title="Xóa">🗑️</button></td>
                </tr>`).join('')}
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
    const statsRes = await apiCall('/api/telesale/data/stats');
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
        <div style="margin-bottom:12px;padding:12px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;font-size:12px;color:#0369a1;">
            <strong>📌 Format cột:</strong> Tên Công Ty | Tên Nhóm | Link Đăng Bài | Nội Dung Đăng Bài | Tên KH | SĐT | Địa Chỉ<br>
            <strong>Hàng đầu tiên</strong> = header (sẽ bỏ qua). Cột <strong>SĐT</strong> là bắt buộc. SĐT trùng sẽ <strong>tự động bỏ qua</strong>.
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
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { preview.innerHTML = '❌ File rỗng hoặc chỉ có header'; return; }
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = _htgd_parseCSVLine(lines[i]);
            if (cols.length < 6) continue;
            rows.push({ company_name:cols[0]||'', group_name:cols[1]||'', post_link:cols[2]||'', post_content:cols[3]||'', customer_name:cols[4]||'', phone:(cols[5]||'').trim(), address:cols[6]||'' });
        }
        _htgd_importRows = rows;
        preview.innerHTML = `
            <div style="font-size:12px;margin-bottom:8px;"><strong style="color:#059669;">📊 ${rows.length} bản ghi</strong> sẽ được import.</div>
            <div style="max-height:200px;overflow:auto;border:1.5px solid #e5e7eb;border-radius:12px;">
                <table class="ts-table"><thead><tr><th style="text-align:left;">Tên CT</th><th style="text-align:left;">Tên KH</th><th style="text-align:left;">SĐT</th><th style="text-align:left;">Địa Chỉ</th></tr></thead>
                <tbody>${rows.slice(0,10).map(r => `<tr><td>${r.company_name}</td><td>${r.customer_name}</td><td style="font-family:monospace;">${r.phone}</td><td>${r.address}</td></tr>`).join('')}
                ${rows.length > 10 ? `<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:8px;">... và ${rows.length-10} bản ghi nữa</td></tr>` : ''}</tbody></table>
            </div>`;
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
    const res = await apiCall('/api/telesale/data/import', 'POST', { source_id: _htgd_activeSourceId, rows: _htgd_importRows });
    if (res.success) { showToast(res.message); closeModal(); _htgd_importRows = []; await _htgd_refreshStats(); _htgd_renderDataTab(); }
    else { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = '📥 Import'; }
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

    const [memRes, usersRes, deptRes] = await Promise.all([
        apiCall('/api/telesale/active-members'),
        apiCall('/api/users'),
        apiCall('/api/teams')
    ]);
    _htgd_members = memRes.members || [];
    const allUsers = (usersRes.users || usersRes || []).filter(u => u.status === 'active');
    _htgd_depts = deptRes.departments || deptRes || [];
    const memberIds = new Set(_htgd_members.map(m => m.user_id));
    const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

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

    el.innerHTML = `
        <div class="ts-members-grid" style="display:grid;grid-template-columns:1fr 320px;gap:18px;">
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="margin:0;color:#122546;font-size:15px;font-weight:800;">👥 NV Telesale Active (${_htgd_members.filter(m=>m.is_active).length})</h4>
                </div>
                ${_htgd_members.length === 0 ? `<div class="ts-empty">
                    <span class="ts-empty-icon">👥</span>
                    <div class="ts-empty-title">Chưa có NV nào</div>
                    <div class="ts-empty-desc">Thêm NV vào Telesale từ sidebar bên phải</div>
                </div>` : `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
                    ${_htgd_members.map(m => {
                        const c = _htgd_avatarColor(m.full_name || m.username);
                        return `<div class="ts-nv-card" style="animation:ts-fadeInUp 0.3s ease both;">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                                <span class="ts-avatar" style="background:${c};width:38px;height:38px;font-size:14px;">${_htgd_initials(m.full_name || m.username)}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:700;color:#122546;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name || m.username}</div>
                                    <div style="font-size:10px;color:#9ca3af;">${m.dept_name || '—'}</div>
                                </div>
                                ${m.is_active ? '<span class="ts-badge" style="background:#dcfce7;color:#16a34a;font-size:9px;">● Active</span>' : '<span class="ts-badge" style="background:#fef2f2;color:#dc2626;font-size:9px;">● Inactive</span>'}
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-size:10px;color:#6b7280;font-weight:600;">Quota/ngày:</span>
                                    <input type="number" value="${m.daily_quota}" style="width:65px;padding:4px 6px;border:1.5px solid #e5e7eb;border-radius:8px;text-align:center;font-weight:700;font-size:12px;"
                                        onchange="_htgd_updateQuota(${m.user_id},this.value)">
                                </div>
                                <button class="ts-btn ts-btn-ghost ts-btn-xs" onclick="_htgd_removeMember(${m.user_id},'${(m.full_name||m.username).replace(/'/g,"\\\\'")}')" title="Bỏ NV">❌</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                ${_htgd_members.length > 0 ? `
                <div style="margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:12px;color:#0369a1;font-weight:700;">🔄 Đồng bộ quota:</span>
                    <input type="number" id="syncQuotaValue" value="250" style="width:80px;padding:5px 8px;border:1.5px solid #bae6fd;border-radius:8px;text-align:center;font-weight:700;">
                    <button class="ts-btn ts-btn-blue ts-btn-xs" onclick="_htgd_syncQuota()">Đồng bộ tất cả</button>
                </div>` : ''}`}
            </div>
            <div style="background:linear-gradient(180deg,#f8fafc,white);border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;">
                <h4 style="margin:0 0 12px;color:#122546;font-size:13px;font-weight:800;">➕ Thêm NV vào Telesale</h4>
                <select id="addMemberDeptFilter" class="ts-select" style="width:100%;margin-bottom:10px;" onchange="_htgd_filterByDept(this.value)">
                    <option value="">📁 Tất cả phòng ban</option>
                    ${Object.entries(groupedUsers).map(([dId,g]) => `<option value="${dId}">${g.name} (${g.users.length})</option>`).join('')}
                </select>
                <div id="addMemberList" class="ts-scroll" style="max-height:450px;overflow:auto;">
                    ${availableUsers.map(u => {
                        const c = _htgd_avatarColor(u.full_name || u.username);
                        const dName = deptMap[u.department_id] || '';
                        return `<div class="htgd-add-member-item" data-name="${(u.full_name||u.username).toLowerCase()}" data-dept="${u.department_id||0}"
                            style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:8px;transition:background 0.15s;"
                            onmouseenter="this.style.background='#eff6ff'" onmouseleave="this.style.background='transparent'" onclick="_htgd_addMember(${u.id})">
                            <span class="ts-avatar ts-avatar-sm" style="background:${c};">${_htgd_initials(u.full_name || u.username)}</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:12px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div>
                                <div style="font-size:10px;color:#9ca3af;">${dName}</div>
                            </div>
                            <span class="ts-btn ts-btn-green ts-btn-xs" style="padding:3px 8px;">➕</span>
                        </div>`;
                    }).join('')}
                    ${availableUsers.length === 0 ? '<div class="ts-empty" style="padding:24px;"><span class="ts-empty-icon" style="font-size:32px;">✅</span><div class="ts-empty-title" style="font-size:12px;">Tất cả NV đã được thêm</div></div>' : ''}
                </div>
            </div>
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
    const res = await apiCall('/api/telesale/active-members', 'POST', { user_id: userId });
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_updateQuota(userId, quota) {
    const res = await apiCall(`/api/telesale/active-members/${userId}`, 'PUT', { daily_quota: parseInt(quota) || 250 });
    if (res.success) showToast('✅ Đã cập nhật quota');
    else showToast(res.error, 'error');
}

async function _htgd_removeMember(userId, name) {
    if (!confirm(`Bỏ "${name}" khỏi Telesale?`)) return;
    const res = await apiCall(`/api/telesale/active-members/${userId}`, 'DELETE');
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

async function _htgd_syncQuota() {
    const quota = parseInt(document.getElementById('syncQuotaValue')?.value) || 250;
    const ids = _htgd_members.filter(m => m.is_active).map(m => m.user_id);
    if (ids.length === 0) return showToast('Không có NV active', 'error');
    const res = await apiCall('/api/telesale/active-members/sync-quota', 'POST', { user_ids: ids, daily_quota: quota });
    if (res.success) { showToast(res.message); await _htgd_renderMembersTab(); }
    else showToast(res.error, 'error');
}

// ========== INVALID NUMBERS TAB ==========
async function _htgd_renderInvalidTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:30px;">⏳ Đang tải...</div>';
    const res = await apiCall('/api/telesale/invalid-numbers');
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
