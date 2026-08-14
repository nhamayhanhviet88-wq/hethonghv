// ========== NỘI QUY & ĐIỀU KHOẢN CÔNG TY HV ==========
var _nqState = {
    rules: [],
    depts: { vanPhong: [], xuong: [], other: [], all: [] },
    stats: { totalRules: 0, generalRules: 0, deptRules: 0, fineRules: 0 },
    filters: {
        scope: 'all',
        deptId: 'all',
        month: 'all',
        year: 'all',
        search: '',
        hasFine: false
    },
    editingId: null,
    modalDeptSearch: ''
};

var _nqIsAdmin = function() {
    if (typeof currentUser === 'undefined' || !currentUser) return false;
    var r = currentUser.role;
    return r === 'giam_doc' || r === 'quan_ly_cap_cao' || r === 'quan_ly' || r === 'truong_phong';
};

async function renderNoiquycongtyhvPage(container) {
    if (!document.getElementById('nqStyles')) {
        var st = document.createElement('style'); st.id = 'nqStyles';
        st.textContent = `
            .nq-page { padding: 20px; background: #f8fafc; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .nq-header-banner { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%); color: #fff; padding: 24px 30px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; position: relative; overflow: hidden; }
            .nq-header-banner::before { content: ""; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
            .nq-title-group h1 { font-size: 22px; font-weight: 900; margin: 0 0 6px 0; display: flex; align-items: center; gap: 10px; letter-spacing: -0.5px; }
            .nq-title-group p { font-size: 13px; color: #e0e7ff; margin: 0; opacity: 0.9; font-weight: 500; }
            .nq-add-btn { background: #10b981; color: #fff; border: none; padding: 12px 22px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s ease; z-index: 1; }
            .nq-add-btn:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); }

            /* Stats Grid */
            .nq-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .nq-stat-card { background: #fff; border-radius: 14px; padding: 18px 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 16px; transition: transform 0.2s, box-shadow 0.2s; }
            .nq-stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.06); }
            .nq-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
            .nq-stat-info { display: flex; flex-direction: column; }
            .nq-stat-value { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.1; }
            .nq-stat-label { font-size: 12px; font-weight: 700; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

            /* Filter Bar */
            .nq-filter-card { background: #fff; border-radius: 14px; padding: 16px 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px; }
            .nq-scope-tabs { display: flex; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; overflow-x: auto; }
            .nq-tab-btn { background: #f1f5f9; color: #475569; border: none; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
            .nq-tab-btn.active { background: #4338ca; color: #fff; box-shadow: 0 2px 8px rgba(67, 56, 202, 0.25); }

            .nq-filter-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
            .nq-search-box { flex: 1; min-width: 240px; position: relative; }
            .nq-search-box input { width: 100%; padding: 9px 14px 9px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s; }
            .nq-search-box input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .nq-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; }

            .nq-select { padding: 9px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #334155; outline: none; background: #fff; cursor: pointer; }
            .nq-select:focus { border-color: #4338ca; }
            .nq-checkbox-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #dc2626; cursor: pointer; user-select: none; background: #fef2f2; padding: 7px 12px; border-radius: 8px; border: 1px solid #fecaca; }

            /* Rules Grid */
            .nq-rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
            .nq-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
            .nq-card:hover { transform: translateY(-3px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); border-color: #cbd5e1; }
            
            .nq-card-header { padding: 16px 18px 12px 18px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: #fafafa; }
            .nq-code-badge { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }
            .nq-scope-badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
            .nq-scope-badge.chung { background: #e0e7ff; color: #3730a3; }
            .nq-scope-badge.phongban { background: #fef3c7; color: #92400e; }

            .nq-card-body { padding: 18px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
            .nq-card-title { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.4; margin: 0; }
            .nq-card-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #64748b; font-weight: 600; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; }
            .nq-card-meta-item { display: flex; align-items: center; gap: 5px; }

            .nq-card-content { font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line; background: #fff; word-break: break-word; }

            .nq-doc-link-btn { display: inline-flex; align-items: center; gap: 6px; background: #e0e7ff; color: #3730a3; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none; transition: all 0.2s; border: 1px solid #c7d2fe; margin-top: 4px; width: fit-content; }
            .nq-doc-link-btn:hover { background: #4338ca; color: #fff; border-color: #4338ca; }

            .nq-fine-box { background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
            .nq-fine-title { font-size: 11px; font-weight: 900; color: #be123c; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
            .nq-fine-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; align-items: center; }
            .nq-fine-label { color: #881337; }
            .nq-fine-value { color: #e11d48; font-weight: 900; }

            .nq-card-footer { padding: 12px 18px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            .nq-action-btn { background: none; border: none; font-size: 12px; font-weight: 800; cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: background 0.15s; display: inline-flex; align-items: center; gap: 5px; }
            .nq-action-edit { color: #2563eb; background: #eff6ff; }
            .nq-action-edit:hover { background: #dbeafe; }
            .nq-action-del { color: #dc2626; background: #fef2f2; }
            .nq-action-del:hover { background: #fee2e2; }

            /* Modal Styles */
            .nq-modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: nqFadeIn 0.2s ease-out; }
            @keyframes nqFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .nq-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; }
            .nq-modal-hdr { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 16px 16px 0 0; }
            .nq-modal-hdr h3 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px; }
            .nq-modal-close { background: none; border: none; font-size: 20px; font-weight: 700; color: #94a3b8; cursor: pointer; }
            .nq-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
            .nq-form-group { display: flex; flex-direction: column; gap: 6px; }
            .nq-form-group label { font-size: 13px; font-weight: 800; color: #334155; }
            .nq-form-input, .nq-form-select, .nq-form-textarea { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
            .nq-form-input[readonly] { background: #f1f5f9; color: #475569; font-weight: 800; cursor: not-allowed; border-color: #e2e8f0; }
            .nq-form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
            .nq-form-input:focus, .nq-form-select:focus, .nq-form-textarea:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            
            /* Searchable Select Dropdown */
            .nq-searchable-select { position: relative; }
            .nq-ss-input { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%20%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }
            .nq-ss-menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; max-height: 240px; overflow-y: auto; box-shadow: 0 10px 20px rgba(0,0,0,0.12); z-index: 1000; display: none; padding: 6px; }
            .nq-ss-menu.active { display: block; }
            .nq-ss-search { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; margin-bottom: 6px; outline: none; box-sizing: border-box; }
            .nq-ss-group-label { font-size: 11px; font-weight: 900; color: #64748b; padding: 6px 10px 4px 10px; text-transform: uppercase; background: #f8fafc; }
            .nq-ss-item { padding: 8px 12px; font-size: 13px; font-weight: 600; color: #1e293b; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
            .nq-ss-item:hover { background: #e0e7ff; color: #3730a3; }
            .nq-ss-item.selected { background: #4338ca; color: #fff; font-weight: 800; }

            /* Paste Image Box */
            .nq-paste-area { border: 2px dashed #cbd5e1; border-radius: 10px; padding: 14px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s; position: relative; }
            .nq-paste-area:hover, .nq-paste-area.highlight { border-color: #4338ca; background: #eef2ff; }
            .nq-paste-text { font-size: 12px; font-weight: 700; color: #64748b; }
            .nq-paste-preview { max-width: 100%; max-height: 180px; border-radius: 8px; border: 1px solid #cbd5e1; margin-top: 8px; }

            .nq-modal-ftr { padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; border-radius: 0 0 16px 16px; }
            .nq-btn-secondary { background: #e2e8f0; color: #475569; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
            .nq-btn-primary { background: #4338ca; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25); }

            .nq-empty { text-align: center; padding: 60px 20px; background: #fff; border-radius: 14px; border: 1px dashed #cbd5e1; grid-column: 1 / -1; }
            .nq-empty-icon { font-size: 48px; margin-bottom: 12px; }
            .nq-empty-text { font-size: 15px; font-weight: 800; color: #475569; }
        `;
        document.head.appendChild(st);
    }

    container.innerHTML = `
        <div class="nq-page">
            <!-- Header Banner -->
            <div class="nq-header-banner">
                <div class="nq-title-group">
                    <h1>📜 NỘI QUY & ĐIỀU KHOẢN CÔNG TY HV</h1>
                    <p>Quy chuẩn văn hóa, quy tắc làm việc & chế tài khen thưởng kỷ luật toàn công ty</p>
                </div>
                ${_nqIsAdmin() ? `
                    <button class="nq-add-btn" onclick="_nqOpenAddModal()">
                        <span>➕</span> Thêm Điều Khoản Mới
                    </button>
                ` : ''}
            </div>

            <!-- Stats Grid -->
            <div class="nq-stats-grid" id="nqStatsGrid">
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#e0e7ff;color:#4338ca">📋</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatTotal">0</span>
                        <span class="nq-stat-label">Tổng Điều Khoản</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#dcfce7;color:#15803d">🏢</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatGeneral">0</span>
                        <span class="nq-stat-label">Nội Quy Chung</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#fef3c7;color:#b45309">🏛️</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatDept">0</span>
                        <span class="nq-stat-label">Nội Quy Phòng Ban</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#ffe4e6;color:#be123c">🚨</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatFine">0</span>
                        <span class="nq-stat-label">Có Phạt Vi Phạm</span>
                    </div>
                </div>
            </div>

            <!-- Filter Toolbar -->
            <div class="nq-filter-card">
                <div class="nq-scope-tabs">
                    <button class="nq-tab-btn active" id="nqTabAll" onclick="_nqSetScope('all')">🌐 Xem Tất Cả</button>
                    <button class="nq-tab-btn" id="nqTabChung" onclick="_nqSetScope('chung')">🏢 1. Nội Quy Chung</button>
                    <button class="nq-tab-btn" id="nqTabPhongban" onclick="_nqSetScope('phong_ban')">🏛️ 2. Nội Quy Phòng Ban</button>
                </div>
                <div class="nq-filter-controls">
                    <div class="nq-search-box">
                        <span class="nq-search-icon">🔍</span>
                        <input type="text" id="nqSearchInput" placeholder="Tìm theo mã (NQ-...), tiêu đề, nội dung, người tạo..." oninput="_nqOnSearch(this.value)">
                    </div>
                    <select class="nq-select" id="nqDeptFilter" onchange="_nqOnDeptChange(this.value)">
                        <option value="all">🏢 Tất Cả Phòng Ban</option>
                    </select>
                    <select class="nq-select" id="nqMonthFilter" onchange="_nqOnMonthChange(this.value)">
                        <option value="all">📅 Tất Cả Các Tháng</option>
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}">Tháng ${m}</option>`).join('')}
                    </select>
                    <select class="nq-select" id="nqYearFilter" onchange="_nqOnYearChange(this.value)">
                        <option value="all">📆 Tất Cả Các Năm</option>
                        <option value="2026">Năm 2026</option>
                        <option value="2025">Năm 2025</option>
                    </select>
                    <label class="nq-checkbox-label">
                        <input type="checkbox" id="nqFineCheck" onchange="_nqOnFineChange(this.checked)">
                        <span>🚨 Phạt Vi Phạm</span>
                    </label>
                </div>
            </div>

            <!-- Rules Card Grid -->
            <div class="nq-rules-grid" id="nqRulesGrid">
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;font-weight:700">⌛ Đang tải dữ liệu nội quy...</div>
            </div>
        </div>
    `;

    await _nqInitData();
}

async function _nqInitData() {
    try {
        var deptRes = await apiCall('/api/company-rules/departments');
        if (deptRes) {
            _nqState.depts = deptRes;
            _nqPopulateDeptFilter();
        }
        await _nqLoadRules();
    } catch (e) {
        console.error('Error init _nqData:', e);
    }
}

function _nqPopulateDeptFilter() {
    var sel = document.getElementById('nqDeptFilter');
    if (!sel) return;

    var html = '<option value="all">🏢 Tất Cả Phòng Ban</option>';
    
    if (_nqState.depts.vanPhong && _nqState.depts.vanPhong.length > 0) {
        html += '<optgroup label="🏛️ HỆ THỐNG VĂN PHÒNG HV">';
        _nqState.depts.vanPhong.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    if (_nqState.depts.xuong && _nqState.depts.xuong.length > 0) {
        html += '<optgroup label="🏭 HỆ THỐNG XƯỞNG HV">';
        _nqState.depts.xuong.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    if (_nqState.depts.other && _nqState.depts.other.length > 0) {
        html += '<optgroup label="🏢 PHÒNG BAN KHÁC">';
        _nqState.depts.other.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    sel.innerHTML = html;
}

async function _nqLoadRules() {
    try {
        var params = new URLSearchParams();
        var f = _nqState.filters;
        if (f.scope !== 'all') params.append('scope', f.scope);
        if (f.deptId !== 'all') params.append('department_id', f.deptId);
        if (f.month !== 'all') params.append('month', f.month);
        if (f.year !== 'all') params.append('year', f.year);
        if (f.search) params.append('search', f.search);
        if (f.hasFine) params.append('has_fine', 'true');

        var res = await apiCall('/api/company-rules?' + params.toString());
        if (res) {
            _nqState.rules = res.rules || [];
            _nqState.stats = res.stats || { totalRules: 0, generalRules: 0, deptRules: 0, fineRules: 0 };
            _nqUpdateStats();
            _nqRenderRules();
        }
    } catch (e) {
        console.error('Error loading rules:', e);
    }
}

function _nqUpdateStats() {
    var s = _nqState.stats;
    var elTot = document.getElementById('nqStatTotal');
    var elGen = document.getElementById('nqStatGeneral');
    var elDept = document.getElementById('nqStatDept');
    var elFine = document.getElementById('nqStatFine');

    if (elTot) elTot.textContent = s.totalRules;
    if (elGen) elGen.textContent = s.generalRules;
    if (elDept) elDept.textContent = s.deptRules;
    if (elFine) elFine.textContent = s.fineRules;
}

function _nqFormatDate(dStr) {
    if (!dStr) return '';
    try {
        var s = String(dStr).substring(0, 10);
        var parts = s.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return dStr;
    } catch(e) {
        return dStr;
    }
}

function _nqRenderRules() {
    var grid = document.getElementById('nqRulesGrid');
    if (!grid) return;

    if (_nqState.rules.length === 0) {
        grid.innerHTML = `
            <div class="nq-empty">
                <div class="nq-empty-icon">📂</div>
                <div class="nq-empty-text">Chưa có điều khoản nào phù hợp với bộ lọc hiện tại</div>
            </div>
        `;
        return;
    }

    var html = '';
    _nqState.rules.forEach(function(r) {
        var isChung = r.scope === 'chung';
        var deptName = isChung ? 'Nội Quy Chung' : (r.department_name || 'Phòng Ban');
        
        var effDateStr = r.effective_date ? _nqFormatDate(r.effective_date) : 'Đang cập nhật';
        var expDateStr = (r.is_forever !== false && r.is_forever !== 'false') ? '♾️ Mãi Mãi (Vô thời hạn)' : (r.expiry_date ? ('Đến ' + _nqFormatDate(r.expiry_date)) : '♾️ Vô thời hạn');
        var createdDateStr = r.created_at ? _nqFormatDate(r.created_at) : '';

        var fineAmt = Number(r.fine_amount) || 0;
        var teamFineAmt = Number(r.team_fine_amount) || 0;
        var deptFineAmt = Number(r.dept_fine_amount) || 0;
        var mgrFineAmt = Number(r.manager_fine_amount) || 0;

        var hasFine = r.has_fine && fineAmt > 0;
        var hasTeamFine = r.has_team_fine && teamFineAmt > 0;
        var hasDeptFine = r.has_dept_fine && deptFineAmt > 0;
        var hasMgrFine = r.has_manager_fine && mgrFineAmt > 0;
        var mgrNameStr = r.manager_name || 'Trưởng Phòng / Quản Lý';

        html += `
            <div class="nq-card">
                <div class="nq-card-header">
                    <span class="nq-code-badge">${r.rule_code}</span>
                    <span class="nq-scope-badge ${isChung ? 'chung' : 'phongban'}">
                        ${isChung ? '🌐 Nội Quy Chung' : '🏛️ ' + deptName}
                    </span>
                </div>
                <div class="nq-card-body">
                    <h3 class="nq-card-title">${escapeHtml(r.title)}</h3>
                    
                    <div class="nq-card-meta">
                        <div class="nq-card-meta-item">
                            <span>📅 Áp dụng:</span>
                            <strong style="color:#0f172a">${effDateStr}</strong>
                            <span style="color:#64748b;font-size:11px">(${expDateStr})</span>
                        </div>
                        <div class="nq-card-meta-item">
                            <span>👤 Tạo bởi:</span>
                            <strong style="color:#4338ca">${escapeHtml(r.created_by_name || 'Hệ thống')}</strong>
                        </div>
                        ${createdDateStr ? `<div class="nq-card-meta-item"><span>🕒 Ngày tạo:</span> ${createdDateStr}</div>` : ''}
                    </div>

                    <div class="nq-card-content">${escapeHtml(r.content)}</div>

                    ${r.doc_link ? `
                        <a href="${r.doc_link}" target="_blank" class="nq-doc-link-btn">
                            <span>🔗 Xem Link Nội Quy Gốc</span>
                        </a>
                    ` : ''}

                    ${r.image_url ? `
                        <div style="margin-top:8px">
                            <img src="${r.image_url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer" onclick="window.open('${r.image_url}')">
                        </div>
                    ` : ''}

                    ${(hasFine || hasTeamFine || hasDeptFine || hasMgrFine) ? `
                        <div class="nq-fine-box">
                            <div class="nq-fine-title">
                                <span>🚨 CHẾ TÀI PHẠT VI PHẠM</span>
                            </div>
                            ${hasFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">👤 Cá nhân vi phạm:</span>
                                    <span class="nq-fine-value">${formatVND(fineAmt)}</span>
                                </div>
                            ` : ''}
                            ${hasTeamFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">👥 Vi phạm Team:</span>
                                    <span class="nq-fine-value">${formatVND(teamFineAmt)}</span>
                                </div>
                            ` : ''}
                            ${hasDeptFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">🏛️ Vi phạm Phòng ban:</span>
                                    <span class="nq-fine-value">${formatVND(deptFineAmt)}</span>
                                </div>
                            ` : ''}
                            ${hasMgrFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">🛡️ Quản lý liên đới (${escapeHtml(mgrNameStr)}):</span>
                                    <span class="nq-fine-value">${formatVND(mgrFineAmt)}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                ${_nqIsAdmin() ? `
                    <div class="nq-card-footer">
                        <div></div>
                        <div style="display:flex;gap:8px">
                            <button class="nq-action-btn nq-action-edit" onclick="_nqEditRule(${r.id})">✏️ Sửa</button>
                            <button class="nq-action-btn nq-action-del" onclick="_nqDeleteRule(${r.id})">🗑️ Xóa</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    grid.innerHTML = html;
}

// ===== FILTER HANDLERS =====
function _nqSetScope(scope) {
    _nqState.filters.scope = scope;
    ['nqTabAll', 'nqTabChung', 'nqTabPhongban'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    if (scope === 'all') document.getElementById('nqTabAll')?.classList.add('active');
    if (scope === 'chung') document.getElementById('nqTabChung')?.classList.add('active');
    if (scope === 'phong_ban') document.getElementById('nqTabPhongban')?.classList.add('active');

    _nqLoadRules();
}

function _nqOnSearch(val) {
    _nqState.filters.search = val;
    if (window._nqSearchTimer) clearTimeout(window._nqSearchTimer);
    window._nqSearchTimer = setTimeout(function() {
        _nqLoadRules();
    }, 350);
}

function _nqOnDeptChange(val) {
    _nqState.filters.deptId = val;
    _nqLoadRules();
}

function _nqOnMonthChange(val) {
    _nqState.filters.month = val;
    _nqLoadRules();
}

function _nqOnYearChange(val) {
    _nqState.filters.year = val;
    _nqLoadRules();
}

function _nqOnFineChange(checked) {
    _nqState.filters.hasFine = checked;
    _nqLoadRules();
}

// ===== SEARCHABLE DROP-DOWN COMPONENT FOR MODAL =====
function _nqRenderSearchableDeptSelect(selectedDeptId) {
    var selectedDept = _nqState.depts.all.find(d => String(d.id) === String(selectedDeptId));
    var selectedText = selectedDept ? selectedDept.name : '-- Chọn phòng ban --';

    return `
        <div class="nq-searchable-select" id="nqSsWrapper">
            <input type="text" class="nq-form-input nq-ss-input" id="nqSsDisplayInput" readonly value="${escapeHtml(selectedText)}" onclick="_nqToggleDeptMenu()">
            <input type="hidden" id="nqFormDeptId" value="${selectedDeptId || ''}">
            
            <div class="nq-ss-menu" id="nqSsMenu">
                <input type="text" class="nq-ss-search" id="nqSsSearchInput" placeholder="🔍 Gõ từ khóa tìm phòng ban (VD: Kế toán, Sale, Cắt)..." oninput="_nqFilterDeptMenuItems(this.value)">
                <div id="nqSsMenuList"></div>
            </div>
        </div>
    `;
}

function _nqToggleDeptMenu() {
    var menu = document.getElementById('nqSsMenu');
    if (!menu) return;
    var isActive = menu.classList.contains('active');
    if (isActive) {
        menu.classList.remove('active');
    } else {
        menu.classList.add('active');
        var searchInp = document.getElementById('nqSsSearchInput');
        if (searchInp) {
            searchInp.value = '';
            searchInp.focus();
            _nqFilterDeptMenuItems('');
        }
    }
}

function _nqFilterDeptMenuItems(query) {
    var listEl = document.getElementById('nqSsMenuList');
    if (!listEl) return;

    var q = (query || '').toLowerCase().trim();
    var currentDeptId = document.getElementById('nqFormDeptId')?.value || '';

    var html = '';

    function renderGroup(label, items) {
        var filtered = items.filter(d => d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)));
        if (filtered.length === 0) return '';
        let grpHtml = `<div class="nq-ss-group-label">${label}</div>`;
        filtered.forEach(d => {
            var isSel = String(d.id) === String(currentDeptId);
            grpHtml += `<div class="nq-ss-item ${isSel ? 'selected' : ''}" onclick="_nqSelectDeptItem(${d.id}, '${escapeHtml(d.name)}')">
                <span>${escapeHtml(d.name)}</span>
                ${d.head_user_name ? `<span style="font-size:11px;opacity:0.8">👤 ${escapeHtml(d.head_user_name)}</span>` : ''}
            </div>`;
        });
        return grpHtml;
    }

    if (_nqState.depts.vanPhong && _nqState.depts.vanPhong.length > 0) {
        html += renderGroup('🏛️ HỆ THỐNG VĂN PHÒNG HV', _nqState.depts.vanPhong);
    }
    if (_nqState.depts.xuong && _nqState.depts.xuong.length > 0) {
        html += renderGroup('🏭 HỆ THỐNG XƯỞNG HV', _nqState.depts.xuong);
    }
    if (_nqState.depts.other && _nqState.depts.other.length > 0) {
        html += renderGroup('🏢 PHÒNG BAN KHÁC', _nqState.depts.other);
    }

    if (!html) {
        html = '<div style="padding:12px;text-align:center;font-size:12px;color:#94a3b8">Không tìm thấy phòng ban phù hợp</div>';
    }

    listEl.innerHTML = html;
}

function _nqSelectDeptItem(deptId, deptName) {
    var hiddenInp = document.getElementById('nqFormDeptId');
    var displayInp = document.getElementById('nqSsDisplayInput');
    var menu = document.getElementById('nqSsMenu');

    if (hiddenInp) hiddenInp.value = deptId;
    if (displayInp) displayInp.value = deptName;
    if (menu) menu.classList.remove('active');

    _nqUpdateManagerDisplay(deptId);
    _nqFetchNextCode();
}

function _nqUpdateManagerDisplay(deptId) {
    var mgrInp = document.getElementById('nqFormMgrName');
    if (!mgrInp) return;

    var dept = _nqState.depts.all.find(d => String(d.id) === String(deptId));
    if (dept && dept.head_user_name) {
        mgrInp.value = dept.head_user_name;
        mgrInp.dataset.mgrId = dept.head_user_id || '';
    } else {
        mgrInp.value = 'Trưởng Phòng / Ban Giám Đốc phụ trách';
        mgrInp.dataset.mgrId = '';
    }
}

// ===== MODAL ADD / EDIT =====
async function _nqOpenAddModal() {
    _nqState.editingId = null;
    _nqRenderModalForm(null);
}

async function _nqEditRule(id) {
    var rule = _nqState.rules.find(function(r) { return r.id === id; });
    if (!rule) return;
    _nqState.editingId = id;
    _nqRenderModalForm(rule);
}

function _nqRenderModalForm(rule) {
    var isEdit = !!rule;
    var existingModal = document.getElementById('nqModalOverlay');
    if (existingModal) existingModal.remove();

    var overlay = document.createElement('div');
    overlay.className = 'nq-modal-overlay';
    overlay.id = 'nqModalOverlay';

    var scope = isEdit ? rule.scope : 'phong_ban';
    var deptId = isEdit ? (rule.department_id || '') : '';
    var effDate = isEdit ? rule.effective_date : new Date().toISOString().substring(0, 10);
    var isForever = isEdit ? (rule.is_forever !== false && rule.is_forever !== 'false') : true;
    var expDate = isEdit && rule.expiry_date ? rule.expiry_date : '';

    var dept = _nqState.depts.all.find(d => String(d.id) === String(deptId));
    var initialMgrName = isEdit ? (rule.manager_name || (dept ? dept.head_user_name : '')) : (dept ? dept.head_user_name : '');

    overlay.innerHTML = `
        <div class="nq-modal">
            <div class="nq-modal-hdr">
                <h3>${isEdit ? '✏️ Chỉnh Sửa Điều Khoản' : '➕ Thêm Điều Khoản Mới'}</h3>
                <button class="nq-modal-close" onclick="_nqCloseModal()">✕</button>
            </div>
            <div class="nq-modal-body">
                <div class="nq-form-group">
                    <label>Phạm Vi Áp Dụng *</label>
                    <div style="display:flex;gap:16px;margin-top:4px">
                        <label style="font-weight:600;cursor:pointer">
                            <input type="radio" name="nqScope" value="chung" ${scope === 'chung' ? 'checked' : ''} onchange="_nqOnScopeRadioChange(this.value)"> 🏢 Nội Quy Chung
                        </label>
                        <label style="font-weight:600;cursor:pointer">
                            <input type="radio" name="nqScope" value="phong_ban" ${scope === 'phong_ban' ? 'checked' : ''} onchange="_nqOnScopeRadioChange(this.value)"> 🏛️ Nội Quy Phòng Ban
                        </label>
                    </div>
                </div>

                <div class="nq-form-group" id="nqDeptSelectGroup" style="display:${scope === 'phong_ban' ? 'flex' : 'none'}">
                    <label>Phòng Ban Áp Dụng *</label>
                    ${_nqRenderSearchableDeptSelect(deptId)}
                </div>

                <div class="nq-form-group">
                    <label>Mã Điều Khoản (Tự động sinh mã chuẩn)</label>
                    <input type="text" class="nq-form-input" id="nqFormCode" value="${isEdit ? rule.rule_code : ''}" readonly placeholder="Tự động sinh mã NQ...">
                </div>

                <div class="nq-form-group">
                    <label>Tiêu Đề Nội Quy *</label>
                    <input type="text" class="nq-form-input" id="nqFormTitle" value="${isEdit ? escapeHtml(rule.title) : ''}" placeholder="Nhập tiêu đề điều khoản ngắn gọn, rõ ràng...">
                </div>

                <div class="nq-form-group">
                    <label>Nội Dung Chi Tiết Điều Khoản *</label>
                    <textarea class="nq-form-textarea" id="nqFormContent" placeholder="Nhập nội dung các quy định chi tiết...">${isEdit ? escapeHtml(rule.content) : ''}</textarea>
                </div>

                <div class="nq-form-group">
                    <label>Link Nội Quy / Tài Liệu Gốc (URL - Không bắt buộc)</label>
                    <input type="text" class="nq-form-input" id="nqFormDocLink" value="${isEdit && rule.doc_link ? escapeHtml(rule.doc_link) : ''}" placeholder="https://docs.google.com/document/d/...">
                </div>

                <div class="nq-form-group">
                    <label>Hình Ảnh Minh Họa / Dán Ảnh (Ctrl + V)</label>
                    <input type="hidden" id="nqFormImage" value="${isEdit && rule.image_url ? escapeHtml(rule.image_url) : ''}">
                    <div class="nq-paste-area" id="nqPasteBox" tabindex="0">
                        <div class="nq-paste-text" id="nqPasteBoxText" style="display:${isEdit && rule.image_url ? 'none' : 'block'}">📋 Bấm vào đây và ấn Ctrl + V để dán ảnh màn hình trực tiếp</div>
                        <div id="nqImagePreviewWrapper" style="position:relative;display:${isEdit && rule.image_url ? 'inline-block' : 'none'};margin-top:8px">
                            <img id="nqImagePreview" class="nq-paste-preview" src="${isEdit && rule.image_url ? rule.image_url : ''}">
                            <button type="button" style="position:absolute;top:6px;right:6px;background:rgba(220,38,38,0.9);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2)" onclick="_nqRemovePastedImage(event)">🗑️ Xóa ảnh</button>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                    <div class="nq-form-group">
                        <label>Áp Dụng Từ Ngày *</label>
                        <input type="date" class="nq-form-input" id="nqFormEffDate" value="${effDate}">
                    </div>
                    <div class="nq-form-group">
                        <label>Áp Dụng Đến Ngày</label>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                            <label style="font-size:12px;font-weight:700;color:#4338ca;cursor:pointer">
                                <input type="checkbox" id="nqFormIsForever" ${isForever ? 'checked' : ''} onchange="_nqToggleForever(this.checked)"> ♾️ Mãi mãi (Không thời hạn)
                            </label>
                        </div>
                        <input type="date" class="nq-form-input" id="nqFormExpDate" value="${expDate}" style="display:${isForever ? 'none' : 'block'}">
                    </div>
                </div>

                <!-- Fine Section -->
                <div style="background:#fff1f2;border:1px solid #ffe4e6;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px">
                    <div style="font-weight:900;color:#be123c;font-size:13px;display:flex;align-items:center;gap:6px">
                        🚨 CHẾ TÀI PHẠT VI PHẠM (NẾU CÓ)
                    </div>

                    <!-- 1. Cá nhân -->
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                            <input type="checkbox" id="nqFormHasFine" ${isEdit && rule.has_fine ? 'checked' : ''} onchange="_nqToggleFineInput(this.checked)"> 👤 Phạt vi phạm cá nhân
                        </label>
                        <input type="number" class="nq-form-input" id="nqFormFineAmt" style="width:160px" value="${isEdit ? Number(rule.fine_amount) : 0}" placeholder="Số tiền VNĐ *" ${isEdit && rule.has_fine ? '' : 'disabled'}>
                    </div>

                    <!-- 2. Team -->
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                            <input type="checkbox" id="nqFormHasTeamFine" ${isEdit && rule.has_team_fine ? 'checked' : ''} onchange="_nqToggleTeamFineInput(this.checked)"> 👥 Phạt vi phạm Team
                        </label>
                        <input type="number" class="nq-form-input" id="nqFormTeamFineAmt" style="width:160px" value="${isEdit ? Number(rule.team_fine_amount) : 0}" placeholder="Số tiền VNĐ *" ${isEdit && rule.has_team_fine ? '' : 'disabled'}>
                    </div>

                    <!-- 3. Phòng Ban -->
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                            <input type="checkbox" id="nqFormHasDeptFine" ${isEdit && rule.has_dept_fine ? 'checked' : ''} onchange="_nqToggleDeptFineInput(this.checked)"> 🏛️ Phạt vi phạm Phòng Ban
                        </label>
                        <input type="number" class="nq-form-input" id="nqFormDeptFineAmt" style="width:160px" value="${isEdit ? Number(rule.dept_fine_amount) : 0}" placeholder="Số tiền VNĐ *" ${isEdit && rule.has_dept_fine ? '' : 'disabled'}>
                    </div>

                    <!-- 4. Quản lý liên đới -->
                    <div style="display:flex;flex-direction:column;gap:6px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                                <input type="checkbox" id="nqFormHasMgrFine" ${isEdit && rule.has_manager_fine ? 'checked' : ''} onchange="_nqToggleMgrFineInput(this.checked)"> 🛡️ Phạt quản lý liên đới
                            </label>
                            <input type="number" class="nq-form-input" id="nqFormMgrFineAmt" style="width:160px" value="${isEdit ? Number(rule.manager_fine_amount) : 0}" placeholder="Số tiền VNĐ *" ${isEdit && rule.has_manager_fine ? '' : 'disabled'}>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">
                            <label style="font-size:12px;font-weight:800;color:#be123c">👤 Tên Quản lý liên đới chịu trách nhiệm phạt:</label>
                            <input type="text" class="nq-form-input" id="nqFormMgrName" value="${escapeHtml(initialMgrName || 'Trưởng Phòng / Ban Giám Đốc phụ trách')}" placeholder="Nhập tên Quản lý / Trưởng phòng liên đới..." ${isEdit && rule.has_manager_fine ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>
            </div>
            <div class="nq-modal-ftr">
                <button class="nq-btn-secondary" onclick="_nqCloseModal()">Hủy</button>
                <button class="nq-btn-primary" onclick="_nqSaveRule()">${isEdit ? 'Lưu Cập Nhật' : 'Tạo Mới'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Setup Clipboard Paste Event for Image
    setupImagePasteHandler(overlay);

    // Click outside to close searchable dept menu
    document.addEventListener('click', function _closeSs(e) {
        var wrapper = document.getElementById('nqSsWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            var menu = document.getElementById('nqSsMenu');
            if (menu) menu.classList.remove('active');
        }
    });

    if (!isEdit) {
        _nqFetchNextCode();
    }
}

function _nqCloseModal() {
    var el = document.getElementById('nqModalOverlay');
    if (el) el.remove();
}

function _nqOnScopeRadioChange(val) {
    var grp = document.getElementById('nqDeptSelectGroup');
    if (grp) grp.style.display = (val === 'phong_ban') ? 'flex' : 'none';
    if (val === 'chung') {
        _nqUpdateManagerDisplay(null);
    }
    _nqFetchNextCode();
}

function _nqToggleFineInput(checked) {
    var inp = document.getElementById('nqFormFineAmt');
    if (inp) inp.disabled = !checked;
}

function _nqToggleTeamFineInput(checked) {
    var inp = document.getElementById('nqFormTeamFineAmt');
    if (inp) inp.disabled = !checked;
}

function _nqToggleDeptFineInput(checked) {
    var inp = document.getElementById('nqFormDeptFineAmt');
    if (inp) inp.disabled = !checked;
}

function _nqToggleMgrFineInput(checked) {
    var inp = document.getElementById('nqFormMgrFineAmt');
    var nameInp = document.getElementById('nqFormMgrName');
    if (inp) inp.disabled = !checked;
    if (nameInp) nameInp.disabled = !checked;
}

function _nqToggleForever(checked) {
    var inp = document.getElementById('nqFormExpDate');
    if (inp) inp.style.display = checked ? 'none' : 'block';
}

function _nqRemovePastedImage(e) {
    if (e) e.stopPropagation();
    var imgInp = document.getElementById('nqFormImage');
    var imgPrev = document.getElementById('nqImagePreview');
    var prevWrapper = document.getElementById('nqImagePreviewWrapper');
    var boxText = document.getElementById('nqPasteBoxText');

    if (imgInp) imgInp.value = '';
    if (imgPrev) imgPrev.src = '';
    if (prevWrapper) prevWrapper.style.display = 'none';
    if (boxText) boxText.style.display = 'block';
}

// ===== PASTE IMAGE HANDLER WITH CANVAS RESIZE =====
function setupImagePasteHandler(modalOverlay) {
    modalOverlay.addEventListener('paste', function(e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                var blob = items[i].getAsFile();
                var reader = new FileReader();
                reader.onload = function(event) {
                    var img = new Image();
                    img.onload = function() {
                        // Canvas Compress & Resize
                        var canvas = document.createElement('canvas');
                        var maxW = 1200;
                        var width = img.width;
                        var height = img.height;
                        if (width > maxW) {
                            height = Math.round(height * (maxW / width));
                            width = maxW;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        var imgInp = document.getElementById('nqFormImage');
                        var imgPrev = document.getElementById('nqImagePreview');
                        var prevWrapper = document.getElementById('nqImagePreviewWrapper');
                        var boxText = document.getElementById('nqPasteBoxText');

                        if (imgInp) imgInp.value = compressedDataUrl;
                        if (imgPrev) imgPrev.src = compressedDataUrl;
                        if (prevWrapper) prevWrapper.style.display = 'inline-block';
                        if (boxText) boxText.style.display = 'none';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(blob);
                e.preventDefault();
                break;
            }
        }
    });
}

async function _nqFetchNextCode() {
    var scopeRadio = document.querySelector('input[name="nqScope"]:checked');
    var scope = scopeRadio ? scopeRadio.value : 'phong_ban';
    var deptId = document.getElementById('nqFormDeptId')?.value || '';

    try {
        var params = new URLSearchParams({ scope: scope });
        if (scope === 'phong_ban' && deptId) params.append('department_id', deptId);

        var res = await apiCall('/api/company-rules/next-code?' + params.toString());
        if (res && res.nextCode) {
            var codeInp = document.getElementById('nqFormCode');
            if (codeInp) {
                codeInp.value = res.nextCode;
            }
        }
    } catch (e) {
        console.error('Error fetch next code:', e);
    }
}

async function _nqSaveRule() {
    var scopeRadio = document.querySelector('input[name="nqScope"]:checked');
    var scope = scopeRadio ? scopeRadio.value : 'phong_ban';
    var deptId = document.getElementById('nqFormDeptId')?.value || null;
    var ruleCode = document.getElementById('nqFormCode')?.value || '';
    var title = document.getElementById('nqFormTitle')?.value || '';
    var content = document.getElementById('nqFormContent')?.value || '';
    var docLink = document.getElementById('nqFormDocLink')?.value || '';
    var imageUrl = document.getElementById('nqFormImage')?.value || '';
    var effDate = document.getElementById('nqFormEffDate')?.value || '';
    var isForever = document.getElementById('nqFormIsForever')?.checked || false;
    var expDate = isForever ? null : (document.getElementById('nqFormExpDate')?.value || null);
    
    var hasFine = document.getElementById('nqFormHasFine')?.checked || false;
    var fineAmt = Number(document.getElementById('nqFormFineAmt')?.value) || 0;
    
    var hasTeamFine = document.getElementById('nqFormHasTeamFine')?.checked || false;
    var teamFineAmt = Number(document.getElementById('nqFormTeamFineAmt')?.value) || 0;

    var hasDeptFine = document.getElementById('nqFormHasDeptFine')?.checked || false;
    var deptFineAmt = Number(document.getElementById('nqFormDeptFineAmt')?.value) || 0;

    var hasMgrFine = document.getElementById('nqFormHasMgrFine')?.checked || false;
    var mgrFineAmt = Number(document.getElementById('nqFormMgrFineAmt')?.value) || 0;

    var mgrNameInp = document.getElementById('nqFormMgrName');
    var mgrName = mgrNameInp ? (mgrNameInp.value.trim() || 'Trưởng Phòng / Ban Giám Đốc phụ trách') : 'Trưởng Phòng / Ban Giám Đốc phụ trách';
    var mgrId = mgrNameInp ? (Number(mgrNameInp.dataset.mgrId) || null) : null;

    if (!title.trim()) { alert('Vui lòng nhập tiêu đề nội quy'); return; }
    if (!content.trim()) { alert('Vui lòng nhập nội dung nội quy'); return; }
    if (!effDate) { alert('Vui lòng chọn ngày áp dụng'); return; }
    if (scope === 'phong_ban' && !deptId) { alert('Vui lòng chọn phòng ban áp dụng'); return; }

    // Validation: Nếu chọn chế tài phạt thì BẮT BUỘC phải ghi số tiền phạt > 0
    if (hasFine && fineAmt <= 0) { alert('⚠️ Bạn đã chọn Phạt vi phạm cá nhân. Vui lòng nhập số tiền phạt (lớn hơn 0).'); return; }
    if (hasTeamFine && teamFineAmt <= 0) { alert('⚠️ Bạn đã chọn Phạt vi phạm Team. Vui lòng nhập số tiền phạt (lớn hơn 0).'); return; }
    if (hasDeptFine && deptFineAmt <= 0) { alert('⚠️ Bạn đã chọn Phạt vi phạm Phòng Ban. Vui lòng nhập số tiền phạt (lớn hơn 0).'); return; }
    if (hasMgrFine && mgrFineAmt <= 0) { alert('⚠️ Bạn đã chọn Phạt quản lý liên đới. Vui lòng nhập số tiền phạt (lớn hơn 0).'); return; }
    if (hasMgrFine && !mgrName) { alert('⚠️ Vui lòng nhập tên Quản lý liên đới chịu trách nhiệm phạt.'); return; }

    var payload = {
        scope: scope,
        department_id: deptId,
        rule_code: ruleCode,
        title: title,
        content: content,
        doc_link: docLink,
        image_url: imageUrl,
        effective_date: effDate,
        is_forever: isForever,
        expiry_date: expDate,
        has_fine: hasFine,
        fine_amount: fineAmt,
        has_team_fine: hasTeamFine,
        team_fine_amount: teamFineAmt,
        has_dept_fine: hasDeptFine,
        dept_fine_amount: deptFineAmt,
        has_manager_fine: hasMgrFine,
        manager_fine_amount: mgrFineAmt,
        manager_user_id: mgrId,
        manager_name: mgrName
    };

    try {
        var res;
        if (_nqState.editingId) {
            res = await apiCall('/api/company-rules/' + _nqState.editingId, 'PUT', payload);
        } else {
            res = await apiCall('/api/company-rules', 'POST', payload);
        }

        if (res && res.error) {
            alert(res.error);
            return;
        }

        _nqCloseModal();
        await _nqLoadRules();
    } catch (e) {
        console.error('Error save rule:', e);
        alert(e.message || 'Lỗi lưu điều khoản');
    }
}

async function _nqDeleteRule(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa điều khoản này?')) return;
    try {
        var res = await apiCall('/api/company-rules/' + id, 'DELETE');
        if (res && res.error) {
            alert(res.error);
            return;
        }
        await _nqLoadRules();
    } catch (e) {
        console.error('Error delete rule:', e);
    }
}
