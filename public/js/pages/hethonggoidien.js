// ========== HỆ THỐNG PHÂN CHIA GỌI ĐIỆN ==========

let _htgd_sources = [];
let _htgd_activeSourceId = null;
let _htgd_page = 1;
let _htgd_search = '';
let _htgd_statusFilter = '';
let _htgd_members = [];
let _htgd_stats = [];
let _htgd_tab = 'data'; // data | members | invalid

async function renderHeThongGoiDienPage(container) {
    const isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(currentUser.role);
    if (!isManager) {
        container.innerHTML = `<div style="padding:60px;text-align:center;"><h2 style="color:#dc2626;">⛔ Không có quyền truy cập</h2><p>Trang này chỉ dành cho Quản lý trở lên.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;height:100%;">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="margin:0;color:#122546;font-size:20px;">📊 Hệ Thống Phân Chia Gọi Điện</h2>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Quản lý data pool, import CSV, phân chia tự động cho NV</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#10b981);color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;" onclick="_htgd_importCSV()">📥 Import CSV/Excel</button>
                    <button class="btn btn-sm" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;" onclick="_htgd_manualPump()">🚀 Bơm Thủ Công</button>
                    <button class="btn btn-sm" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;" onclick="_htgd_manualRecall()">🔄 Thu Hồi Thủ Công</button>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex;gap:4px;border-bottom:2px solid #e5e7eb;">
                <button class="htgd-tab active" onclick="_htgd_switchTab('data',this)" style="padding:8px 16px;font-size:12px;font-weight:700;color:#2563eb;background:white;border:2px solid #e5e7eb;border-bottom:2px solid white;border-radius:8px 8px 0 0;cursor:pointer;margin-bottom:-2px;">📞 Data Pool</button>
                <button class="htgd-tab" onclick="_htgd_switchTab('members',this)" style="padding:8px 16px;font-size:12px;font-weight:600;color:#6b7280;background:#f9fafb;border:none;border-radius:8px 8px 0 0;cursor:pointer;">👥 NV Telesale</button>
                <button class="htgd-tab" onclick="_htgd_switchTab('invalid',this)" style="padding:8px 16px;font-size:12px;font-weight:600;color:#6b7280;background:#f9fafb;border:none;border-radius:8px 8px 0 0;cursor:pointer;">❌ Kho Số Không Tồn Tại</button>
            </div>

            <!-- Content -->
            <div id="htgdContent" style="flex:1;overflow:auto;">
                <div style="text-align:center;padding:30px;color:#6b7280;">⏳ Đang tải...</div>
            </div>
        </div>
    `;
    _htgd_tab = 'data';
    await _htgd_loadSources();
}

function _htgd_switchTab(tab, el) {
    _htgd_tab = tab;
    document.querySelectorAll('.htgd-tab').forEach(t => {
        t.style.color = '#6b7280'; t.style.fontWeight = '600'; t.style.background = '#f9fafb';
        t.style.border = 'none'; t.style.borderBottom = 'none';
    });
    el.style.color = '#2563eb'; el.style.fontWeight = '700'; el.style.background = 'white';
    el.style.border = '2px solid #e5e7eb'; el.style.borderBottom = '2px solid white';
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

async function _htgd_renderDataTab() {
    const el = document.getElementById('htgdContent');
    if (!el) return;

    // Stats cards
    const totalStats = _htgd_stats.reduce((acc, s) => ({
        total: acc.total + parseInt(s.total || 0),
        available: acc.available + parseInt(s.available || 0),
        assigned: acc.assigned + parseInt(s.assigned || 0),
        answered: acc.answered + parseInt(s.answered || 0),
        cold: acc.cold + parseInt(s.cold || 0),
        invalid: acc.invalid + parseInt(s.invalid || 0),
    }), { total: 0, available: 0, assigned: 0, answered: 0, cold: 0, invalid: 0 });

    el.innerHTML = `
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px;">
            ${_htgd_statCard('📊', 'Tổng Data', totalStats.total, '#122546', '#f0f4f8')}
            ${_htgd_statCard('✅', 'Sẵn Sàng', totalStats.available, '#059669', '#ecfdf5')}
            ${_htgd_statCard('📤', 'Đã Phân', totalStats.assigned, '#2563eb', '#eff6ff')}
            ${_htgd_statCard('📞', 'Đã Gọi', totalStats.answered, '#d97706', '#fef3c7')}
            ${_htgd_statCard('❄️', 'Kho Lạnh', totalStats.cold, '#6366f1', '#eef2ff')}
            ${_htgd_statCard('❌', 'Không Tồn Tại', totalStats.invalid, '#dc2626', '#fef2f2')}
        </div>

        <!-- Source Tabs -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">
            ${_htgd_sources.map(s => {
                const stat = _htgd_stats.find(st => st.id === s.id) || {};
                const active = s.id === _htgd_activeSourceId;
                return `<button onclick="_htgd_selectSource(${s.id})" style="padding:6px 12px;font-size:11px;font-weight:${active ? '700' : '600'};
                    color:${active ? 'white' : '#374151'};background:${active ? 'linear-gradient(135deg,#122546,#1e3a5f)' : '#f3f4f6'};
                    border:${active ? 'none' : '1px solid #e5e7eb'};border-radius:8px;cursor:pointer;">
                    ${s.icon || '📁'} ${s.name} <span style="opacity:0.7;font-size:10px;">(${stat.total || 0})</span>
                </button>`;
            }).join('')}
        </div>

        <!-- Toolbar -->
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
            <input type="text" id="htgdSearch" placeholder="🔍 Tìm SĐT, Tên KH, Công ty..." value="${_htgd_search}"
                style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;"
                onkeyup="if(event.key==='Enter'){_htgd_search=this.value;_htgd_page=1;_htgd_loadData();}">
            <select id="htgdStatusFilter" style="padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;"
                onchange="_htgd_statusFilter=this.value;_htgd_page=1;_htgd_loadData();">
                <option value="">Tất cả trạng thái</option>
                <option value="available" ${_htgd_statusFilter==='available'?'selected':''}>✅ Sẵn sàng</option>
                <option value="assigned" ${_htgd_statusFilter==='assigned'?'selected':''}>📤 Đã phân</option>
                <option value="answered" ${_htgd_statusFilter==='answered'?'selected':''}>📞 Đã gọi</option>
                <option value="cold" ${_htgd_statusFilter==='cold'?'selected':''}>❄️ Kho lạnh</option>
            </select>
            <button class="btn btn-sm btn-secondary" onclick="document.getElementById('htgdSearch').value='';_htgd_search='';_htgd_statusFilter='';_htgd_page=1;_htgd_loadData();" style="border-radius:8px;font-size:11px;">🔄 Reset</button>
            <button class="btn btn-sm" onclick="_htgd_addDataManual()" style="background:#059669;color:white;border:none;border-radius:8px;font-size:11px;padding:6px 12px;cursor:pointer;">➕ Thêm</button>
        </div>

        <!-- Data Table -->
        <div id="htgdDataTable" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="text-align:center;padding:20px;color:#6b7280;">⏳ Đang tải data...</div>
        </div>

        <!-- Pagination -->
        <div id="htgdPagination" style="margin-top:12px;display:flex;justify-content:center;gap:4px;"></div>
    `;
    _htgd_loadData();
}

function _htgd_statCard(icon, label, value, color, bg) {
    return `<div style="padding:12px;background:${bg};border-radius:10px;text-align:center;">
        <div style="font-size:20px;">${icon}</div>
        <div style="font-size:18px;font-weight:800;color:${color};margin:4px 0;">${value.toLocaleString()}</div>
        <div style="font-size:10px;color:#6b7280;font-weight:600;">${label}</div>
    </div>`;
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
            available: { icon: '✅', label: 'Sẵn sàng', bg: '#dcfce7', color: '#16a34a' },
            assigned: { icon: '📤', label: 'Đã phân', bg: '#dbeafe', color: '#2563eb' },
            answered: { icon: '📞', label: 'Đã gọi', bg: '#fef3c7', color: '#d97706' },
            cold: { icon: '❄️', label: 'Kho lạnh', bg: '#eef2ff', color: '#6366f1' },
            invalid: { icon: '❌', label: 'Không tồn tại', bg: '#fef2f2', color: '#dc2626' },
        };
        const m = map[s] || map.available;
        return `<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${m.bg};color:${m.color};">${m.icon} ${m.label}</span>`;
    };

    tbl.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
                <tr style="background:linear-gradient(135deg,#122546,#1e3a5f);color:white;">
                    <th style="padding:8px 10px;text-align:left;width:40px;">#</th>
                    <th style="padding:8px 10px;text-align:left;">Tên Công Ty</th>
                    <th style="padding:8px 10px;text-align:left;">Tên KH</th>
                    <th style="padding:8px 10px;text-align:left;">SĐT</th>
                    <th style="padding:8px 10px;text-align:left;">Địa Chỉ</th>
                    <th style="padding:8px 10px;text-align:center;">Trạng Thái</th>
                    <th style="padding:8px 10px;text-align:left;">Phân Cho</th>
                    <th style="padding:8px 10px;text-align:center;">Thao Tác</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((d, i) => `
                <tr style="border-bottom:1px solid #f3f4f6;${i%2===0?'':'background:#fafbfc;'}">
                    <td style="padding:6px 10px;color:#9ca3af;">${((_htgd_page-1)*50)+i+1}</td>
                    <td style="padding:6px 10px;font-weight:600;color:#374151;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.company_name||'').replace(/"/g,'&quot;')}">${d.company_name || '—'}</td>
                    <td style="padding:6px 10px;font-weight:700;color:#122546;">${d.customer_name || '—'}</td>
                    <td style="padding:6px 10px;font-family:monospace;font-weight:700;color:#2563eb;">${d.phone}</td>
                    <td style="padding:6px 10px;color:#6b7280;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(d.address||'').replace(/"/g,'&quot;')}">${d.address || '—'}</td>
                    <td style="padding:6px 10px;text-align:center;">${statusBadge(d.status)}</td>
                    <td style="padding:6px 10px;font-size:11px;color:#6b7280;">${d.last_assigned_user_name || '—'}</td>
                    <td style="padding:6px 10px;text-align:center;">
                        <button class="btn btn-xs btn-danger" onclick="_htgd_deleteData(${d.id})" title="Xóa">🗑️</button>
                    </td>
                </tr>`).join('')}
                ${data.length === 0 ? '<tr><td colspan="8" style="padding:30px;text-align:center;color:#9ca3af;">Không có data nào</td></tr>' : ''}
            </tbody>
        </table>
        <div style="padding:8px 12px;background:#f9fafb;font-size:11px;color:#6b7280;display:flex;justify-content:space-between;">
            <span>Hiển thị ${data.length} / ${total} bản ghi</span>
            <span>Trang ${_htgd_page} / ${totalPages || 1}</span>
        </div>
    `;

    // Pagination
    const pag = document.getElementById('htgdPagination');
    if (pag && totalPages > 1) {
        let html = '';
        if (_htgd_page > 1) html += `<button onclick="_htgd_page=${_htgd_page-1};_htgd_loadData();" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:11px;">◀ Trước</button>`;
        for (let p = Math.max(1, _htgd_page-2); p <= Math.min(totalPages, _htgd_page+2); p++) {
            html += `<button onclick="_htgd_page=${p};_htgd_loadData();" style="padding:4px 10px;border:1px solid ${p===_htgd_page?'#2563eb':'#d1d5db'};border-radius:6px;cursor:pointer;font-size:11px;background:${p===_htgd_page?'#2563eb':'white'};color:${p===_htgd_page?'white':'#374151'};font-weight:${p===_htgd_page?'700':'400'};">${p}</button>`;
        }
        if (_htgd_page < totalPages) html += `<button onclick="_htgd_page=${_htgd_page+1};_htgd_loadData();" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:11px;">Sau ▶</button>`;
        pag.innerHTML = html;
    } else if (pag) pag.innerHTML = '';
}

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
        <button class="btn btn-success" onclick="_htgd_submitAddData()">💾 Thêm</button>`);
}

async function _htgd_submitAddData() {
    const phone = document.getElementById('addDataPhone')?.value?.trim();
    if (!phone) return showToast('Nhập SĐT', 'error');
    const res = await apiCall('/api/telesale/data', 'POST', {
        source_id: _htgd_activeSourceId,
        phone, customer_name: document.getElementById('addDataName').value,
        company_name: document.getElementById('addDataCompany').value,
        group_name: document.getElementById('addDataGroup').value,
        address: document.getElementById('addDataAddress').value,
        post_link: document.getElementById('addDataLink').value,
        post_content: document.getElementById('addDataContent').value,
    });
    if (res.success) { showToast(res.message); closeModal(); _htgd_loadData(); await _htgd_refreshStats(); }
    else showToast(res.error, 'error');
}

// ========== IMPORT CSV ==========
function _htgd_importCSV() {
    if (!_htgd_activeSourceId) return showToast('Chọn nguồn trước', 'error');
    const src = _htgd_sources.find(s => s.id === _htgd_activeSourceId);
    openModal('📥 Import CSV/Excel - ' + (src?.name || ''), `
        <div style="margin-bottom:12px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:12px;color:#0369a1;">
            <strong>📌 Format cột:</strong> Tên Công Ty | Tên Nhóm | Link Đăng Bài | Nội Dung Đăng Bài | Tên KH | SĐT | Địa Chỉ<br>
            <strong>Hàng đầu tiên</strong> = header (sẽ bỏ qua). Cột <strong>SĐT</strong> là bắt buộc.<br>
            SĐT trùng trong cùng nguồn sẽ được <strong>tự động bỏ qua</strong>.
        </div>
        <div class="form-group">
            <label>📄 Chọn file CSV/Excel</label>
            <input type="file" id="importFile" accept=".csv,.xlsx,.xls" class="form-control" onchange="_htgd_previewImport(this)">
        </div>
        <div id="importPreviewArea" style="display:none;"></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" id="importSubmitBtn" disabled onclick="_htgd_submitImport()">📥 Import</button>`);
}

let _htgd_importRows = [];
async function _htgd_previewImport(input) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById('importPreviewArea');
    preview.style.display = 'block';
    preview.innerHTML = '⏳ Đang đọc file...';

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { preview.innerHTML = '❌ File rỗng hoặc chỉ có header'; return; }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = _htgd_parseCSVLine(lines[i]);
            if (cols.length < 6) continue;
            rows.push({
                company_name: cols[0] || '', group_name: cols[1] || '', post_link: cols[2] || '',
                post_content: cols[3] || '', customer_name: cols[4] || '', phone: (cols[5] || '').trim(), address: cols[6] || ''
            });
        }
        _htgd_importRows = rows;
        preview.innerHTML = `
            <div style="font-size:12px;margin-bottom:8px;">
                <strong style="color:#059669;">📊 ${rows.length} bản ghi</strong> sẽ được import.
            </div>
            <div style="max-height:200px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <thead><tr style="background:#f3f4f6;position:sticky;top:0;">
                        <th style="padding:4px 6px;text-align:left;">Tên CT</th>
                        <th style="padding:4px 6px;text-align:left;">Tên KH</th>
                        <th style="padding:4px 6px;text-align:left;">SĐT</th>
                        <th style="padding:4px 6px;text-align:left;">Địa Chỉ</th>
                    </tr></thead>
                    <tbody>
                        ${rows.slice(0, 10).map(r => `<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:3px 6px;">${r.company_name}</td><td style="padding:3px 6px;">${r.customer_name}</td><td style="padding:3px 6px;font-family:monospace;">${r.phone}</td><td style="padding:3px 6px;">${r.address}</td></tr>`).join('')}
                        ${rows.length > 10 ? `<tr><td colspan="4" style="padding:6px;text-align:center;color:#6b7280;">... và ${rows.length - 10} bản ghi nữa</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('importSubmitBtn').disabled = false;
    } catch (e) {
        preview.innerHTML = `❌ Lỗi đọc file: ${e.message}`;
    }
}

function _htgd_parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuotes = !inQuotes; }
        else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += c; }
    }
    result.push(current.trim());
    return result;
}

async function _htgd_submitImport() {
    if (_htgd_importRows.length === 0) return;
    const btn = document.getElementById('importSubmitBtn');
    btn.disabled = true; btn.textContent = '⏳ Đang import...';
    const res = await apiCall('/api/telesale/data/import', 'POST', {
        source_id: _htgd_activeSourceId, rows: _htgd_importRows
    });
    if (res.success) {
        showToast(res.message); closeModal(); _htgd_importRows = [];
        _htgd_loadData(); await _htgd_refreshStats();
        // Re-render stats in data tab
        const statsRes = await apiCall('/api/telesale/data/stats');
        _htgd_stats = statsRes.stats || [];
        _htgd_renderDataTab();
    } else { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = '📥 Import'; }
}

// ========== PUMP & RECALL ==========
async function _htgd_manualPump() {
    if (!confirm('Bơm data cho tất cả NV active ngay bây giờ?\n(Thao tác này tương đương cron 7:00 sáng)')) return;
    showToast('⏳ Đang bơm...', 'info');
    const res = await apiCall('/api/telesale/pump', 'POST');
    if (res.success) {
        showToast(res.message);
        if (res.alerts && res.alerts.length > 0) {
            const alertMsg = res.alerts.map(a => `⚠️ ${a.source}: cần ${a.needed}, còn ${a.available}`).join('\n');
            alert('⚠️ Cảnh báo nguồn hết data:\n\n' + alertMsg);
        }
        await _htgd_refreshStats(); _htgd_renderDataTab();
    } else showToast(res.error, 'error');
}

async function _htgd_manualRecall() {
    if (!confirm('Thu hồi tất cả data chưa gọi?\n(Thao tác này tương đương cron 00:00)')) return;
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

    const [memRes, usersRes] = await Promise.all([
        apiCall('/api/telesale/active-members'),
        apiCall('/api/users')
    ]);
    _htgd_members = memRes.members || [];
    const allUsers = (usersRes.users || usersRes || []).filter(u => u.status === 'active');

    const memberIds = new Set(_htgd_members.map(m => m.user_id));
    const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 350px;gap:16px;">
            <!-- Active Members -->
            <div>
                <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                    <h4 style="margin:0;color:#122546;">👥 NV Telesale Active (${_htgd_members.filter(m=>m.is_active).length})</h4>
                </div>
                <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        <thead>
                            <tr style="background:linear-gradient(135deg,#122546,#1e3a5f);color:white;">
                                <th style="padding:8px 10px;text-align:left;">NV</th>
                                <th style="padding:8px 10px;text-align:left;">Phòng Ban</th>
                                <th style="padding:8px 10px;text-align:center;">Quota/Ngày</th>
                                <th style="padding:8px 10px;text-align:center;">Trạng Thái</th>
                                <th style="padding:8px 10px;text-align:center;">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_htgd_members.map(m => `
                            <tr style="border-bottom:1px solid #f3f4f6;">
                                <td style="padding:8px 10px;">
                                    <div style="font-weight:700;color:#122546;">${m.full_name || m.username}</div>
                                    <div style="font-size:10px;color:#9ca3af;">${m.username}</div>
                                </td>
                                <td style="padding:8px 10px;font-size:11px;color:#6b7280;">${m.dept_name || '—'}</td>
                                <td style="padding:8px 10px;text-align:center;">
                                    <input type="number" value="${m.daily_quota}" style="width:70px;padding:4px;border:1px solid #d1d5db;border-radius:6px;text-align:center;font-weight:700;font-size:12px;"
                                        onchange="_htgd_updateQuota(${m.user_id},this.value)">
                                </td>
                                <td style="padding:8px 10px;text-align:center;">
                                    ${m.is_active ? '<span style="color:#16a34a;font-weight:700;">🟢 Active</span>' : '<span style="color:#dc2626;">🔴 Inactive</span>'}
                                </td>
                                <td style="padding:8px 10px;text-align:center;">
                                    <button class="btn btn-xs btn-danger" onclick="_htgd_removeMember(${m.user_id},'${(m.full_name||m.username).replace(/'/g,"\\\\'")}')" title="Bỏ">❌</button>
                                </td>
                            </tr>`).join('')}
                            ${_htgd_members.length === 0 ? '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9ca3af;">Chưa có NV nào</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                ${_htgd_members.length > 0 ? `
                <div style="margin-top:12px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;display:flex;gap:8px;align-items:center;">
                    <span style="font-size:12px;color:#0369a1;font-weight:600;">🔄 Đồng bộ quota:</span>
                    <input type="number" id="syncQuotaValue" value="250" style="width:80px;padding:4px;border:1px solid #bae6fd;border-radius:6px;text-align:center;font-weight:700;">
                    <button class="btn btn-sm" style="background:#2563eb;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;" onclick="_htgd_syncQuota()">Đồng bộ tất cả</button>
                </div>` : ''}
            </div>

            <!-- Add Member -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                <h4 style="margin:0 0 12px;color:#122546;font-size:13px;">➕ Thêm NV vào Telesale</h4>
                <input type="text" id="addMemberSearch" placeholder="🔍 Tìm NV..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;margin-bottom:8px;"
                    oninput="_htgd_filterAddMembers(this.value)">
                <div id="addMemberList" style="max-height:400px;overflow:auto;">
                    ${availableUsers.map(u => `
                    <div class="htgd-add-member-item" data-name="${(u.full_name||u.username).toLowerCase()}" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f3f4f6;cursor:pointer;" onclick="_htgd_addMember(${u.id})">
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#374151;">${u.full_name || u.username}</div>
                            <div style="font-size:10px;color:#9ca3af;">${u.username}</div>
                        </div>
                        <button class="btn btn-xs btn-success">➕</button>
                    </div>`).join('')}
                    ${availableUsers.length === 0 ? '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">Tất cả NV đã được thêm</div>' : ''}
                </div>
            </div>
        </div>
    `;
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
        <div style="margin-bottom:16px;">
            <h4 style="margin:0;color:#122546;">❌ Kho Số Không Tồn Tại (${numbers.length})</h4>
            <p style="font-size:12px;margin:4px 0 0;color:#6b7280;">Các số đã bị báo "không tồn tại" ≥ 2 lần. GĐ có thể kiểm tra và khôi phục.</p>
        </div>

        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:linear-gradient(135deg,#7f1d1d,#991b1b);color:white;">
                        <th style="padding:8px 10px;text-align:left;">#</th>
                        <th style="padding:8px 10px;text-align:left;">SĐT</th>
                        <th style="padding:8px 10px;text-align:left;">Tên KH</th>
                        <th style="padding:8px 10px;text-align:left;">Công Ty</th>
                        <th style="padding:8px 10px;text-align:left;">Nguồn</th>
                        <th style="padding:8px 10px;text-align:center;">Lần Báo</th>
                        <th style="padding:8px 10px;text-align:center;">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${numbers.map((n, i) => `
                    <tr style="border-bottom:1px solid #f3f4f6;">
                        <td style="padding:6px 10px;color:#9ca3af;">${i+1}</td>
                        <td style="padding:6px 10px;font-family:monospace;font-weight:700;color:#dc2626;">${n.phone}</td>
                        <td style="padding:6px 10px;font-weight:600;">${n.customer_name || '—'}</td>
                        <td style="padding:6px 10px;color:#6b7280;">${n.company_name || '—'}</td>
                        <td style="padding:6px 10px;">${n.source_icon || ''} ${n.source_name || '—'}</td>
                        <td style="padding:6px 10px;text-align:center;font-weight:700;color:#dc2626;">${n.invalid_count}x</td>
                        <td style="padding:6px 10px;text-align:center;">
                            <button class="btn btn-xs btn-success" onclick="_htgd_restoreNumber(${n.id})" title="Khôi phục">♻️ Khôi phục</button>
                        </td>
                    </tr>`).join('')}
                    ${numbers.length === 0 ? '<tr><td colspan="7" style="padding:30px;text-align:center;color:#9ca3af;">Chưa có số nào bị báo không tồn tại</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

async function _htgd_restoreNumber(id) {
    if (!confirm('Khôi phục số này về pool sẵn sàng?')) return;
    const res = await apiCall(`/api/telesale/invalid-numbers/${id}/restore`, 'POST');
    if (res.success) { showToast(res.message); await _htgd_renderInvalidTab(); }
    else showToast(res.error, 'error');
}
